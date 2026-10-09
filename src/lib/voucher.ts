import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";
import type { AidCategory, Voucher } from "./types";

/**
 * Voucher tokens
 * --------------
 * A voucher is represented off-chain by a record in the store and on the wire
 * by a compact signed token:
 *
 *     base64url(payloadJson) + "." + base64url(HMAC_SHA256(payload, secret))
 *
 * The token lets a partner (merchant) prove the voucher is authentic without a
 * database lookup, while the single-use rule is enforced atomically on the
 * server. A bare QR code alone does NOT guarantee single use — that is a common
 * misunderstanding worth calling out in the demo.
 */

export interface VoucherTokenPayload {
  /** Token format version. */
  v: 1;
  /** Voucher id (also stored server-side). */
  id: string;
  /** Category this voucher can be spent on. */
  cat: AidCategory;
  /** Amount in USD. */
  amt: number;
  /** Pseudonymous beneficiary reference. No personal data. */
  ref: string;
  /** Issuer organization id. */
  org: string;
  /** Issued-at, epoch milliseconds. */
  iat: number;
  /** Expires-at, epoch milliseconds. */
  exp: number;
  /** Random nonce to make tokens unique. */
  nonce: string;
}

export const ISSUER_ORG = "aidblink-demo-org";

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function hmac(data: string): Buffer {
  return createHmac("sha256", env.voucherSecret).update(data).digest();
}

export function signToken(payload: VoucherTokenPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = b64url(hmac(body));
  return `${body}.${sig}`;
}

export function verifyToken(token: string): VoucherTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  let expected: Buffer;
  try {
    expected = hmac(body);
  } catch {
    return null;
  }
  const provided = fromB64url(sig);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(fromB64url(body).toString("utf8")) as VoucherTokenPayload;
    if (payload.v !== 1) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildTokenFromVoucher(voucher: Voucher): string {
  const iat = new Date(voucher.issuedAt).getTime();
  const exp = new Date(voucher.expiresAt).getTime();
  return signToken({
    v: 1,
    id: voucher.id,
    cat: voucher.category,
    amt: voucher.amountUsd,
    ref: voucher.beneficiaryRef,
    org: ISSUER_ORG,
    iat,
    exp,
    nonce: randomBytes(8).toString("hex"),
  });
}

export function tokenIsExpired(payload: VoucherTokenPayload): boolean {
  return Date.now() > payload.exp;
}

/** Human-friendly code shown under the QR for manual entry in the demo. */
export function shortCode(voucherId: string): string {
  return voucherId.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}
