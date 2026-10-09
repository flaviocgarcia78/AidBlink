import { fail, json } from "@/lib/api";
import { summarize } from "@/lib/aid";
import { env } from "@/lib/env";
import { isAnchoringEnabled, isAnchorFunded, getTreasuryLamports, LAMPORTS_PER_SOL } from "@/lib/solana";
import { snapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Treasury ledger: recorded funds, budget allocation and live on-chain balance. */
export async function GET() {
  try {
    const data = await snapshot();
    const summary = summarize(data);
    const [onchainLamports, anchorFunded] = await Promise.all([
      getTreasuryLamports(),
      isAnchorFunded(),
    ]);

    return json({
      network: env.network,
      treasury: env.treasuryAddress,
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
