// End-to-end smoke test for AidBlink.
// Usage: node scripts/smoke.mjs   (server must be running on :3000)
const base = process.env.BASE ?? "http://localhost:3000";

const ORG = { user: "org@aidblink.demo", password: "aidblink-org" };
const PARTNER = { user: "parceiro@aidblink.demo", password: "aidblink-parceiro" };

async function call(method, path, body, cookie) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;

  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function login(role, user, password) {
  const res = await fetch(base + "/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role, user, password }),
  });
  if (res.status !== 200) return null;
  const setCookies =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const session = setCookies
    .map((c) => c.split(";")[0])
    .find((c) => c.startsWith("aidblink_session="));
  return session ?? null;
}

function ok(label, condition, extra = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!condition) process.exitCode = 1;
}

// Wait for the server.
let up = false;
for (let i = 0; i < 40; i += 1) {
  try {
    const r = await fetch(base + "/api/balance");
    if (r.ok) {
      up = true;
      break;
    }
  } catch {
    /* retry */
  }
  await new Promise((r) => setTimeout(r, 500));
}
if (!up) {
  console.error("Server did not start");
  process.exit(1);
}

// 0. Demo authentication.
const orgCookie = await login("org", ORG.user, ORG.password);
const partnerCookie = await login("partner", PARTNER.user, PARTNER.password);
ok("Organization login", !!orgCookie);
ok("Partner login", !!partnerCookie);

const unauth = await call("POST", "/api/requests", {
  beneficiaryRef: "BEN-NOAUTH",
  category: "food",
  amountUsd: 1,
});
ok("Unauthenticated mutation blocked", unauth.status === 401, `status=${unauth.status}`);

// 1. Action metadata.
const action = await call("GET", "/api/actions/donate");
ok("GET action metadata", action.status === 200 && action.data.type === "action");

// 2. Simulated contribution.
const don = await call("POST", "/api/donations", { simulated: true, sol: 0.2 });
ok("Record simulated donation", don.status === 201 && don.data.donation.sol === 0.2);

// 3. Balance exposes the ledger (on-chain totals; simulated is not counted).
const bal = await call("GET", "/api/balance");
ok(
  "Balance exposes summary",
  bal.status === 200 &&
    typeof bal.data.summary?.raisedUsd === "number" &&
    typeof bal.data.program === "string",
);

// 4. Create a request within the on-chain budget.
const created = await call(
  "POST",
  "/api/requests",
  { beneficiaryRef: "BEN-9001", category: "food", amountUsd: 1, note: "smoke test" },
  orgCookie,
);
ok("Create request", created.status === 201);
const requestId = created.data.request?.id;

// 5. Approve -> voucher.
const approved = await call(
  "POST",
  `/api/requests/${requestId}/approve`,
  { decision: "approve" },
  orgCookie,
);
ok("Approve request issues voucher", approved.status === 201 && !!approved.data.voucher);
const voucherId = approved.data.voucher?.id;

// 6. Fetch voucher with QR + token.
const detail = await call("GET", `/api/vouchers/${voucherId}`);
ok(
  "Voucher detail has token + QR",
  detail.status === 200 && detail.data.token && detail.data.qrDataUrl.startsWith("data:image"),
);
const token = detail.data.token;

// 7. Redeem once (partner role required).
const redeem1 = await call(
  "POST",
  "/api/redeem",
  { token, merchant: "Mercado Central" },
  partnerCookie,
);
ok("First redemption succeeds", redeem1.status === 200 && redeem1.data.ok === true);

// 7b. Org session cannot redeem.
const redeemWrongRole = await call(
  "POST",
  "/api/redeem",
  { token: "irrelevant", merchant: "x" },
  orgCookie,
);
ok("Wrong role blocked on redeem", redeemWrongRole.status === 403, `status=${redeemWrongRole.status}`);

// 8. Redeem again -> blocked.
const redeem2 = await call(
  "POST",
  "/api/redeem",
  { token, merchant: "Mercado Central" },
  partnerCookie,
);
ok("Second redemption blocked", redeem2.status === 409, `status=${redeem2.status}`);

// 9. Rejected attempt is logged.
const reds = await call("GET", "/api/redemptions");
ok("Rejected attempt logged", (reds.data.attempts ?? []).length >= 1);

// 10. Tampered token is rejected.
const tampered = token.slice(0, -3) + "abc";
const bad = await call("POST", "/api/redeem", { token: tampered, merchant: "x" }, partnerCookie);
ok("Tampered token rejected", bad.status === 400 || bad.status === 409);

console.log("\nDone.");
