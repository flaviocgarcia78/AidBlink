import { fail, json } from "@/lib/api";
import { snapshot } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Redemption history plus rejected attempts (for the anti-reuse demo). */
export async function GET() {
  try {
    const data = await snapshot();
    const redemptions = [...data.redemptions].sort(
      (a, b) => Date.parse(b.at) - Date.parse(a.at),
    );
    const attempts = [...data.attempts]
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
      .slice(0, 20);
    return json({ redemptions, attempts });
  } catch (error) {
    return fail(error);
  }
}
