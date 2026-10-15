#!/usr/bin/env bash
# Captures the current build and cuts a 45-55 second competition reel.
#
#   CAPTURE=1 scripts/competition-trailer.sh [out-dir]  # recapture every source, then cut
#   scripts/competition-trailer.sh [out-dir]            # cut again from existing sources
#
# The footage is deliberately labelled as IWER emulator capture: it demonstrates the Quest build
# without pretending that the passthrough background or hand tracking came from a physical headset.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=${1:-$HOME/Desktop/spinsmith-videos/competition-final}
MAIN=$OUT/main/shots
SHOW=$OUT/showcase/shots
ULT=$OUT/ultimates/shots
WIDTH=${DRIVE_VIDEO_WIDTH:-1920}
HEIGHT=${DRIVE_VIDEO_HEIGHT:-1080}
FPS=${DRIVE_VIDEO_FPS:-60}
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
mkdir -p "$OUT"

CAPTURE_OWNS_SERVER=0
cleanup() {
  if [ "$CAPTURE_OWNS_SERVER" = 1 ]; then npx @iwsdk/cli dev down >/dev/null 2>&1 || true; fi
}
trap cleanup EXIT

if [ -n "${CAPTURE:-}" ]; then
  echo "Starting the visible IWSDK capture browser..."
  npx @iwsdk/cli dev restart --open --allow-browser-automation --timeout 60000 >/dev/null
  CAPTURE_OWNS_SERVER=1
  CAPTURE_USE_RUNNING=1 scripts/trailer.sh "$OUT/main"
  CAPTURE_USE_RUNNING=1 scripts/showcase.sh "$OUT/showcase"
  CAPTURE_USE_RUNNING=1 scripts/ultimates.sh "$OUT/ultimates"
fi

required=(
  "$MAIN/01-rise-title.mp4" "$MAIN/02-portal.mp4" "$MAIN/03-rip-ramp-replay.mp4"
  "$MAIN/04-strike.mp4" "$MAIN/05-cup-sling.mp4" "$MAIN/06-forge.mp4"
  "$MAIN/07-match-win.mp4" "$SHOW/01-hub-progression.mp4"
  "$SHOW/03-forge-customization.mp4" "$SHOW/05-arena-workshop.mp4"
  "$SHOW/07-all-arenas-labelled.mp4" "$ULT/1-anvil.mp4" "$ULT/2-rush.mp4"
  "$ULT/3-magnet.mp4" "$ULT/4-tilt.mp4" "$ULT/5-hammer.mp4" "$ULT/6-ward.mp4"
)
for file in "${required[@]}"; do
  if [ ! -s "$file" ]; then
    echo "Missing source: $file" >&2
    echo "Run CAPTURE=1 $0 '$OUT' first." >&2
    exit 1
  fi
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"; cleanup' EXIT

card() {
  local file=$1 title=$2 sub=$3 duration=$4
  ffmpeg -y -loglevel error \
    -f lavfi -i "color=c=0x111419:s=${WIDTH}x${HEIGHT}:d=${duration}:r=${FPS}" \
    -f lavfi -i anullsrc=r=48000:cl=stereo -t "$duration" \
    -vf "drawtext=fontfile=$FONT:text='$title':fontcolor=0xff8a2a:fontsize=104:x=(w-text_w)/2:y=(h-text_h)/2-55,drawtext=fontfile=$FONT:text='$sub':fontcolor=0xe7edf4:fontsize=42:x=(w-text_w)/2:y=(h/2)+65" \
    -c:v libx264 -crf 13 -preset slow -tune animation -pix_fmt yuv420p \
    -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$TMP/$file.mp4"
}

