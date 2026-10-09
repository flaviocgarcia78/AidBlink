import { fail, json } from "@/lib/api";
import { effectiveStatus } from "@/lib/aid";
import { snapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** List issued vouchers with their effective status. */
export async function GET() {
  try {
    const data = await snapshot();
    const vouchers = [...data.vouchers]
      .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt))
      .map((v) => ({ ...v, status: effectiveStatus(v) }));
    return json({ vouchers });
  } catch (error) {
    return fail(error);
  }
}
