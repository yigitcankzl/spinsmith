#!/usr/bin/env bash
# Records the emulator trailer shots with the hand driver and cuts a rough trailer with title
# cards (run the dev server with browser automation enabled).
#   scripts/trailer.sh [out-dir]        start a capture server, record every shot, then cut
#   CUT_ONLY=1 scripts/trailer.sh       cut again from the shots already recorded
#   CAPTURE_USE_RUNNING=1 ...           reuse an automation-enabled managed server
# Output: <out-dir>/shots/*.mp4 and <out-dir>/spinsmith-trailer-rough.mp4 (emulator footage, labelled).
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=${1:-$HOME/Desktop/spinsmith-videos}
S=$OUT/shots
mkdir -p "$S"
D=scripts/drive.sh
E=scripts/emu.sh
VIDEO_WIDTH=${DRIVE_VIDEO_WIDTH:-1920}
VIDEO_HEIGHT=${DRIVE_VIDEO_HEIGHT:-1080}
VIDEO_FPS=${DRIVE_VIDEO_FPS:-60}
rec() { DRIVE_TIMEOUT=100000 DRIVE_VIDEO="$S/$1" $D "${@:2}" >/dev/null; }
phase() { $D '["peek","phase"]' 2>/dev/null; }
home() { [ "$(phase)" = '"hub"' ] || { $D '["tap","menu"]' '["wait",0.3]' '["tap","menu"]' '["wait",2]' >/dev/null; sleep 1; }; }
ready() { $D '["key","KeyR"]' '["wait",3.5]' >/dev/null; }
logs() { $E logs 40; }

if [ -z "${CUT_ONLY:-}" ]; then
  CAPTURE_OWNS_SERVER=0
  if [ -z "${CAPTURE_USE_RUNNING:-}" ]; then
    echo "Starting a visible, hardware-accelerated IWSDK capture browser (it will stop when capture finishes)..."
    npx @iwsdk/cli dev restart --open --allow-browser-automation --timeout 60000 >/dev/null
    CAPTURE_OWNS_SERVER=1
    trap '[ "$CAPTURE_OWNS_SERVER" = 1 ] && npx @iwsdk/cli dev down >/dev/null 2>&1 || true' EXIT
  fi
  $E enter
  # 1. The arena rises and the title (a fresh page, the title shows once per session).
  $D '["demo"]' >/dev/null 2>&1; sleep 10
  npx @iwsdk/cli xr enter >/dev/null 2>&1; npx @iwsdk/cli xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1; $E front
  rec 01-rise-title.mp4 '["wait",13]'
  # 2. The rival's portal entrance.
  rec 02-portal.mp4 '["tap","play"]' '["wait",3.5]'
  # 3. Rip, a ramp that knocks the rival out, and its replay (retried until the ramp is the cause).
  for _ in 1 2 3 4 5; do
    sleep 3; ready
    rec 03-rip-ramp-replay.mp4 '["rip",{"power":0.95}]' '["fightAt",3]' '["ramp",{"hold":0.35}]' '["key","KeyK"]' '["wait",9]'
    logs | grep -q "YOUR RAMP →" && break
  done
  # 4. The strike (a new match so the round is fresh).
  sleep 3; ready
  rec 04-strike.mp4 '["rip",{"power":0.8}]' '["fightAt",3]' '["key","KeyJ"]' '["wait",0.8]' '["slap",{"fallback":true}]' '["wait",3.5]'
  # 4a. The signature move: grab opposite rims and physically forge the live arena.
  sleep 5; $D '["demo"]' >/dev/null 2>&1; sleep 3; $E enter; $D '["wait",8]' >/dev/null; ready
  rec 04a-arena-forge.mp4 '["dualRip",{"power":0.88,"onBeat":true}]' '["fightAt",2.7]' '["key","KeyU"]' '["arenaForge",{"squeeze":0.03,"twist":14,"tilt":0.03,"hold":0.7}]' '["wait",2]'
  # 4b. The room-scale payoff without room-scale movement: catch a ring-out on the real table and
  # draw a molten return rail back into the bowl.
  rec 04b-outer-ring.mp4 '["outerRingReturn","right"]' '["wait",2]'
  # 5. Cup and sling.
  for _ in 1 2 3; do
    # Reset to the stable Forge Bowl bout; a later rival may end the round while the hand reaches in.
    sleep 5; $D '["demo"]' >/dev/null 2>&1; sleep 3; $E enter; $D '["wait",8]' >/dev/null; ready
    rec 05-cup-sling.mp4 '["rip",{"power":0.7}]' '["fightAt",2.6]' '["cup",{"at":"mine"}]' '["wait",0.4]' '["sling"]' '["wait",2.5]'
    logs | grep -q "sling" && break
  done
  # 6. The forge: a part onto the top, then the quench.
  sleep 4; home
  rec 06-forge.mp4 '["tap","forge"]' '["wait",2.5]' '["drag","Saw","top"]' '["wait",1]' '["drag","top","quench"]' '["wait",3]'
  # 7. A won match.
  sleep 3; home; ready
  rec 07-match-win.mp4 '["rip",{"power":0.9}]' '["wait",3]' '["key","KeyK"]' '["wait",11]' '["rip",{"power":0.9}]' '["wait",3]' '["key","KeyK"]' '["wait",10]'
