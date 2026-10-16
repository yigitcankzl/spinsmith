#!/usr/bin/env bash
# Drives the emulated hands (dev server started with --allow-browser-automation).
# Each argument is one step as JSON: '["rip",{"power":0.9}]' '["wait",3]' '["state"]'.
# Prints the game state after the last step. DRIVE_VIDEO=clip.mp4 also records a video.
set -euo pipefail
cd "$(dirname "$0")/.."
printf '[%s]' "$(IFS=,; echo "$*")" > .drive.json
# DRIVE_VIDEO=/path/clip.mp4 records the page while the steps run.
if [ -n "${DRIVE_VIDEO:-}" ]; then realpath -m "$DRIVE_VIDEO" > .drive-video; else rm -f .drive-video; fi
npx @iwsdk/cli browser run scripts/drive.mjs --timeout "${DRIVE_TIMEOUT:-100000}" 2>&1 | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try { const j = JSON.parse(s); console.log(j.ok ? JSON.stringify(j.data.result) : JSON.stringify(j.error ?? j)); }
  catch { console.log(s); }
});' 
