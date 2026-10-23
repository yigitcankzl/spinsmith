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
  "$NEW/close-crossguard.mp4" "$NEW/close-rub.mp4" "$NEW/forge.mp4" "$NEW/workshop.mp4" "$NEW/match-won-cards.mp4"; do
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
    -vf "${PRE:+$PRE,}scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=58:x=46:y=38:box=1:boxcolor=0x111419@0.74:boxborderw=15:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=31:x=49:y=119:box=1:boxcolor=0x111419@0.62:boxborderw=9:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='$LABEL':fontcolor=white@0.85:fontsize=30:x=w-text_w-28:y=h-50:box=1:boxcolor=0x111419@0.55:boxborderw=8${EXTRA:+,$EXTRA}" \
    -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p "${audio[@]}" "$TMP/$file.mp4"
}

# The disclosure, big, over the opening shot (not a silent black card).
EXTRA="drawtext=fontfile=$FONT:text='EMULATOR FOOTAGE':fontcolor=0xff8a2a:fontsize=84:x=(w-text_w)/2:y=h-250:box=1:boxcolor=0x111419@0.8:boxborderw=18:enable='lt(t,1.5)',drawtext=fontfile=$FONT:text='${DISCLOSE:-IWSDK emulator (IWER)  -  not headset footage}':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h-140:box=1:boxcolor=0x111419@0.7:boxborderw=10:enable='lt(t,1.5)'" \
  clip 00-hook "$NEW/desk-ko-first-side.mp4" 1.3 5.6 "THE ARENA IS THE WEAPON" "Squeeze the bowl / throw the rival off your desk"
# A running game clock on the new player's segment: the pace is the point.
FIRST30=; if [ -s "$NEW/first-30.mp4" ]; then FIRST30=1; EXTRA="drawtext=fontfile=$FONT:text='FROM HOME  %{eif\\:t\\:d\\:2}.%{eif\\:mod(t*10\\,10)\\:d} s':fontcolor=0xffa24a:fontsize=64:x=w-text_w-46:y=40:box=1:boxcolor=0x111419@0.74:boxborderw=14" clip 005-first "$NEW/first-30.mp4" 0.2 17.8 "A NEW PLAYER, UNCUT" "Carry the top in  /  the ghost hand shows the rip  /  first ramp"; fi
clip 01-match "$NEW/first-match.mp4" 1.0 12.3 "ONE ROUND, UNCUT" "Rip  /  the rival runs to your edge  /  squeeze"
# The room changes the outcome: the same first-match squeeze with the game's table detection
# switched off (a ring-out lesson) and with the table detected (DESK KO). Both IWER, same seat.
ROOMSEG=; if [ -s "$NEW/tray-squeeze.mp4" ]; then ROOMSEG=1
  ffmpeg -y -loglevel error -ss 5.4 -t 4.2 -i "$NEW/tray-squeeze.mp4" -ss 0.7 -t 4.2 -i "$NEW/desk-ko-first-side.mp4" -filter_complex \
    "[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}/2:${HEIGHT}:${WIDTH}*0.36:0,fps=${FPS},eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12[a];[1:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}/2:${HEIGHT}:${WIDTH}*0.36:0,fps=${FPS},eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12[b];[a][b]hstack,drawbox=x=iw/2-2:y=0:w=4:h=ih:color=0x111419:t=fill,drawtext=fontfile=$FONT:text='YOUR DESK IS THE RING-OUT':fontcolor=0xffa24a:fontsize=58:x=46:y=38:box=1:boxcolor=0x111419@0.74:boxborderw=15:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='TABLE DETECTION OFF':fontcolor=white:fontsize=38:x=w/4-text_w/2:y=h-120:box=1:boxcolor=0x111419@0.75:boxborderw=12,drawtext=fontfile=$FONT:text='TABLE DETECTED  -  DESK KO':fontcolor=0xffa24a:fontsize=38:x=3*w/4-text_w/2:y=h-120:box=1:boxcolor=0x111419@0.75:boxborderw=12,drawtext=fontfile=$FONT:text='$LABEL':fontcolor=white@0.85:fontsize=30:x=w-text_w-28:y=h-50:box=1:boxcolor=0x111419@0.55:boxborderw=8[v]" \
    -map "[v]" -map 1:a? -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$TMP/015-room.mp4"
