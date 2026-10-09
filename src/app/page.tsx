import Link from "next/link";
import { Badge, ButtonLink, Card, DecorQr, Notice, SectionHeading } from "@/components/ui";
import {
  IconArrowRight,
  IconBolt,
  IconBuilding,
  IconCheck,
  IconCoins,
  IconHeart,
  IconLock,
  IconQr,
  IconShield,
  IconUsers,
  IconWallet,
} from "@/components/icons";
import { env } from "@/lib/env";

const HERO_POINTS = [
  { icon: <IconShield />, label: "Real Devnet transfers" },
  { icon: <IconLock />, label: "No PII on-chain" },
  { icon: <IconUsers />, label: "No wallet for the beneficiary" },
];

const PILLARS = [
  {
    icon: <IconHeart />,
    title: "The problem",
    body: "People in vulnerability often need a small, immediate help — one meal, one ride to a clinic. Donations get lost in the distance between the donor and the person helped.",
  },
  {
    icon: <IconShield />,
    title: "Our approach",
    body: "Keep crypto exactly where it helps: funding, transparency and auditability. Keep the human flow simple — a link to give, a dashboard to administer, a QR to receive.",
  },
  {
    icon: <IconCheck />,
    title: "The result",
    body: "A contribution is traceable from the chain to a delivered, one-time benefit — without forcing anyone to create a wallet, buy SOL or understand fees.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Contribute",
    body: "A supporter opens the Blink and sends a small amount of SOL. The transfer is real and verifiable on-chain.",
    icon: <IconWallet />,
    href: "/contribute",
  },
  {
    n: "02",
    title: "Administer",
    body: "An organization sees the pool, records pseudonymous requests and approves a food or transport benefit.",
    icon: <IconBuilding />,
    href: "/admin",
  },
  {
    n: "03",
    title: "Deliver",
    body: "The person receives a one-time voucher with a QR code. A partner verifies and redeems it — only once.",
    icon: <IconQr />,
    href: "/redeem",
  },
];

