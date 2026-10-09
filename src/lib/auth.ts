import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "./api";

/**
 * Demo authentication.
 *
 * For the hackathon we deliberately avoid a user database: two example
 * accounts (organization and partner) are configured through environment
 * variables with safe demo defaults. A signed, HttpOnly cookie carries the
 * session. This is a demo gate, not production-grade authN — swap it for a real
 * identity provider before shipping.
 */

export type Role = "org" | "partner";

export interface Session {
  role: Role;
  user: string;
  /** Expiry, epoch milliseconds. */
  exp: number;
}

export const SESSION_COOKIE = "aidblink_session";
export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export function isRole(value: unknown): value is Role {
  return value === "org" || value === "partner";
}

function authSecret(): string {
  return (
    process.env.AIDBLINK_AUTH_SECRET ||
    process.env.AIDBLINK_VOUCHER_SECRET ||
    "aidblink-dev-secret-do-not-use-in-production"
  );
}

export interface DemoAccount {
  role: Role;
  label: string;
  user: string;
  password: string;
  home: string;
}

export function accountFor(role: Role): DemoAccount {
  if (role === "org") {
    return {
      role,
      label: "Organization",
      user: process.env.AIDBLINK_ORG_USER || "org@aidblink.demo",
      password: process.env.AIDBLINK_ORG_PASSWORD || "aidblink-org",
      home: "/admin",
    };
  }
  return {
    role,
    label: "Partner",
    user: process.env.AIDBLINK_PARTNER_USER || "parceiro@aidblink.demo",
    password: process.env.AIDBLINK_PARTNER_PASSWORD || "aidblink-parceiro",
    home: "/redeem",
  };
}

/** Demo convenience: show the prefilled credentials on the login page. */
export function demoHintsEnabled(): boolean {
  return (process.env.AIDBLINK_DEMO_HINTS ?? "1") !== "0";
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Verify credentials and return a fresh session, or null. */
export function authenticate(
  role: Role,
  user: string,
  password: string,
): Session | null {
  const account = accountFor(role);
  const userOk = safeEqual(user.trim().toLowerCase(), account.user.toLowerCase());
  const passOk = safeEqual(password, account.password);
  if (!userOk || !passOk) return null;
  return { role, user: account.user, exp: Date.now() + SESSION_TTL_MS };
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, "base64");
}

function hmac(data: string): Buffer {
  return createHmac("sha256", authSecret()).update(data).digest();
}

export function serializeSession(session: Session): string {
  const body = b64url(JSON.stringify(session));
  return `${body}.${b64url(hmac(body))}`;
}

export function parseSession(raw: string | undefined): Session | null {
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  let expected: Buffer;
  try {
    expected = hmac(body);
  } catch {
    return null;
  }
  const provided = fromB64url(sig);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    const session = JSON.parse(fromB64url(body).toString("utf8")) as Session;
    if (!isRole(session.role)) return null;
    if (typeof session.exp !== "number" || session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Read the current session from the request cookies (server-side only). */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return parseSession(jar.get(SESSION_COOKIE)?.value);
}

/** Cookie attributes. `secure` is enabled only when the app URL is HTTPS. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://"),
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

/** Require a role in an API route, throwing an HTTP-friendly error otherwise. */
export async function requireRole(role: Role): Promise<Session> {
  const session = await getSession();
  if (!session) throw new ApiError("Authentication required", 401);
  if (session.role !== role) {
    throw new ApiError("You do not have access to this action", 403);
  }
  return session;
}
