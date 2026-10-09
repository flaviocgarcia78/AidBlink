"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Badge, Card, CategoryPill, Notice, VoucherStatusBadge } from "@/components/ui";
import { apiGet } from "@/lib/client";
import { formatDateTime, formatUsd } from "@/lib/money";
import type { Voucher } from "@/lib/types";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/types";

interface VoucherDetail {
  voucher: Voucher;
  token: string;
  code: string;
  redeemUrl: string;
  qrDataUrl: string;
}

export default function VoucherPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const [data, setData] = useState<VoucherDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setData(await apiGet<VoucherDetail>(`/api/vouchers/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load voucher");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function copyLink() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.redeemUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <Notice tone="red">{error}</Notice>
        <Link
          href="/admin"
          className="mt-4 inline-block text-sm font-semibold text-emerald-600 hover:underline"
        >
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-500">Loading voucher…</p>;
  }

  const { voucher } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-3">
        <Badge tone="green">Step 3 · Deliver</Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Benefit voucher
        </h1>
        <p className="text-slate-600">
          Show this QR code at a participating partner. It can be redeemed once.
        </p>
      </header>

      <Notice tone="amber">
        Prototype — this is not a real benefit and the QR code has no monetary
        value. It demonstrates the one-time delivery flow.
      </Notice>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 px-6 py-6 text-white">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-widest text-emerald-50">
              AidBlink voucher
            </span>
            <span className="text-2xl" aria-hidden>
              {CATEGORY_ICONS[voucher.category]}
            </span>
          </div>
          <p className="mt-4 text-4xl font-extrabold">
            {formatUsd(voucher.amountUsd)}
          </p>
          <p className="text-emerald-50">
            {CATEGORY_LABELS[voucher.category]} · single use
          </p>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={data.qrDataUrl}
            alt="Voucher QR code"
            width={220}
            height={220}
            className="mx-auto rounded-xl border border-slate-200"
          />
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <VoucherStatusBadge status={voucher.status} />
              <CategoryPill category={voucher.category} />
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Voucher</dt>
                <dd className="mono font-semibold text-slate-800">{voucher.id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Code</dt>
                <dd className="mono font-semibold text-slate-800">{data.code}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Beneficiary</dt>
                <dd className="font-semibold text-slate-800">
                  {voucher.beneficiaryRef}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Issued</dt>
                <dd className="text-slate-800">{formatDateTime(voucher.issuedAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Valid until</dt>
                <dd className="text-slate-800">{formatDateTime(voucher.expiresAt)}</dd>
              </div>
              {voucher.redeemedAt ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Redeemed</dt>
                  <dd className="text-slate-800">
                    {formatDateTime(voucher.redeemedAt)}
                    {voucher.redeemedBy ? ` · ${voucher.redeemedBy}` : ""}
                  </dd>
                </div>
              ) : null}
              {voucher.anchorSignature ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Anchor</dt>
                  <dd className="mono truncate text-xs text-slate-500">
                    {voucher.anchorSignature}
                  </dd>
                </div>
              ) : null}
            </dl>

            <button
              type="button"
              onClick={copyLink}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              {copied ? "Link copied" : "Copy redemption link"}
            </button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/redeem?token=${encodeURIComponent(data.token)}`}
          className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700"
        >
          Open in partner simulator
        </Link>
        <Link
          href="/admin"
          className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
