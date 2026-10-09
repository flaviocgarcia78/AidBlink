import { NextRequest } from "next/server";
import { approveRequest, rejectRequest, summarize } from "@/lib/aid";
import { fail, json } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { env } from "@/lib/env";
import { fetchOnchainDonations } from "@/lib/program";
import { getConnection, LAMPORTS_PER_SOL } from "@/lib/solana";
import { snapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Decide a pending request.
 * Body: { decision?: "approve" | "reject" } — defaults to "approve".
 * Approving issues a one-time voucher and is blocked when it would exceed the
 * on-chain treasury budget, keeping the ledger coherent.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole("org");
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      decision?: "approve" | "reject";
    };

    if (body.decision === "reject") {
      const request = await rejectRequest(id);
      return json({ request });
    }

    const data = await snapshot();
    const donations = await fetchOnchainDonations(getConnection())
      .then((rows) =>
        rows.map((d) => {
          const sol = d.lamports / LAMPORTS_PER_SOL;
          return {
            sol,
            usd: sol * env.solUsdRate,
            donor: d.donor,
            signature: d.address,
          };
        }),
      )
      .catch(() => []);
    const { availableUsd } = summarize({ ...data, donations });

    const { request, voucher } = await approveRequest(id, { availableUsd });
    return json({ request, voucher }, 201);
  } catch (error) {
    return fail(error);
  }
}
