import Link from "next/link";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type { AidCategory, RequestStatus, VoucherStatus } from "@/lib/types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/types";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* -------------------------------- Buttons ------------------------------- */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "dark"
  | "onDark";
export type ButtonSize = "sm" | "md" | "lg";

const BUTTON_BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800",
  secondary:
    "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  dark: "bg-slate-900 text-white shadow-sm hover:bg-slate-800",
  onDark:
    "border border-white/20 bg-white/10 text-white hover:bg-white/20 active:bg-white/25",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cx(BUTTON_BASE, BUTTON_VARIANTS[variant], BUTTON_SIZES[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return <button className={buttonClass({ variant, size, className })} {...props} />;
}

export function ButtonLink({
  href,
  variant,
  size,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link href={href} className={buttonClass({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}

/* --------------------------------- Inputs ------------------------------- */

export const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(inputClass, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(inputClass, "h-auto py-2.5", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(inputClass, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

/* --------------------------------- Cards -------------------------------- */

export function Card({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-200/80 bg-white shadow-card",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>
        {icon ? (
          <span className="text-lg text-emerald-600" aria-hidden>
            {icon}
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-bold leading-none tracking-tight text-slate-900 [font-variant-numeric:tabular-nums]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </Card>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cx("max-w-2xl", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-slate-600">{description}</p>
      ) : null}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        {eyebrow ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 ring-1 ring-inset ring-emerald-100">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

/* -------------------------------- Badges -------------------------------- */

type Tone = "green" | "amber" | "red" | "slate" | "blue" | "violet" | "dark";

const TONES: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  red: "bg-rose-50 text-rose-700 ring-rose-100",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  dark: "bg-slate-900 text-white ring-slate-900",
};

export function Badge({
  tone = "slate",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
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
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  const styles: Record<Tone, string> = {
    green: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    amber: "border-amber-200 bg-amber-50/80 text-amber-900",
    red: "border-rose-200 bg-rose-50/80 text-rose-900",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    blue: "border-sky-200 bg-sky-50/80 text-sky-900",
    violet: "border-violet-200 bg-violet-50/80 text-violet-900",
    dark: "border-slate-800 bg-slate-900 text-slate-100",
  };
  return (
    <div
      className={cx(
        "rounded-xl border px-4 py-3 text-sm leading-relaxed",
        styles[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------ Decor QR -------------------------------- */

/** Deterministic, decorative QR-like mark. Not a scannable code. */
export function DecorQr({ className = "" }: { className?: string }) {
  const n = 21;
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const inFinder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);

  const cells: Array<[number, number]> = [];
  for (let y = 0; y < n; y += 1) {
    for (let x = 0; x < n; x += 1) {
      if (inFinder(x, y)) continue;
      if (rnd() > 0.56) cells.push([x, y]);
    }
  }

  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.8" fill="currentColor" />
    </g>
  );

  return (
    <svg viewBox={`0 0 ${n} ${n}`} className={className} aria-hidden="true">
      <g fill="currentColor">
        {cells.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x + 0.25} y={y + 0.25} width="0.9" height="0.9" rx="0.2" />
        ))}
      </g>
      <g color="currentColor">
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
      </g>
    </svg>
  );
}
