import { ApiError } from "./api";
import { env } from "./env";
import { round2 } from "./money";
import { anchorMemo, isAnchoringEnabled } from "./solana";
import { nextVoucherId, update } from "./store";
import type {
  AidCategory,
  AidRequest,
  LedgerSummary,
  Redemption,
  Voucher,
  VoucherStatus,
} from "./types";
import { tokenIsExpired, verifyToken } from "./voucher";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Vouchers past their expiry date are reported as expired on read. */
export function effectiveStatus(voucher: Voucher): VoucherStatus {
  if (voucher.status === "issued" && new Date(voucher.expiresAt).getTime() < Date.now()) {
    return "expired";
  }
  return voucher.status;
}

export interface ApprovalResult {
  request: AidRequest;
  voucher: Voucher;
}

/** Approve a pending request and issue the matching one-time voucher. */
export async function approveRequest(requestId: string): Promise<ApprovalResult> {
  return update((data) => {
    const request = data.requests.find((r) => r.id === requestId);
    if (!request) throw new ApiError(`Request ${requestId} not found`, 404);
    if (request.status !== "pending") {
      throw new ApiError(`Request ${requestId} is already ${request.status}`, 409);
    }

    const now = new Date();
    const expires = new Date(now.getTime() + env.voucherTtlDays * DAY_MS);
    const voucher: Voucher = {
      id: nextVoucherId(data),
      requestId: request.id,
      beneficiaryRef: request.beneficiaryRef,
      category: request.category,
      amountUsd: request.amountUsd,
      status: "issued",
      issuedAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    data.vouchers.push(voucher);
    request.status = "approved";
    request.decidedAt = now.toISOString();
    request.voucherId = voucher.id;

    return { request, voucher };
  });
}

export async function rejectRequest(requestId: string): Promise<AidRequest> {
  return update((data) => {
    const request = data.requests.find((r) => r.id === requestId);
    if (!request) throw new ApiError(`Request ${requestId} not found`, 404);
    if (request.status !== "pending") {
      throw new ApiError(`Request ${requestId} is already ${request.status}`, 409);
    }
    request.status = "rejected";
    request.decidedAt = new Date().toISOString();
    return request;
  });
}

/**
 * Redeem a voucher exactly once.
 *
 * The single-use guarantee comes from the atomic status transition performed
 * inside `update` (serialized read-modify-write), not from the QR code itself.
 * A second attempt with the same token is rejected and logged.
 */
export async function redeemVoucher(
  token: string,
  merchant: string,
): Promise<Redemption> {
  const payload = verifyToken(token);
  if (!payload) {
    await logAttempt(token, merchant, "Invalid or tampered token");
    throw new ApiError("Invalid or tampered voucher token", 400);
  }

  if (tokenIsExpired(payload)) {
    await logAttempt(token, merchant, "Voucher expired");
    throw new ApiError("This voucher has expired", 410);
  }

  const redemption = await update((data) => {
    const voucher = data.vouchers.find((v) => v.id === payload.id);
    if (!voucher) {
      data.attempts.push(attemptRecord(token, merchant, "Unknown voucher"));
      throw new ApiError("Voucher not found", 404);
    }
    if (voucher.status === "redeemed") {
      data.attempts.push(
        attemptRecord(token, merchant, `Already redeemed at ${voucher.redeemedBy ?? "another partner"}`),
      );
      throw new ApiError(
        "Voucher already redeemed — this benefit can only be used once",
        409,
      );
    }
    if (effectiveStatus(voucher) === "expired") {
      data.attempts.push(attemptRecord(token, merchant, "Voucher expired"));
      throw new ApiError("Voucher expired", 410);
    }

    const at = new Date().toISOString();
    voucher.status = "redeemed";
    voucher.redeemedAt = at;
    voucher.redeemedBy = merchant;

    const record: Redemption = {
      id: `RED-${voucher.id}`,
      voucherId: voucher.id,
      merchant,
      category: voucher.category,
      amountUsd: voucher.amountUsd,
      at,
    };
    data.redemptions.push(record);
    return record;
  });

  // Best-effort transparency anchor. Never blocks the redemption.
  if (isAnchoringEnabled()) {
    const signature = await anchorMemo(
      [
        "AidBlink",
        "redeem",
        redemption.voucherId,
        redemption.category,
        redemption.amountUsd.toFixed(2),
        merchant,
        redemption.at,
      ].join("|"),
    );
    if (signature) {
      redemption.anchorSignature = signature;
      await update((data) => {
        const voucher = data.vouchers.find((v) => v.id === redemption.voucherId);
        if (voucher) voucher.anchorSignature = signature;
      }).catch(() => undefined);
    }
  }

  return redemption;
}

async function logAttempt(token: string, merchant: string, reason: string) {
  await update((data) => {
    data.attempts.push(attemptRecord(token, merchant, reason));
  }).catch(() => undefined);
}

function attemptRecord(token: string, merchant: string, reason: string) {
  return {
    id: `ATT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    token: token.slice(0, 24),
    merchant,
    reason,
    at: new Date().toISOString(),
  };
}

/* ------------------------------- summaries ------------------------------ */

export function summarize(data: {
  donations: { sol: number; usd: number; donor?: string; signature: string }[];
  requests: { status: string }[];
  vouchers: Voucher[];
  redemptions: Redemption[];
}): LedgerSummary {
  const raisedSol = data.donations.reduce((sum, d) => sum + d.sol, 0);
  const raisedUsd = data.donations.reduce((sum, d) => sum + d.usd, 0);

  const vouchers = data.vouchers;
  const allocatedUsd = vouchers.reduce((sum, v) => sum + v.amountUsd, 0);
  const redeemedUsd = data.redemptions.reduce((sum, r) => sum + r.amountUsd, 0);

  const donors = new Set(
    data.donations.map((d) => d.donor).filter((d): d is string => Boolean(d)),
  );

  const byCategory: LedgerSummary["byCategory"] = {
    food: { allocatedUsd: 0, redeemedUsd: 0 },
    transport: { allocatedUsd: 0, redeemedUsd: 0 },
  };
  for (const voucher of vouchers) {
    byCategory[voucher.category].allocatedUsd += voucher.amountUsd;
  }
  for (const redemption of data.redemptions) {
    byCategory[redemption.category].redeemedUsd += redemption.amountUsd;
  }
  byCategory.food.allocatedUsd = round2(byCategory.food.allocatedUsd);
  byCategory.food.redeemedUsd = round2(byCategory.food.redeemedUsd);
  byCategory.transport.allocatedUsd = round2(byCategory.transport.allocatedUsd);
  byCategory.transport.redeemedUsd = round2(byCategory.transport.redeemedUsd);

  return {
    raisedSol: round2(raisedSol * 1e6) / 1e6,
    raisedUsd: round2(raisedUsd),
    allocatedUsd: round2(allocatedUsd),
    redeemedUsd: round2(redeemedUsd),
    availableUsd: round2(raisedUsd - allocatedUsd),
    donorCount: donors.size,
    donationCount: data.donations.length,
    pendingCount: data.requests.filter((r) => r.status === "pending").length,
    approvedCount: data.requests.filter((r) => r.status === "approved").length,
    voucherIssued: vouchers.length,
    voucherRedeemed: vouchers.filter((v) => v.status === "redeemed").length,
    byCategory,
  };
}
