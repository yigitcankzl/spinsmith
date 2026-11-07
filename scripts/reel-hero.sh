#!/usr/bin/env bash
# Cuts a focused 60-75 second submission reel from the labelled IWER footage library.
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-hero-1080p60.mp4}
S=$R/shots M=$R/shots/more T=$R/takes
W=1920 H=1080 FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
TAG="drawtext=fontfile=$FONT:text='IWER EMULATOR  /  SYNTHETIC ROOM + TABLE PLANE  /  NOT HEADSET FOOTAGE':fontcolor=white@0.78:fontsize=24:x=w-text_w-24:y=20:box=1:boxcolor=0x111419@0.55:boxborderw=7"
LOOK="eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
segments=()
enc=(-c:v libx264 -crf 15 -preset medium -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2)

clip() {
  local name=$1 src=$2 start=$3 dur=$4 title=$5 sub=$6
  test -s "$src" || { echo "Missing source: $src" >&2; exit 1; }
  local audio=(-map 0:a)
  if ! ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" | grep -q .; then
    audio=(-f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -map 1:a)
  fi
  ffmpeg -y -loglevel error -ss "$start" -t "$dur" -i "$src" "${audio[@]:0:${#audio[@]}-2}" \
    -filter_complex "[0:v]scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,fps=$FPS,$LOOK,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=76:x=48:y=40:box=1:boxcolor=0x111419@0.78:boxborderw=16:enable='lt(t,1.65)',drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=40:x=52:y=146:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='lt(t,1.65)',$TAG[v]" \
    -map '[v]' "${audio[@]: -2}" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segments+=("$name")
}

split_room() {
  local dur=4.4
  ffmpeg -y -loglevel error -ss 5.4 -t "$dur" -i "$S/tray-squeeze.mp4" -ss 0.7 -t "$dur" -i "$S/desk-ko-first-side.mp4" \
    -filter_complex "[0:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$((W/2)):$H:$((W*36/100)):0,fps=$FPS,$LOOK[l];[1:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$((W/2)):$H:$((W*46/100)):0,fps=$FPS,$LOOK[r];[l][r]hstack,drawbox=x=iw/2-3:y=0:w=6:h=ih:color=0x111419:t=fill,drawtext=fontfile=$FONT:text='YOUR DESK IS THE RING-OUT':fontcolor=0xffa24a:fontsize=76:x=48:y=40:box=1:boxcolor=0x111419@0.78:boxborderw=16:enable='lt(t,2.2)',drawtext=fontfile=$FONT:text='NO TABLE  -  NORMAL RING-OUT':fontcolor=white:fontsize=42:x=w/4-text_w/2:y=h-125:box=1:boxcolor=0x111419@0.8:boxborderw=12,drawtext=fontfile=$FONT:text='TABLE FOUND  -  DESK KO +1':fontcolor=0xffa24a:fontsize=42:x=3*w/4-text_w/2:y=h-125:box=1:boxcolor=0x111419@0.8:boxborderw=12,$TAG[v];[0:a][1:a]amix=inputs=2:normalize=0,volume=0.7[a]" \
    -map '[v]' -map '[a]' -t "$dur" "${enc[@]}" "$TMP/01-room.mp4"
  segments+=(01-room)
}

