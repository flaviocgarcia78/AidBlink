# AidBlink — Architecture

> 🌐 **Português (BR):** [ARCHITECTURE.pt-BR.md](./ARCHITECTURE.pt-BR.md)

## Overview

AidBlink is a single Next.js application. It exposes one web UI for three roles
(donor, organization, partner) and a small HTTP API, including a standard
Solana Action (Blink) endpoint for contributions.

```
                 Solana Devnet
        ┌──────────────────────────────────────────┐
        │  AidBlink program                         │
        │    ├─ Pool PDA      (treasury + totals)   │
        │    └─ Donation PDAs (one per contribution)│
        │  Treasury wallet (receives the SOL)       │
        │  Optional Memo anchor for redemptions     │
        └───────────────┬──────────────────────────┘
                        │ RPC
┌───────────────────────┴────────────────────────────────┐
│                     Next.js app                         │
│                                                         │
│  /contribute  ──► /api/actions/donate ──► build tx      │
│      │                    ▲                             │
│      │                    │ Blink spec (GET/POST)       │
│      ▼                    │                             │
│  wallet.sign & send ──────┘                             │
│      │                                                  │
│      ▼                                                  │
│  /api/donations ◄── read Donation PDAs (chain) ─────────┤
│                                          │              │
│  /admin ── /api/requests ── approve ──► Voucher ────────┤
│                                          │  HMAC token  │
│  /voucher/[id] ◄── signed token + QR ◄───┘              │
│      │                                                  │
│      ▼                                                  │
│  /redeem ── /api/redeem ── atomic status change ──► anchor (opt.)
│                                                         │
│                  File-backed JSON store                 │
│          (requests, vouchers, redemptions, demo)        │
└─────────────────────────────────────────────────────────┘
```

## Roles and flows

### 1. Contribute (donor)

1. The page (or any Blink client) calls `POST /api/actions/donate?amount=N`
   with the donor's public key.
2. The server builds an `aidblink::donate` instruction: it records the
   contribution in a new `Donation` PDA *and* transfers the SOL to the treasury
   in the same atomic instruction. The donor is the fee payer; a recent blockhash
   is attached and the transaction is returned base64-encoded.
3. The wallet signs and sends it.
4. `GET /api/donations` reads the `Donation` PDAs straight from the program
   (`getProgramAccounts`), so the "Recent contributions" list is the chain
   itself — nothing is copied into a database for on-chain entries.

`simulated: true` entries are stored locally and labelled `source: "simulated"`;
they never count toward the on-chain ledger.

### 2. Administer (organization)

- `POST /api/requests` creates a request containing a **pseudonymous reference**
  only (`beneficiaryRef`), a category and a USD amount.
- `POST /api/requests/:id/approve` performs an atomic transition
  `pending → approved` and issues a voucher. It also enforces a **budget guard**:
  the request amount cannot exceed `raised − allocated` (computed from the
  on-chain ledger), so `Available` never goes negative.
- `GET /api/balance` returns the ledger summary plus the live on-chain treasury
  balance.

### 3. Deliver (beneficiary + partner)

- `GET /api/vouchers/:id` returns the voucher, a signed token and a QR code
  whose content is the partner redemption URL (`/redeem?token=...`).
- `POST /api/redeem` verifies the token and performs an atomic
  `issued → redeemed` transition. It moves **no** on-chain value: the only
  optional on-chain side effect is the audit memo. The SOL stays in the treasury.

## Demo authentication

`/admin` (organization) and `/redeem` (partner) are gated by a lightweight demo
login. Credentials come from environment variables with safe defaults; a signed,
HttpOnly cookie (`aidblink_session`) carries the role. Page components read the
session server-side (`src/lib/auth.ts`) and redirect to `/login`; the mutating
API routes (`POST /api/requests`, `/api/requests/:id/approve`, `POST /api/redeem`)
call `requireRole(...)`, so the gate cannot be bypassed by calling the API
directly. Reads (balances, lists) stay public and contain only pseudonymous
data. This is a demo gate, not production authN.

## Voucher security model

A voucher has two parts:

1. **An off-chain record** in the store (source of truth for status).
2. **A signed token** handed to the partner:

   ```
   token = base64url(payload) + "." + base64url(HMAC_SHA256(payload, secret))
   payload = { v, id, cat, amt, ref, org, iat, exp, nonce }
   ```

Properties:

