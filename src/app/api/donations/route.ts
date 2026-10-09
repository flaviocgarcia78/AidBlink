import { NextRequest } from "next/server";
import { ApiError, fail, json } from "@/lib/api";
import { round2, solToUsd } from "@/lib/money";
import { parseDonation, LAMPORTS_PER_SOL } from "@/lib/solana";
import { snapshot, update } from "@/lib/store";
import type { Donation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List recorded contributions, newest first. */
export async function GET() {
  try {
    const data = await snapshot();
    const donations = [...data.donations].sort(
      (a, b) => Date.parse(b.confirmedAt) - Date.parse(a.confirmedAt),
    );
    return json({ donations });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Record a contribution.
 *
 * - `{ signature }`              verifies a real on-chain transfer to the treasury
 * - `{ simulated: true, sol }`   records a demo contribution (clearly labelled)
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      signature?: string;
      simulated?: boolean;
      sol?: number;
      donor?: string;
    };

    if (body.simulated || (body.signature && body.signature.startsWith("sim:"))) {
      const sol = Number(body.sol ?? 0.1);
      if (!Number.isFinite(sol) || sol <= 0 || sol > 1000) {
        throw new ApiError("Invalid simulated amount", 400);
      }
      const donation: Donation = {
        id: `DON-${Date.now().toString(36)}`,
        signature: `sim:${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
        lamports: Math.round(sol * LAMPORTS_PER_SOL),
        sol: round2(sol * 1e6) / 1e6,
        usd: solToUsd(sol),
        donor: body.donor ?? "simulated-donor",
        source: "simulated",
        confirmedAt: new Date().toISOString(),
      };
      await update((data) => {
        data.donations.push(donation);
      });
      return json({ donation, verified: false }, 201);
    }

    const signature = body.signature;
    if (!signature) {
      throw new ApiError('Provide a transaction "signature" or set simulated', 400);
    }

    const data = await snapshot();
    const existing = data.donations.find((d) => d.signature === signature);
    if (existing) {
      return json({ donation: existing, duplicate: true });
    }

    const parsed = await parseDonation(signature);
    if (!parsed) {
      throw new ApiError(
        "Could not verify this transaction on-chain yet. Wait a few seconds and retry.",
        422,
      );
    }

    const sol = parsed.lamports / LAMPORTS_PER_SOL;
    const donation: Donation = {
      id: `DON-${signature.slice(0, 8)}`,
      signature,
      lamports: parsed.lamports,
      sol: round2(sol * 1e6) / 1e6,
      usd: solToUsd(sol),
      donor: parsed.donor,
      source: "onchain",
      confirmedAt: new Date().toISOString(),
    };

    await update((store) => {
      store.donations.push(donation);
    });

    return json({ donation, verified: true }, 201);
  } catch (error) {
    return fail(error);
  }
}
