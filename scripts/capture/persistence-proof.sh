#!/usr/bin/env bash
# Records the same saved smithy before and after a real browser reload, then fails if the saved
# progression changed. This is emulator evidence for the trailer, not headset footage.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT=${1:-$HOME/Desktop/spinsmith-videos/persistence-proof}
RAW="$OUT/raw"
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
mkdir -p "$RAW"
cd "$ROOT"

phase() { scripts/drive.sh '["peek","phase"]' 2>/dev/null; }
saved_state() {
  printf '%s|%s|%s|%s' \
    "$(scripts/drive.sh '["peek","progress.level"]' 2>/dev/null)" \
    "$(scripts/drive.sh '["peek","progress.stamps"]' 2>/dev/null)" \
    "$(scripts/drive.sh '["peek","progress.champions"]' 2>/dev/null)" \
    "$(scripts/drive.sh '["peek","progress.marks"]' 2>/dev/null)"
}

enter_hub() {
  npx @iwsdk/cli runtime wait --timeout 60000 >/dev/null
  scripts/emu.sh enter
  npx @iwsdk/cli browser run scripts/capture/viewport.mjs --timeout 60000 >/dev/null
  npx @iwsdk/cli browser run scripts/capture/mute-audio.mjs --timeout 60000 >/dev/null
  scripts/capture/prepare-room.sh >/dev/null
  scripts/drive.sh '["wait",6]' >/dev/null
  if [[ "$(phase)" == '"placing"' ]]; then
    npx @iwsdk/cli browser run scripts/capture/place.mjs --timeout 60000 >/dev/null
    scripts/drive.sh '["wait",2]' >/dev/null
  fi
  [[ "$(phase)" == '"hub"' ]] || { echo "Expected hub, got $(phase)" >&2; exit 1; }
}

record_hub() {
  local file=$1
  DRIVE_TIMEOUT=60000 DRIVE_VIDEO_WIDTH=1440 DRIVE_VIDEO_HEIGHT=810 DRIVE_VIDEO_FPS=60 \
    DRIVE_VIDEO="$file" scripts/drive.sh '["wait",4]' >/dev/null
  [[ -s "$file" ]]
}

# The prepared save makes the persistent objects visible without first grinding through matches.
scripts/drive.sh '["demo"]' >/dev/null
sleep 1
enter_hub
before=$(saved_state)
record_hub "$RAW/before.mp4"

# This is the proof boundary: reload the actual app, re-enter XR and inspect the save it restored.
npx @iwsdk/cli browser reload >/dev/null
sleep 1
enter_hub
after=$(saved_state)
[[ "$before" == "$after" ]] || { echo "Saved progression changed across reload." >&2; exit 1; }
record_hub "$RAW/after.mp4"

ffmpeg -y -loglevel error \
  -i "$RAW/before.mp4" -i "$RAW/after.mp4" -f lavfi -i anullsrc=r=48000:cl=stereo \
  -filter_complex "\
[0:v]scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,fps=60,\
drawtext=fontfile=$FONT:text='BEFORE RELOAD':fontcolor=0xff9b42:fontsize=48:x=44:y=38:box=1:boxcolor=0x101318@0.74:boxborderw=14,\
drawtext=fontfile=$FONT:text='LV 8  /  3 CHAMPIONS  /  RIVAL MARKS':fontcolor=white:fontsize=27:x=47:y=112:box=1:boxcolor=0x101318@0.60:boxborderw=9,\
trim=duration=2.4,setpts=PTS-STARTPTS[a];\
[1:v]scale=1920:1080:force_original_aspect_ratio=increase:flags=lanczos,crop=1920:1080,fps=60,\
drawtext=fontfile=$FONT:text='AFTER REAL BROWSER RELOAD':fontcolor=0xff9b42:fontsize=48:x=44:y=38:box=1:boxcolor=0x101318@0.74:boxborderw=14,\
drawtext=fontfile=$FONT:text='SAME LOCAL SAVE RESTORED':fontcolor=white:fontsize=27:x=47:y=112:box=1:boxcolor=0x101318@0.60:boxborderw=9,\
trim=duration=2.4,setpts=PTS-STARTPTS[b];\
color=c=0x101318:s=1920x1080:r=60:d=0.6,\
drawtext=fontfile=$FONT:text='BROWSER RELOAD':fontcolor=0xff9b42:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2[cut];\
[a][cut][b]concat=n=3:v=1:a=0,\
drawtext=fontfile=$FONT:text='IWER EMULATOR  -  SYNTHETIC ROOM  -  NOT HEADSET FOOTAGE':fontcolor=white@0.60:fontsize=20:x=w-text_w-26:y=h-38[v]" \
  -map '[v]' -map 2:a:0 -shortest \
  -c:v h264_nvenc -preset p6 -tune hq -rc vbr -cq 14 -b:v 0 -pix_fmt yuv420p -r 60 \
  -c:a aac -b:a 192k -movflags +faststart "$OUT/spinsmith-persistence-proof-1080p60.mp4"

echo "$OUT/spinsmith-persistence-proof-1080p60.mp4"
