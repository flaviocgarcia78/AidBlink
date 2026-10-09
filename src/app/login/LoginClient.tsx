"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Card, cx, Field, Input, Notice, PageHeader } from "@/components/ui";
import { IconBuilding, IconScan } from "@/components/icons";
import { apiPost } from "@/lib/client";

type Role = "org" | "partner";

interface Hint {
  user: string;
  password: string;
}

export default function LoginClient({
  next,
  denied,
  initialRole,
  hints,
}: {
  next: string;
  denied: boolean;
  initialRole: Role;
  hints: { org: Hint; partner: Hint } | null;
}) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pick(nextRole: Role) {
    setRole(nextRole);
    if (hints) {
      setUser(hints[nextRole].user);
      setPassword(hints[nextRole].password);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/auth/login", { role, user, password });
      router.push(next || (role === "org" ? "/admin" : "/redeem"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        eyebrow="Demo sign in"
        title="Sign in"
        description="The organization dashboard and the partner terminal are demo-gated with example users. Contributors and beneficiaries never need an account."
      />

      {denied ? (
        <Notice tone="amber">
          Sign in with the right demo user to open that area.
        </Notice>
      ) : null}
      {error ? <Notice tone="red">{error}</Notice> : null}

      <Card className="p-6 sm:p-7">
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { role: "org" as Role, label: "Organization", icon: <IconBuilding /> },
                { role: "partner" as Role, label: "Partner", icon: <IconScan /> },
              ]
            ).map((option) => (
              <button
                key={option.role}
                type="button"
                onClick={() => pick(option.role)}
                className={cx(
                  "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition",
                  role === option.role
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                )}
              >
                {option.icon}
                {option.label}
              </button>
            ))}
          </div>

          <Field label="User">
            <Input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoComplete="username"
              placeholder={role === "org" ? "org@aidblink.demo" : "parceiro@aidblink.demo"}
            />
          </Field>

          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </Field>

          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || user.length === 0 || password.length === 0}
          >
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        {hints ? (
          <div className="mt-6 space-y-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
            <p className="font-semibold text-slate-600">Demo credentials</p>
            <button
              type="button"
              onClick={() => pick("org")}
              className="block w-full text-left transition hover:text-slate-800"
            >
              <span className="mono font-semibold text-slate-700">{hints.org.user}</span>{" "}
              / <span className="mono">{hints.org.password}</span> — organization
            </button>
            <button
              type="button"
              onClick={() => pick("partner")}
              className="block w-full text-left transition hover:text-slate-800"
            >
              <span className="mono font-semibold text-slate-700">
                {hints.partner.user}
              </span>{" "}
              / <span className="mono">{hints.partner.password}</span> — partner
            </button>
            <p>
              Set real credentials in <span className="mono">.env</span> and disable
              these hints with <span className="mono">AIDBLINK_DEMO_HINTS=0</span>.
            </p>
          </div>
        ) : null}
      </Card>

      <p className="text-center text-sm text-slate-500">
        Just exploring?{" "}
        <Link href="/contribute" className="font-semibold text-emerald-600 hover:underline">
          Contribute without an account
        </Link>
        .
      </p>
    </div>
  );
}
