#!/usr/bin/env bash
# Helpers for one continuous take (scripts/capture/long-rec.mjs). Usage:
#   long.sh start OUT | flush | stop | auto [n leases] | steps '<json step>' ...
set -euo pipefail
cd "$(dirname "$0")/../.."
STATE=.long-out
run() { LONG_OUT="$(cat "$STATE")" LONG_PART=$1 npx @iwsdk/cli browser run scripts/capture/long-rec.mjs --timeout 105000 | jq -c '.data.result // .error // .'; }
case "$1" in
  start) realpath -m "$2" > "$STATE"; rm -f "$(cat "$STATE")"; run start ;;
  flush|stop) run "$1" ;;
  auto) for ((i = 0; i < ${2:-1}; i++)); do o=$(run auto); echo "$o"; grep -q '"stopReason":"budget"' <<<"$o" || break; done ;;
  steps) shift; scripts/drive.sh "$@" | cut -c1-300 || true; run flush ;;
esac
