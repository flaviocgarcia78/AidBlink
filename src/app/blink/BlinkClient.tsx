"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import Link from "next/link";
import WalletButton from "@/components/wallet/WalletButton";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Notice,
  PageHeader,
} from "@/components/ui";
import {
  IconBolt,
  IconCheck,
  IconExternal,
  IconShield,
  IconWallet,
} from "@/components/icons";
import { apiGet, apiPost } from "@/lib/client";
import { env } from "@/lib/env";
import { formatUsd, shortAddress } from "@/lib/money";

interface ActionParameter {
  name: string;
  label?: string;
  required?: boolean;
  type?: string;
  min?: number;
  max?: number;
}

interface ActionLink {
  type?: string;
  label: string;
  href: string;
  parameters?: ActionParameter[];
}

interface ActionMeta {
  type: string;
  icon: string;
  title: string;
  description: string;
  label: string;
  links?: { actions: ActionLink[] };
}

interface TransactionResponse {
  type: "transaction";
  transaction: string;
  message?: string;
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Rewrite an absolute action URL to a same-origin path (LAN access safe). */
function sameOrigin(href: string): string {
  try {
    const url = new URL(href);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

function sameOriginAsset(src: string): string {
  try {
    return new URL(src).pathname;
  } catch {
    return src;
  }
}

/**
 * Substitute `{name}` placeholders and append any remaining declared
 * parameters as query string, following the Solana Actions spec.
 */
function buildHref(link: ActionLink, values: Record<string, string>): string {
  let href = sameOrigin(link.href);
  const used = new Set<string>();
  for (const parameter of link.parameters ?? []) {
    const token = `{${parameter.name}}`;
    if (href.includes(token)) {
      href = href.split(token).join(encodeURIComponent(values[parameter.name] ?? ""));
      used.add(parameter.name);
    }
  }
  const url = new URL(href, env.appUrl);
  for (const parameter of link.parameters ?? []) {
    const value = values[parameter.name];
    if (!used.has(parameter.name) && value) {
      url.searchParams.set(parameter.name, value);
    }
  }
  return `${url.pathname}${url.search}`;
}

export default function BlinkClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [meta, setMeta] = useState<ActionMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [custom, setCustom] = useState("0.1");

  useEffect(() => {
    apiGet<ActionMeta>("/api/actions/donate")
      .then(setMeta)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load the action"),
      );
  }, []);

  const presets = useMemo(
    () => (meta?.links?.actions ?? []).filter((a) => !(a.parameters?.length ?? 0)),
    [meta],
  );
  const customAction = useMemo(
    () => (meta?.links?.actions ?? []).find((a) => (a.parameters?.length ?? 0) > 0),
    [meta],
  );

  const run = useCallback(
    async (link: ActionLink, values: Record<string, string>) => {
      if (!publicKey) {
        setError("Connect a wallet to sign the transaction.");
        return;
      }
      setBusy(true);
      setError(null);
      setNotice(null);
      setSignature(null);
      try {
        const href = buildHref(link, values);
        const data = await apiPost<TransactionResponse>(href, {
          account: publicKey.toBase58(),
        });
        const tx = Transaction.from(base64ToBytes(data.transaction));
        const sig = await sendTransaction(tx, connection);
        await connection.confirmTransaction(sig, "confirmed");
        setSignature(sig);
        setNotice(data.message ?? `Contribution of ${link.label} confirmed.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [connection, publicKey, sendTransaction],
  );

  const customValid =
    customAction?.parameters?.every((p) => {
      const value = Number(custom);
      if (p.type === "number") {
        if (!Number.isFinite(value)) return false;
        if (p.min !== undefined && value < p.min) return false;
        if (p.max !== undefined && value > p.max) return false;
      }
      return value !== 0 || !p.required;
    }) ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Blinks · Solana Actions"
        title="Built-in Blink client"
        description="This page consumes the same Solana Action exposed at /api/actions/donate. It is a minimal Blink client so the demo works on localhost and even when public clients are unavailable."
        actions={
          connected && publicKey ? (
            <Badge tone="green">
              <IconCheck className="h-3.5 w-3.5" />
              {shortAddress(publicKey.toBase58())}
            </Badge>
          ) : (
            <Badge tone="slate">Wallet not connected</Badge>
          )
        }
      />

      <Notice tone="slate">
        Public Blink clients (like <span className="mono">dial.to</span>) render
        the exact same action — but they run remotely and cannot reach a
        localhost or LAN URL. This built-in client talks to the action directly.
      </Notice>

      {error ? <Notice tone="red">{error}</Notice> : null}
      {notice ? (
        <Notice tone="green">
          {notice}
          {signature ? (
            <>
              {" "}
              <a
                href={`https://explorer.solana.com/tx/${signature}?cluster=${env.network}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                View on Solana Explorer
                <IconExternal className="h-3.5 w-3.5" />
              </a>
            </>
          ) : null}
        </Notice>
      ) : null}

      {!meta ? (
        <p className="text-slate-500">Loading action…</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-start gap-4 border-b border-slate-100 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sameOriginAsset(meta.icon)}
              alt=""
              className="h-14 w-14 rounded-2xl ring-1 ring-slate-200"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-900">{meta.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {meta.description}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-6">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <IconBolt className="text-emerald-600" />
                Quick amounts
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {presets.map((link) => (
                  <Button
                    key={link.href}
                    variant="secondary"
                    onClick={() => run(link, {})}
                    disabled={busy || !connected}
                  >
                    {link.label}
                  </Button>
                ))}
              </div>
            </div>

            {customAction ? (
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <IconShield className="text-emerald-600" />
                  {customAction.label}
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div className="w-40">
                    <Field label="Amount in SOL">
                      <Input
                        type="number"
                        min="0.001"
                        max="100"
                        step="0.01"
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                      />
                    </Field>
                  </div>
                  <Button
                    onClick={() => run(customAction, { amount: custom })}
                    disabled={busy || !connected || !customValid}
                    size="lg"
                  >
                    {customAction.label}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Amount between 0.001 and 100 SOL · 1 SOL ≈{" "}
                  {formatUsd(env.solUsdRate)} at the demo rate.
                </p>
              </div>
            ) : null}

            {!connected ? (
              <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                <IconWallet className="text-slate-400" />
                <span className="text-sm text-slate-600">
                  Connect a wallet to sign the contribution.
                </span>
                <WalletButton />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span className="mono break-all">
                GET /api/actions/donate
              </span>
              <span className="text-slate-300">·</span>
              <span>Action version 2.1.3</span>
              <span className="text-slate-300">·</span>
              <span>Network {env.network}</span>
            </div>
          </div>
        </Card>
      )}

      <p className="text-center text-sm text-slate-500">
        Prefer the normal flow?{" "}
        <Link href="/contribute" className="font-semibold text-emerald-600 hover:underline">
          Go to the Contribute page
        </Link>
        .
      </p>
    </div>
  );
}