| Property | How it is achieved |
| --- | --- |
| **Authenticity** | HMAC signature; a partner cannot forge or alter amount/category. |
| **Integrity** | Any modification invalidates the signature (`timingSafeEqual`). |
| **Expiry** | `exp` is checked against server time before redemption. |
| **Single use** | Atomic `issued → redeemed` transition inside a serialized read-modify-write. |
| **Tamper evidence** | Invalid/tampered tokens are rejected and logged. |
| **Privacy** | Only a pseudonymous `ref`; no personal data in the token or on-chain. |
| **Auditability** | Optional SPL Memo anchor per redemption. |

### Why single use is *not* a QR property

A QR code is just an image of a token. If single use depended on the QR, copying
the image would defeat it. In AidBlink the rule lives in the **server-side state
machine**:

```
redeem(token):
  verify signature ──► reject if invalid
  check expiry      ──► reject if expired
  atomically:
     if status == 'issued'  -> status = 'redeemed'; record redemption
     else                   -> reject and log the attempt
```

The read-modify-write cycle is serialized by an in-process mutex
(`src/lib/store.ts`), so two simultaneous scans cannot both succeed. For a
multi-instance deployment this would become a database transaction or a
conditional `UPDATE ... WHERE status = 'issued'`.

## Solana integration

- **Cluster:** Devnet by default (`NEXT_PUBLIC_SOLANA_NETWORK`).
- **Program:** `programs/aidblink` — an Anchor program whose id is
  `AIDBLINK_PROGRAM_ID` (see the README for build/deploy steps).
- **Treasury:** a public address; the app needs no private key to receive funds.
- **Blink spec:** `public/actions.json` routes `/contribute` to
  `/api/actions/donate`; the endpoint sets CORS, `X-Action-Version` and
  `X-Blockchain-Ids` headers.
- **Optional anchor:** if `AIDBLINK_ANCHOR_SECRET_KEY` is configured *and funded*,
  each redemption sends an SPL Memo transaction. Failures never block a
  redemption.

### The AidBlink program

| Item | Value |
| --- | --- |
| Instructions | `initialize_pool(treasury)`, `donate(lamports, memo, nonce)` |
| Pool PDA | seeds `[b"pool"]` — stores authority, treasury, totals |
| Donation PDA | seeds `[b"donation", donor, nonce]` — stores donor, lamports, index, timestamp, memo |
| Funds | moved to the treasury wallet by a CPI to the System program, inside `donate` |

The client encodes instructions and decodes accounts itself
(`src/lib/program.ts`) using Anchor's conventions: discriminator
`sha256("global:<ix>")[0..8]`, Borsh-encoded args in declaration order, and
account layout in struct order. This keeps the app dependency-light while the
account layout stays explicit.

## Persistence

`src/lib/store.ts` is a minimal file-backed JSON store (`.data/store.json`)
with an in-process serialization mutex. It auto-seeds demo data on first run.
The interface (`snapshot`, `update`) is intentionally small so it can be
replaced by Postgres/SQLite without touching the routes. `resetStore()` (behind
the organization-only `POST /api/demo/reset`, surfaced as **Reset demo** on the
dashboard) clears the off-chain demo data so a demo can be replayed from a clean
state — it never touches the on-chain ledger or the treasury.

## Configuration

See the table in `README.md`. Key points:

- Non-public env vars are never exposed to the browser bundle.
- The voucher secret is server-only.
- A fixed `NEXT_PUBLIC_SOL_USD_RATE` makes the demo deterministic; production
  would use a live price feed.

## Threat model (scope of this prototype)

| Threat | Mitigation here | Production follow-up |
| --- | --- | --- |
| Forged voucher | HMAC signature | Same, with key rotation / KMS |
| Reused voucher | Atomic status transition | DB transaction / on-chain PDA |
| Tampered amount | Signature over amount+category | Truly on-chain enforcement |
| Fake donation recorded | `donate` writes the record and moves the funds in one instruction | Indexer / webhook |
| Double-counted donation | One `Donation` PDA per tx; listing reads accounts, not client input | Unique constraint |
| Leaked personal data | Pseudonymous refs only | Data-minimization policy |
| Anonymous staff approval | Demo login role gate on pages + mutating APIs | Identity provider (OIDC) + per-user audit log |

## Deliberate non-goals (for the hackathon)

- No proprietary token, no WhatsApp/LLM integration, no multi-organization
  tenancy, no automatic disbursement, no real prepaid card.
- Benefit delivery is under **organization control** by design; the prototype
  proves the mechanism, not a regulated payment rail.

## Extending toward production

1. Replace the JSON store with Postgres and unique constraints.
2. Replace the demo login with a real identity provider and per-user audit logs.
3. Move voucher state to a Solana program (PDA per voucher) for on-chain
   single-use enforcement, keeping the same token interface.
4. Integrate real partners and a reimbursement settlement flow.
5. Add a live price oracle and a public transparency page backed by the chain.
