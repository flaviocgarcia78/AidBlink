/**
 * AidBlink domain types.
 *
 * Privacy note: beneficiary data is referenced by a pseudonymous code only.
 * No personally identifiable information is ever written to Solana or embedded
 * in a voucher token.
 */

export type AidCategory = "food" | "transport";

export type RequestStatus = "pending" | "approved" | "rejected";

export type VoucherStatus = "issued" | "redeemed" | "expired";

export type DonationSource = "onchain" | "simulated";

/** A confirmed contribution recorded against the treasury. */
export interface Donation {
  id: string;
  /** On-chain transaction signature, or a `sim:` id for demo contributions. */
  signature: string;
  /** On-chain donation account (PDA) address, when read from the program. */
  address?: string;
  lamports: number;
  sol: number;
  /** USD value at the illustrative demo rate. */
  usd: number;
  /** Donor wallet address when available. */
  donor?: string;
  source: DonationSource;
  confirmedAt: string;
}

/** A request for essential aid. Contains no personal data. */
export interface AidRequest {
  id: string;
  /** Pseudonymous beneficiary code, e.g. `BEN-4821`. */
  beneficiaryRef: string;
  category: AidCategory;
  amountUsd: number;
  note?: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt?: string;
  voucherId?: string;
}

/** A one-time, category-scoped benefit voucher. */
export interface Voucher {
  id: string;
  requestId: string;
  beneficiaryRef: string;
  category: AidCategory;
  amountUsd: number;
  status: VoucherStatus;
  issuedAt: string;
  expiresAt: string;
  redeemedAt?: string;
  redeemedBy?: string;
  /** On-chain memo signature anchoring the redemption, when enabled. */
  anchorSignature?: string;
}

/** A successful voucher redemption at a partner. */
export interface Redemption {
  id: string;
  voucherId: string;
  merchant: string;
  category: AidCategory;
  amountUsd: number;
  at: string;
  anchorSignature?: string;
}

/** An unsuccessful redemption attempt, kept for the anti-reuse demo. */
export interface RedemptionAttempt {
  id: string;
  token: string;
  merchant: string;
  reason: string;
  at: string;
}

export interface AidRequestInput {
  beneficiaryRef: string;
  category: AidCategory;
  amountUsd: number;
  note?: string;
}

/** Aggregated treasury ledger used across the dashboard and API. */
export interface LedgerSummary {
  raisedSol: number;
  raisedUsd: number;
  allocatedUsd: number;
  redeemedUsd: number;
  availableUsd: number;
  donorCount: number;
  donationCount: number;
  pendingCount: number;
  approvedCount: number;
  voucherIssued: number;
  voucherRedeemed: number;
  byCategory: Record<AidCategory, { allocatedUsd: number; redeemedUsd: number }>;
}

export const CATEGORY_LABELS: Record<AidCategory, string> = {
  food: "Food assistance",
  transport: "Transport assistance",
};

export const CATEGORY_ICONS: Record<AidCategory, string> = {
  food: "🍲",
  transport: "🚌",
};
