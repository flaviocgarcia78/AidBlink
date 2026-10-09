import { createHash } from "node:crypto";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { env } from "./env";

/**
 * Hand-rolled client for the AidBlink Anchor program.
 *
 * We encode instructions and decode accounts ourselves instead of pulling the
 * Anchor JS client, so the API stays dependency-light and the account layout is
 * explicit. The conventions below mirror Anchor exactly:
 *
 * - instruction discriminator = sha256("global:<ix>")[0..8]
 * - account discriminator     = sha256("account:<Name>")[0..8]
 * - arguments are Borsh-encoded in declaration order
 */

/** Fallback used when the env var is not set. */
export const DEFAULT_PROGRAM_ID = "BsNDtwVsmxpMSnnoUiiadhjnRvxJ8huuZWZ5vcrFCrrg";

const POOL_SEED = Buffer.from("pool");
const DONATION_SEED = Buffer.from("donation");

/** Sha256("account:Donation") + 32 + 8 + 8 + 8 + (4 + 200) + 1. */
export const DONATION_ACCOUNT_SIZE = 8 + 32 + 8 + 8 + 8 + (4 + 200) + 1;

function disc(prefix: "global" | "account", name: string): Buffer {
  return createHash("sha256").update(`${prefix}:${name}`).digest().subarray(0, 8);
}

const IX_DONATE = disc("global", "donate");
const IX_INITIALIZE_POOL = disc("global", "initialize_pool");
const ACC_DONATION = disc("account", "Donation");
const ACC_POOL = disc("account", "Pool");

export function getProgramId(): PublicKey {
  return new PublicKey(env.programId);
}

export function getPoolPda(programId = getProgramId()): PublicKey {
  return PublicKey.findProgramAddressSync([POOL_SEED], programId)[0];
}

export function getDonationPda(
  donor: PublicKey,
  nonce: bigint,
  programId = getProgramId(),
): PublicKey {
  const nonceBytes = Buffer.alloc(8);
  nonceBytes.writeBigUInt64LE(nonce, 0);
  return PublicKey.findProgramAddressSync(
    [DONATION_SEED, donor.toBuffer(), nonceBytes],
    programId,
  )[0];
}

/* ------------------------------- encoding ------------------------------- */

function encodeU64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value), 0);
  return buf;
}

function encodeString(value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

/** lamports: u64, memo: String, nonce: u64 (declaration order). */
function encodeDonateArgs(lamports: number, memo: string, nonce: bigint): Buffer {
  return Buffer.concat([
    IX_DONATE,
    encodeU64(lamports),
    encodeString(memo.slice(0, 200)),
    encodeU64(nonce),
  ]);
}

export interface BuiltDonation {
  /** Base64 serialized, unsigned transaction for the donor wallet to sign. */
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  nonce: string;
  donation: string;
}

/**
 * Build the unsigned `donate` transaction: records the contribution on-chain
 * and transfers the SOL to the treasury, atomically.
 */
export async function buildDonationTransaction(
  connection: Connection,
  donor: PublicKey,
  lamports: number,
  memo: string,
): Promise<BuiltDonation> {
  const programId = getProgramId();
  const nonce = BigInt(Date.now());
  const donation = getDonationPda(donor, nonce, programId);

  const instruction = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: donor, isSigner: true, isWritable: true },
      { pubkey: getPoolPda(programId), isSigner: false, isWritable: true },
      { pubkey: new PublicKey(env.treasuryAddress), isSigner: false, isWritable: true },
      { pubkey: donation, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: encodeDonateArgs(lamports, memo, nonce),
  });

  const transaction = new Transaction().add(instruction);
  transaction.feePayer = donor;
  const latest = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = latest.blockhash;

  return {
    transaction: transaction
      .serialize({ requireAllSignatures: false, verifySignatures: false })
      .toString("base64"),
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
    nonce: nonce.toString(),
    donation: donation.toBase58(),
  };
}

/* ------------------------------- decoding ------------------------------- */

export interface OnchainDonation {
  /** PDA address of the donation record. */
  address: string;
  donor: string;
  lamports: number;
  index: number;
  timestamp: number;
  memo: string;
  /** Transaction signature, resolved from the account history. */
  signature?: string;
}

