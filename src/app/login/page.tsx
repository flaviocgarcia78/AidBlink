import { redirect } from "next/navigation";
import { accountFor, demoHintsEnabled, getSession } from "@/lib/auth";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

/**
 * Demo sign-in page. Organizations use it to reach `/admin`; partners use it to
 * reach the `/redeem` terminal. Contributors never need an account.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; denied?: string; role?: string }>;
}) {
  const params = await searchParams;
  const session = await getSession();

  const rawNext = typeof params.next === "string" ? params.next : "";
  // Only allow internal, single-slash paths (avoid open redirects).
  const next = /^\/[^/]/.test(rawNext) ? rawNext : "";

  // Which role does `next` require?
  const requiredRole: "org" | "partner" | null =
    next === "/admin" || next.startsWith("/admin/")
      ? "org"
      : next === "/redeem" || next.startsWith("/redeem/")
        ? "partner"
        : null;

  if (session) {
    // Honour `next` only when the signed-in role can open it; otherwise go to
    // the role's own home. This prevents a redirect loop when a signed-in user
    // opens the other role's page.
    if (!requiredRole || session.role === requiredRole) {
      redirect(next || accountFor(session.role).home);
    }
    redirect(accountFor(session.role).home);
  }

  const initialRole = params.role === "partner" ? "partner" : "org";
  const hints = demoHintsEnabled()
    ? {
        org: {
          user: accountFor("org").user,
          password: accountFor("org").password,
        },
        partner: {
          user: accountFor("partner").user,
          password: accountFor("partner").password,
        },
      }
    : null;

  return (
    <LoginClient
      next={next}
      denied={params.denied === "1"}
      initialRole={initialRole}
      hints={hints}
    />
  );
}
