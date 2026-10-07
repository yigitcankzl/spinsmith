#!/usr/bin/env bash
# Drives the emulated hands (dev server started with --allow-browser-automation).
# Each argument is one step as JSON: '["rip",{"power":0.9}]' '["wait",3]' '["state"]'.
# Prints the game state after the last step. See .claude/skills/drive/SKILL.md.
set -euo pipefail
cd "$(dirname "$0")/.."
printf '[%s]' "$(IFS=,; echo "$*")" > .drive.json
npx @iwsdk/cli browser run scripts/drive.mjs --timeout "${DRIVE_TIMEOUT:-60000}" 2>&1 | node -e '
let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try { const j = JSON.parse(s); console.log(j.ok ? JSON.stringify(j.data.result) : JSON.stringify(j.error ?? j)); }
  catch { console.log(s); }
});' 
