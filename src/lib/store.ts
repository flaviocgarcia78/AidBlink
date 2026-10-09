import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { solToUsd } from "./money";
import type {
  AidRequest,
  AidRequestInput,
  Donation,
  Redemption,
  RedemptionAttempt,
  Voucher,
} from "./types";

/**
 * Minimal file-backed store.
 *
 * For a hackathon demo we deliberately avoid a database dependency: the whole
 * state lives in a single JSON file. The interface is intentionally small so it
 * can be swapped for Postgres/SQLite later without touching the routes.
 */

export interface StoreData {
  donations: Donation[];
  requests: AidRequest[];
  vouchers: Voucher[];
  redemptions: Redemption[];
  attempts: RedemptionAttempt[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const EMPTY: StoreData = {
  donations: [],
  requests: [],
  vouchers: [],
  redemptions: [],
  attempts: [],
};

/**
 * Cache on globalThis so hot reloads in dev do not thrash the file.
 */
const globalForStore = globalThis as unknown as {
  __aidblinkStore?: StoreData;
  __aidblinkWriteQueue?: Promise<void>;
};

function nowIso(): string {
  return new Date().toISOString();
}

function seed(): StoreData {
  const sol = 0.1;
  return {
    ...EMPTY,
    donations: [
      {
        id: `DON-${randomUUID().slice(0, 8)}`,
        signature: `sim:${randomUUID()}`,
        lamports: Math.round(sol * 1_000_000_000),
        sol,
        usd: solToUsd(sol),
        donor: "seed-demo",
        source: "simulated",
        confirmedAt: nowIso(),
      },
    ],
    requests: [
      {
        id: "REQ-1001",
        beneficiaryRef: "BEN-4821",
        category: "food",
        amountUsd: 30,
        note: "Meal basket for a family of four.",
        status: "pending",
        createdAt: nowIso(),
      },
      {
        id: "REQ-1002",
        beneficiaryRef: "BEN-7310",
        category: "transport",
        amountUsd: 15,
        note: "Bus fare to a medical appointment.",
        status: "pending",
        createdAt: nowIso(),
      },
    ],
  };
}

async function read(): Promise<StoreData> {
  if (globalForStore.__aidblinkStore) {
    return globalForStore.__aidblinkStore;
  }
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    const merged: StoreData = { ...EMPTY, ...parsed };
    globalForStore.__aidblinkStore = merged;
    return merged;
  } catch {
    const fresh = seed();
    globalForStore.__aidblinkStore = fresh;
    await persist(fresh);
    return fresh;
  }
}

async function persist(data: StoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Mutate the store through a serialized read/write cycle to avoid lost updates
 * when several requests land at the same time.
 */
export async function update<T>(
  mutate: (data: StoreData) => T | Promise<T>,
): Promise<T> {
  const previous = globalForStore.__aidblinkWriteQueue ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  globalForStore.__aidblinkWriteQueue = previous.then(() => gate);

  await previous;
  try {
    const data = await read();
    try {
      const result = await mutate(data);
      await persist(data);
      return result;
    } catch (err) {
      // Persist side effects recorded before the failure (e.g. a rejected
      // redemption attempt) so the anti-reuse demo can show the full history.
      await persist(data);
      throw err;
    }
  } finally {
    release();
  }
}

export async function snapshot(): Promise<StoreData> {
  const data = await read();
  // Return a shallow copy so callers cannot mutate the cache by accident.
  return {
    donations: [...data.donations],
    requests: [...data.requests],
    vouchers: [...data.vouchers],
    redemptions: [...data.redemptions],
    attempts: [...data.attempts],
  };
}

/* ------------------------------- helpers ------------------------------- */

export function nextRequestId(data: StoreData): string {
  const nums = data.requests
    .map((r) => Number(r.id.replace(/[^0-9]/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 1000;
  return `REQ-${max + 1}`;
}

export function nextVoucherId(data: StoreData): string {
  const nums = data.vouchers
    .map((v) => Number(v.id.replace(/[^0-9]/g, "")))
    .filter((n) => Number.isFinite(n));
  const max = nums.length ? Math.max(...nums) : 5000;
  return `VCH-${max + 1}`;
}

export function createRequest(
  data: StoreData,
  input: AidRequestInput,
): AidRequest {
  const request: AidRequest = {
    id: nextRequestId(data),
    beneficiaryRef: input.beneficiaryRef,
    category: input.category,
    amountUsd: input.amountUsd,
    note: input.note,
    status: "pending",
    createdAt: nowIso(),
  };
  data.requests.push(request);
  return request;
}
