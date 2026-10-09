#!/usr/bin/env bash
#
# Stop AidBlink processes started by scripts/run.sh (dev or prod).
#
#   ./scripts/stop.sh              stop the web servers only
#   ./scripts/stop.sh --validator  also stop a local solana-test-validator
#   ./scripts/stop.sh --all        same as --validator
#
# Safety: it only targets processes whose working directory is this repository,
# so unrelated Node projects on the machine are never touched. Other Node
# servers keep running.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

GREEN="\033[32m"; YELLOW="\033[33m"; RESET="\033[0m"
info() { printf "${GREEN}▸${RESET} %s\n" "$1"; }
warn() { printf "${YELLOW}!${RESET} %s\n" "$1"; }

STOP_VALIDATOR=0
for arg in "$@"; do
  case "$arg" in
    --validator|--all) STOP_VALIDATOR=1 ;;
    -h|--help)
      sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) warn "unknown option: $arg"; exit 1 ;;
  esac
done

# Print PIDs matching a pgrep pattern whose cwd is this repo root.
collect() {
  local pattern="$1" pid cwd
  for pid in $(pgrep -f "$pattern" 2>/dev/null || true); do
    [ "$pid" = "$$" ] && continue
    cwd="$(readlink "/proc/$pid/cwd" 2>/dev/null || true)"
    [ "$cwd" = "$ROOT" ] && echo "$pid"
  done
}

stop_pids() {
  local label="$1"; shift
  local -a pids=("$@")
  [ "${#pids[@]}" -eq 0 ] && { info "No ${label} running."; return 0; }

  info "Stopping ${label}: ${pids[*]}"
  kill "${pids[@]}" 2>/dev/null || true

  local _ pid remaining
  for _ in $(seq 1 20); do
    remaining=0
    for pid in "${pids[@]}"; do
      kill -0 "$pid" 2>/dev/null && remaining=1
    done
    [ "$remaining" -eq 0 ] && break
    sleep 0.5
  done

  for pid in "${pids[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      warn "Force-killing $pid"
      kill -9 "$pid" 2>/dev/null || true
    fi
  done
}

mapfile -t WEB < <(
  { collect 'scripts/run.sh'; collect 'next start'; collect 'next-server'; collect 'npm run start'; } | sort -un
)
stop_pids "AidBlink web server(s)" "${WEB[@]}"

if [ "$STOP_VALIDATOR" -eq 1 ]; then
  mapfile -t VAL < <(collect 'solana-test-validator' | sort -un)
  stop_pids "local solana-test-validator" "${VAL[@]}"
fi

info "Done."
