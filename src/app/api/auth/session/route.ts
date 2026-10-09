import { fail, json } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Return the current session (or null) for the navigation bar. */
export async function GET() {
  try {
    const session = await getSession();
    return json({
      session: session
        ? { role: session.role, user: session.user }
        : null,
    });
  } catch (error) {
    return fail(error);
  }
}
