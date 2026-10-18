#!/usr/bin/env bash
# Repeatable high-resolution IWER hero frames. These are presentation captures, not Quest proof.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT="${1:-$ROOT/artifacts/capture}"
mkdir -p "$OUT"
cd "$ROOT"

"$ROOT/scripts/capture/setup.sh" "${SPINSMITH_CAPTURE_SETUP:-restart}"
npx @iwsdk/cli browser run scripts/capture/prepare-forge-hero.mjs --timeout 60000 >/dev/null

# Live arena deformation: enter a real bout with the hand driver, then hold the two rim grips at
# maximum squeeze/twist/tilt while the cinematic capture patches the IWER presentation layer.
SPINSMITH_CAPTURE_SKIP_SETUP=1 SPINSMITH_CAPTURE_POSE=arena-forge \
  scripts/capture/cinematic.sh "$OUT/01-arena-forge-hero.png"
# Let the deliberately long capture hold release and both hands park before the independent palm
# proof begins. Starting the next test during that hold correctly registers extra interventions.
npx @iwsdk/cli browser run scripts/capture/finish-pose.mjs --timeout 90000 >/dev/null

# The production palm gesture drives a top across the declared physical table boundary. The test
# asserts the bonus and persisted trophy before the cinematic frame is taken.
# Start from a fresh game state; presentation recordings intentionally mutate a live bout and must
# never leak that state into the independent proof.
"$ROOT/scripts/capture/setup.sh" restart >/dev/null
npm run check:desk-ko >/dev/null
# The result word sits above the score card; give this proof six extra vertical degrees instead of
# shrinking the game UI or clipping the rule at the top of the frame.
npx @iwsdk/cli xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.45,"z":0.45},"orientation":{"pitch":-28,"yaw":0,"roll":0}}' >/dev/null
npx @iwsdk/cli xr set-device-state --input-json '{"state":{"stereoEnabled":false,"fov":60}}' >/dev/null
SPINSMITH_CAPTURE_SKIP_SETUP=1 SPINSMITH_CAPTURE_POSE=desk-ko \
  scripts/capture/cinematic.sh "$OUT/02-desk-ko-hero.png"

echo "Hero captures:"
echo "  $OUT/01-arena-forge-hero.png"
echo "  $OUT/02-desk-ko-hero.png"
