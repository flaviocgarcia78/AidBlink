import type { AidCategory, RequestStatus, VoucherStatus } from "@/lib/types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/types";

type Tone = "green" | "amber" | "red" | "slate" | "blue" | "violet";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  tone = "slate",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

const REQUEST_TONES: Record<RequestStatus, Tone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

const VOUCHER_TONES: Record<VoucherStatus, Tone> = {
  issued: "blue",
  redeemed: "green",
  expired: "slate",
};

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return <Badge tone={REQUEST_TONES[status]}>{status}</Badge>;
}

export function VoucherStatusBadge({ status }: { status: VoucherStatus }) {
  return <Badge tone={VOUCHER_TONES[status]}>{status}</Badge>;
}

export function CategoryPill({ category }: { category: AidCategory }) {
  return (
    <Badge tone={category === "food" ? "violet" : "blue"}>
      <span aria-hidden>{CATEGORY_ICONS[category]}</span>
      {CATEGORY_LABELS[category]}
    </Badge>
  );
}

export function Notice({
  tone = "amber",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  const styles: Record<Tone, string> = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-rose-200 bg-rose-50 text-rose-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-sky-200 bg-sky-50 text-sky-800",
    violet: "border-violet-200 bg-violet-50 text-violet-800",
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`}>
      {children}
    </div>
  );
}
