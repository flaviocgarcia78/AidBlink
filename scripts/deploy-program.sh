#!/usr/bin/env bash
#
# Build, deploy and initialize the AidBlink on-chain program.
#
#   ./scripts/deploy-program.sh [cluster]      # default: devnet
#
# Requires the Solana CLI and the Anchor CLI. The deploy wallet is
# ~/.config/solana/id.json and must hold enough SOL for the program rent.
set -euo pipefail

# Make the CLIs discoverable when installed in the usual locations.
export PATH="$HOME/.local/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"

CLUSTER="${1:-devnet}"

if ! command -v anchor >/dev/null 2>&1; then
  echo "anchor CLI not found on PATH." >&2
  exit 1
fi
if ! command -v solana >/dev/null 2>&1; then
  echo "solana CLI not found on PATH." >&2
  exit 1
fi

# Restore the committed program keypair so a fresh clone keeps the same id.
mkdir -p target/deploy
if [ ! -f target/deploy/aidblink-keypair.json ] && [ -f keys/aidblink-keypair.json ]; then
  cp keys/aidblink-keypair.json target/deploy/aidblink-keypair.json
  echo "Restored program keypair from keys/aidblink-keypair.json"
fi

WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"
echo "Cluster : $CLUSTER"
echo "Wallet  : $WALLET"
echo "Program : $(grep -oE 'aidblink = "[^"]+"' Anchor.toml | head -1 | cut -d'"' -f2)"

BALANCE="$(solana balance "$WALLET" --url "$CLUSTER" 2>/dev/null || echo '?')"
echo "Balance : $BALANCE"

echo
echo "==> anchor build"
anchor build

echo
echo "==> anchor program deploy ($CLUSTER)"
anchor program deploy --provider.cluster "$CLUSTER"

echo
echo "==> initialize pool"
node scripts/init-pool.mjs

echo
echo "Done. Program is live on $CLUSTER."
