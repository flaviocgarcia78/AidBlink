# AidBlink — emergency aid in a single link

> 🌐 **Português (BR):** [README.pt-BR.md](./README.pt-BR.md)

AidBlink turns a Solana Blink (a shareable transaction link) into a transparent
aid pipeline: supporters contribute SOL, an organization allocates the pool to
real needs, and the person in need receives a **one-time benefit voucher** for
food or transport — no wallet, no crypto knowledge required on the receiving
side.

> **Hackathon prototype.** Contributions are real Solana Devnet transactions,
> recorded on-chain by the AidBlink Anchor program. Benefit amounts, partners
> and redemption are simulated. Vouchers have no monetary value.

---

## The problem

People in vulnerable situations often need something small and immediate: one
meal, one bus fare to a clinic. Donations get lost in the distance between the
donor and the person helped, and people in need are rarely able to manage
wallets or on-chain fees.

## Our approach

Keep crypto exactly where it adds value — **funding, transparency and
auditability** — and keep the human flow simple:

| Step | Who | What happens |
| --- | --- | --- |
| 1. Contribute | Supporter | Opens a Blink, sends SOL. Real Devnet transfer. |
| 2. Administer | Organization | Views the pool, records pseudonymous requests, approves a benefit. |
| 3. Deliver | Person in need | Receives a one-time voucher with a QR code. A partner redeems it once. |

The receiving side never touches a wallet. Personal data never touches the
chain — beneficiaries are pseudonymous references such as `BEN-4821`.

## What is real vs. simulated

| Layer | Real (Devnet) | Simulated |
| --- | --- | --- |
| Contribute (Blink) | `donate` instruction records a `Donation` PDA and moves the SOL | USD value at a fixed demo rate |
| Administer | On-chain contributions + treasury balance read from the chain | Requests, beneficiary codes, approval |
| Deliver (voucher) | One-time redemption rule; optional on-chain anchor | Partner, redemption, USD benefit |

The one-time rule is **not** a property of the QR code. It is enforced by an
atomic state transition on the server (`UPDATE ... WHERE status = 'issued'`). A
second redemption is rejected and logged — this is the core of the demo.

## Tech stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Solana**: an **Anchor program** (`programs/aidblink`) that records
  contributions, plus `@solana/web3.js`, wallet-adapter (Phantom) and Solana
  Actions/Blinks
- `qrcode` for voucher QR codes; a file-backed JSON store (no database needed)

## Project structure

```
src/
  app/
    page.tsx                     Landing / problem statement
    contribute/                  Blink + in-app contribution flow
    admin/                       Organization dashboard
    voucher/[id]/                Beneficiary voucher with QR code
    redeem/                      Partner redemption simulator
    api/
      actions/donate/            Solana Action (Blink) GET + POST
      donations/                 List / verify / record contributions
      balance/                   Treasury ledger summary
      requests/                  List / create aid requests
      requests/[id]/approve/     Approve or reject -> issue voucher
      vouchers/                  List vouchers
      vouchers/[id]/             Voucher detail + signed token + QR
      redeem/                    Redeem a voucher exactly once
      redemptions/               Redemption history + rejected attempts
  lib/
    env.ts        Runtime configuration
    solana.ts     Connection, treasury balance, memo anchor
    program.ts    AidBlink program client (encode ix, decode accounts)
    voucher.ts    HMAC-signed voucher tokens
    store.ts      File-backed JSON store (swappable)
    aid.ts        Business logic (approve, redeem, summarize)
    actions.ts    Blink metadata helpers
programs/
  aidblink/       Anchor program: on-chain contribution ledger
public/
  actions.json    Blinks action routing
docs/
  ARCHITECTURE.md, PITCH.md, DEMO_SCRIPT.md, SUBMISSION.md
Dockerfile, docker-compose.yml, .dockerignore
LICENSE
```

## Getting started

### One command (recommended)

`scripts/run.sh` does everything: creates `.env` if missing, installs
dependencies only when needed, picks a free port and starts the app.

```bash
./scripts/run.sh                # dev server (installs if needed)
./scripts/run.sh --prod         # production build, then serve
./scripts/run.sh --smoke        # build + run the end-to-end smoke test, then stop
./scripts/run.sh --port 3100    # force a port (default 3000, auto-picks if busy)
```

Equivalent npm shortcuts:

```bash
npm run demo          # ./scripts/run.sh
npm run demo:prod     # ./scripts/run.sh --prod
npm run verify        # ./scripts/run.sh --smoke
```

The script prints the URL to open. If port 3000 is already taken by another
process it automatically moves to the next free port (e.g. 3001), so the app
always comes up.

### Manual steps

```bash
# 1. Install
npm install

# 2. Configure (defaults work for a local demo)
cp .env.example .env
# Set AIDBLINK_TREASURY_ADDRESS / NEXT_PUBLIC_TREASURY_ADDRESS to your wallet.

# 3. Run
npm run dev        # http://localhost:3000
```

Open:

- `/` — problem and overview
- `/contribute` — contribute SOL (real) or record a simulated contribution
- `/admin` — organization dashboard
- `/redeem` — partner simulator

### Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public base URL, used to build links and QR codes |
| `NEXT_PUBLIC_SOLANA_NETWORK` / `NEXT_PUBLIC_SOLANA_RPC_URL` | Cluster + RPC endpoint |
| `AIDBLINK_TREASURY_ADDRESS` / `NEXT_PUBLIC_TREASURY_ADDRESS` | Public address that receives contributions |
| `AIDBLINK_PROGRAM_ID` | Deployed AidBlink program id (defaults to the devnet program in this repo) |
| `AIDBLINK_VOUCHER_SECRET` | HMAC secret for voucher tokens (server only) |
| `NEXT_PUBLIC_SOL_USD_RATE` | Illustrative SOL/USD rate for budgeting |
| `AIDBLINK_ANCHOR_SECRET_KEY` | Optional server keypair to anchor redemptions on-chain |
| `AIDBLINK_VOUCHER_TTL_DAYS` | Voucher lifetime (default 30) |

