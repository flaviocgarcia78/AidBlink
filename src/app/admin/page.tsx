"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Badge,
  Card,
  CategoryPill,
  Notice,
  RequestStatusBadge,
  Stat,
  VoucherStatusBadge,
} from "@/components/ui";
import { apiGet, apiPost } from "@/lib/client";
import { SUGGESTED_AMOUNTS, formatDateTime, formatSol, formatUsd } from "@/lib/money";
import type {
  AidCategory,
  AidRequest,
  LedgerSummary,
  Redemption,
  RedemptionAttempt,
  Voucher,
} from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

interface BalanceResponse {
  network: string;
  treasury: string;
  solUsdRate: number;
  anchoringEnabled: boolean;
  onchainBalanceSol: string | null;
  summary: LedgerSummary;
}

interface RequestWithVoucher extends AidRequest {
  voucher?: Voucher;
}

export default function AdminPage() {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [requests, setRequests] = useState<RequestWithVoucher[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [attempts, setAttempts] = useState<RedemptionAttempt[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [ref, setRef] = useState("BEN-");
  const [category, setCategory] = useState<AidCategory>("food");
  const [amountUsd, setAmountUsd] = useState(30);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [b, r, v, red] = await Promise.all([
        apiGet<BalanceResponse>("/api/balance"),
        apiGet<{ requests: RequestWithVoucher[] }>("/api/requests"),
        apiGet<{ vouchers: Voucher[] }>("/api/vouchers"),
        apiGet<{ redemptions: Redemption[]; attempts: RedemptionAttempt[] }>(
          "/api/redemptions",
        ),
      ]);
      setBalance(b);
      setRequests(r.requests);
      setVouchers(v.vouchers);
      setRedemptions(red.redemptions);
      setAttempts(red.attempts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function createRequest() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiPost("/api/requests", { beneficiaryRef: ref, category, amountUsd, note });
      setMessage(`Request created for ${ref}.`);
      setRef("BEN-");
      setNote("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request");
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiPost<{ voucher?: Voucher }>(
        `/api/requests/${id}/approve`,
        { decision },
      );
      setMessage(
        decision === "approve"
          ? `Approved ${id}. Voucher ${result.voucher?.id} issued.`
          : `Rejected ${id}.`,
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  const summary = balance?.summary;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <Badge tone="green">Step 2 · Administer</Badge>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Organization dashboard
          </h1>
          <p className="max-w-2xl text-slate-600">
            See the available aid pool, record pseudonymous requests, and approve
            a food or transport benefit. Approving issues a one-time voucher.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Refresh
        </button>
      </header>

      {error ? <Notice tone="red">{error}</Notice> : null}
      {message ? <Notice tone="green">{message}</Notice> : null}

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Raised"
          value={summary ? formatUsd(summary.raisedUsd) : "—"}
          hint={summary ? `${summary.raisedSol} SOL · ${summary.donationCount} contributions` : undefined}
        />
        <Stat
          label="Available"
          value={summary ? formatUsd(summary.availableUsd) : "—"}
          hint="Raised minus allocated benefits"
        />
        <Stat
          label="Allocated"
          value={summary ? formatUsd(summary.allocatedUsd) : "—"}
          hint={
            summary
              ? `${summary.voucherIssued} vouchers · ${summary.pendingCount} pending`
              : undefined
          }
        />
        <Stat
          label="Redeemed"
          value={summary ? formatUsd(summary.redeemedUsd) : "—"}
          hint={summary ? `${summary.voucherRedeemed} vouchers redeemed` : undefined}
        />
      </section>

      {balance ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>
            On-chain treasury balance:{" "}
            <span className="mono font-semibold text-slate-700">
              {balance.onchainBalanceSol ?? "unavailable"} SOL
            </span>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Network: <span className="font-semibold">{balance.network}</span>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            On-chain anchoring:{" "}
            <span className="font-semibold">
              {balance.anchoringEnabled ? "enabled" : "disabled"}
            </span>
          </span>
          <span className="text-slate-300">|</span>
          <span className="mono">{balance.treasury}</span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* New request */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">New aid request</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use a pseudonymous reference only. Never enter personal data.
          </p>

          <div className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-slate-600">
              Beneficiary reference
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
              />
            </label>

            <div>
              <p className="text-sm font-medium text-slate-600">Category</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(["food", "transport"] as AidCategory[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCategory(c);
                      setAmountUsd(SUGGESTED_AMOUNTS[c][1]);
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      category === c
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-600">Amount (USD)</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTED_AMOUNTS[category].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAmountUsd(value)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                      amountUsd === value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {formatUsd(value)}
                  </button>
                ))}
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(Number(e.target.value))}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <label className="block text-sm font-medium text-slate-600">
              Note (optional)
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Bus fare to a medical appointment"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
              />
            </label>

            <button
              type="button"
              onClick={createRequest}
              disabled={busy || ref.trim().length < 2 || amountUsd <= 0}
              className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              Create request
            </button>
          </div>
        </Card>

        {/* Requests */}
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">Requests</h2>
          {requests.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No requests yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {requests.map((request) => (
                <li
                  key={request.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="mono text-xs text-slate-400">
                        {request.id}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {request.beneficiaryRef}
                      </span>
                      <CategoryPill category={request.category} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {formatUsd(request.amountUsd)}
                      </span>
                      <RequestStatusBadge status={request.status} />
                    </div>
                  </div>

                  {request.note ? (
                    <p className="mt-2 text-sm text-slate-500">{request.note}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {request.status === "pending" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => decide(request.id, "approve")}
                          disabled={busy}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => decide(request.id, "reject")}
                          disabled={busy}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    ) : null}
                    {request.voucherId ? (
                      <Link
                        href={`/voucher/${request.voucherId}`}
                        className="text-sm font-semibold text-emerald-600 hover:underline"
                      >
                        Open voucher {request.voucherId} →
                      </Link>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Vouchers + redemptions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">Vouchers</h2>
          {vouchers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No vouchers issued yet. Approve a request to issue one.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {vouchers.map((voucher) => (
                <li
                  key={voucher.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="mono text-xs text-slate-400">
                      {voucher.id}
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {voucher.beneficiaryRef}
                    </span>
                    <CategoryPill category={voucher.category} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {formatUsd(voucher.amountUsd)}
                    </span>
                    <VoucherStatusBadge status={voucher.status} />
                    <Link
                      href={`/voucher/${voucher.id}`}
                      className="text-sm font-semibold text-emerald-600 hover:underline"
                    >
                      Open →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-bold text-slate-900">
            Redemptions & rejected attempts
          </h2>
          {redemptions.length === 0 && attempts.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              Nothing redeemed yet. Try the partner simulator.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100">
              {redemptions.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {formatUsd(r.amountUsd)} · {CATEGORY_LABELS[r.category]}
                    </p>
                    <p className="text-xs text-slate-400">
                      {r.voucherId} · {r.merchant} · {formatDateTime(r.at)}
                    </p>
                  </div>
                  <Badge tone="green">redeemed</Badge>
                </li>
              ))}
              {attempts.map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-rose-700">
                      Rejected: {a.reason}
                    </p>
                    <p className="text-xs text-slate-400">
                      {a.merchant} · {formatDateTime(a.at)}
                    </p>
                  </div>
                  <Badge tone="red">blocked</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Notice tone="amber">
        Demo rate: 1 SOL ≈ {formatUsd(balance?.solUsdRate ?? 150)}. Amounts in USD
        are illustrative. Vouchers are prototype benefits with no real value.
      </Notice>
    </div>
  );
}
