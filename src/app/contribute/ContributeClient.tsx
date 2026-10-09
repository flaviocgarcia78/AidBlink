"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import WalletButton from "@/components/wallet/WalletButton";
import {
  Badge,
  Button,
  Card,
  cx,
  Field,
  Input,
  Notice,
  PageHeader,
} from "@/components/ui";
import {
  IconArrowRight,
  IconBolt,
  IconCheck,
  IconCoins,
  IconExternal,
  IconWallet,
} from "@/components/icons";
import { apiGet, apiPost } from "@/lib/client";
import { env } from "@/lib/env";
import { formatDateTime, formatSol, formatUsd, shortAddress } from "@/lib/money";
import { SOL_AMOUNTS } from "@/lib/actions";
import type { Donation } from "@/lib/types";

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

interface ActionResult {
  type: string;
  title: string;
  description: string;
  label: string;
}

export default function ContributeClient() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();

  const [amount, setAmount] = useState(0.1);
  const [custom, setCustom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [action, setAction] = useState<ActionResult | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);

  const loadDonations = useCallback(async () => {
    try {
      const data = await apiGet<{ donations: Donation[] }>("/api/donations");
      setDonations(data.donations.slice(0, 6));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    apiGet<ActionResult>("/api/actions/donate").then(setAction).catch(() => {});
    loadDonations();
  }, [loadDonations]);

  const effectiveAmount = custom ? Number(custom) : amount;
  const amountValid =
    Number.isFinite(effectiveAmount) &&
    effectiveAmount >= 0.001 &&
    effectiveAmount <= 100;

  async function contribute() {
    if (!publicKey) {
      setError("Connect a wallet first, or record a simulated contribution.");
      return;
    }
    if (!amountValid) {
      setError("Enter an amount between 0.001 and 100 SOL.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const { transaction } = await apiPost<{ transaction: string }>(
        `/api/actions/donate?amount=${effectiveAmount}`,
        { account: publicKey.toBase58() },
      );
      const tx = Transaction.from(base64ToBytes(transaction));
      const signature = await sendTransaction(tx, connection);
      await connection.confirmTransaction(signature, "confirmed");
      await apiPost("/api/donations", { signature });
      setSuccess(signature);
      await loadDonations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Contribution failed");
    } finally {
      setBusy(false);
    }
  }

  async function simulate() {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await apiPost("/api/donations", { simulated: true, sol: effectiveAmount });
      setSuccess("simulated");
      await loadDonations();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setBusy(false);
    }
  }

  const actionUrl = `${env.appUrl}/api/actions/donate`;
  const dialUrl = `https://dial.to/?action=solana-action:${encodeURIComponent(
    actionUrl,
  )}`;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Step 1 · Contribute"
        title="Contribute to the aid pool"
        description={
          action?.description ??
          "Send a small amount of SOL through the AidBlink Blink. The transfer is real and verifiable on-chain."
        }
        actions={
          connected && publicKey ? (
            <Badge tone="green">
              <IconCheck className="h-3.5 w-3.5" />
              Connected · {shortAddress(publicKey.toBase58())}
            </Badge>
          ) : (
            <Badge tone="slate">Wallet not connected</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6 sm:p-7">
          <p className="text-sm font-semibold text-slate-700">Choose an amount</p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {SOL_AMOUNTS.map((value) => {
              const active = !custom && amount === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setAmount(value);
                    setCustom("");
                  }}
                  className={cx(
                    "rounded-xl border px-3 py-3.5 text-center transition",
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                  )}
                >
                  <span className="block text-base font-bold">
                    {formatSol(value)}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    ≈ {formatUsd(Number(value) * env.solUsdRate)}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <Field label="Custom amount (SOL)">
              <Input
                type="number"
                min="0.001"
                max="100"
                step="0.01"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="e.g. 0.2"
              />
            </Field>
          </div>

          {!amountValid ? (
            <p className="mt-2 text-sm text-rose-600">
              Enter an amount between 0.001 and 100 SOL.
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            {connected ? (
              <Button onClick={contribute} disabled={busy || !amountValid} size="lg">
                <IconCoins />
                {busy ? "Sending…" : `Contribute ${formatSol(effectiveAmount)}`}
              </Button>
            ) : (
              <WalletButton />
            )}
            <Button
              variant="secondary"
              size="lg"
              onClick={simulate}
              disabled={busy || !amountValid}
            >
              Record simulated contribution
            </Button>
          </div>

          {error ? (
            <div className="mt-5">
              <Notice tone="red">{error}</Notice>
            </div>
          ) : null}

          {success ? (
            <div className="mt-5">
              <Notice tone="green">
                {success === "simulated" ? (
                  <>Simulated contribution recorded for the demo.</>
                ) : (
                  <>
                    Contribution confirmed.{" "}
                    <a
                      href={`https://explorer.solana.com/tx/${success}?cluster=${env.network}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      View on Solana Explorer
                      <IconExternal className="h-3.5 w-3.5" />
                    </a>
                  </>
                )}
              </Notice>
            </div>
          ) : null}

          <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              Treasury:{" "}
              <span className="mono text-slate-600">
                {shortAddress(env.publicTreasuryAddress, 6)}
              </span>
            </span>
            <span className="text-slate-300">·</span>
            <span>Network: {env.network}</span>
            <span className="text-slate-300">·</span>
            <span>1 SOL ≈ {formatUsd(env.solUsdRate)}</span>
          </p>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <IconBolt />
              </span>
              <p className="text-sm font-semibold text-slate-700">
                This is a Solana Blink
              </p>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              The same contribution flow is exposed as a standard Solana Action,
              so any Blink-compatible client can use it.
            </p>
            <p className="mono mt-3 break-all rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              GET {actionUrl}
            </p>
            <a
              href={dialUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:underline"
            >
              Open in a Blink client (dial.to)
              <IconExternal className="h-3.5 w-3.5" />
            </a>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                Recent contributions
              </p>
              <IconWallet className="text-slate-300" />
            </div>
            {donations.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No contributions yet.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {donations.map((d) => (
                  <li key={d.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="font-semibold text-slate-800">
                        {formatSol(d.sol)}{" "}
                        <span className="font-normal text-slate-400">
                          ≈ {formatUsd(d.usd)}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(d.confirmedAt)} ·{" "}
                        {d.source === "onchain" ? "on-chain" : "simulated"}
                      </p>
                    </div>
                    {d.source === "onchain" ? (
                      <a
                        href={`https://explorer.solana.com/tx/${d.signature}?cluster=${env.network}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        tx <IconArrowRight className="h-3.5 w-3.5" />
                      </a>
                    ) : (
                      <Badge tone="slate">demo</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
