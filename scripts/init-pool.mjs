#!/usr/bin/env node
/**
 * Create the AidBlink pool account after the program has been deployed.
 *
 *   node scripts/init-pool.mjs
 *
 * Reads the RPC, treasury and program id from `.env`, signs with the Solana CLI
 * wallet at ~/.config/solana/id.json and creates the `[b"pool"]` PDA. Safe to
 * run more than once: it exits early if the pool already exists.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

/* --------------------------------- env ---------------------------------- */

function loadEnv(file = ".env") {
  const out = {};
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env: rely on the real environment */
  }
  return out;
}

const fileEnv = loadEnv();
const get = (key, fallback) => process.env[key] ?? fileEnv[key] ?? fallback;

const RPC = get("NEXT_PUBLIC_SOLANA_RPC_URL", "https://api.devnet.solana.com");
const TREASURY = get("AIDBLINK_TREASURY_ADDRESS");
const PROGRAM_ID = get(
  "AIDBLINK_PROGRAM_ID",
  "BsNDtwVsmxpMSnnoUiiadhjnRvxJ8huuZWZ5vcrFCrrg",
);

const POOL_SEED = Buffer.from("pool");

function disc(prefix, name) {
  return createHash("sha256").update(`${prefix}:${name}`).digest().subarray(0, 8);
}

function walletPath() {
  if (process.env.ANCHOR_WALLET) return process.env.ANCHOR_WALLET;
  return process.env.SOLANA_WALLET ?? path.join(os.homedir(), ".config", "solana", "id.json");
}

async function main() {
  const programId = new PublicKey(PROGRAM_ID);
  const treasury = new PublicKey(TREASURY);
  const authority = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(readFileSync(walletPath(), "utf8"))),
  );
  const connection = new Connection(RPC, "confirmed");

  const [pool] = PublicKey.findProgramAddressSync([POOL_SEED], programId);
  const info = await connection.getAccountInfo(pool);
  if (info) {
    console.log(`Pool already initialized: ${pool.toBase58()}`);
    return;
  }

  const ix = new TransactionInstruction({
    programId,
    keys: [
      { pubkey: authority.publicKey, isSigner: true, isWritable: true },
      { pubkey: pool, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.concat([
      disc("global", "initialize_pool"),
      treasury.toBuffer(),
    ]),
  });

  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(ix),
    [authority],
  );

  console.log(`Pool initialized: ${pool.toBase58()}`);
  console.log(`  authority: ${authority.publicKey.toBase58()}`);
  console.log(`  treasury : ${treasury.toBase58()}`);
  console.log(`  program  : ${programId.toBase58()}`);
  console.log(`  signature: ${signature}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
