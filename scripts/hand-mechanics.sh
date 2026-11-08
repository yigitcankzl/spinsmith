#!/usr/bin/env bash
# Records a plain mechanics catalogue: no trailer cards, no montage and no hidden controller input.
# Every clip is driven through IWER's emulated hand skeleton and is kept separately for inspection.
#
# Usage: scripts/hand-mechanics.sh [output-directory]
# CAPTURE_USE_RUNNING=1 reuses an automation-enabled managed IWSDK browser.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT=${1:-$HOME/Desktop/spinsmith-videos/hand-mechanics}
RAW=$OUT/raw
LABELLED=$OUT/labelled
DRIVE=scripts/drive.sh
EMU=scripts/emu.sh
FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
CAPTURE_WIDTH=${DRIVE_VIDEO_WIDTH:-1440}
CAPTURE_HEIGHT=${DRIVE_VIDEO_HEIGHT:-810}
WIDTH=${OUTPUT_VIDEO_WIDTH:-1920}
HEIGHT=${OUTPUT_VIDEO_HEIGHT:-1080}
FPS=${DRIVE_VIDEO_FPS:-60}
START_AT=${HAND_START_AT:-1}
ONLY=${HAND_ONLY:-}
mkdir -p "$RAW" "$LABELLED"

should_capture() {
  local candidate=$1
  [ "$candidate" -ge "$START_AT" ] || return 1
  [ -z "$ONLY" ] && return 0
  local selected item
  IFS=',' read -r -a selected <<<"$ONLY"
  for item in "${selected[@]}"; do
    [ "$item" = "$candidate" ] && return 0
  done
  return 1
}

CAPTURE_OWNS_SERVER=0
cleanup() {
  if [ "$CAPTURE_OWNS_SERVER" = 1 ]; then
    npx @iwsdk/cli dev down >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ -z "${CAPTURE_USE_RUNNING:-}" ]; then
  echo "Starting the GPU-backed IWER hand-capture runtime..."
  npx @iwsdk/cli dev restart --headless --allow-browser-automation --timeout 60000 >/dev/null
  CAPTURE_OWNS_SERVER=1
fi

browser_ready=false
for _ in $(seq 1 60); do
  if npx @iwsdk/cli dev status 2>/dev/null | grep -q '"browserCommandReady": true'; then
    browser_ready=true
    break
  fi
  sleep 1
done
if [ "$browser_ready" != true ]; then
  echo "Managed browser did not become command-ready." >&2
  exit 1
fi

phase() { "$DRIVE" '["peek","phase"]' 2>/dev/null; }
arena_name() { "$DRIVE" '["peek","arena.layout.name"]' 2>/dev/null; }

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
  for _ in $(seq 1 20); do
    [ "$(arena_name)" = '"Forge Bowl"' ] && return
    "$DRIVE" '["key","KeyA"]' '["wait",0.1]' >/dev/null
  done
  echo "Could not select Forge Bowl for the hand-mechanics capture." >&2
  exit 1
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
    "$DRIVE" '["dualRip",{"power":0.84,"onBeat":true}]' '["key","KeyU"]' '["fightAt",0.65]' >/dev/null
    [ "$(phase)" = '"fight"' ] && return
  done
  echo "Expected fight phase after two launch attempts, got $(phase)" >&2
  exit 1
}

record() {
  local file=$1
  shift
  echo "Recording $file"
  local result
  if ! result=$(DRIVE_TIMEOUT=100000 \
    DRIVE_VIDEO_WIDTH=$CAPTURE_WIDTH DRIVE_VIDEO_HEIGHT=$CAPTURE_HEIGHT DRIVE_VIDEO_FPS=$FPS \
    DRIVE_VIDEO="$RAW/$file.mp4" \
    "$DRIVE" "$@"); then
    echo "$result" >&2
    return 1
  fi
  if [ ! -s "$RAW/$file.mp4" ]; then
    echo "$result" >&2
    return 1
  fi
}

