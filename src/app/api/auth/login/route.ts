import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { ApiError, fail, json } from "@/lib/api";
import {
  authenticate,
  isRole,
  SESSION_COOKIE,
  serializeSession,
  sessionCookieOptions,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Exchange demo credentials for a signed session cookie. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      role?: unknown;
      user?: unknown;
      password?: unknown;
    };

    if (!isRole(body.role)) {
      throw new ApiError("role must be 'org' or 'partner'", 400);
    }
    if (typeof body.user !== "string" || typeof body.password !== "string") {
      throw new ApiError("user and password are required", 400);
    }

    const session = authenticate(body.role, body.user, body.password);
    if (!session) {
      throw new ApiError("Invalid credentials", 401);
    }

    const jar = await cookies();
    jar.set(SESSION_COOKIE, serializeSession(session), sessionCookieOptions());

    return json({
      ok: true,
      session: { role: session.role, user: session.user },
    });
  } catch (error) {
    return fail(error);
  }
}
