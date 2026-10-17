#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTPUT="${1:-$ROOT/artifacts/capture/spinsmith-cinematic.png}"
BACKGROUND="$ROOT/scripts/capture/assets/comfy-cafe-2k.jpg"
PARAMS="$(mktemp --suffix=.spinsmith-capture.json)"
trap 'rm -f "$PARAMS"' EXIT

mkdir -p "$(dirname "$OUTPUT")"
OUTPUT="$(realpath -m "$OUTPUT")"

cat >"$PARAMS" <<JSON
{
  "output": "$OUTPUT",
  "width": 1920,
  "height": 1080,
  "background": "$BACKGROUND",
  "backgroundYaw": 0,
  "backgroundBlur": 0,
  "backgroundIntensity": 0.9,
  "skinHands": true,
  "disclosure": true,
  "settleFrames": 6
}
JSON

"$ROOT/scripts/capture/setup.sh" "${SPINSMITH_CAPTURE_SETUP:-restart}"
SPINSMITH_CAPTURE_PARAMS="$PARAMS" timeout 120 npx @iwsdk/cli browser run scripts/capture/shot.mjs --timeout 90000
echo "Saved $OUTPUT"
