# AidBlink — Product demo script (≤ 3 minutes)

> Colosseum asks for a product demo video of up to 3 minutes, separate from the
> pitch. This is a **shot-by-shot script** for a single continuous screen
> recording. Everything below is a real, working flow.

**Target length:** ~2:50 · **Format:** screen recording + voice-over.
**Resolution:** 1440×900 or larger, browser at 100% zoom.

---

## Pre-flight checklist (before recording)

1. `npm run build && npm start` (or `npm run dev`).
2. `cp .env.example .env` and set the treasury address; use **Devnet**.
3. Install Phantom, switch it to **Devnet**, fund it with test SOL
   (https://faucet.solana.com).
4. Open `/admin` once and click **Refresh** to confirm the balance loads.
5. Have a second browser tab ready with the Solana Explorer.
6. Decide your demo beneficiary codes (e.g. `BEN-4821`, `BEN-7310`).

> If the wallet is unavailable during recording, use **Record simulated
> contribution** — the rest of the flow is identical. The demo must be honest:
> say out loud which step is simulated.

---

## 0:00–0:15 — Frame the problem (landing page)

**Screen:** `/`

**Voice-over:**
> "This is AidBlink. Emergency aid in a single link. A person needs a meal or a
> bus fare. Supporters contribute. An organization approves the need. The person
> receives a one-time voucher — no wallet required."

Scroll slowly to the *Contribute · Administer · Deliver* cards, then to the
"real vs simulated" table.

---

## 0:15–1:00 — Step 1: Contribute (real on-chain)

**Screen:** click **Contribute** (`/contribute`) → click **Connect Wallet** → choose
Phantom.

**Actions:**
1. Select **0.1 SOL**.
2. Click **Contribute 0.1 SOL**.
3. Approve in Phantom.
4. When the success notice appears, open the **View on Solana Explorer** link in
   the second tab and show the confirmed transfer to the treasury.

**Voice-over:**
> "The contribution is a real Solana Devnet transaction, signed by the donor's
> wallet and verifiable on-chain. This same flow is exposed as a standard Solana
> Blink — a shareable link — so we never force the donor to learn a new app."

Then return to `/contribute` and show **Recent contributions** updating.

---

## 1:00–1:40 — Step 2: Administer (organization dashboard)

**Screen:** click **Org dashboard** (`/admin`).

**Actions:**
1. Point to the stats: **Raised**, **Available**, **Allocated**, **Redeemed**.
2. In **New aid request**, type `BEN-9001`, choose **Food assistance**, amount
   **$30**, note *"Meal basket"*, click **Create request**.
3. Find the new request in the list and click **Approve**.
4. Show the message: *Voucher VCH-… issued*.

**Voice-over:**
> "The organization sees a transparent pool, reads the balance straight from the
> chain, and records only a pseudonymous reference. No personal data goes
> on-chain. Approving the request issues a one-time voucher."

---

## 1:40–2:05 — Step 3: Deliver (voucher with QR)

**Screen:** click **Open voucher VCH-…** (`/voucher/[id]`).

**Actions:**
1. Show the voucher pass: amount, category, beneficiary code, validity.
2. Show the **QR code** and the code beneath it.
3. Note the amber banner: *Prototype — not a real benefit.*

**Voice-over:**
> "The person receives a QR code. They may not even have a smartphone — the
> organization can print it or read the code. The voucher is signed by the
> server, so a partner can trust it; and it can only be used once."

---

## 2:05–2:35 — Partner redemption and the anti-reuse proof

**Screen:** click **Open in partner simulator** (`/redeem?token=…`).

**Actions:**
1. Set the partner name (e.g. **Mercado Central**).
2. Click **Verify & redeem** → green success: *Voucher redeemed successfully*.
3. Click **Verify & redeem** again (same token).
4. Show the red rejection: *Voucher already redeemed — this benefit can only be
   used once.*

**Voice-over:**
> "The partner scans the voucher and the benefit is delivered. Now the same
> code is scanned again — and it is rejected. The one-time rule is enforced
> atomically on the server, not by the QR image. That is what makes this a real
> delivery mechanism."

Optionally, scroll the dashboard to the **Redemptions & rejected attempts** log
to show the blocked attempt recorded.

---

## 2:35–2:50 — Close

**Screen:** back to `/` or the dashboard.

**Voice-over:**
> "AidBlink does not confuse a donation on-chain with aid delivered. Contributions
> are real and transparent; delivery is controlled by the organization; the
> person in need just gets help. Emergency aid in a single link."

---

## Honesty rules (do not skip)

- State clearly that **benefit amounts and partner redemption are simulated**
  and that vouchers have no monetary value.
- If you use **Record simulated contribution**, say so on camera.
- Never claim a real NGO partnership or a real redeemable benefit.

## Fallback for a failed wallet pop-up

If Phantom misbehaves mid-recording: reload, use **Record simulated
contribution** for step 1, and continue. The dashboard, voucher and anti-reuse
flow are unaffected.
