import Link from "next/link";
import { IconGlobe, IconLock, IconShield } from "@/components/icons";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white/70">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/aidblink-icon.svg"
                alt=""
                className="h-8 w-8 rounded-lg"
              />
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                Aid<span className="text-emerald-600">Blink</span>
              </span>
            </div>
            <p className="mt-3 max-w-md text-sm text-slate-500">
              Emergency aid in a single link. Contributions are transparent on
              Solana; benefits are delivered as one-time vouchers by
              organizations.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Flow
            </p>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/contribute" className="hover:text-slate-900">
                  Contribute
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-slate-900">
                  Organization dashboard
                </Link>
              </li>
              <li>
                <Link href="/redeem" className="hover:text-slate-900">
                  Partner terminal
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Trust
            </p>
            <ul className="mt-3 space-y-2.5 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <IconShield className="text-emerald-600" />
                No PII on-chain
              </li>
              <li className="flex items-center gap-2">
                <IconLock className="text-emerald-600" />
                Signed, one-time vouchers
              </li>
              <li className="flex items-center gap-2">
                <IconGlobe className="text-emerald-600" />
                Built on Solana Blinks
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Hackathon prototype. Contributions are real Solana Devnet
            transactions; benefits and partners are simulated.
          </p>
          <p>Not a financial product · Vouchers have no monetary value</p>
        </div>
      </div>
    </footer>
  );
}
