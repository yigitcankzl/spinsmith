#!/usr/bin/env bash
# Cuts the competition reel around the first match's staged DESK KO (IWER emulator footage,
# labelled on every shot). New shots come from the drive steps recorded on 2026-10-22
# (stageFirstWrench, rip + ramp with the lesson ghost, flick); the rest reuse the 10-16 sources.
#
#   scripts/night-trailer.sh [new-shots-dir] [old-sources-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

NEW=${1:-$HOME/Desktop/spinsmith-videos/night-2026-10-22/shots}
OLD=${2:-$HOME/Desktop/spinsmith-videos/competition-final}
FINAL=${3:-$HOME/Desktop/spinsmith-videos/night-2026-10-22/spinsmith-reel-1080p60.mp4}
MAIN=$OLD/main/shots
SHOW=$OLD/showcase/shots
ULT=$OLD/ultimates/shots
WIDTH=1920
HEIGHT=1080
FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
# The disclosure burned into every shot (the room shots use the CC0 360 backdrop of scripts/capture/prepare-room.sh).
LABEL=${LABEL:-IWER EMULATOR CAPTURE  -  NOT HEADSET FOOTAGE}

for file in "$NEW/desk-ko-first-side.mp4" "$NEW/desk-ko-first-close.mp4" "$NEW/first-rip-ghost.mp4" "$NEW/flick.mp4" "$NEW/seal-stamp.mp4" "$NEW/match-won-cards.mp4" \
  "$MAIN/01-rise-title.mp4" "$MAIN/06-forge.mp4" \
  "$SHOW/05-arena-workshop.mp4" "$SHOW/07-all-arenas-labelled.mp4"; do
  [ -s "$file" ] || { echo "Missing source: $file" >&2; exit 1; }
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

card() {
  local file=$1 title=$2 sub=$3 duration=$4
  ffmpeg -y -loglevel error \
    -f lavfi -i "color=c=0x111419:s=${WIDTH}x${HEIGHT}:d=${duration}:r=${FPS}" \
    -f lavfi -i anullsrc=r=48000:cl=stereo -t "$duration" \
    -vf "drawtext=fontfile=$FONT:text='$title':fontcolor=0xff8a2a:fontsize=104:x=(w-text_w)/2:y=(h-text_h)/2-55,drawtext=fontfile=$FONT:text='$sub':fontcolor=0xe7edf4:fontsize=42:x=(w-text_w)/2:y=(h/2)+65" \
    -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p \
    -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$TMP/$file.mp4"
}

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
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},eq=contrast=1.06:saturation=1.13:brightness=-0.015,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=58:x=46:y=38:box=1:boxcolor=0x111419@0.74:boxborderw=15:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=31:x=49:y=119:box=1:boxcolor=0x111419@0.62:boxborderw=9:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='$LABEL':fontcolor=white@0.55:fontsize=22:x=w-text_w-28:y=h-42" \
    -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p "${audio[@]}" "$TMP/$file.mp4"
}

# Story: the hook is the room-dependent beat, then how you get there, then the depth behind it.
clip 00-hook "$NEW/desk-ko-first-side.mp4" 0.3 6.0 "THE ARENA IS THE WEAPON" "Squeeze the bowl  throw the rival off your real desk"
if [ -s "$NEW/hub.mp4" ]; then clip 01-rise "$NEW/hub.mp4" 0.4 2.8 "YOUR TABLE IS THE ARENA" "Seated mixed reality  hands only"
else clip 01-rise "$MAIN/01-rise-title.mp4" 6.2 2.6 "YOUR TABLE IS THE ARENA" "Seated mixed reality  hands only"; fi
clip 02-rip "$NEW/first-rip-ghost.mp4" 2.6 6.6 "PINCH  PULL  RIP" "A ghost hand shows each move once"
clip 03-desk "$NEW/desk-ko-first-close.mp4" 1.2 4.4 "DESK KO IN YOUR FIRST MATCH" "The real edge glows  the squeeze throws"
clip 04-flick "$NEW/flick.mp4" 0.2 2.8 "FLICK IT" "Your fingertip is part of the physics"
clip 06-strike "$NEW/seal-stamp.mp4" 0.3 4.2 "STAMP AN ULTIMATE" "Pinch the seal  press it into the bowl"
# Optional hand close-ups, when the new-shots folder has them.
if [ -s "$NEW/close-squeeze.mp4" ]; then clip 05a-squeeze "$NEW/close-squeeze.mp4" 0.6 3.0 "TWO HANDS ON THE RIM" "Squeeze  stretch  tilt  twist the live bowl"; fi
if [ -s "$NEW/close-crossguard.mp4" ]; then clip 05b-guard "$NEW/close-crossguard.mp4" 0.3 2.6 "CROSSGUARD" "Two still palms make a rail that saves you"; fi
if [ -s "$NEW/close-rub.mp4" ]; then clip 05c-rub "$NEW/close-rub.mp4" 0.9 2.4 "SPIN RUB" "A fingertip along your rim spins it back up"; fi
# Optional: a 3-4 top brawl shot, when the new-shots folder has one.
if [ -s "$NEW/brawl.mp4" ]; then clip 07-brawl "$NEW/brawl.mp4" 11.6 5.0 "BRAWL" "Three or four tops  last one spinning"; fi
if [ -s "$NEW/forge.mp4" ]; then clip 08-forge "$NEW/forge.mp4" 2.6 5.0 "FORGE IT BY HAND" "226 builds  each changes the physics"
else clip 08-forge "$MAIN/06-forge.mp4" 1.2 3.8 "FORGE IT BY HAND" "226 builds  each changes the physics"; fi
if [ -s "$NEW/workshop.mp4" ]; then clip 09-workshop "$NEW/workshop.mp4" 3.0 5.0 "BUILD THE BATTLEGROUND" "Twenty arenas and a workshop"
else clip 09-workshop "$SHOW/05-arena-workshop.mp4" 16.5 3.0 "BUILD THE BATTLEGROUND" "Twenty arenas and a workshop"; fi
clip 10-arenas "$SHOW/07-all-arenas-labelled.mp4" 9.5 2.4 "TWENTY ARENAS" "Fifteen bouts  nine rivals"
clip 11-return "$NEW/match-won-cards.mp4" 5.0 7.5 "ONE NEW MOVE A MATCH" "A streak and tomorrow on every result"
card 13-end "SPINSMITH" "Hands only  Seated  Meta Quest Browser" 1.8

segments=(00-hook 01-rise 02-rip 03-desk 04-flick)
for c in 05a-squeeze 05b-guard 05c-rub; do [ -s "$TMP/$c.mp4" ] && segments+=("$c"); done
segments+=(06-strike)
[ -s "$NEW/brawl.mp4" ] && segments+=(07-brawl)
segments+=(08-forge 09-workshop)
# SKIP_ARENAS=1 drops the grey 10-16 arena-variety shot from a backdrop cut.
[ "${SKIP_ARENAS:-0}" = 1 ] || segments+=(10-arenas)
segments+=(11-return 13-end)
printf "file '%s.mp4'\n" "${segments[@]/#/$TMP/}" > "$TMP/list.txt"
mkdir -p "$(dirname "$FINAL")"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
