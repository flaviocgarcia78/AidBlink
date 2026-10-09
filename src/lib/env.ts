/**
 * Centralized runtime configuration.
 *
 * Everything here has a safe default so the app runs for a demo without any
 * environment file. Real deployments must override the treasury address and
 * the voucher secret via environment variables.
 */

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",

  network: process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet",

  rpcUrl:
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com",

  /**
   * Public treasury address that receives contributions. The default is a
   * syntactically valid placeholder; override it in `.env` for a real demo.
   */
  treasuryAddress:
    process.env.AIDBLINK_TREASURY_ADDRESS ??
    "11111111111111111111111111111111",

  /**
   * Same treasury address, but exposed to the browser for display. Kept as a
   * NEXT_PUBLIC_* variable because containers must inline it at build time.
   */
  publicTreasuryAddress:
    process.env.NEXT_PUBLIC_TREASURY_ADDRESS ??
    process.env.AIDBLINK_TREASURY_ADDRESS ??
    "11111111111111111111111111111111",

  /** HMAC secret for voucher tokens. */
  voucherSecret:
    process.env.AIDBLINK_VOUCHER_SECRET ??
    "aidblink-dev-secret-do-not-use-in-production",

  /** Illustrative SOL/USD rate used for demo budgeting. */
  solUsdRate: Number(process.env.NEXT_PUBLIC_SOL_USD_RATE ?? "150"),

  /** Optional server keypair for on-chain memo anchoring. */
  anchorSecretKey: process.env.AIDBLINK_ANCHOR_SECRET_KEY ?? "",

  /** Voucher lifetime in days. */
  voucherTtlDays: Number(process.env.AIDBLINK_VOUCHER_TTL_DAYS ?? "30"),
} as const;

export const isTreasuryConfigured = env.treasuryAddress.length >= 32;