if [ -z "${CUT_ONLY:-}" ]; then
# 01 — The signature launch. One relaxed open palm is the launcher, the other hand pulls.
if should_capture 1; then
reset_demo
ready_match
record 01-palm-launch \
  '["wait",0.8]' '["dualRip",{"power":0.88,"aim":8,"onBeat":true}]' '["wait",2.2]'
fi

# 02 — Draw a real directional rule into the live arena with one fingertip.
if should_capture 2; then
reset_demo
start_fight
record 02-finger-groove \
  '["wait",0.2]' '["groove",{"at":{"x":-0.085,"z":0.02},"angle":10,"length":0.07}]' '["wait",2.2]'
fi

# 03 — Pinch and drag the floor to raise a ramp under the moving rival.
if should_capture 3; then
reset_demo
start_fight
record 03-pinch-ramp \
  '["wait",0.6]' '["ramp",{"hold":0.65}]' '["wait",2.5]'
fi

# 04 — Pull a physical rim sector inward and release its spring impulse.
if should_capture 4; then
reset_demo
start_fight
record 04-rim-spring \
  '["wait",0.6]' '["rimSpring",{"angle":38,"pull":0.052}]' '["wait",2.4]'
fi

# 05 — Two flat palms on the rim become a Crossguard rail that saves your own top.
if should_capture 5; then
reset_demo
start_fight
record 05-crossguard \
  '["wait",0.5]' '["crossguard",{"hold":0.8}]' '["wait",1.8]'
fi

# 06 — Both hands grab the live rim and squeeze, twist and tilt its physics.
if should_capture 6; then
reset_demo
start_fight
record 06-two-hand-arena-forge \
  '["wait",0.5]' '["arenaForge",{"squeeze":0.034,"twist":18,"tilt":0.045,"hold":1.3}]' '["wait",2.4]'
fi

# 07 — Press a cup into the floor, catch a top, then pinch-pull-release it like a sling.
if should_capture 7; then
reset_demo
start_fight
record 07-cup-and-sling \
  '["wait",0.4]' '["cup",{"at":"mine"}]' '["wait",0.5]' '["sling",{"pull":0.095}]' '["wait",2.5]'
fi

# 08 — A top outside the bowl can be caught on the table with an open palm and swept home.
if should_capture 8; then
reset_demo
start_fight
record 08-palm-catch-return \
  '["wait",0.5]' '["outerRingReturn","right"]' '["wait",2.5]'
fi

# 09 — A real downward palm slap spends the armed ultimate and changes the arena.
if should_capture 9; then
reset_demo
start_fight
"$DRIVE" '["key","KeyJ"]' '["wait",0.8]' >/dev/null
record 09-palm-slap-ultimate \
  '["wait",0.5]' '["slap",{"angle":"rival","fallback":true}]' '["wait",4.0]'
fi

# 10 — The alternate ultimate: pinch the raised seal and physically stamp it into the fight.
if should_capture 10; then
reset_demo
start_fight
"$DRIVE" '["key","KeyJ"]' '["wait",0.8]' >/dev/null
record 10-seal-stamp-ultimate \
  '["wait",0.5]' '["stampUltimate",{"at":"rival","steerAngle":20,"hold":1.0}]' '["wait",4.0]'
fi

# 11 — In the workshop, one palm is the workbench while the other hand fits a real part.
if should_capture 11; then
reset_demo
"$DRIVE" '["tap","forge"]' '["wait",2.5]' >/dev/null
record 11-palm-workbench \
  '["wait",0.6]' '["palmForge","Striker","left"]' '["wait",2.5]'
fi

# 12 — Standard precise hand work also covers placing machinery and resizing the arena rim.
if should_capture 12; then
reset_demo
"$DRIVE" '["tap","workshop"]' '["wait",2.5]' '["tap","pieces"]' '["wait",0.8]' >/dev/null
record 12-workshop-pinch-build \
  '["drag","bumper","arena_left"]' '["wait",0.8]' '["arenaResize"]' '["wait",2.4]'
fi

