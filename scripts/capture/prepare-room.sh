#!/usr/bin/env bash
# Reapply the presentation-only room after a demo-save reload. This changes only the desktop IWER
# capture layer; it is never bundled into the Quest build.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PARAMS="$(mktemp --suffix=.spinsmith-room.json)"
trap 'rm -f "$PARAMS"' EXIT

printf '%s\n' \
  '{' \
  '  "screenshot": false,' \
  '  "width": 1920,' \
  '  "height": 1080,' \
  "  \"background\": \"$ROOT/scripts/capture/assets/empty-room-2k.jpg\"," \
  '  "backgroundYaw": 0,' \
  '  "backgroundBlur": 0,' \
  '  "backgroundIntensity": 0.9,' \
  '  "skinHands": true,' \
  '  "devTable": true,' \
  '  "disclosure": false,' \
  '  "settleFrames": 4' \
  '}' >"$PARAMS"

cd "$ROOT"
SPINSMITH_CAPTURE_PARAMS="$PARAMS" \
  npx @iwsdk/cli browser run scripts/capture/shot.mjs --timeout 90000
