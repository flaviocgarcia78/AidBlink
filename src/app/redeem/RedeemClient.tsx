"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge, Card, CategoryPill, Notice } from "@/components/ui";
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
      <header className="space-y-3">
        <Badge tone="blue">Partner terminal</Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Redeem a voucher
        </h1>
        <p className="max-w-2xl text-slate-600">
          A partner scans (or pastes) the voucher token. The server verifies the
          signature and redeems it exactly once — a second attempt is rejected.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <label className="block text-sm font-medium text-slate-600">
            Partner name
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Voucher token
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              rows={5}
              placeholder="Paste the token from the QR code link"
              className="mono mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs text-slate-700 outline-none focus:border-emerald-500"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={redeem}
              disabled={busy || token.trim().length === 0}
              className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy ? "Verifying…" : "Verify & redeem"}
            </button>
            <button
              type="button"
              onClick={() => {
                setToken("");
                setResult(null);
                setError(null);
              }}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>

          {error ? (
            <div className="mt-4">
              <Notice tone="red">
                <strong className="block">Redemption rejected</strong>
                {error}
              </Notice>
            </div>
          ) : null}

          {result ? (
            <div className="mt-4">
              <Notice tone="green">
                <strong className="block">Voucher redeemed successfully</strong>
                {formatUsd(result.amountUsd)} · {result.category} ·{" "}
                {result.voucherId} · {result.merchant}
                {result.anchorSignature ? (
                  <span className="mono mt-1 block break-all text-xs">
                    anchored: {result.anchorSignature}
                  </span>
                ) : null}
              </Notice>
            </div>
          ) : null}

          <p className="mt-5 text-xs text-slate-500">
            Tip for the demo: redeem a voucher, then try the same token again to
            see it blocked.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">Vouchers</h2>
          <p className="mt-1 text-sm text-slate-500">
            Pick an issued voucher to load its token.
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
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="mono text-xs text-slate-400">
                      {voucher.id}
                    </span>
                    <CategoryPill category={voucher.category} />
                    <span className="text-sm font-semibold text-slate-700">
                      {formatUsd(voucher.amountUsd)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => useVoucher(voucher.id)}
                    disabled={voucher.status !== "issued"}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                  >
                    {voucher.status === "issued" ? "Use" : voucher.status}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
