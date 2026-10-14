#!/usr/bin/env bash
# Captures the current build and cuts a 100-second competition reel.
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
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
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
    -vf "drawtext=fontfile=$FONT:text='$title':fontcolor=0xff8a2a:fontsize=96:x=(w-text_w)/2:y=(h-text_h)/2-55,drawtext=fontfile=$FONT:text='$sub':fontcolor=0xe7edf4:fontsize=38:x=(w-text_w)/2:y=(h/2)+65,fade=t=in:st=0:d=0.25,fade=t=out:st=$(awk -v d="$duration" 'BEGIN {print d-0.3}'):d=0.3" \
    -c:v libx264 -crf 13 -preset slow -tune animation -pix_fmt yuv420p \
    -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$TMP/$file.mp4"
}

clip() {
  local file=$1 source=$2 start=$3 duration=$4 title=$5 sub=$6
  local fade_at
  fade_at=$(awk -v d="$duration" 'BEGIN {print d-0.25}')
  ffmpeg -y -loglevel error -ss "$start" -i "$source" -t "$duration" \
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=52:x=46:y=42:box=1:boxcolor=0x111419@0.72:boxborderw=16:enable='lt(t,2.4)',drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=29:x=49:y=118:box=1:boxcolor=0x111419@0.62:boxborderw=10:enable='lt(t,2.4)',drawtext=fontfile=$FONT:text='IWER EMULATOR CAPTURE  -  QUEST BUILD':fontcolor=white@0.56:fontsize=24:x=w-text_w-30:y=h-45,fade=t=in:st=0:d=0.18,fade=t=out:st=$fade_at:d=0.25" \
    -af "afade=t=in:st=0:d=0.15,afade=t=out:st=$fade_at:d=0.25" \
    -c:v libx264 -crf 13 -preset slow -tune animation -pix_fmt yuv420p \
    -c:a aac -b:a 256k -ar 48000 -ac 2 "$TMP/$file.mp4"
}

card 00-title "SPINSMITH" "Forge it  Rip it  Reshape the arena" 2.5
clip 01-rise "$MAIN/01-rise-title.mp4" 6.2 4.5 "YOUR TABLE BECOMES THE ARENA" "Seated mixed reality built for hands"
clip 02-portal "$MAIN/02-portal.mp4" 0.5 3.7 "RIVALS ENTER YOUR ROOM" "Seven fighters with different tactics"
clip 03-ramp "$MAIN/03-rip-ramp-replay.mp4" 0.5 11 "RESHAPE THE FIGHT" "Raise a ramp under a moving top"
clip 04-strike "$MAIN/04-strike.mp4" 2.8 6 "STRIKE THE TABLE" "A hand powered ultimate changes the arena"
clip 05-cup "$MAIN/05-cup-sling.mp4" 1.8 6 "CATCH AND SLING" "The floor becomes your weapon"
clip 06-forge "$MAIN/06-forge.mp4" 0.5 10 "FORGE IT BY HAND" "Every fitted part changes the physics"
clip 07-builds "$SHOW/03-forge-customization.mp4" 10 8 "BUILD YOUR FIGHTER" "226 legal combinations plus style and combat choices"
clip 08-workshop "$SHOW/05-arena-workshop.mp4" 16 9 "BUILD THE BATTLEGROUND" "Place hazards boosts and moving machinery"

for i in 1 2 3 4 5 6; do
  name=("" "ANVIL" "RUSH" "MAGNET" "TILT" "HAMMER" "WARD")
  lower=("" "anvil" "rush" "magnet" "tilt" "hammer" "ward")
  clip "$(printf '09-ult-%02d' "$i")" "$ULT/$i-${lower[$i]}.mp4" 7.0 2.1 "${name[$i]} STRIKE" "Six arena changing ultimates"
done

clip 10-arenas "$SHOW/07-all-arenas-labelled.mp4" 9.5 8 "FIFTEEN ARENAS" "Each one changes the physical rules"
clip 11-return "$SHOW/01-hub-progression.mp4" 1.4 8 "A REASON TO RETURN" "Daily orders feats champions and personal records"
clip 12-win "$MAIN/07-match-win.mp4" 14 10 "ONE MORE MATCH" "Fast rounds  direct rematches  new tactical layers"
card 13-end "SPINSMITH" "Hands only  Seated  Meta Quest Browser" 3

segments=(
  00-title 01-rise 02-portal 03-ramp 04-strike 05-cup 06-forge 07-builds 08-workshop
  09-ult-01 09-ult-02 09-ult-03 09-ult-04 09-ult-05 09-ult-06
  10-arenas 11-return 12-win 13-end
)
printf "file '%s.mp4'\n" "${segments[@]/#/$TMP/}" > "$TMP/list.txt"
FINAL=$OUT/spinsmith-competition-1080p60.mp4
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c:v libx264 -crf 13 -preset slow -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart "$FINAL"

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL")
echo "$FINAL ($duration s)"