# 13 — A fast open-palm sweep crosses the bowl and physically redirects tops on its path.
if should_capture 13; then
reset_demo
start_fight
record 13-forge-gust \
  '["wait",0.5]' '["palmGust",{"angle":-12,"side":"left"}]' '["wait",2.4]'
fi

# 14 — One fingertip swung through the rival flicks it along the swing.
if should_capture 14; then
reset_demo
start_fight
record 14-flick \
  '["wait",0.5]' '["flick",{"target":"rival","angle":0,"speed":0.65,"side":"right"}]' '["wait",2.4]'
fi
fi

titles=(
  "AVUC DESTEKLI FIRLATMA"
  "PARMAKLA YON OLUGU"
  "SIKISTIRIP RAMPA CEKME"
  "KENAR YAYINI GERME"
  "CROSSGUARD  IKI AVUC RAY OLUR"
  "IKI ELLE ARENAYI DOVME"
  "CUP VE SAPAN"
  "MASADAN AVUCLA GERI GETIRME"
  "AVUC DARBE ULTISI"
  "MUHUR BASMA ULTISI"
  "AVUC USTUNDE PARCA TAKMA"
  "SIKISTIRIP YERLESTIRME VE BOYUTLAMA"
  "AVUCLA FORGE GUST"
  "PARMAKLA FLICK"
)
subs=(
  "Acik avuc rampayi tutar  diger el ipi ceker"
  "Isaret parmagi arenaya tek kullanimlik hiz cizgisi kazir"
  "Zemin fiziksel olarak yukselir ve topaci firlatir"
  "Kenari cekip birakinca yay kuvveti olusur"
  "Kenardaki iki duz avuc bir ray kurar  kendi topacini kurtarir"
  "Iki el canli arenayi sikistirir  eger ve cevirir"
  "Parmak zemine cep acar  pinch topaci geri firlatir"
  "Disari cikan topac avucta yakalanip arenaya supurulur"
  "Masaya inen avuc arenada kalici bir etki birakir"
  "Yukselen muhur tutulup istenen noktaya fiziksel olarak basilir"
  "Bir el topaci tasir  diger el gercek parcayi yerine oturtur"
  "Ayni pinch diliyle makine yerlestirilir ve arena genisletilir"
  "Acik avucun yonlu supurmesi yolundaki topaclari fiziksel olarak iter"
  "Parmak ucu rakibin icinden gecer  topac savrulur  tek sarj"
)

files=()
for i in $(seq 1 14); do
  raw=$(find "$RAW" -maxdepth 1 -type f -name "$(printf '%02d' "$i")-*.mp4" -print -quit)
  if [ -z "$raw" ]; then echo "Missing raw clip $i" >&2; exit 1; fi
  name=$(basename "$raw")
  out="$LABELLED/$name"
  title=${titles[$((i - 1))]}
  sub=${subs[$((i - 1))]}
  ffmpeg -y -loglevel error -i "$raw" -f lavfi -i anullsrc=r=48000:cl=stereo \
    -map 0:v:0 -map 1:a:0 -shortest \
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},drawtext=fontfile=$FONT:text='$title':fontcolor=0xff9b42:fontsize=46:x=42:y=34:box=1:boxcolor=0x101318@0.78:boxborderw=14,drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=27:x=45:y=106:box=1:boxcolor=0x101318@0.65:boxborderw=9,drawtext=fontfile=$FONT:text='IWER EMULATOR  -  EL ISKELETIYLE OTOMATIK TEST  -  QUEST KAYDI DEGIL':fontcolor=white@0.58:fontsize=20:x=w-text_w-26:y=h-38" \
    -c:v h264_nvenc -preset p6 -tune hq -rc vbr -cq 14 -b:v 0 -pix_fmt yuv420p -r "$FPS" \
    -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$out"
  files+=("$out")
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"; cleanup' EXIT
printf "file '%s'\n" "${files[@]}" > "$TMP/list.txt"
FINAL=$OUT/spinsmith-hand-mechanics-1080p60.mp4
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c copy -movflags +faststart "$FINAL"

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL")
echo "$FINAL ($duration s)"
