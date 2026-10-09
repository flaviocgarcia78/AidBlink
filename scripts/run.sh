#!/usr/bin/env bash
#
# AidBlink — one-command runner.
#
#   ./scripts/run.sh                 install (if needed) + dev server
#   ./scripts/run.sh --prod          install + production build + serve
#   ./scripts/run.sh --smoke         install + build + end-to-end smoke test
#   ./scripts/run.sh --port 3100     use a specific port
#
# It creates .env from .env.example when missing and picks a free port
# automatically when the default (3000) is already taken.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BOLD="\033[1m"; GREEN="\033[32m"; YELLOW="\033[33m"; RED="\033[31m"; RESET="\033[0m"
info() { printf "${GREEN}▸${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }
die()  { printf "${RED}✗${RESET} %s\n" "$1" >&2; exit 1; }

usage() {
  cat <<'EOF'
AidBlink runner

Usage:
  ./scripts/run.sh [options]

Options:
  --dev           Start the development server (default)
  --prod          Build for production, then serve it
  --smoke         Build, start in the background, run the end-to-end smoke test
  --port <n>      Port to listen on (default 3000, auto-picks a free one)
  -h, --help      Show this help
EOF
}

MODE="dev"
SMOKE=0
PORT_SET=0
PORT="${PORT:-3000}"

while [ $# -gt 0 ]; do
  case "$1" in
    --dev) MODE="dev"; shift ;;
    --prod|--start) MODE="prod"; shift ;;
    --smoke) SMOKE=1; MODE="prod"; shift ;;
    --port) PORT="${2:-}"; PORT_SET=1; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option: $1 (try --help)" ;;
  esac
done

[ -n "$PORT" ] || die "--port needs a value"

# 1. Node / npm.
command -v node >/dev/null 2>&1 || die "Node.js not found. Install Node 20+ from https://nodejs.org."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || warn "Node ${NODE_MAJOR} detected; Node 20+ is recommended."
command -v npm >/dev/null 2>&1 || die "npm not found."

# 2. Configuration file.
if [ ! -f .env ]; then
  cp .env.example .env
  info "Created .env from .env.example"
fi
if grep -qE '^AIDBLINK_TREASURY_ADDRESS=([[:space:]]*|1{20,})$' .env; then
  warn "AIDBLINK_TREASURY_ADDRESS is still a placeholder — set your wallet to receive contributions."
fi

# 3. Dependencies (install only when missing or stale).
needs_install=0
[ -d node_modules ] || needs_install=1
if [ -f package-lock.json ] && [ -f node_modules/.package-lock.json ]; then
  [ package-lock.json -nt node_modules/.package-lock.json ] && needs_install=1
fi
if [ "$needs_install" -eq 1 ]; then
  info "Installing dependencies (npm install)..."
  npm install
else
  info "Dependencies already installed."
fi

# 4. Pick a free port.
port_free() {
  node -e 'const net=require("net");const s=net.createServer();s.once("error",()=>process.exit(1));s.once("listening",()=>s.close(()=>process.exit(0)));s.listen(Number(process.argv[1]),"127.0.0.1");' "$1" 2>/dev/null
}
if ! port_free "$PORT"; then
  [ "$PORT_SET" -eq 0 ] || die "Port $PORT is already in use. Pick another with --port <n>."
  ORIG="$PORT"
  while ! port_free "$PORT"; do PORT=$((PORT + 1)); done
  warn "Port $ORIG is busy; using $PORT instead."
fi

APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:$PORT}"

# 5. Smoke test: build, start in the background, test, stop.
if [ "$SMOKE" -eq 1 ]; then
  LOG="${TMPDIR:-/tmp}/aidblink-smoke.log"
  info "Building for production..."
  NEXT_PUBLIC_APP_URL="$APP_URL" npm run build
  info "Starting server on $APP_URL for the smoke test..."
  NEXT_PUBLIC_APP_URL="$APP_URL" PORT="$PORT" npm run start >"$LOG" 2>&1 &
  SRV=$!
  cleanup() { kill "$SRV" >/dev/null 2>&1 || true; pkill -P "$SRV" >/dev/null 2>&1 || true; }
  trap cleanup EXIT
  BASE="$APP_URL" node scripts/smoke.mjs
  echo

  info "Smoke test done (server stopped). Logs: $LOG"
  exit 0
fi

# 6. Dev or production serve.
if [ "$MODE" = "prod" ]; then
  info "Building for production..."
  NEXT_PUBLIC_APP_URL="$APP_URL" npm run build
  info "Serving on ${BOLD}${APP_URL}${RESET} (Ctrl+C to stop)"
  NEXT_PUBLIC_APP_URL="$APP_URL" PORT="$PORT" npm run start
else
  info "Starting dev server on ${BOLD}${APP_URL}${RESET} (Ctrl+C to stop)"
  NEXT_PUBLIC_APP_URL="$APP_URL" PORT="$PORT" npm run dev
fi
