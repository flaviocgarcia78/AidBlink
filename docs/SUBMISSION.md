# AidBlink — Submission guide

> 🌐 **Português (BR):** [SUBMISSION.pt-BR.md](./SUBMISSION.pt-BR.md)

Everything needed to publish the project and record the two Colosseum videos.

## Repository checklist

- [ ] Code pushed to a public GitHub repository.
- [ ] `README.md` explains the problem, the flow, how to run, and the
      real-vs-simulated boundary.
- [ ] `.env` is **not** committed (`.gitignore` excludes it); `.env.example`
      documents every variable.
- [ ] The Anchor program (`programs/aidblink`) is included and deploys to the
      documented Devnet id (`npm run program:deploy`).
- [ ] `npm install && npm run build` passes from a clean clone.
- [ ] `node scripts/smoke.mjs` passes against a running server.
- [x] MIT `LICENSE` file included.
- [x] `Dockerfile` + `docker-compose.yml` for a one-command run.

## Videos (two separate files)

Both videos are already generated in `docs/demo/` (English, AI voice-over +
soft music), matching the Colosseum lengths:

| Video | Length | File | Script |
| --- | --- | --- | --- |
| Pitch / presentation | 2–3 min | `docs/demo/aidblink-pitch.mp4` | `docs/PITCH.md` |
| Product demo | ≤ 3 min | `docs/demo/aidblink-demo.mp4` | `docs/DEMO_SCRIPT.md` |

Regenerate against a running app:

```bash
npm install --no-save playwright ffmpeg-static
npx playwright install chromium
pip install --target .tts edge-tts
TTS_PYTHONPATH=.tts npm run demo:video   # product demo
TTS_PYTHONPATH=.tts npm run demo:pitch   # presentation video
```

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

The contribution list reads from the AidBlink program already deployed to
Devnet (`AIDBLINK_PROGRAM_ID` in `.env.example`), so judges can contribute with
no extra setup. To redeploy the program yourself:

```bash
npm run program:deploy        # anchor build + deploy (devnet) + init pool
```

Or, with no local Node setup, use Docker:

```bash
cp .env.example .env
docker compose up --build     # http://localhost:3000
```

Optional, to prove live on-chain activity:

```bash
# Fund an anchor account so redemptions are anchored on-chain
solana airdrop 1 <ANCHOR_PUBLIC> --url devnet
# Or use https://faucet.solana.com
```

Then try the flow: `/contribute` → `/admin` (sign in as `org@aidblink.demo` /
`aidblink-org`) → `/voucher/[id]` → `/redeem` (sign in as
`parceiro@aidblink.demo` / `aidblink-parceiro`). Redeem twice to see the
anti-reuse rejection.

## What is real vs. simulated (state this in the submission)

- **Real:** Solana Devnet contributions recorded by the AidBlink Anchor program
  (one `Donation` PDA per contribution), on-chain IDL published, treasury
  balance reads, optional memo anchoring, one-time redemption enforcement.
- **Simulated:** USD benefit values, partners, redemption at a real merchant,
  and the vouchers themselves (no monetary value). Redemption does **not** pay
  the partner or beneficiary on-chain — it only flips the voucher state and,
  optionally, writes an audit memo. The SOL stays in the treasury.
- **Gated (demo login):** the organization dashboard and the partner terminal
  use example users. Mutating API routes enforce the role server-side.

## Mapping to typical judging criteria

| Criterion | Where it shows |
| --- | --- |
| Problem & impact | `README.md`, `docs/PITCH.md` (the donation→aid gap) |
| Product & execution | Full working flow: contribute → administer → deliver → redeem |
| Use of Solana / Blinks | Custom Anchor program, standard Action endpoint, real transactions, optional anchor |
| Originality | One-time voucher mechanism + explicit real/simulated boundary |
| Technical depth | `docs/ARCHITECTURE.md` (on-chain program, token signing, atomic single-use, threat model) |
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
