"use client";

import { useCallback, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import WalletButton from "@/components/wallet/WalletButton";
import { Badge, Card, Notice } from "@/components/ui";
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
      // 1. Ask the Blink action endpoint for an unsigned transaction.
      const { transaction } = await apiPost<{ transaction: string }>(
        `/api/actions/donate?amount=${effectiveAmount}`,
        { account: publicKey.toBase58() },
      );

      // 2. Have the wallet sign and send it.
      const tx = Transaction.from(base64ToBytes(transaction));
      const signature = await sendTransaction(tx, connection);

      // 3. Wait for confirmation, then record it against the aid pool.
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
      <header className="space-y-3">
        <Badge tone="green">Step 1 · Contribute</Badge>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Contribute to the aid pool
        </h1>
        <p className="max-w-2xl text-slate-600">
          {action?.description ??
            "Send a small amount of SOL through the AidBlink Blink. The transfer is real and verifiable on-chain."}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-700">
              Choose an amount
            </p>
            {connected && publicKey ? (
              <Badge tone="green">
                Connected · {shortAddress(publicKey.toBase58())}
              </Badge>
            ) : (
              <Badge tone="slate">Wallet not connected</Badge>
            )}
          </div>

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
                  className={`rounded-xl border px-4 py-3 text-center font-semibold transition ${
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  {formatSol(value)}
                  <span className="mt-0.5 block text-xs font-normal text-slate-400">
                    ≈ {formatUsd(Number(value) * env.solUsdRate)}
                  </span>
                </button>
              );
            })}
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-600">
            Custom amount (SOL)
            <input
              type="number"
              min="0.001"
              max="100"
              step="0.01"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="e.g. 0.2"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none focus:border-emerald-500"
            />
          </label>

          {!amountValid ? (
            <p className="mt-2 text-sm text-rose-600">
              Enter an amount between 0.001 and 100 SOL.
            </p>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-3">
            {connected ? (
              <button
                type="button"
                onClick={contribute}
                disabled={busy || !amountValid}
                className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? "Sending…" : `Contribute ${formatSol(effectiveAmount)}`}
              </button>
            ) : (
              <WalletButton />
            )}
            <button
              type="button"
              onClick={simulate}
              disabled={busy || !amountValid}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Record simulated contribution
            </button>
          </div>

          {error ? (
            <div className="mt-4">
              <Notice tone="red">{error}</Notice>
            </div>
          ) : null}

          {success ? (
            <div className="mt-4">
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
                      className="font-semibold underline"
                    >
                      View on Solana Explorer →
                    </a>
                  </>
                )}
              </Notice>
            </div>
          ) : null}

          <p className="mt-5 text-xs text-slate-500">
            Treasury: <span className="mono">{env.publicTreasuryAddress}</span> ·
            Network: {env.network} · Demo rate: 1 SOL ≈ {formatUsd(env.solUsdRate)}
          </p>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700">
              This is a Solana Blink
            </p>
            <p className="mt-2 text-sm text-slate-600">
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
              className="mt-3 inline-block text-sm font-semibold text-emerald-600 hover:underline"
            >
              Open in a Blink client (dial.to) →
            </a>
          </Card>

          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-700">
              Recent contributions
            </p>
            {donations.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No contributions yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {donations.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <p className="font-medium text-slate-700">
                        {formatSol(d.sol)}{" "}
                        <span className="text-slate-400">
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
                        className="text-xs font-semibold text-emerald-600 hover:underline"
                      >
                        tx →
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
