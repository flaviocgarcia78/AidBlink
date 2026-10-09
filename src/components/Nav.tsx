"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import WalletButton from "@/components/wallet/WalletButton";
import { cx } from "@/components/ui";
import { env } from "@/lib/env";

interface SessionInfo {
  role: "org" | "partner";
  user: string;
}

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/contribute", label: "Contribute" },
  { href: "/admin", label: "Org dashboard" },
  { href: "/redeem", label: "Partner" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { session: null }))
      .then((data: { session: SessionInfo | null }) => {
        if (active) setSession(data.session ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pathname]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setSession(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-3 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/aidblink-icon.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="flex flex-col leading-none">
            <span className="text-[17px] font-extrabold tracking-tight text-slate-900">
              Aid<span className="text-emerald-600">Blink</span>
            </span>
            <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {env.network}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200/70 bg-white/60 p-1 md:flex">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cx(
                  "rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <span className="hidden flex-col items-end leading-tight sm:flex">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {session.role === "org" ? "Organization" : "Partner"}
                </span>
                <span className="mono text-xs text-slate-600">{session.user}</span>
              </span>
              <button
                type="button"
                onClick={signOut}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Sign in
            </Link>
          )}
          <WalletButton />
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 px-3 py-2 md:hidden">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cx(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
