#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

CLI=(npx @iwsdk/cli)
MODES=(
  single-rip dual-rip intent-preview ramp-release finger-groove rim-spring crossguard forge-wheel
  ember-plant flick rub palm-gust palm-gust-left palm-forge outer-ring
  arena-morph-tutorial arena-morph-squeeze arena-morph-stretch arena-morph-twist
  arena-morph-tilt arena-morph-cancel
)

status="$("${CLI[@]}" dev status)"
if ! grep -Eq '"browserCommandReady"[[:space:]]*:[[:space:]]*true' <<<"$status"; then
  echo "Managed IWER browser is not ready. Start it with npm run dev first." >&2
  exit 1
fi

xr_status="$("${CLI[@]}" xr status --input-json '{}')"
if ! grep -Eq '"sessionActive"[[:space:]]*:[[:space:]]*true' <<<"$xr_status"; then
  "${CLI[@]}" xr enter --input-json '{}' >/dev/null
fi
"${CLI[@]}" xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null

# HANDS_ISOLATE=1 starts each mode from a freshly loaded page (default: one page, faster): one
# probe's leftover tops, locks, cards or save state must not decide the next probe's result.
isolate() {
  [ "${HANDS_ISOLATE:-0}" = 1 ] || return 0
  "${CLI[@]}" browser reload >/dev/null 2>&1 || true
  "${CLI[@]}" runtime wait --timeout 60000 >/dev/null 2>&1 || true
  for _ in 1 2 3; do
    "${CLI[@]}" xr status --input-json '{}' 2>/dev/null | grep -Eq '"sessionActive"[[:space:]]*:[[:space:]]*true' && break
    "${CLI[@]}" xr enter --input-json '{}' >/dev/null 2>&1 || true
    sleep 2
  done
  "${CLI[@]}" xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1 || true
  bash scripts/emu.sh front >/dev/null 2>&1 || true
  # Let the first frames' shader compiles pass: a turn sampled at a few fps reads short.
  sleep 4
}

run_check() {
  local mode="$1"
  local output
  isolate
  echo "[hands] $mode"
  if ! output="$(HAND_CHECK="$mode" "${CLI[@]}" browser run scripts/check-hand-mechanic.mjs --timeout 100000 2>&1)"; then
    printf '%s\n' "$output" >&2
    return 1
  fi
  echo "[hands] $mode passed"
}

for mode in "${MODES[@]}"; do
  run_check "$mode"
done

# Ember release used to leak into Finger Groove intermittently. Repeat it enough to catch that race.
for attempt in 1 2 3 4 5; do
  echo "[hands] ember release stress $attempt/5"
  run_check ember-plant
done

echo "[hands] all hand mechanics passed"
