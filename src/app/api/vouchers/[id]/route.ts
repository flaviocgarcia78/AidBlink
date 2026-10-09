import QRCode from "qrcode";
import { ApiError, fail, json } from "@/lib/api";
import { effectiveStatus } from "@/lib/aid";
import { env } from "@/lib/env";
import { snapshot } from "@/lib/store";
import { buildTokenFromVoucher, shortCode } from "@/lib/voucher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Voucher detail including the signed token, a QR code that opens the partner
 * redemption page, and the redeem URL itself.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await snapshot();
    const voucher = data.vouchers.find((v) => v.id === id);
    if (!voucher) throw new ApiError(`Voucher ${id} not found`, 404);

    const token = buildTokenFromVoucher(voucher);
    const redeemUrl = `${env.appUrl}/redeem?token=${encodeURIComponent(token)}`;
    const qrDataUrl = await QRCode.toDataURL(redeemUrl, {
      width: 320,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    });

    return json({
      voucher: { ...voucher, status: effectiveStatus(voucher) },
      token,
      code: shortCode(voucher.id),
      redeemUrl,
      qrDataUrl,
    });
  } catch (error) {
    return fail(error);
  }
}
