#!/usr/bin/env bash
# Cuts the competition reel around the first match's staged DESK KO (IWER emulator footage,
# labelled on every shot): it opens on the DESK KO with the disclosure over it, then one uncut
# first match, the hand moves, the forge and the workshop, and a sounded end card.
#
#   scripts/night-trailer.sh [shots-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

NEW=${1:-$HOME/Desktop/spinsmith-videos/night-2026-10-23/shots}
FINAL=${2:-$HOME/Desktop/spinsmith-videos/night-2026-10-23/spinsmith-reel-1080p60.mp4}
WIDTH=1920
HEIGHT=1080
FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
# The disclosure burned into every shot (the room shots use the CC0 360 backdrop of scripts/capture/prepare-room.sh).
LABEL=${LABEL:-IWER EMULATOR  /  CC0 360 ROOM BACKDROP  /  NOT HEADSET FOOTAGE}

for file in "$NEW/desk-ko-first-side.mp4" "$NEW/close-squeeze.mp4" "$NEW/first-match.mp4" "$NEW/flick.mp4" "$NEW/seal-stamp.mp4" \
  "$NEW/close-crossguard.mp4" "$NEW/close-rub.mp4" "$NEW/forge.mp4" "$NEW/workshop.mp4"; do
  [ -s "$file" ] || { echo "Missing source: $file" >&2; exit 1; }
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT


# Every shot: scaled to 1080p, a short title, and a permanent IWER disclosure.
clip() {
  local file=$1 source=$2 start=$3 duration=$4 title=$5 sub=$6
  local audio=(-c:a aac -b:a 256k -ar 48000 -ac 2)
  local inputs=(-ss "$start" -i "$source")
  if ! ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$source" | grep -q .; then
    inputs+=(-f lavfi -i anullsrc=r=48000:cl=stereo)
    audio+=(-shortest)
  fi
  ffmpeg -y -loglevel error "${inputs[@]}" -t "$duration" \
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},eq=contrast=1.06:saturation=1.13:brightness=-0.015,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=58:x=46:y=38:box=1:boxcolor=0x111419@0.74:boxborderw=15:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=31:x=49:y=119:box=1:boxcolor=0x111419@0.62:boxborderw=9:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='$LABEL':fontcolor=white@0.55:fontsize=22:x=w-text_w-28:y=h-42${EXTRA:+,$EXTRA}" \
    -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p "${audio[@]}" "$TMP/$file.mp4"
}

# The disclosure, big, over the opening shot (not a silent black card).
EXTRA="drawtext=fontfile=$FONT:text='EMULATOR FOOTAGE':fontcolor=0xff8a2a:fontsize=84:x=(w-text_w)/2:y=h-250:box=1:boxcolor=0x111419@0.8:boxborderw=18:enable='lt(t,2.4)',drawtext=fontfile=$FONT:text='${DISCLOSE:-IWSDK emulator (IWER)  -  not headset footage}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h-140:box=1:boxcolor=0x111419@0.7:boxborderw=10:enable='lt(t,2.4)'" \
  clip 00-hook "$NEW/desk-ko-first-side.mp4" 0.4 7.4 "THE ARENA IS THE WEAPON" "Squeeze the bowl / throw the rival off your desk"
clip 01-match "$NEW/first-match.mp4" 0.3 14 "ONE ROUND, UNCUT" "Rip  /  the rival runs to your edge  /  squeeze"
clip 02-squeeze "$NEW/close-squeeze.mp4" 0.3 3.2 "TWO HANDS ON THE RIM" "Squeeze / stretch / tilt / twist the live bowl"
clip 03-flick "$NEW/flick.mp4" 0.2 2.8 "FLICK" "Your fingertip is part of the physics"
clip 04-guard "$NEW/close-crossguard.mp4" 0.0 2.6 "CROSSGUARD" "Two still palms make a rail that saves you"
clip 05-rub "$NEW/close-rub.mp4" 0.6 2.4 "SPIN RUB" "A fingertip along your rim spins it back up"
clip 06-strike "$NEW/seal-stamp.mp4" 0.8 4.0 "STAMP AN ULTIMATE" "Pinch the seal / press it into the bowl"
clip 07-forge "$NEW/forge.mp4" 2.8 4.2 "FORGE IT BY HAND" "Drag a part onto your top / it fights differently"
clip 08-workshop "$NEW/workshop.mp4" 8.0 8.5 "BUILD THE BATTLEGROUND" "Shape the floor / place pits and bumpers"
# The end card rings the game's motif (D A F high-D), so the reel never ends in silence.
ffmpeg -y -loglevel error \
  -f lavfi -i "color=c=0x111419:s=${WIDTH}x${HEIGHT}:d=2.6:r=${FPS}" \
  -f lavfi -i "aevalsrc='0.25*(sin(2*PI*587*t)*exp(-4*t)+gte(t,0.15)*sin(2*PI*880*t)*exp(-4*(t-0.15))+gte(t,0.3)*sin(2*PI*698*t)*exp(-4*(t-0.3))+gte(t,0.45)*sin(2*PI*1175*t)*exp(-3*(t-0.45)))':s=48000:c=stereo:d=2.6" \
  -vf "drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=104:x=(w-text_w)/2:y=(h-text_h)/2-55,drawtext=fontfile=$FONT:text='Hands only  /  Seated  /  Meta Quest Browser':fontcolor=0xe7edf4:fontsize=42:x=(w-text_w)/2:y=(h/2)+65" \
  -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$TMP/09-end.mp4"

segments=(00-hook 01-match 02-squeeze 03-flick 04-guard 05-rub 06-strike 07-forge 08-workshop 09-end)
printf "file '%s.mp4'\n" "${segments[@]/#/$TMP/}" > "$TMP/list.txt"
mkdir -p "$(dirname "$FINAL")"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
