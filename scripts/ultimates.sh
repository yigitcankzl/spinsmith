#!/usr/bin/env bash
# Records every ultimate with real emulated hand input and cuts one reusable 1080p60 reel.
# Usage: scripts/ultimates.sh [out-dir]
# CAPTURE_USE_RUNNING=1 reuses an automation-enabled managed IWSDK browser.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=${1:-$HOME/Desktop/spinsmith-videos/ultimates}
SHOTS=$OUT/shots
DRIVE=scripts/drive.sh
EMU=scripts/emu.sh
mkdir -p "$SHOTS"

CAPTURE_OWNS_SERVER=0
if [ -z "${CAPTURE_USE_RUNNING:-}" ]; then
  npx @iwsdk/cli dev restart --headless --allow-browser-automation --timeout 60000 >/dev/null
  CAPTURE_OWNS_SERVER=1
fi
cleanup() {
  if [ "$CAPTURE_OWNS_SERVER" = 1 ]; then npx @iwsdk/cli dev down >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

phase() { "$DRIVE" '["peek","phase"]' 2>/dev/null; }
reset_demo() {
  "$DRIVE" '["demo"]' >/dev/null
  "$EMU" enter
  "$DRIVE" '["wait",8]' >/dev/null
  if [ "$(phase)" != '"hub"' ]; then
    echo "Expected hub after demo reset, got $(phase)" >&2
    exit 1
  fi
}

names=(anvil rush magnet tilt hammer ward)
keys=(Digit1 Digit2 Digit3 Digit4 Digit5 Digit6)
clips=()
for i in "${!names[@]}"; do
  reset_demo
  "$DRIVE" '["key","KeyR"]' '["wait",3.5]' >/dev/null
  clip="$SHOTS/$((i + 1))-${names[$i]}.mp4"
  echo "Recording ${names[$i]}"
  if [ "${names[$i]}" = hammer ]; then
    DRIVE_TIMEOUT=100000 DRIVE_VIDEO="$clip" "$DRIVE" \
      '["rip",{"power":0.9,"aim":8}]' '["key","KeyU"]' '["fightAt",3]' '["key","Digit5"]' \
      '["key","KeyJ"]' '["wait",0.8]' '["slap"]' '["wait",0.6]' \
      '["key","KeyG"]' '["key","KeyT"]' '["wait",4]' >/dev/null
  elif [ "${names[$i]}" = ward ]; then
    DRIVE_TIMEOUT=100000 DRIVE_VIDEO="$clip" "$DRIVE" \
      '["rip",{"power":0.9,"aim":8}]' '["key","KeyU"]' '["fightAt",3]' '["key","Digit6"]' \
      '["key","KeyJ"]' '["wait",0.8]' '["slap"]' '["wait",0.6]' \
      '["key","KeyG"]' '["key","KeyT"]' '["wait",4]' >/dev/null
  else
    DRIVE_TIMEOUT=100000 DRIVE_VIDEO="$clip" "$DRIVE" \
      '["rip",{"power":0.9,"aim":8}]' '["key","KeyU"]' '["fightAt",3]' \
      "[\"key\",\"${keys[$i]}\"]" '["wait",0.25]' \
      '["key","KeyJ"]' '["wait",0.8]' '["slap"]' '["wait",4]' >/dev/null
  fi
  test -s "$clip"
  clips+=("$clip")
done

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"; cleanup' EXIT
for clip in "${clips[@]}"; do printf "file '%s'\n" "$clip"; done > "$tmp/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$tmp/list.txt" \
  -c:v libx264 -crf 12 -preset slow -tune animation -pix_fmt yuv420p -r 60 \
  -c:a aac -b:a 256k -movflags +faststart "$OUT/spinsmith-ultimates.mp4"

echo "$OUT/spinsmith-ultimates.mp4"
