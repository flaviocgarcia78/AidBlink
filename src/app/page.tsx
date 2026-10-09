import Link from "next/link";
import { Badge, Card, Notice } from "@/components/ui";
import { env } from "@/lib/env";

const STEPS = [
  {
    n: "1",
    title: "Contribute",
    body: "A supporter opens the link (a Solana Blink) and sends a small amount of SOL. The transaction is real, on Devnet.",
    icon: "🤝",
    href: "/contribute",
  },
  {
    n: "2",
    title: "Administer",
    body: "An organization sees the available pool, records pseudonymous requests and approves a food or transport benefit.",
    icon: "⚖️",
    href: "/admin",
  },
  {
    n: "3",
    title: "Deliver",
    body: "The person receives a one-time voucher with a QR code. A partner verifies and redeems it — only once.",
    icon: "🎫",
    href: "/redeem",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Badge tone="green">Solana Blinks · Devnet demo</Badge>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
            Emergency aid in a{" "}
            <span className="text-emerald-600">single link</span>.
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-600">
            A person needs help with an essential need — a meal or a bus fare.
            Supporters contribute through a shareable Blink. Funds become
            transparent, one-time vouchers delivered by an organization. No
            wallet, no crypto knowledge required on the receiving side.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/contribute"
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              Contribute SOL
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Organization dashboard
            </Link>
            <Link
              href="/redeem"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Partner redeem simulator
            </Link>
          </div>
        </div>

        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            What is real in this demo
          </p>
          <ul className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="flex gap-3">
              <span className="text-emerald-600">✅</span>
              <span>
                Contributions: real SOL transfers on{" "}
                <strong>{env.network}</strong>, verifiable on-chain.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-600">✅</span>
              <span>
                One-time redemption: enforced atomically on the server; a second
                scan is rejected.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-600">✅</span>
              <span>
                Privacy: beneficiaries are pseudonymous references, never
                personal data on-chain.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-amber-500">🧪</span>
              <span>
                Benefit values in USD and partner redemption are illustrative.
              </span>
            </li>
          </ul>
        </Card>
      </section>

      {/* Problem */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 md:col-span-1">
          <h2 className="text-xl font-bold text-slate-900">The problem</h2>
          <p className="mt-3 text-sm text-slate-600">
            People in vulnerability often need a small, immediate help — one
            meal, one ride to a clinic. Donations get lost in the distance
            between the donor and the person helped, and people in need are
            rarely able to handle wallets or crypto.
          </p>
        </Card>
        <Card className="p-6 md:col-span-1">
          <h2 className="text-xl font-bold text-slate-900">Our approach</h2>
          <p className="mt-3 text-sm text-slate-600">
            Keep the crypto exactly where it helps: funding, transparency and
            auditability. Keep the human flow simple: a link for supporters, a
            dashboard for organizations, and a QR voucher for the person
            receiving help.
          </p>
        </Card>
        <Card className="p-6 md:col-span-1">
          <h2 className="text-xl font-bold text-slate-900">The result</h2>
          <p className="mt-3 text-sm text-slate-600">
            A contribution is traceable from the chain to a delivered, one-time
            benefit — without forcing anyone to create a wallet, buy SOL or
            understand transaction fees.
          </p>
        </Card>
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900">
          Three steps, one flow
        </h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <Link key={step.n} href={step.href} className="group">
              <Card className="h-full p-6 transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {step.n}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm text-slate-600">{step.body}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-emerald-600">
                  Open →
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Real vs simulated */}
      <section>
        <h2 className="text-2xl font-bold text-slate-900">
          What is real, what is simulated
        </h2>
        <Card className="mt-5 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Layer</th>
                <th className="px-4 py-3 font-semibold">Real (Devnet)</th>
                <th className="px-4 py-3 font-semibold">Simulated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">
                  Contribute (Blink)
                </td>
                <td className="px-4 py-3 text-slate-600">SOL transfer</td>
                <td className="px-4 py-3 text-slate-600">
                  USD value at a fixed demo rate
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">
                  Administer
                </td>
                <td className="px-4 py-3 text-slate-600">
                  Balance read from the chain
                </td>
                <td className="px-4 py-3 text-slate-600">
                  Requests and beneficiary codes
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 font-medium text-slate-700">
                  Deliver (voucher)
                </td>
                <td className="px-4 py-3 text-slate-600">
                  One-time rule + on-chain anchor (optional)
                </td>
                <td className="px-4 py-3 text-slate-600">
                  Partner and redemption
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
        <div className="mt-5">
          <Notice tone="amber">
            This is a hackathon prototype. Vouchers are not real benefits and
            cannot be exchanged for goods or services.
          </Notice>
        </div>
      </section>
    </div>
  );
}
