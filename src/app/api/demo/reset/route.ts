import { fail, json } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { resetStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reset the demo back to its seed.
 *
 * Organization role only: it wipes requests, vouchers, redemptions and the
 * recorded attempts. On-chain contributions are untouched (they live on the
 * program and are re-read on every request).
 */
export async function POST() {
  try {
    await requireRole("org");
    const data = await resetStore();
    return json({
      ok: true,
      requests: data.requests.length,
      vouchers: data.vouchers.length,
      donations: data.donations.length,
    });
  } catch (error) {
    return fail(error);
  }
}