const PROOFS = [
  "HMAC-signed tokens a partner can trust offline",
  "Atomic issued → redeemed transition on the server",
  "A second scan is rejected and logged",
];

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* Hero */}
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <IconBolt className="text-emerald-600" />
            Solana Blinks · {env.network} demo
          </span>

          <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Emergency aid in a{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              single link
            </span>
            .
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
            Supporters contribute through a shareable Blink. Funds become
            transparent, one-time vouchers for food or transport, delivered by an
            organization. The person in need never touches a wallet.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/contribute" size="lg">
              Contribute SOL
              <IconArrowRight />
            </ButtonLink>
            <ButtonLink href="/admin" size="lg" variant="secondary">
              Organization dashboard
            </ButtonLink>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-slate-600">
            {HERO_POINTS.map((point) => (
              <li key={point.label} className="flex items-center gap-2">
                <span className="text-emerald-600">{point.icon}</span>
                {point.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Product preview */}
        <Card className="relative overflow-hidden p-6 shadow-card-hover">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-emerald-100/60 blur-2xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                Live aid pipeline
              </p>
              <Badge tone="green">on-chain</Badge>
            </div>

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-emerald-600 ring-1 ring-slate-200">
                  <IconWallet />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    0.10 SOL contributed
                  </p>
                  <p className="text-xs text-slate-500">Devnet · confirmed</p>
                </div>
                <IconCheck className="text-emerald-600" />
              </div>

              <div className="ml-4 h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-violet-600 ring-1 ring-slate-200">
                  <IconBuilding />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    Food assistance · $30
                  </p>
                  <p className="text-xs text-slate-500">Beneficiary BEN-4821</p>
                </div>
                <Badge tone="green">approved</Badge>
              </div>

              <div className="ml-4 h-4 w-px bg-slate-200" />

              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-white text-slate-900 ring-1 ring-emerald-200">
                  <DecorQr className="h-9 w-9" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    One-time voucher
                  </p>
                  <p className="text-xs text-emerald-700">
                    Redeem at a partner · then blocked
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-5 flex items-center gap-2 text-xs text-slate-500">
              <IconLock className="text-slate-400" />
              Signed voucher · single use enforced server-side
            </p>
          </div>
        </Card>
      </section>

      {/* Pillars */}
      <section className="grid gap-6 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title} className="p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
              <span className="text-xl">{pillar.icon}</span>
            </span>
            <h2 className="mt-4 text-lg font-bold text-slate-900">
              {pillar.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {pillar.body}
            </p>
          </Card>
        ))}
      </section>

      {/* Steps */}
      <section>
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, one continuous flow"
          description="Each step maps to a page in this demo. Click through to follow the money and the benefit."
        />
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <Link
              key={step.n}
              href={step.href}
              className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2"
            >
              <Card className="h-full p-6 transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-card-hover">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <span className="text-lg">{step.icon}</span>
                  </span>
                  <span className="text-sm font-bold text-slate-300">
                    {step.n}
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.body}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  Open
                  <IconArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* The insight */}
      <section>
        <Card className="overflow-hidden">
          <div className="grid gap-8 p-8 lg:grid-cols-[1fr_0.85fr] lg:p-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                <IconBolt />
                The differentiator
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                A donation on-chain is not aid delivered
              </h2>
              <p className="mt-3 text-slate-600">
                AidBlink does not confuse the two. It connects a contribution to
                a purpose and closes the loop with a voucher that can only be
                used once.
              </p>
              <ul className="mt-6 space-y-3">
                {PROOFS.map((proof) => (
                  <li key={proof} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <IconCheck className="h-3.5 w-3.5" />
                    </span>
                    {proof}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-slate-900 p-6 text-slate-100">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Redemption state machine
              </p>
              <div className="mono mt-4 space-y-2 text-[13px]">
                <p className="text-emerald-300">if status == &quot;issued&quot;:</p>
                <p className="pl-4 text-slate-300">
                  status = &quot;redeemed&quot;
                </p>
                <p className="pl-4 text-slate-300">record(voucher, partner)</p>
                <p className="text-rose-300">else:</p>
                <p className="pl-4 text-slate-400">
                  reject(&quot;already redeemed&quot;)
                </p>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-slate-400">
                The rule lives in server state, not in the QR image. Copying the
                code does not create a second benefit.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Real vs simulated */}
      <section>
        <SectionHeading
          eyebrow="Transparency"
          title="What is real, what is simulated"
          description="We are explicit about the boundary — it is a design decision, not a limitation."
        />
        <Card className="mt-6 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Layer</th>
                <th className="px-5 py-3.5 font-semibold">Real (Devnet)</th>
                <th className="px-5 py-3.5 font-semibold">Simulated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-medium text-slate-700">
                  Contribute (Blink)
                </td>
                <td className="px-5 py-4 text-slate-600">
                  SOL transfer, verifiable on-chain
                </td>
                <td className="px-5 py-4 text-slate-600">
                  USD value at a fixed demo rate
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-medium text-slate-700">
                  Administer
                </td>
                <td className="px-5 py-4 text-slate-600">
                  Treasury balance read from the chain
                </td>
                <td className="px-5 py-4 text-slate-600">
                  Requests and beneficiary codes
                </td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="px-5 py-4 font-medium text-slate-700">
                  Deliver (voucher)
                </td>
                <td className="px-5 py-4 text-slate-600">
                  One-time rule + optional on-chain anchor
                </td>
                <td className="px-5 py-4 text-slate-600">
                  Partner and redemption
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
        <div className="mt-5">
          <Notice tone="amber">
            <strong className="font-semibold">Prototype.</strong> Vouchers are not
            real benefits and cannot be exchanged for goods or services.
          </Notice>
        </div>
      </section>

      {/* CTA */}
      <section>
        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white sm:p-10">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                See the full flow in under three minutes
              </h2>
              <p className="mt-2 text-slate-300">
                Contribute, approve a need, deliver a voucher — and watch the
                second redemption get rejected.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/contribute" size="lg" variant="primary">
                <IconCoins />
                Start with a contribution
              </ButtonLink>
              <ButtonLink href="/redeem" size="lg" variant="onDark">
                Try the partner terminal
              </ButtonLink>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
