#!/usr/bin/env bash
# The first match's staged DESK KO, end to end in the managed IWER browser (dev server running).
set -euo pipefail

cd "$(dirname "$0")/.."

CLI=(npx @iwsdk/cli)
TIMEOUT=90000

status="$("${CLI[@]}" dev status)"
jq -e '.data.state.browserCommandReady == true' >/dev/null <<<"$status" || {
  echo 'Managed IWSDK browser is not ready. Run: npx @iwsdk/cli dev up' >&2
  exit 1
}

xr="$("${CLI[@]}" xr status)"
if [[ "$(jq -r '.data.result.sessionActive' <<<"$xr")" != true ]]; then
  "${CLI[@]}" xr enter --timeout "$TIMEOUT" >/dev/null
fi
"${CLI[@]}" xr set-input-mode --input-json '{"mode":"hand"}' --timeout "$TIMEOUT" >/dev/null
"${CLI[@]}" browser run scripts/capture/mute-audio.mjs --timeout "$TIMEOUT" >/dev/null
# A page loaded with the emulated head standing puts the arena on the tray: seat it and re-place.
bash scripts/emu.sh front >/dev/null
"${CLI[@]}" browser run scripts/capture/place.mjs --timeout "$TIMEOUT" >/dev/null

echo 'desk-ko-first: fresh first match, forge-lesson round, two-hand squeeze' >&2
out="$("${CLI[@]}" browser run scripts/check-desk-ko-first-match.mjs --timeout 100000)"
if ! jq -e '.data.result.ok == true' >/dev/null <<<"$out"; then
  printf '%s\n' "$out" >&2
  echo 'First-match DESK KO proof failed' >&2
  exit 1
fi
jq '.data.result' <<<"$out"