fi
clip 02-squeeze "$NEW/close-squeeze.mp4" 0.3 3.2 "TWO HANDS ON THE RIM" "Squeeze / stretch / tilt / twist the live bowl"
clip 03-flick "$NEW/flick.mp4" 0.2 2.8 "FLICK" "Your fingertip is part of the physics"
clip 04-guard "$NEW/close-crossguard.mp4" 0.0 2.6 "CROSSGUARD" "Two still palms make a rail that saves you"
clip 05-rub "$NEW/close-rub.mp4" 0.6 2.4 "SPIN RUB" "A fingertip along your rim spins it back up"
clip 06-strike "$NEW/seal-stamp.mp4" 0.8 4.0 "STAMP AN ULTIMATE" "Pinch the seal / press it into the bowl"
# Comfort: the dial's stops on its plate (filmed from the seat, cropped in).
COMFORTSEG=; if [ -s "$NEW/comfort.mp4" ]; then COMFORTSEG=1; PRE="crop=iw*0.42:ih*0.42:iw*0.22:ih*0.38" clip 065-comfort "$NEW/comfort.mp4" 5.6 3.0 "COMFORT, ONE PINCH AWAY" "Pinch the comfort plate  /  Large text: ON"; fi
# Large text, off and on side by side (the same close fight shot, IWER).
if [ -n "$COMFORTSEG" ] && [ -s "$NEW/bigtext-fight.mp4" ]; then
  ffmpeg -y -loglevel error -ss 0.6 -t 2.6 -i "$NEW/flick.mp4" -ss 0.6 -t 2.6 -i "$NEW/bigtext-fight.mp4" -filter_complex \
    "[0:v]crop=iw*0.46:ih*0.62:iw*0.27:ih*0.04,scale=${WIDTH}/2:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}/2:${HEIGHT},fps=${FPS},eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12[a];[1:v]crop=iw*0.66:ih*0.89:iw*0.17:ih*0.0,scale=${WIDTH}/2:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}/2:${HEIGHT},fps=${FPS},eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12[b];[a][b]hstack,drawbox=x=iw/2-2:y=0:w=4:h=ih:color=0x111419:t=fill,drawtext=fontfile=$FONT:text='LARGE TEXT OFF':fontcolor=white:fontsize=40:x=w/4-text_w/2:y=h-120:box=1:boxcolor=0x111419@0.75:boxborderw=12,drawtext=fontfile=$FONT:text='LARGE TEXT ON':fontcolor=0xffa24a:fontsize=40:x=3*w/4-text_w/2:y=h-120:box=1:boxcolor=0x111419@0.75:boxborderw=12,drawtext=fontfile=$FONT:text='$LABEL':fontcolor=white@0.85:fontsize=30:x=w-text_w-28:y=h-50:box=1:boxcolor=0x111419@0.55:boxborderw=8[v]" \
    -map "[v]" -map 0:a? -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$TMP/066-bigtext.mp4"
fi
# Four arenas in live play, one beat each (IWER, recorded by .tmp/rec-arenas.sh style drives).
parts=()
for f in "$NEW"/arenas/*.mp4; do
  [ -s "$f" ] || continue
  n=$(basename "$f" .mp4)
  clip "arena-$n" "$f" 0.3 1.4 "EVERY ARENA PLAYS ITS OWN WAY" "Terraces  /  craters  /  ice  /  pits"
  parts+=("arena-$n")
done
clip 07-forge "$NEW/forge.mp4" 2.8 3.2 "FORGE IT BY HAND" "Drag a part onto your top / it fights differently"
clip 08-workshop "$NEW/workshop.mp4" 7.6 3.8 "BUILD THE BATTLEGROUND" "Shape the floor / place pits and bumpers"
# Filmed wide from a fixed pose: cropped in to the card and the arena.
PRE="crop=iw*0.55:ih*0.55:iw*0.225:ih*0.1" clip 085-return "$NEW/match-won-cards.mp4" $(python3 -c "print(max(0, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$NEW/match-won-cards.mp4") - 3.6))") 3.4 "COME BACK TOMORROW" "A day streak and a new order for tomorrow"
# The end card rings the game's motif (D A F high-D), so the reel never ends in silence.
ffmpeg -y -loglevel error \
  -ss 0.2 -t 2.0 -i "$NEW/desk-ko-first-side.mp4" \
  -f lavfi -i "aevalsrc='0.25*(sin(2*PI*587*t)*exp(-4*t)+gte(t,0.15)*sin(2*PI*880*t)*exp(-4*(t-0.15))+gte(t,0.3)*sin(2*PI*698*t)*exp(-4*(t-0.3))+gte(t,0.45)*sin(2*PI*1175*t)*exp(-3*(t-0.45)))':s=48000:c=stereo:d=2.0" \
  -map 0:v -map 1:a -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},gblur=sigma=16,eq=brightness=-0.42:saturation=0.7,drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=104:x=(w-text_w)/2:y=(h-text_h)/2-55,drawtext=fontfile=$FONT:text='Your real desk is the ring-out':fontcolor=0xe7edf4:fontsize=50:x=(w-text_w)/2:y=(h/2)+50,drawtext=fontfile=$FONT:text='Hands only  /  Seated  /  Meta Quest Browser':fontcolor=0xe7edf4@0.7:fontsize=32:x=(w-text_w)/2:y=(h/2)+125,drawtext=fontfile=$FONT:text='$LABEL':fontcolor=white@0.85:fontsize=30:x=w-text_w-28:y=h-50:box=1:boxcolor=0x111419@0.55:boxborderw=8" \
  -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$TMP/09-end.mp4"

segments=(00-hook ${ROOMSEG:+015-room} ${FIRST30:+005-first} 01-match 02-squeeze 03-flick 04-guard 05-rub 06-strike ${COMFORTSEG:+065-comfort} ${COMFORTSEG:+066-bigtext} ${parts[@]+"${parts[@]}"} 07-forge 08-workshop 085-return 09-end)
printf "file '%s.mp4'\n" "${segments[@]/#/$TMP/}" > "$TMP/list.txt"
mkdir -p "$(dirname "$FINAL")"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c:v libx264 -crf 14 -preset medium -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 256k -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
