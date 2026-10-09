import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildActionGetResponse } from "@/lib/actions";
import { ApiError, fail, json, withActionsHeaders } from "@/lib/api";
import { buildContributionTransaction, LAMPORTS_PER_SOL } from "@/lib/solana";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Solana Action (Blink) for contributions.
 *
 * GET  /api/actions/donate        -> action metadata
 * POST /api/actions/donate?amount -> unsigned transaction for the wallet
 *
 * A Blink-aware client (e.g. a wallet or https://dial.to) performs the POST and
 * asks the user to sign. The same document powers the in-app /contribute page.
 */

export async function GET() {
  return withActionsHeaders(json(buildActionGetResponse()));
}

export async function OPTIONS() {
  return withActionsHeaders(new NextResponse(null, { status: 204 }));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      account?: string;
      amount?: number;
    };

    const account = body.account;
    if (typeof account !== "string" || account.length === 0) {
      throw new ApiError('Missing "account" in request body', 400);
    }

    let donor: PublicKey;
    try {
      donor = new PublicKey(account);
    } catch {
      throw new ApiError('Invalid "account" public key', 400);
    }

    const amountParam = req.nextUrl.searchParams.get("amount");
    const amount = Number(amountParam ?? body.amount ?? 0.1);
    if (!Number.isFinite(amount) || amount < 0.001 || amount > 100) {
      throw new ApiError("Amount must be between 0.001 and 100 SOL", 400);
    }

    const lamports = Math.round(amount * LAMPORTS_PER_SOL);
    const built = await buildContributionTransaction(donor, lamports);

    return withActionsHeaders(
      json({
        type: "transaction",
        transaction: built.transaction,
        message: `Contribute ${amount} SOL to the AidBlink aid pool`,
      }),
    );
  } catch (error) {
    return withActionsHeaders(fail(error));
  }
}
