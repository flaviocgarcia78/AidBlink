import { NextRequest } from "next/server";
import { ApiError, fail, json } from "@/lib/api";
import { round2, solToUsd } from "@/lib/money";
import {
  confirmDonationTransaction,
  fetchOnchainDonations,
} from "@/lib/program";
import { getConnection, LAMPORTS_PER_SOL } from "@/lib/solana";
import { snapshot, update } from "@/lib/store";
import type { Donation } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Contributions.
 *
 * The source of truth is the AidBlink program on Solana: every contribution is
 * a `Donation` account, so GET reads them straight from the chain. Demo entries
 * (`simulated`) stay in the local JSON store and are clearly labelled.
 */
export async function GET() {
  try {
    const data = await snapshot();
    const simulated = data.donations.filter((d) => d.source === "simulated");

    let onchain: Donation[] = [];
    try {
      const rows = await fetchOnchainDonations(getConnection());
      onchain = rows.map((d): Donation => {
        const sol = d.lamports / LAMPORTS_PER_SOL;
        return {
          id: `DON-${d.index}`,
          signature: d.signature ?? d.address,
          address: d.address,
          lamports: d.lamports,
          sol: round2(sol * 1e6) / 1e6,
          usd: solToUsd(sol),
          donor: d.donor,
          source: "onchain",
          confirmedAt: new Date(d.timestamp * 1000).toISOString(),
        };
      });
    } catch (error) {
      // Never fail the page because the RPC hiccuped; fall back to demo data.
      console.error("Could not read on-chain donations:", error);
    }

    const donations = [...onchain, ...simulated].sort(
      (a, b) => Date.parse(b.confirmedAt) - Date.parse(a.confirmedAt),
    );

    return json({ donations, onchainCount: onchain.length });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Record a simulated contribution (demo, clearly labelled) or verify that a
 * real contribution landed on-chain. On-chain data is not copied into the
 * store: it is always read back from Solana.
 *
 * - `{ simulated: true, sol }`   records a demo contribution
 * - `{ signature }`              verifies the on-chain transaction
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

    const verified = await confirmDonationTransaction(
      getConnection(),
      signature,
    );
    if (!verified) {
      throw new ApiError(
        "Could not verify this contribution on-chain yet. Wait a few seconds and retry.",
        422,
      );
    }

    return json({ signature, verified: true });
  } catch (error) {
    return fail(error);
  }
}
