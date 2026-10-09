"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import WalletButton from "@/components/wallet/WalletButton";
import { cx } from "@/components/ui";
import { env } from "@/lib/env";

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
