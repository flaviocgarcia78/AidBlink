import { fail, json } from "@/lib/api";
import { summarize } from "@/lib/aid";
import { env } from "@/lib/env";
import { fetchOnchainDonations } from "@/lib/program";
import {
  getConnection,
  isAnchoringEnabled,
  isAnchorFunded,
  getTreasuryLamports,
  LAMPORTS_PER_SOL,
} from "@/lib/solana";
import { snapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Treasury ledger: on-chain contributions recorded by the AidBlink program,
 * budget allocation and live treasury balance.
 */
export async function GET() {
  try {
    const data = await snapshot();

    // Contributions live on-chain; their totals feed the ledger.
    const donations = await fetchOnchainDonations(getConnection()).then((rows) =>
      rows.map((d) => {
        const sol = d.lamports / LAMPORTS_PER_SOL;
        return { sol, usd: sol * env.solUsdRate, donor: d.donor, signature: d.address };
      }),
    ).catch(() => []);

    const summary = summarize({ ...data, donations });

    const [onchainLamports, anchorFunded] = await Promise.all([
      getTreasuryLamports(),
      isAnchorFunded(),
    ]);

    return json({
      network: env.network,
      treasury: env.treasuryAddress,
      program: env.programId,
      solUsdRate: env.solUsdRate,
      anchoringEnabled: isAnchoringEnabled() && anchorFunded,
      onchainBalanceSol:
        onchainLamports === null
          ? null
          : (onchainLamports / LAMPORTS_PER_SOL).toFixed(4),
      onchainBalanceLamports: onchainLamports,
      summary,
    });
  } catch (error) {
    return fail(error);
  }
}