function decodeDonation(address: string, data: Buffer): OnchainDonation | null {
  if (data.length < 8 || !data.subarray(0, 8).equals(ACC_DONATION)) return null;
  let offset = 8;
  const donor = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const lamports = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const index = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const timestamp = Number(data.readBigInt64LE(offset));
  offset += 8;
  const memoLen = data.readUInt32LE(offset);
  offset += 4;
  const memo = data.subarray(offset, offset + memoLen).toString("utf8");

  return { address, donor: donor.toBase58(), lamports, index, timestamp, memo };
}

export interface OnchainPool {
  authority: string;
  treasury: string;
  totalLamports: number;
  donationCount: number;
}

export async function fetchPool(connection: Connection): Promise<OnchainPool | null> {
  const info = await connection.getAccountInfo(getPoolPda());
  if (!info) return null;
  const data = info.data as Buffer;
  if (data.length < 8 || !data.subarray(0, 8).equals(ACC_POOL)) return null;

  let offset = 8;
  const authority = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const treasury = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const totalLamports = Number(data.readBigUInt64LE(offset));
  offset += 8;
  const donationCount = Number(data.readBigUInt64LE(offset));

  return {
    authority: authority.toBase58(),
    treasury: treasury.toBase58(),
    totalLamports,
    donationCount,
  };
}

/**
 * Read every donation recorded by the program, newest first, and resolve the
 * creating transaction signature for the ones we return.
 *
 * Results are cached briefly (45s): the demo reads this from several places
 * (dashboard mount, balance, request approval) and each raw call hits the
 * Devnet RPC twice per donation, which can take 10-20s on a slow public
 * endpoint. A short TTL keeps the budget guard coherent while avoiding the
 * repeated latency.
 */
const DONATIONS_CACHE_TTL_MS = 30_000;
let donationsCache: { at: number; data: OnchainDonation[] } | null = null;

export async function fetchOnchainDonations(
  connection: Connection,
  limit = 50,
): Promise<OnchainDonation[]> {
  if (
    donationsCache &&
    Date.now() - donationsCache.at < DONATIONS_CACHE_TTL_MS
  ) {
    return donationsCache.data;
  }

  const accounts = await connection.getProgramAccounts(getProgramId(), {
    filters: [{ dataSize: DONATION_ACCOUNT_SIZE }],
  });

  const donations = accounts
    .map(({ pubkey, account }) =>
      decodeDonation(pubkey.toBase58(), account.data as Buffer),
    )
    .filter((d): d is OnchainDonation => d !== null);

  donations.sort((a, b) => b.timestamp - a.timestamp || b.index - a.index);
  const top = donations.slice(0, limit);

  // Each donation PDA is written exactly once (at creation), so its account
  // history has a single signature: the contribution transaction.
  await Promise.all(
    top.map(async (donation) => {
      try {
        const sigs = await connection.getSignaturesForAddress(
          new PublicKey(donation.address),
          { limit: 1 },
        );
        donation.signature = sigs[0]?.signature;
      } catch {
        donation.signature = undefined;
      }
    }),
  );

  donationsCache = { at: Date.now(), data: top };
  return top;
}

/** Whether a confirmed transaction actually invoked the AidBlink program. */
export async function confirmDonationTransaction(
  connection: Connection,
  signature: string,
): Promise<boolean> {
  const tx = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return false;
  const programId = getProgramId().toBase58();
  const logs = tx.meta?.logMessages ?? [];
  return (
    logs.some((line) => line.includes(`Program ${programId} invoke`)) &&
    logs.some((line) => line.includes("Instruction: Donate"))
  );
}

/* --------------------------- setup (initialize) ------------------------- */

/** Instruction that creates the pool; used by the post-deploy setup script. */
export function buildInitializePoolInstruction(
  authority: PublicKey,
  treasury: PublicKey,
): TransactionInstruction {
  return new TransactionInstruction({
    programId: getProgramId(),
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: getPoolPda(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([IX_INITIALIZE_POOL, treasury.toBuffer()]),
  });
}
