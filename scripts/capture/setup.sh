#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

cli() {
  timeout 100 npx @iwsdk/cli "$@"
}

if [[ "${1:-}" == "restart" ]]; then
  echo "Restarting the managed GPU-backed IWER capture runtime..."
  timeout 150 npx @iwsdk/cli dev restart --open --allow-browser-automation >/dev/null
  ready=false
  for _ in $(seq 1 60); do
    if cli dev status 2>/dev/null | grep -q '"browserCommandReady": true'; then
      ready=true
      break
    fi
    sleep 1
  done
  if [[ "$ready" != true ]]; then
    echo "Managed browser did not become command-ready." >&2
    exit 1
  fi
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
# A seated player's view, close enough to read the hands and top profiles without the wide-angle
# distortion of IWER's default spectator camera.
cli xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.45,"z":0.45},"orientation":{"pitch":-34,"yaw":0,"roll":0}}' >/dev/null
cli xr set-device-state --input-json '{"state":{"stereoEnabled":false,"fov":55}}' >/dev/null
cli browser run scripts/capture/mute-audio.mjs --timeout 60000 >/dev/null
cli xr status | grep 'sessionActive'
