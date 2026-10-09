import { NextRequest } from "next/server";
import { redeemVoucher } from "@/lib/aid";
import { ApiError, fail, json } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redeem a voucher. Single-use is enforced server-side.
 * Body: { token: string, merchant?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      merchant?: string;
    };

    if (typeof body.token !== "string" || body.token.length === 0) {
      throw new ApiError("Missing voucher token", 400);
    }

    const merchant = (body.merchant ?? "").trim() || "Partner terminal";
    const redemption = await redeemVoucher(body.token, merchant);

    return json({ ok: true, redemption });
  } catch (error) {
    return fail(error);
  }
}