### Scripts

```bash
npm run dev         # development server
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # tsc --noEmit
npm run demo        # one-command setup + dev server (scripts/run.sh)
npm run demo:prod   # one-command production build + serve
npm run verify      # build + end-to-end smoke test
node scripts/gen-keys.mjs   # generate a treasury + anchor keypair
node scripts/init-pool.mjs  # create the on-chain pool account after deploy
node scripts/smoke.mjs      # end-to-end API smoke test (server must be running)
```

## Running with Docker

The app ships with a multi-stage `Dockerfile` (Next.js `standalone` output) and a
`docker-compose.yml` for a one-command demo.

```bash
# 1. Provide runtime configuration (treasury address + voucher secret).
cp .env.example .env

# 2. Build and start.
docker compose up --build

# 3. Open http://localhost:3000
```

Notes:

- **`NEXT_PUBLIC_*` values are inlined at build time.** Changing the app URL,
  network or treasury display address requires a rebuild:
  `docker compose build --no-cache`.
- Server-only secrets (`AIDBLINK_VOUCHER_SECRET`, `AIDBLINK_ANCHOR_SECRET_KEY`)
  are injected at **runtime**, never baked into the image.
- The file-backed demo store lives on the named volume `aidblink-data`
  (`/app/.data`), so state survives container restarts. Reset it with
  `docker compose down -v`.
- Run the built image directly with `docker run --rm -p 3000:3000 --env-file
  .env aidblink:latest`.

## The on-chain program

Contributions are recorded by the Anchor program in `programs/aidblink`
(devnet id `BsNDtwVsmxpMSnnoUiiadhjnRvxJ8huuZWZ5vcrFCrrg`). A `donate`
instruction creates a `Donation` PDA **and** moves the SOL to the treasury in
the same instruction. `GET /api/donations` reads those PDAs back with
`getProgramAccounts`, so the "Recent contributions" list is the chain itself.

| Item | Value |
| --- | --- |
| Instructions | `initialize_pool(treasury)`, `donate(lamports, memo, nonce)` |
| Pool PDA | `[b"pool"]` — authority, treasury, totals |
| Donation PDA | `[b"donation", donor, nonce]` — donor, lamports, index, timestamp, memo |

Build and deploy (needs the [Solana CLI](https://solana.com/docs/intro/installation)
and the [Anchor CLI](https://github.com/coral-xyz/anchor/releases)):

```bash
anchor build                  # -> target/deploy/aidblink.so
anchor keys sync              # only if you regenerate the program keypair
anchor deploy                 # deploys to the cluster in Anchor.toml (devnet)
node scripts/init-pool.mjs    # creates the [b"pool"] account
```

The deploy wallet is `~/.config/solana/id.json` and must hold Devnet SOL
(roughly 1–2 SOL for the program account). Fund it at
https://faucet.solana.com, or use `solana airdrop 2`.

> **Deploy keypair.** `scripts/deploy-program.sh` restores the program keypair
> from `keys/aidblink-keypair.json` if `target/deploy/` is missing, so a fresh
> clone deploys to the same program id. That keypair is the program's **upgrade
> authority** — it is Devnet-only and must be rotated for production.

## The Blink (Solana Action)

`public/actions.json` maps `/contribute` to `/api/actions/donate`. The endpoint
implements the Actions spec:

- `GET /api/actions/donate` → action metadata (title, icon, preset amounts)
- `POST /api/actions/donate?amount=0.1` with `{ "account": "<pubkey>" }` → base64
  unsigned transaction to sign and send

CORS and `X-Action-Version` / `X-Blockchain-Ids` headers are set, so any
Blink-compatible client can use the link (try it on https://dial.to).

## Voucher tokens

A voucher is an off-chain record plus a compact signed token:

```
base64url(payloadJson) + "." + base64url(HMAC_SHA256(payload, secret))
```

The payload contains the voucher id, category, amount, pseudonymous reference,
issuer and expiry. The partner can prove authenticity without a database lookup,
while single use is enforced server-side. See `docs/ARCHITECTURE.md` for the
security model.

## Optional on-chain anchoring

If `AIDBLINK_ANCHOR_SECRET_KEY` is set **and funded**, each redemption writes a
short SPL Memo transaction, anchoring the event for auditability. When the key
is missing or unfunded, anchoring is skipped silently and redemption still
succeeds. Fund the anchor account with Devnet SOL (e.g. `solana airdrop 1
<ANCHOR_PUBLIC>` or https://faucet.solana.com).

## Privacy

- No personally identifiable information on-chain or in voucher tokens.
- Beneficiaries are referenced by pseudonymous codes only.
- The voucher secret stays server-side.

## Roadmap

- Real partner integrations (merchant terminal, reimbursement settlement)
- Program-derived-account vouchers with on-chain single-use enforcement
- Multiple organizations with scoped treasuries
- Live SOL/USD price feed
- Postgres/institutional database behind the same store interface

## Disclaimer

AidBlink is a hackathon prototype. It is not a financial product, is not
affiliated with any real aid organization, and its vouchers cannot be exchanged
for goods or services.

## License

Released under the [MIT License](./LICENSE). © 2026 AidBlink contributors.
