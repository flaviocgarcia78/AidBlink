import { NextRequest } from "next/server";
import { approveRequest, rejectRequest } from "@/lib/aid";
import { fail, json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Decide a pending request.
 * Body: { decision?: "approve" | "reject" } — defaults to "approve".
 * Approving issues a one-time voucher.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as {
      decision?: "approve" | "reject";
    };

    if (body.decision === "reject") {
      const request = await rejectRequest(id);
      return json({ request });
    }

    const { request, voucher } = await approveRequest(id);
    return json({ request, voucher }, 201);
  } catch (error) {
    return fail(error);
  }
}
