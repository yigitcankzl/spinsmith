#!/usr/bin/env bash
# Two straightforward room-backed gameplay takes. They use the same production hand driver as the
# mechanics tests; dev keys only keep the capture round alive and end it on cue.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

OUT=${1:-$HOME/Desktop/spinsmith-videos/room-gameplay}
RAW="$OUT/raw"
DRIVE=scripts/drive.sh
EMU=scripts/emu.sh
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
CAPTURE_WIDTH=${DRIVE_VIDEO_WIDTH:-1440}
CAPTURE_HEIGHT=${DRIVE_VIDEO_HEIGHT:-810}
WIDTH=${OUTPUT_VIDEO_WIDTH:-1920}
HEIGHT=${OUTPUT_VIDEO_HEIGHT:-1080}
FPS=${DRIVE_VIDEO_FPS:-60}
mkdir -p "$RAW"

phase() { "$DRIVE" '["peek","phase"]' 2>/dev/null; }

reset_demo() {
  "$DRIVE" '["demo"]' >/dev/null
  sleep 1
  npx @iwsdk/cli runtime wait --timeout 60000 >/dev/null
  "$EMU" enter
  npx @iwsdk/cli browser run scripts/capture/viewport.mjs --timeout 60000 >/dev/null
  npx @iwsdk/cli browser run scripts/capture/mute-audio.mjs --timeout 60000 >/dev/null
  scripts/capture/prepare-room.sh >/dev/null
  "$DRIVE" '["wait",8]' >/dev/null
  if [ "$(phase)" != '"hub"' ]; then
    echo "Expected hub after reset, got $(phase)" >&2
    exit 1
  fi
}

ready_match() {
  "$DRIVE" '["key","KeyR"]' '["wait",3.5]' >/dev/null
  if [ "$(phase)" != '"ready"' ]; then
    echo "Expected ready phase, got $(phase)" >&2
    exit 1
  fi
}

start_fight() {
  ready_match
  for _ in 1 2; do
    "$DRIVE" '["dualRip",{"power":0.86,"onBeat":true}]' '["key","KeyU"]' '["fightAt",1.5]' >/dev/null
    if [ "$(phase)" = '"fight"' ]; then
      return
    fi
  done
  echo "Expected fight phase after two launch attempts, got $(phase)" >&2
  exit 1
}

record() {
  local file=$1
  shift
  echo "Recording $file"
  DRIVE_TIMEOUT=100000 \
    DRIVE_VIDEO_WIDTH=$CAPTURE_WIDTH DRIVE_VIDEO_HEIGHT=$CAPTURE_HEIGHT DRIVE_VIDEO_FPS=$FPS \
    DRIVE_VIDEO="$RAW/$file.mp4" \
    "$DRIVE" "$@" >/dev/null
  test -s "$RAW/$file.mp4"
}

label() {
  local input=$1 output=$2 title=$3 subtitle=$4
  ffmpeg -y -loglevel error -i "$input" -f lavfi -i anullsrc=r=48000:cl=stereo \
    -map 0:v:0 -map 1:a:0 -shortest \
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},drawtext=fontfile=$FONT:text='$title':fontcolor=0xff9b42:fontsize=46:x=42:y=34:box=1:boxcolor=0x101318@0.72:boxborderw=14,drawtext=fontfile=$FONT:text='$subtitle':fontcolor=white:fontsize=27:x=45:y=106:box=1:boxcolor=0x101318@0.58:boxborderw=9,drawtext=fontfile=$FONT:text='IWER EMULATOR  -  SYNTHETIC 3D ROOM  -  QUEST FOOTAGE DEGIL':fontcolor=white@0.58:fontsize=20:x=w-text_w-26:y=h-38" \
    -c:v h264_nvenc -preset p6 -tune hq -rc vbr -cq 14 -b:v 0 -pix_fmt yuv420p -r "$FPS" \
    -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$output"
}

# Take 1: the complete physical opening followed by three readable arena decisions.
reset_demo
ready_match
record 01-launch-and-arena-control \
  '["wait",0.6]' \
  '["dualRip",{"power":0.88,"aim":8,"onBeat":true}]' \
  '["key","KeyU"]' '["fightAt",1.4]' \
  '["groove",{"at":{"x":-0.06,"z":0.02},"angle":14,"length":0.12}]' '["wait",0.5]' \
  '["ramp",{"hold":0.6}]' '["wait",0.6]' \
  '["rimSpring",{"angle":38,"pull":0.052}]' '["wait",2.4]'

# Take 2: live two-hand arena shaping, a directional palm move and a stamped finisher.
reset_demo
"$DRIVE" '["key","KeyA"]' '["wait",1.0]' >/dev/null
start_fight
record 02-forge-and-finish \
  '["wait",0.5]' \
  '["arenaForge",{"squeeze":0.034,"twist":18,"tilt":0.045,"hold":1.2}]' '["wait",0.6]' \
  '["palmGust",{"angle":-12,"side":"left"}]' '["wait",0.7]' \
  '["key","KeyJ"]' '["wait",0.5]' \
  '["stampUltimate",{"at":"rival","steerAngle":20,"hold":1.0}]' '["wait",2.5]' \
  '["key","KeyK"]' '["wait",3.0]'

label "$RAW/01-launch-and-arena-control.mp4" "$OUT/01-launch-and-arena-control-1080p60.mp4" \
  'FIRLAT  OKU  ARENAYI DEGISTIR' 'Avuc rampasi  yon olugu  pinch rampasi  kenar yayi'
label "$RAW/02-forge-and-finish.mp4" "$OUT/02-forge-and-finish-1080p60.mp4" \
  'IKI ELLE DOV  AVUCLA YON VER' 'Canli arena deformasyonu  Forge Gust  fiziksel muhur ultisi'

printf "file '%s'\n" \
  "$OUT/01-launch-and-arena-control-1080p60.mp4" \
  "$OUT/02-forge-and-finish-1080p60.mp4" >"$OUT/concat.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$OUT/concat.txt" -c copy -movflags +faststart \
  "$OUT/spinsmith-room-gameplay-1080p60.mp4"
rm -f "$OUT/concat.txt"

echo "$OUT/spinsmith-room-gameplay-1080p60.mp4"
