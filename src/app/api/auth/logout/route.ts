import { cookies } from "next/headers";
import { fail, json } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Clear the session cookie. */
export async function POST() {
  try {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    return json({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
