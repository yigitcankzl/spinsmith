#!/usr/bin/env bash
# First Five Minutes, end to end in the managed IWER browser (dev server running, office_small room):
# a fresh save, ENTER, then a new player's first match driven with the emulated hands over several
# browser leases (each is capped at 110 s; the game is paused between them), then the JSON summary.
set -euo pipefail

cd "$(dirname "$0")/.."

CLI=(npx @iwsdk/cli)
PROBE=scripts/check-first-five.mjs
LEASES=${FIRST_FIVE_LEASES:-8}
STORAGE="$(mktemp)"

restore_storage() {
  SPINSMITH_STORAGE_FILE="$STORAGE" SPINSMITH_STORAGE_MODE=restore \
    "${CLI[@]}" browser run scripts/capture/storage.mjs --timeout 30000 >/dev/null 2>&1 || true
  rm -f "$STORAGE"
}
trap restore_storage EXIT

status="$("${CLI[@]}" dev status)"
jq -e '.data.state.browserCommandReady == true' >/dev/null <<<"$status" || {
  echo 'Managed IWSDK browser is not ready. Run: npx @iwsdk/cli dev up' >&2
  exit 1
}

SPINSMITH_STORAGE_FILE="$STORAGE" SPINSMITH_STORAGE_MODE=save \
  "${CLI[@]}" browser run scripts/capture/storage.mjs --timeout 30000 >/dev/null

echo 'first-five: fresh save, reload' >&2
FIRST_FIVE_PART=fresh "${CLI[@]}" browser run "$PROBE" --timeout 30000 >/dev/null
# The reload follows the command; let the new page generation load before entering XR.
sleep 2
"${CLI[@]}" runtime wait --timeout 60000 >/dev/null
scripts/emu.sh enter
"${CLI[@]}" browser run scripts/capture/mute-audio.mjs --timeout 30000 >/dev/null

for ((i = 1; i <= LEASES; i++)); do
  echo "first-five: drive lease $i/$LEASES" >&2
  out="$(FIRST_FIVE_PART=drive "${CLI[@]}" browser run "$PROBE" --timeout 105000)" || {
    printf '%s\n' "$out" >&2
    echo 'first-five drive lease failed' >&2
    exit 1
  }
  jq -c '.data.result | {phase, gameSeconds, secondsTo, done}' <<<"$out" >&2
  if jq -e '.data.result.done == true' >/dev/null <<<"$out"; then break; fi
done

out="$(FIRST_FIVE_PART=report "${CLI[@]}" browser run "$PROBE" --timeout 30000)" || {
  printf '%s\n' "$out" >&2
  echo 'First Five Minutes check failed' >&2
  exit 1
}
if ! jq -e '.data.result.ok == true' >/dev/null <<<"$out"; then
  printf '%s\n' "$out" >&2
  echo 'First Five Minutes check failed' >&2
  exit 1
fi
jq '.data.result' <<<"$out"
