#!/usr/bin/env bash
# Records a broad, editable SpinSmith footage library rather than a short trailer.
# Output: named 1080p60 source clips plus one continuous full-showcase cut.
# CAPTURE_USE_RUNNING=1 reuses an automation-enabled managed browser.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=${1:-$HOME/Desktop/spinsmith-videos/full-showcase}
SHOTS=$OUT/shots
mkdir -p "$SHOTS"

DRIVE=scripts/drive.sh
EMU=scripts/emu.sh
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
rec() {
  local file=$1
  shift
  echo "Recording $file"
  local result
  if ! result=$(DRIVE_TIMEOUT=100000 DRIVE_VIDEO="$SHOTS/$file" "$DRIVE" "$@"); then
    echo "$result" >&2
    return 1
  fi
}
phase() { "$DRIVE" '["peek","phase"]' 2>/dev/null; }

CAPTURE_OWNS_SERVER=0
if [ -z "${CAPTURE_USE_RUNNING:-}" ]; then
  echo "Starting a visible, hardware-accelerated IWSDK capture browser..."
  npx @iwsdk/cli dev restart --open --allow-browser-automation --timeout 60000 >/dev/null
  CAPTURE_OWNS_SERVER=1
fi
cleanup() {
  if [ "$CAPTURE_OWNS_SERVER" = 1 ]; then npx @iwsdk/cli dev down >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

reset_demo() {
  "$DRIVE" '["demo"]' >/dev/null
  "$EMU" enter
  "$DRIVE" '["wait",8]' >/dev/null
  if [ "$(phase)" != '"hub"' ]; then
    echo "Expected hub after demo reset, got $(phase)" >&2
    exit 1
  fi
}

arena_to() {
  local index=$1
  for ((i = 0; i < index; i++)); do "$DRIVE" '["key","KeyA"]' '["wait",0.12]' >/dev/null; done
}

echo "SpinSmith full-showcase capture: $OUT"

# 01. The persistent home: order board and champion selection.
reset_demo
rec 01-hub-progression.mp4 \
  '["wait",2]' '["tap","order"]' '["wait",4]' '["tap","champion"]' '["wait",4]'

# 02. Three strongly different silhouettes together: Striker, Anvil and Halo.
reset_demo
rec 02-top-lineup.mp4 '["key","KeyV"]' '["wait",8]' '["key","KeyV"]' '["wait",1]'

# 03. A real forge pass: compare unlocked rings, then fit a low core/steady tip and change style.
reset_demo
rec 03-forge-customization.mp4 \
  '["tap","forge"]' '["wait",2.5]' \
  '["tap","tab_ring"]' '["wait",1]' \
  '["drag","Halo","top"]' '["wait",1]' \
  '["drag","Gale","top"]' '["wait",1]' \
  '["drag","Bulwark","top"]' '["wait",1]' \
  '["drag","Anvil","top"]' '["wait",1]' \
  '["tap","tab_core"]' '["wait",1]' '["drag","Stub","top"]' '["wait",1]' \
  '["tap","tab_tip"]' '["wait",1]' '["drag","Dome","top"]' '["wait",1]' \
  '["tap","tab_style"]' '["wait",1]' \
  '["tap","Spin"]' '["wait",1]' '["tap","Rust23"]' '["wait",1]' \
  '["tap","Emblem_glow"]' '["wait",1]' '["tap","Strike"]' '["wait",1]' \
  '["drag","top","quench"]' '["wait",4]'

# 04. The forged Anvil/Stub/Dome build in the fast Ember Ring.
rec 04-custom-top-ember-fight.mp4 \
  '["key","KeyA"]' '["wait",2]' '["key","KeyR"]' '["wait",3.5]' \
  '["rip",{"power":0.95,"aim":12,"twist":-0.7}]' '["fightAt",3]' \
  '["ramp",{"hold":0.35}]' '["wait",3]' '["key","KeyK"]' '["wait",8]'

# 05. Build an arena by hand: square clockwork ridge, pit, bumper, boost pad, turntable,
# circling pillars and a wider rim; Save starts a match in the finished arena.
reset_demo
rec 05-arena-workshop.mp4 \
  '["tap","workshop"]' '["wait",2.5]' \
  '["tap","form"]' '["wait",1]' '["drag","square","arena_center"]' '["wait",1]' \
  '["drag","theme","arena_center"]' '["wait",0.8]' '["drag","theme","arena_center"]' '["wait",1]' \
  '["tap","floor"]' '["wait",1]' '["drag","ridge","arena_center"]' '["wait",1]' \
  '["tap","pieces"]' '["wait",1]' \
  '["drag","slag_pit","arena_rim_left"]' '["wait",1]' \
  '["drag","bumper","arena_left"]' '["wait",1]' \
  '["drag","boost_pad","arena_right"]' '["wait",1]' \
  '["tap","extras"]' '["wait",1]' '["drag","turntable","arena_center"]' '["wait",1]' \
  '["drag","circling_pillars","arena_center"]' '["wait",1]' \
  '["arenaResize"]' '["wait",2]' \
  '["tap","save"]' '["wait",5]'

if [ "$(phase)" != '"ready"' ] && [ "$(phase)" != '"result"' ]; then
  echo "Workshop did not start the saved arena match: $(phase)" >&2
  exit 1
fi

# 06. Fight in the arena just authored above.
rec 06-custom-arena-fight.mp4 \
  '["rip",{"power":0.9,"aim":-10}]' '["fightAt",3]' \
  '["ramp",{"hold":0.4}]' '["wait",2]' '["key","KeyJ"]' '["slap"]' '["wait",3]' \
  '["key","KeyO"]' '["wait",8]'

# 07. Every built-in arena, in order. The labelled version is made below.
reset_demo
arena_steps=()
for ((i = 0; i < 15; i++)); do
  arena_steps+=('["wait",2.4]')
  if [ "$i" -lt 14 ]; then arena_steps+=('["key","KeyA"]'); fi
done
rec 07-all-arenas-raw.mp4 "${arena_steps[@]}"

arenas=(
  "FORGE BOWL" "EMBER RING" "ZERO-G DISH" "CLOCKWORK SPIRE" "FROST OVAL"
  "SUMO SQUARE" "TITAN CRATER" "TWIN BASINS" "RIPPLE POOL" "COLOSSUS BOWL"
  "NEON SPEEDWAY" "ORBIT FOUNDRY" "GLACIER STEPS" "METEOR PIT" "GRAND ANVIL"
)
arena_filter="fps=60"
for i in "${!arenas[@]}"; do
  start=$(awk -v n="$i" 'BEGIN { printf "%.1f", n * 2.4 }')
  end=$(awk -v n="$i" 'BEGIN { printf "%.1f", (n + 1) * 2.4 }')
  arena_filter+=",drawtext=fontfile=$FONT:text='${arenas[$i]}':fontcolor=0xffa24a:fontsize=48:x=50:y=45:box=1:boxcolor=0x101218@0.72:boxborderw=18:enable='between(t,$start,$end)'"
done
ffmpeg -y -loglevel error -i "$SHOTS/07-all-arenas-raw.mp4" -vf "$arena_filter" \
  -c:v libx264 -crf 14 -preset slow -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart "$SHOTS/07-all-arenas-labelled.mp4"

# 08-10. Real bouts on arenas whose physical rules look and play differently.
reset_demo
arena_to 2
rec 08-zero-g-dish-fight.mp4 \
  '["key","KeyR"]' '["wait",3.5]' '["rip",{"power":0.72,"steep":0.55,"twist":1}]' \
  '["wait",7]' '["key","KeyK"]' '["wait",8]'

reset_demo
arena_to 5
rec 09-sumo-square-fight.mp4 \
  '["key","KeyR"]' '["wait",3.5]' '["rip",{"power":0.98,"aim":14}]' \
  '["fightAt",3]' '["key","KeyJ"]' '["slap"]' '["wait",3]' '["key","KeyO"]' '["wait",8]'

reset_demo
arena_to 10
rec 10-neon-speedway-fight.mp4 \
  '["key","KeyR"]' '["wait",3.5]' '["rip",{"power":0.92,"aim":-16}]' \
  '["wait",9]' '["key","KeyK"]' '["wait",8]'

# 11. A named rival's telegraphed move, defensive cup and counter-strike.
reset_demo
rec 11-hookjaw-rival-move.mp4 \
  '["key","KeyH"]' '["wait",3.5]' '["rip",{"power":0.88}]' '["fightAt",3]' \
  '["key","KeyT"]' '["wait",2]' '["cup",{"at":"mine"}]' '["wait",2]' \
  '["key","KeyJ"]' '["slap"]' '["wait",3]' '["key","KeyK"]' '["wait",8]'

required=(
  01-hub-progression 02-top-lineup 03-forge-customization 04-custom-top-ember-fight
  05-arena-workshop 06-custom-arena-fight 07-all-arenas-labelled 08-zero-g-dish-fight
  09-sumo-square-fight 10-neon-speedway-fight 11-hookjaw-rival-move
)
for file in "${required[@]}"; do
  if [ ! -s "$SHOTS/$file.mp4" ]; then echo "Missing capture: $SHOTS/$file.mp4" >&2; exit 1; fi
done

# Keep every source clip editable, and also make one continuous chapter-labelled reference cut.
TMP=$(mktemp -d)
labelled=()
for file in "${required[@]}"; do
  title=${file#??-}
  title=${title//-/ }
  out="$TMP/$file.mp4"
  ffmpeg -y -loglevel error -i "$SHOTS/$file.mp4" \
    -vf "drawtext=fontfile=$FONT:text='${title^^}':fontcolor=white:fontsize=38:x=42:y=h-82:box=1:boxcolor=0x101218@0.66:boxborderw=12:enable='between(t,0,2.5)'" \
    -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p \
    -c:a aac -b:a 256k -ar 48000 -ac 2 "$out"
  labelled+=("$out")
done
printf "file '%s'\n" "${labelled[@]}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c:v libx264 -crf 14 -preset slow -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart "$OUT/spinsmith-full-showcase.mp4"

echo "$OUT/spinsmith-full-showcase.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/spinsmith-full-showcase.mp4") s)"