fi

for required in 01-rise-title 02-portal 03-rip-ramp-replay 04-strike 04a-arena-forge 04b-outer-ring 05-cup-sling 06-forge 07-match-win; do
  if [ ! -s "$S/$required.mp4" ]; then
    echo "Missing capture: $S/$required.mp4" >&2
    exit 1
  fi
done

# The cut: title cards between trimmed shots, every shot labelled as emulator footage.
T=$(mktemp -d)
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
card() {
  ffmpeg -y -loglevel error -f lavfi -i "color=c=0x14161b:s=${VIDEO_WIDTH}x${VIDEO_HEIGHT}:d=2.2:r=$VIDEO_FPS" -f lavfi -i anullsrc=r=48000:cl=stereo -t 2.2 \
    -vf "drawtext=fontfile=$FONT:text='$2':fontcolor=0xff8a2a:fontsize=92:x=(w-text_w)/2:y=(h-text_h)/2-30,drawtext=fontfile=$FONT:text='$3':fontcolor=0xd9d4cc:fontsize=40:x=(w-text_w)/2:y=(h/2)+60,fade=t=in:st=0:d=0.3,fade=t=out:st=1.9:d=0.3" \
    -c:v libx264 -crf 14 -preset slow -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2 -shortest "$T/$1.mp4"
}
clip() {
  local end; end=$(echo "$4 - 0.3" | bc)
  ffmpeg -y -loglevel error -ss "$3" -i "$S/$2" -t "$4" \
    -vf "scale=${VIDEO_WIDTH}:${VIDEO_HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${VIDEO_WIDTH}:${VIDEO_HEIGHT},fps=${VIDEO_FPS},drawtext=fontfile=$FONT:text='Captured in the IWER emulator':fontcolor=white@0.55:fontsize=26:x=w-text_w-30:y=h-50,fade=t=in:st=0:d=0.2,fade=t=out:st=$end:d=0.3" \
    -af "afade=t=in:st=0:d=0.2,afade=t=out:st=$end:d=0.3" -c:v libx264 -crf 14 -preset slow -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2 "$T/$1.mp4"
}
card c0 "SPINSMITH" "A spinning-top battle on your real table"
clip s1 01-rise-title.mp4 6.5 5
card c1 "THEY COME FOR YOU" "Seven rivals, each with a move of its own"
clip s2 02-portal.mp4 0.6 4
card c2 "RESHAPE THE ARENA" "Pinch the floor and a ramp throws your rival out"
clip s3 03-rip-ramp-replay.mp4 0.5 14
card c2a "GRAB THE LIVE ARENA" "Two hands squeeze, tilt and twist the fight"
clip s3a 04a-arena-forge.mp4 4.2 6
card c2b "YOUR TABLE IS IN PLAY" "Catch a ring-out and forge its road home"
clip s3b 04b-outer-ring.mp4 0 5
card c3 "STRIKE THE TABLE" "Slap your real desk and a shockwave runs through the arena"
clip s4 04-strike.mp4 2 8
card c4 "CATCH AND SLING" "Press a cup into the floor, then let it fly"
clip s5 05-cup-sling.mp4 1.5 8
card c5 "FORGE IT BY HAND" "226 builds, every part changes the physics"
clip s6 06-forge.mp4 0.5 12
clip s7 07-match-win.mp4 15 13
card c6 "SPINSMITH" "Hands only. Seated. Play in the Quest browser, no install."
for n in c0 s1 c1 s2 c2 s3 c2a s3a c2b s3b c3 s4 c4 s5 c5 s6 s7 c6; do echo "file '$T/$n.mp4'"; done > "$T/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$T/list.txt" -c:v libx264 -crf 14 -preset slow -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart "$OUT/spinsmith-trailer-rough.mp4"
echo "$OUT/spinsmith-trailer-rough.mp4 ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/spinsmith-trailer-rough.mp4") s)"
