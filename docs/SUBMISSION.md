# AidBlink — Submission guide

Everything needed to publish the project and record the two Colosseum videos.

## Repository checklist

- [ ] Code pushed to a public GitHub repository.
- [ ] `README.md` explains the problem, the flow, how to run, and the
      real-vs-simulated boundary.
- [ ] `.env` is **not** committed (`.gitignore` excludes it); `.env.example`
      documents every variable.
- [ ] `npm install && npm run build` passes from a clean clone.
- [ ] `node scripts/smoke.mjs` passes against a running server.
- [ ] License file added (optional, recommended).

## Videos (two separate files)

| Video | Length | Script |
| --- | --- | --- |
| Pitch / presentation | 2–3 min | `docs/PITCH.md` |
| Product demo | ≤ 3 min | `docs/DEMO_SCRIPT.md` |

Recording tips:

- Record at 1440×900 or higher, browser at 100% zoom.
- Narrate the **one-time voucher** insight — it is the differentiator.
- Always state which parts are simulated. Do not claim a real NGO partnership or
  a redeemable benefit.

## Run the project (for judges)

```bash
npm install
cp .env.example .env          # set AIDBLINK_TREASURY_ADDRESS
npm run dev                   # http://localhost:3000
```

Optional, to prove live on-chain activity:

```bash
# Fund an anchor account so redemptions are anchored on-chain
solana airdrop 1 <ANCHOR_PUBLIC> --url devnet
# Or use https://faucet.solana.com
```

Then try the flow: `/contribute` → `/admin` → `/voucher/[id]` → `/redeem`
(redeem twice to see the anti-reuse rejection).

## What is real vs. simulated (state this in the submission)

- **Real:** Solana Devnet contributions, on-chain verification, treasury balance
  reads, optional memo anchoring, one-time redemption enforcement.
- **Simulated:** USD benefit values, partners, redemption at a real merchant,
  and the vouchers themselves (no monetary value).

## Mapping to typical judging criteria

| Criterion | Where it shows |
| --- | --- |
| Problem & impact | `README.md`, `docs/PITCH.md` (the donation→aid gap) |
| Product & execution | Full working flow: contribute → administer → deliver → redeem |
| Use of Solana / Blinks | Standard Action endpoint, real transfers, optional anchor |
| Originality | One-time voucher mechanism + explicit real/simulated boundary |
| Technical depth | `docs/ARCHITECTURE.md` (token signing, atomic single-use, threat model) |
| Feasibility | Small, extensible codebase; clear production roadmap |
| Presentation | Two focused videos with scripts |

## Demo day fallbacks

- **Airdrop dry / no Devnet SOL:** use *Record simulated contribution* and say so;
  the rest of the flow is unaffected.
- **Wallet extension issues:** reload, or skip the wallet step and use the
  simulator for step 1.
- **RPC latency:** the treasury balance may show `unavailable` briefly; click
  **Refresh** on the dashboard.

## Honest claims only

Safe claims:

- "Contributions are real Solana Devnet transactions."
- "Vouchers are one-time and the second redemption is rejected by the server."
- "No personal data is written on-chain."

Avoid:

- "We partner with [real company]."
- "The voucher can be spent at [real store]."
- "This is production-ready."
