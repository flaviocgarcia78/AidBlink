import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { env } from "./env";

/* --------------------------- base58 (no deps) --------------------------- */

const B58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_MAP: Record<string, number> = {};
for (let i = 0; i < B58_ALPHABET.length; i += 1) {
  B58_MAP[B58_ALPHABET[i]] = i;
}

/** Decode a base58 string (e.g. a CLI keypair) into raw bytes. */
export function base58Decode(input: string): Uint8Array {
  if (input.length === 0) return new Uint8Array(0);
  const bytes: number[] = [0];
  for (const ch of input) {
    const value = B58_MAP[ch];
    if (value === undefined) {
      throw new Error(`Invalid base58 character "${ch}"`);
    }
    let carry = value;
    for (let j = 0; j < bytes.length; j += 1) {
      carry += bytes[j] * 58;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  for (const ch of input) {
    if (ch !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

/* ------------------------------- network -------------------------------- */

let cachedConnection: Connection | null = null;

export function getConnection(): Connection {
  if (!cachedConnection) {
    cachedConnection = new Connection(env.rpcUrl, "confirmed");
  }
  return cachedConnection;
}

export function getTreasuryPublicKey(): PublicKey {
  return new PublicKey(env.treasuryAddress);
}

export function isValidPublicKey(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

/** On-chain balance of the treasury account, in lamports. */
export async function getTreasuryLamports(): Promise<number | null> {
  if (!isValidPublicKey(env.treasuryAddress)) return null;
  try {
    return await getConnection().getBalance(getTreasuryPublicKey());
  } catch {
    return null;
  }
}

/* ------------------------- contribution transaction --------------------- */

export interface BuiltContribution {
  /** Base64 serialized, unsigned transaction for the donor wallet to sign. */
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

/**
 * Build an unsigned SOL transfer from the donor to the treasury, ready to be
 * returned by the Blink action endpoint and signed by the donor's wallet.
 */
export async function buildContributionTransaction(
  donor: PublicKey,
  lamports: number,
): Promise<BuiltContribution> {
  const treasury = getTreasuryPublicKey();
  const connection = getConnection();

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: donor,
      toPubkey: treasury,
      lamports,
    }),
  );
  transaction.feePayer = donor;

  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latest.blockhash;

  const serialized = transaction
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");

  return {
    transaction: serialized,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  };
}

/* --------------------- on-chain verification of donations --------------- */

export interface ParsedDonation {
  lamports: number;
  donor: string;
}

/**
 * Fetch a confirmed transaction and sum the SOL sent to the treasury. Returns
 * null when the transaction is missing or contains no transfer to the treasury.
 */
export async function parseDonation(
  signature: string,
): Promise<ParsedDonation | null> {
  const connection = getConnection();
  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx || !tx.meta) return null;

  const treasury = env.treasuryAddress;
  const accountKeys = tx.transaction.message.accountKeys.map((k) =>
    typeof k === "string" ? k : k.pubkey.toBase58(),
  );
  const feePayer = accountKeys[0];
  let lamports = 0;

  for (const ix of tx.transaction.message.instructions) {
    if (
      "program" in ix &&
      ix.program === "system" &&
      "parsed" in ix &&
      ix.parsed?.type === "transfer" &&
      ix.parsed?.info?.destination === treasury
    ) {
      lamports += Number(ix.parsed.info.lamports ?? 0);
    }
  }

  if (lamports <= 0) return null;
  return { lamports, donor: feePayer };
}

/* --------------------------- transparency anchor ------------------------ */

const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

let anchorKeypair: Keypair | null | undefined;

function getAnchorKeypair(): Keypair | null {
  if (anchorKeypair !== undefined) return anchorKeypair;
  if (!env.anchorSecretKey) {
    anchorKeypair = null;
    return null;
  }
  try {
    anchorKeypair = Keypair.fromSecretKey(base58Decode(env.anchorSecretKey));
  } catch {
    anchorKeypair = null;
  }
  return anchorKeypair;
}

export function isAnchoringEnabled(): boolean {
  return getAnchorKeypair() !== null;
}

let anchorFundingCache: { at: number; funded: boolean } | null = null;

/** Whether the anchor account currently holds enough SOL to pay for a memo. */
export async function isAnchorFunded(): Promise<boolean> {
  const keypair = getAnchorKeypair();
  if (!keypair) return false;
  const now = Date.now();
  if (anchorFundingCache && now - anchorFundingCache.at < 60_000) {
    return anchorFundingCache.funded;
  }
  try {
    const balance = await getConnection().getBalance(keypair.publicKey);
    const funded = balance >= 5000;
    anchorFundingCache = { at: now, funded };
    return funded;
  } catch {
    anchorFundingCache = { at: now, funded: false };
    return false;
  }
}

/**
 * Write a short memo to Solana, anchoring a redemption for auditability.
 * Returns the transaction signature, or null when anchoring is disabled,
 * unfunded or fails (the redemption itself must never depend on this).
 */
export async function anchorMemo(memo: string): Promise<string | null> {
  const keypair = getAnchorKeypair();
  if (!keypair) return null;
  if (!(await isAnchorFunded())) return null;
  try {
    const connection = getConnection();
    const transaction = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: keypair.publicKey, isSigner: true, isWritable: false },
        ],
        programId: MEMO_PROGRAM_ID,
        data: Buffer.from(memo, "utf8"),
      }),
    );
    const signature = await sendAndConfirmTransaction(connection, transaction, [
      keypair,
    ]);
    return signature;
  } catch {
    return null;
  }
}

export { LAMPORTS_PER_SOL };
