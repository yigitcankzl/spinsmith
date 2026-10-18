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
WIDTH=${DRIVE_VIDEO_WIDTH:-1920}
HEIGHT=${DRIVE_VIDEO_HEIGHT:-1080}
FPS=${DRIVE_VIDEO_FPS:-60}
mkdir -p "$RAW" "$LABELLED"

CAPTURE_OWNS_SERVER=0
cleanup() {
  if [ "$CAPTURE_OWNS_SERVER" = 1 ]; then
    npx @iwsdk/cli dev down >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

if [ -z "${CAPTURE_USE_RUNNING:-}" ]; then
  echo "Starting the GPU-backed IWER hand-capture runtime..."
  env -u WAYLAND_DISPLAY \
    XDG_SESSION_TYPE=x11 \
    __NV_PRIME_RENDER_OFFLOAD=1 \
    __GLX_VENDOR_LIBRARY_NAME=nvidia \
    __VK_LAYER_NV_optimus=NVIDIA_only \
    DRI_PRIME=1 \
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

reset_demo() {
  "$DRIVE" '["demo"]' >/dev/null
  sleep 1
  npx @iwsdk/cli runtime wait --timeout 60000 >/dev/null
  "$EMU" enter
  npx @iwsdk/cli browser run scripts/capture/viewport.mjs --timeout 60000 >/dev/null
  npx @iwsdk/cli browser run scripts/capture/mute-audio.mjs --timeout 60000 >/dev/null
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
  "$DRIVE" '["dualRip",{"power":0.84,"onBeat":true}]' '["fightAt",2.2]' >/dev/null
  if [ "$(phase)" != '"fight"' ]; then
    echo "Expected fight phase, got $(phase)" >&2
    exit 1
  fi
}

record() {
  local file=$1
  shift
  echo "Recording $file"
  DRIVE_TIMEOUT=100000 \
    DRIVE_VIDEO_WIDTH=$WIDTH DRIVE_VIDEO_HEIGHT=$HEIGHT DRIVE_VIDEO_FPS=$FPS \
    DRIVE_VIDEO="$RAW/$file.mp4" \
    "$DRIVE" "$@" >/dev/null
  test -s "$RAW/$file.mp4"
}

if [ -z "${CUT_ONLY:-}" ]; then
# 01 — The signature launch. One relaxed open palm is the launcher, the other hand pulls.
reset_demo
ready_match
record 01-palm-launch \
  '["wait",0.8]' '["dualRip",{"power":0.88,"aim":8,"onBeat":true}]' '["wait",2.2]'

# 02 — Draw a real directional rule into the live arena with one fingertip.
reset_demo
start_fight
record 02-finger-groove \
  '["wait",0.6]' '["groove",{"at":{"x":-0.07,"z":0.015},"angle":12,"length":0.12}]' '["wait",2.2]'

# 03 — Pinch and drag the floor to raise a ramp under the moving rival.
reset_demo
start_fight
record 03-pinch-ramp \
  '["wait",0.6]' '["ramp",{"hold":0.65}]' '["wait",2.5]'

# 04 — Pull a physical rim sector inward and release its spring impulse.
reset_demo
start_fight
record 04-rim-spring \
  '["wait",0.6]' '["rimSpring",{"angle":38,"pull":0.052}]' '["wait",2.4]'

# 05 — An open hand becomes a temporary wall at the edge of the bowl.
reset_demo
start_fight
record 05-palm-brace \
  '["wait",0.5]' '["palmBrace",{"angle":48,"hold":2.0}]' '["wait",1.8]'

# 06 — Both hands grab the live rim and squeeze, twist and tilt its physics.
reset_demo
start_fight
record 06-two-hand-arena-forge \
  '["wait",0.5]' '["arenaForge",{"squeeze":0.034,"twist":18,"tilt":0.045,"hold":1.3}]' '["wait",2.4]'

# 07 — Press a cup into the floor, catch a top, then pinch-pull-release it like a sling.
reset_demo
start_fight
record 07-cup-and-sling \
  '["wait",0.4]' '["cup",{"at":"mine"}]' '["wait",0.5]' '["sling",{"pull":0.095}]' '["wait",2.5]'

# 08 — A top outside the bowl can be caught on the table with an open palm and swept home.
reset_demo
start_fight
record 08-palm-catch-return \
  '["wait",0.5]' '["outerRingReturn","right"]' '["wait",2.5]'

# 09 — A real downward palm slap spends the armed ultimate and changes the arena.
reset_demo
start_fight
"$DRIVE" '["key","KeyU"]' '["wait",0.8]' >/dev/null
record 09-palm-slap-ultimate \
  '["wait",0.5]' '["slap",{"angle":"rival","fallback":true}]' '["wait",4.0]'

# 10 — The alternate ultimate: pinch the raised seal and physically stamp it into the fight.
reset_demo
start_fight
"$DRIVE" '["key","KeyU"]' '["wait",0.8]' >/dev/null
record 10-seal-stamp-ultimate \
  '["wait",0.5]' '["stampUltimate",{"at":"rival","steerAngle":20,"hold":1.0}]' '["wait",4.0]'

# 11 — In the workshop, one palm is the workbench while the other hand fits a real part.
reset_demo
"$DRIVE" '["tap","forge"]' '["wait",2.5]' >/dev/null
record 11-palm-workbench \
  '["wait",0.6]' '["palmForge","Striker","left"]' '["wait",2.5]'

# 12 — Standard precise hand work also covers placing machinery and resizing the arena rim.
reset_demo
"$DRIVE" '["tap","workshop"]' '["wait",2.5]' '["tap","pieces"]' '["wait",0.8]' >/dev/null
record 12-workshop-pinch-build \
  '["drag","bumper","arena_left"]' '["wait",0.8]' '["arenaResize"]' '["wait",2.4]'

# 13 — A fast open-palm sweep crosses the bowl and physically redirects tops on its path.
reset_demo
start_fight
record 13-forge-gust \
  '["wait",0.5]' '["palmGust",{"angle":-12,"side":"left"}]' '["wait",2.4]'
fi

titles=(
  "AVUC DESTEKLI FIRLATMA"
  "PARMAKLA YON OLUGU"
  "SIKISTIRIP RAMPA CEKME"
  "KENAR YAYINI GERME"
  "AVUC BARIYERI"
  "IKI ELLE ARENAYI DOVME"
  "CUP VE SAPAN"
  "MASADAN AVUCLA GERI GETIRME"
  "AVUC DARBE ULTISI"
  "MUHUR BASMA ULTISI"
  "AVUC USTUNDE PARCA TAKMA"
  "SIKISTIRIP YERLESTIRME VE BOYUTLAMA"
  "AVUCLA FORGE GUST"
)
subs=(
  "Acik avuc rampayi tutar  diger el ipi ceker"
  "Isaret parmagi arenaya tek kullanimlik hiz cizgisi kazir"
  "Zemin fiziksel olarak yukselir ve topaci firlatir"
  "Kenari cekip birakinca yay kuvveti olusur"
  "Acik el kisa sureli fiziksel duvara donusur"
  "Iki el canli arenayi sikistirir  eger ve cevirir"
  "Parmak zemine cep acar  pinch topaci geri firlatir"
  "Disari cikan topac avucta yakalanip arenaya supurulur"
  "Masaya inen avuc arenada kalici bir etki birakir"
  "Yukselen muhur tutulup istenen noktaya fiziksel olarak basilir"
  "Bir el topaci tasir  diger el gercek parcayi yerine oturtur"
  "Ayni pinch diliyle makine yerlestirilir ve arena genisletilir"
  "Acik avucun yonlu supurmesi yolundaki topaclari fiziksel olarak iter"
)

files=()
for i in $(seq 1 13); do
  raw=$(find "$RAW" -maxdepth 1 -type f -name "$(printf '%02d' "$i")-*.mp4" -print -quit)
  if [ -z "$raw" ]; then echo "Missing raw clip $i" >&2; exit 1; fi
  name=$(basename "$raw")
  out="$LABELLED/$name"
  title=${titles[$((i - 1))]}
  sub=${subs[$((i - 1))]}
  ffmpeg -y -loglevel error -i "$raw" -f lavfi -i anullsrc=r=48000:cl=stereo \
    -map 0:v:0 -map 1:a:0 -shortest \
    -vf "scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase:flags=lanczos,crop=${WIDTH}:${HEIGHT},fps=${FPS},drawtext=fontfile=$FONT:text='$title':fontcolor=0xff9b42:fontsize=46:x=42:y=34:box=1:boxcolor=0x101318@0.78:boxborderw=14,drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=27:x=45:y=106:box=1:boxcolor=0x101318@0.65:boxborderw=9,drawtext=fontfile=$FONT:text='IWER EMULATOR  -  EL ISKELETIYLE OTOMATIK TEST  -  QUEST KAYDI DEGIL':fontcolor=white@0.58:fontsize=20:x=w-text_w-26:y=h-38" \
    -c:v libx264 -crf 12 -preset slow -tune animation -pix_fmt yuv420p -r "$FPS" \
    -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$out"
  files+=("$out")
done

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"; cleanup' EXIT
printf "file '%s'\n" "${files[@]}" > "$TMP/list.txt"
FINAL=$OUT/spinsmith-hand-mechanics-1080p60.mp4
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" \
  -c:v libx264 -crf 12 -preset slow -tune animation -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart "$FINAL"

duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL")
echo "$FINAL ($duration s)"
