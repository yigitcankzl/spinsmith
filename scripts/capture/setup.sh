#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

cli() {
  timeout 100 npx @iwsdk/cli "$@"
}

if [[ "${1:-}" == "restart" ]]; then
  echo "Restarting the managed IWER capture runtime in headless mode..."
  timeout 150 npx @iwsdk/cli dev restart --headless --open --allow-browser-automation >/dev/null
  cli runtime wait >/dev/null
fi

cli xr exit --input-json '{}' >/dev/null 2>&1 || true
cli browser run scripts/capture/viewport.mjs --timeout 60000 >/dev/null

for _ in 1 2 3; do
  cli xr enter --input-json '{}' >/dev/null 2>&1 || true
  if cli xr status 2>/dev/null | grep -q '"sessionActive": true'; then
    break
  fi
done

cli xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null
cli xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.63,"z":0.12},"orientation":{"pitch":-26,"yaw":0,"roll":0}}' >/dev/null
cli xr status | grep 'sessionActive'
