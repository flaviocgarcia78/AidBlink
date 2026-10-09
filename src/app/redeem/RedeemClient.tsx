"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Button,
  Card,
  CategoryPill,
  Field,
  Input,
  Notice,
  PageHeader,
  VoucherStatusBadge,
} from "@/components/ui";
import {
  IconCheck,
  IconScan,
  IconShield,
  IconSpark,
} from "@/components/icons";
import { apiGet, apiPost } from "@/lib/client";
import { formatUsd } from "@/lib/money";
import type { Redemption, Voucher } from "@/lib/types";

interface RedeemSuccess {
  ok: true;
  redemption: Redemption;
}

interface RedeemFailure {
  error: string;
}

export default function RedeemClient() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState("");
  const [merchant, setMerchant] = useState("Mercado Central");
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Redemption | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadVouchers = useCallback(async () => {
    try {
      const data = await apiGet<{ vouchers: Voucher[] }>("/api/vouchers");
      setVouchers(data.vouchers);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const preset = searchParams.get("token");
    if (preset) setToken(preset);
    loadVouchers();
  }, [searchParams, loadVouchers]);

  async function useVoucher(id: string) {
    setError(null);
    setResult(null);
    try {
      const detail = await apiGet<{ token: string }>(`/api/vouchers/${id}`);
      setToken(detail.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voucher");
    }
  }

  async function redeem() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const data = await apiPost<RedeemSuccess | RedeemFailure>("/api/redeem", {
        token,
        merchant,
      });
      if ("error" in data) {
        setError(data.error);
      } else {
        setResult(data.redemption);
      }
      await loadVouchers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redemption failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Step 3 · Deliver"
        title="Partner terminal"
        description="A partner scans (or pastes) the voucher token. The server verifies the signature and redeems it exactly once — a second attempt is rejected."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 sm:p-7">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <IconScan />
            </span>
            <h2 className="text-lg font-bold text-slate-900">Verify a voucher</h2>
          </div>

          <div className="mt-5 space-y-4">
            <Field label="Partner name">
              <Input
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Partner or merchant"
              />
            </Field>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Voucher token
              </span>
              <textarea
                value={token}
                onChange={(e) => setToken(e.target.value)}
                rows={5}
                placeholder="Paste the token from the QR code link"
                className="mono mt-0 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs leading-relaxed text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={redeem}
                disabled={busy || token.trim().length === 0}
                size="lg"
              >
                <IconShield />
                {busy ? "Verifying…" : "Verify & redeem"}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  setToken("");
                  setResult(null);
                  setError(null);
                }}
              >
                Clear
              </Button>
            </div>
          </div>

          {error ? (
            <div className="mt-5">
              <Notice tone="red">
                <strong className="block">Redemption rejected</strong>
                {error}
              </Notice>
            </div>
          ) : null}

          {result ? (
            <div className="mt-5">
              <Notice tone="green">
                <strong className="flex items-center gap-1.5">
                  <IconCheck className="h-4 w-4" />
                  Voucher redeemed successfully
                </strong>
                <span className="mt-1 block">
                  {formatUsd(result.amountUsd)} · {result.category} ·{" "}
                  {result.voucherId} · {result.merchant}
                </span>
                {result.anchorSignature ? (
                  <span className="mono mt-1 block break-all text-xs">
                    anchored: {result.anchorSignature}
                  </span>
                ) : null}
              </Notice>
            </div>
          ) : null}

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-xs text-slate-500">
            <IconSpark className="mt-0.5 shrink-0 text-emerald-600" />
            <span>
              Demo tip: redeem a voucher, then try the same token again to see the
              single-use rule block it.
            </span>
          </div>
        </Card>

        <Card className="p-6 sm:p-7">
          <h2 className="text-lg font-bold text-slate-900">Issued vouchers</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick a voucher to load its token, or scan directly from the voucher
            page.
          </p>
          {vouchers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No vouchers yet.{" "}
              <Link href="/admin" className="font-semibold text-emerald-600">
                Approve a request
              </Link>{" "}
              first.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {vouchers.map((voucher) => (
                <li
                  key={voucher.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="mono text-xs text-slate-400">
                      {voucher.id}
                    </span>
                    <CategoryPill category={voucher.category} />
                    <span className="text-sm font-semibold text-slate-700">
                      {formatUsd(voucher.amountUsd)}
                    </span>
                    <VoucherStatusBadge status={voucher.status} />
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => useVoucher(voucher.id)}
                    disabled={voucher.status !== "issued"}
                  >
                    {voucher.status === "issued" ? "Use" : voucher.status}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