clip() {
  local file=$1 source=$2 start=$3 duration=$4 title=$5 sub=$6
  ffmpeg -y -loglevel error -ss "$start" -i "$source" -t "$duration" \
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},eq=contrast=1.06:saturation=1.13:brightness=-0.015,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=58:x=46:y=38:box=1:boxcolor=0x111419@0.74:boxborderw=15:enable='lt(t,1.8)',drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=31:x=49:y=119:box=1:boxcolor=0x111419@0.62:boxborderw=9:enable='lt(t,1.8)',drawtext=fontfile=$FONT:text='IWER EMULATOR CAPTURE  -  QUEST BUILD':fontcolor=white@0.52:fontsize=22:x=w-text_w-28:y=h-42" \
    -c:v libx264 -crf 13 -preset slow -tune animation -pix_fmt yuv420p \
    -c:a aac -b:a 256k -ar 48000 -ac 2 "$TMP/$file.mp4"
}

clip 00-hook "$MAIN/03-rip-ramp-replay.mp4" 1.5 3.2 "SPINSMITH" "Pinch  pull  rip  reshape the fight"
clip 01-rise "$MAIN/01-rise-title.mp4" 6.2 2.6 "YOUR TABLE IS THE ARENA" "Seated mixed reality built for hands"
clip 02-portal "$MAIN/02-portal.mp4" 0.5 2.2 "RIVALS ENTER YOUR ROOM" "Seven fighters  seven tactics"
clip 03-ramp "$MAIN/03-rip-ramp-replay.mp4" 4.3 4.4 "RAISE A RAMP" "Read the motion and change its path"
clip 04-cup "$MAIN/05-cup-sling.mp4" 2.2 3.8 "CATCH AND SLING" "Press the floor  catch  fire it back"
clip 05-strike "$MAIN/04-strike.mp4" 3.0 3.6 "STRIKE THE TABLE" "Your palm permanently changes the arena"
clip 06-forge "$MAIN/06-forge.mp4" 1.2 4.5 "FORGE IT BY HAND" "Every fitted part changes the physics"
clip 07-builds "$SHOW/03-forge-customization.mp4" 10.5 3 "BUILD YOUR FIGHTER" "226 legal combinations  real tradeoffs"
clip 08-workshop "$SHOW/05-arena-workshop.mp4" 16.5 4 "BUILD THE BATTLEGROUND" "Place hazards  boosts  moving machinery"

# The source shots include their setup and launch. Cut where the palm actually lands, then keep
# three visually distinct persistent rules instead of turning the submission into an ability list.
clip 09-ult-anvil "$ULT/1-anvil.mp4" 8.5 2.6 "FORGED RIDGES" "Anvil cracks stay in the battlefield"
clip 09-ult-tilt "$ULT/4-tilt.mp4" 8.5 2.6 "ARENA TILTED" "The whole dish becomes the rule"
clip 09-ult-ward "$ULT/6-ward.mp4" 8.5 2.6 "GUARDED SECTOR" "A raised rim changes the exchange"

clip 10-arenas "$SHOW/07-all-arenas-labelled.mp4" 9.5 2.8 "FIFTEEN ARENAS" "Each one changes the physical rules"
clip 11-return "$SHOW/01-hub-progression.mp4" 1.8 2.8 "COME BACK STRONGER" "Daily orders  rivals  champions  records"
clip 12-win "$MAIN/07-match-win.mp4" 15 4 "ONE MORE MATCH" "Fast rounds  instant rematch  new tactics"
card 13-end "SPINSMITH" "Hands only  Seated  Meta Quest Browser" 1.6

segments=(
  00-hook 01-rise 02-portal 03-ramp 04-cup 05-strike 06-forge 07-builds 08-workshop
  09-ult-anvil 09-ult-tilt 09-ult-ward
  10-arenas 11-return 12-win 13-end
)
printf "file '%s.mp4'\n" "${segments[@]/#/$TMP/}" > "$TMP/list.txt"
FINAL=$OUT/spinsmith-competition-1080p60.mp4
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c:v libx264 -crf 13 -preset slow -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart "$FINAL"

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL")
echo "$FINAL ($duration s)"
