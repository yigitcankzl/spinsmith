#!/usr/bin/env bash
# One unbroken take, with sound, of a new smith's first session: a fresh save, the first match and its
# lessons, the guided forge visit, the rematch and the rest of the Cinder Circuit (bouts 1-2 to 1-5).
# Needs the capture runtime up (scripts/capture/setup.sh restart). Output: OUT (default below).
set -euo pipefail
cd "$(dirname "$0")/../.."
OUT=${1:-$HOME/Desktop/spinsmith-videos/long-2026-10-25/01-first-session.raw}
L=scripts/capture/long.sh
npx @iwsdk/cli browser run scripts/clear-resume.mjs --timeout 20000 >/dev/null
scripts/drive.sh '["fresh"]' >/dev/null
sleep 2
npx @iwsdk/cli runtime wait --timeout 60000 >/dev/null
scripts/capture/setup.sh >/dev/null
scripts/capture/prepare-room.sh >/dev/null
npx @iwsdk/cli browser run scripts/capture/unmute-audio.mjs --timeout 30000 >/dev/null
$L start "$OUT"
LONG_CARRY=1 LONG_HOLD=16 $L auto 8
$L steps '["tap","menu"]' '["wait",4]'
$L steps '["wait",1.5]' '["tap","forge"]' '["wait",3]'
$L steps '["wait",1.5]' '["drag","Spur","top"]' '["wait",3]' '["tap","tab_ring"]' '["wait",2.5]' '["tap","tab_core"]' '["wait",2.5]' \
  '["tap","tab_look"]' '["wait",2.5]' '["tap","tab_combat"]' '["wait",2.5]' '["tap","tab_tip"]' '["wait",1.5]'
$L steps '["tap","quench"]' '["wait",5]'
for _ in 1 2 3 4 5; do
  LONG_CARRY=1 LONG_HOLD=12 $L auto 6
  $L steps '["tap","menu"]' '["wait",4]'
done
$L stop
