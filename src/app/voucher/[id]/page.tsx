"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Button,
  ButtonLink,
  CategoryPill,
  Card,
  Notice,
  PageHeader,
  VoucherStatusBadge,
} from "@/components/ui";
import { IconCheck, IconLock, IconQr, IconScan } from "@/components/icons";
import { apiGet } from "@/lib/client";
import { env } from "@/lib/env";
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

function Row({
  term,
  value,
  mono,
}: {
  term: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{term}</dt>
      <dd
        className={
          mono ? "mono font-semibold text-slate-800" : "font-medium text-slate-800"
        }
      >
        {value}
      </dd>
    </div>
  );
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
      <div className="mx-auto max-w-xl space-y-4">
        <Notice tone="red">{error}</Notice>
        <ButtonLink href="/admin" variant="secondary">
          ← Back to dashboard
        </ButtonLink>
      </div>
    );
  }

  if (!data) {
    return <p className="text-slate-500">Loading voucher…</p>;
  }

  const { voucher } = data;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Step 3 · Deliver"
        title="Benefit voucher"
        description="Show this QR code at a participating partner. It can be redeemed once."
        actions={<VoucherStatusBadge status={voucher.status} />}
      />

      <Notice tone="amber">
        Prototype — this is not a real benefit and the QR code has no monetary
        value. It demonstrates the one-time delivery flow.
      </Notice>

      <Card className="overflow-hidden">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-600 px-6 py-7 text-white">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50/90">
                AidBlink voucher
              </span>
              <p className="mt-4 text-4xl font-extrabold tracking-tight">
                {formatUsd(voucher.amountUsd)}
              </p>
              <p className="mt-1 text-emerald-50">
                {CATEGORY_LABELS[voucher.category]} · single use
              </p>
            </div>
            <span className="text-3xl" aria-hidden>
              {CATEGORY_ICONS[voucher.category]}
            </span>
          </div>
        </div>

        <div className="grid gap-7 p-6 sm:grid-cols-[auto_1fr] sm:p-7">
          <div className="mx-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.qrDataUrl}
              alt="Voucher QR code"
              width={220}
              height={220}
              className="rounded-xl border border-slate-200 bg-white p-2"
            />
            <p className="mono mt-3 text-center text-sm font-semibold tracking-widest text-slate-700">
              {data.code}
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <VoucherStatusBadge status={voucher.status} />
              <CategoryPill category={voucher.category} />
            </div>

            <dl className="divide-y divide-slate-100 text-sm">
              <Row term="Voucher" value={voucher.id} mono />
              <Row term="Beneficiary" value={voucher.beneficiaryRef} />
              <Row term="Issued" value={formatDateTime(voucher.issuedAt)} />
              <Row term="Valid until" value={formatDateTime(voucher.expiresAt)} />
              {voucher.redeemedAt ? (
                <Row
                  term="Redeemed"
                  value={`${formatDateTime(voucher.redeemedAt)}${
                    voucher.redeemedBy ? ` · ${voucher.redeemedBy}` : ""
                  }`}
                />
              ) : null}
            </dl>

            {voucher.anchorSignature ? (
              <div className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <IconCheck className="mt-0.5 shrink-0 text-emerald-600" />
                <span className="mono break-all">
                  Anchored on-chain: {voucher.anchorSignature}
                </span>
              </div>
            ) : null}

            <Button variant="secondary" size="sm" onClick={copyLink}>
              {copied ? "Link copied" : "Copy redemption link"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <ButtonLink
          href={`/redeem?token=${encodeURIComponent(data.token)}`}
          size="lg"
        >
          <IconScan />
          Open in partner simulator
        </ButtonLink>
        <ButtonLink href="/admin" size="lg" variant="secondary">
          Back to dashboard
        </ButtonLink>
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-400">
        <IconLock />
        The token is signed by the server. Single use is enforced server-side —
        not by the QR image.
      </p>
      <p className="flex items-center gap-2 text-xs text-slate-400">
        <IconQr />
        Redemption URL points at {env.appUrl}/redeem
      </p>
    </div>
  );
}
