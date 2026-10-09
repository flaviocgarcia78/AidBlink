// Generates a Solana keypair for the AidBlink demo treasury and prints
// base58 values that can be pasted into .env. Run with: node scripts/gen-keys.mjs
import { Keypair } from "@solana/web3.js";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes) {
  const digits = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] << 8;
      digits[i] = carry % 58;
      carry = (carry / 58) | 0;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let out = "";
  for (const byte of bytes) {
    if (byte !== 0) break;
    out += "1";
  }
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    out += ALPHABET[digits[i]];
  }
  return out;
}

const treasury = Keypair.generate();
const anchor = Keypair.generate();

console.log("TREASURY_PUBLIC=" + treasury.publicKey.toBase58());
console.log("ANCHOR_PUBLIC=" + anchor.publicKey.toBase58());
console.log("ANCHOR_SECRET=" + base58Encode(anchor.secretKey));
