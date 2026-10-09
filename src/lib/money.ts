import { env } from "./env";
import type { AidCategory } from "./types";

export const LAMPORTS_PER_SOL_BN = 1_000_000_000;

export function solToUsd(sol: number): number {
  return round2(sol * env.solUsdRate);
}

export function usdToSol(usd: number): number {
  return usd / env.solUsdRate;
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatSol(value: number): string {
  const fixed = value.toFixed(4);
  return `${fixed.replace(/\.?0+$/, "")} SOL`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function shortAddress(address: string, size = 4): string {
  if (address.length <= size * 2 + 3) return address;
  return `${address.slice(0, size)}...${address.slice(-size)}`;
}

/**
 * Benefit budgets are denominated in USD but rounded to friendly, discrete
 * amounts so the demo stays legible (e.g. $30 for a meal, $15 for a ride).
 */
export const SUGGESTED_AMOUNTS: Record<AidCategory, number[]> = {
  food: [15, 30, 60],
  transport: [10, 15, 25],
};