arena_grid() {
  local dur=3.6 inputs=() filters='' i=0
  for n in 05 06 12 15; do
    local src=$S/arenas/$n.mp4
    test -s "$src" || { echo "Missing source: $src" >&2; exit 1; }
    inputs+=(-ss 0.3 -t "$dur" -i "$src")
    filters+="[$i:v]scale=$((W/2)):$((H/2)):force_original_aspect_ratio=increase:flags=lanczos,crop=$((W/2)):$((H/2)),fps=$FPS,$LOOK[c$i];"
    i=$((i + 1))
  done
  ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex \
    "${filters}[c0][c1][c2][c3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,drawbox=x=iw/2-3:y=0:w=6:h=ih:color=0x111419:t=fill,drawbox=x=0:y=ih/2-3:w=iw:h=6:color=0x111419:t=fill,drawtext=fontfile=$FONT:text='BUILD THE BATTLEGROUND':fontcolor=0xffa24a:fontsize=72:x=(w-text_w)/2:y=h/2-text_h/2:box=1:boxcolor=0x111419@0.85:boxborderw=16:enable='lt(t,1.6)',$TAG[v];[0:a][1:a][2:a][3:a]amix=inputs=4:normalize=0,volume=0.5[a]" \
    -map '[v]' -map '[a]' -t "$dur" "${enc[@]}" "$TMP/11-arenas.mp4"
  segments+=(11-arenas)
}

clip 00-hook "$S/hook-ko.mp4" 2.0 5.0 'THE ARENA IS THE WEAPON' 'Squeeze the live bowl  /  throw the rival off your desk'
split_room
clip 02-rip "$T/first.mp4" 3.0 16.0 'ONE UNBROKEN EXCHANGE' 'Carry  /  rip  /  raise a ramp  /  watch the collision'
clip 03-ramp "$M/ramp.mp4" 0.5 3.0 'RAISE A RAMP' 'Touch the bowl and change the next collision'
clip 04-squeeze "$S/close-squeeze.mp4" 0.3 4.0 'BEND THE FIGHT' 'Squeeze  /  stretch  /  tilt  /  twist'
clip 05-flick "$S/flick.mp4" 0.2 3.0 'YOUR FINGERTIP IS PHYSICS' 'Flick a top at the exact moment it opens'
clip 06-strike "$S/seal-stamp.mp4" 0.8 4.0 'STAMP AN ULTIMATE' 'The arena keeps the consequence'
clip 07-boss "$T/boss.mp4" 1.6 7.0 'BOSSES FIGHT BACK' 'Read the ghost palm  /  interrupt the arena attack'
clip 08-brawl "$T/brawl.mp4" 0.8 7.0 'FOUR-TOP BRAWL' 'The arena opens out  /  last top spinning wins'
clip 09-forge "$S/forge.mp4" 2.8 5.0 'FORGE YOUR FIGHTER' 'Drag real parts  /  every build changes the physics'
clip 10-workshop "$S/workshop.mp4" 7.6 4.0 'FORGE YOUR ARENA' 'Shape the floor  /  place hazards and boosts'
arena_grid
clip 12-return "$M/hub-map.mp4" 1.4 4.0 'YOUR TABLE REMEMBERS' 'Daily order  /  streak  /  champion tops  /  rival record'

ffmpeg -y -loglevel error -ss 3.6 -t 4 -i "$S/hook-ko.mp4" -f lavfi \
  -i "aevalsrc='0.25*(sin(2*PI*587*t)*exp(-4*t)+gte(t,0.15)*sin(2*PI*880*t)*exp(-4*(t-0.15))+gte(t,0.3)*sin(2*PI*698*t)*exp(-4*(t-0.3)))':s=48000:c=stereo:d=4" \
  -map 0:v -map 1:a -vf "scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,gblur=sigma=16,eq=brightness=-0.42:saturation=0.7,drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=(h-text_h)/2-80,drawtext=fontfile=$FONT:text='The arena is the weapon. Your desk is the ring-out.':fontcolor=0xe7edf4:fontsize=54:x=(w-text_w)/2:y=h/2+50,$TAG" \
  -t 4 "${enc[@]}" "$TMP/13-end.mp4"
segments+=(13-end)

printf "file '%s.mp4'\n" "${segments[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 \
  -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL")
awk -v d="$duration" 'BEGIN { if (d < 60 || d > 75) exit 1 }' || { echo "Hero cut must be 60-75 seconds, got $duration" >&2; exit 1; }
echo "$FINAL ($duration s)"
