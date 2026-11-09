#!/usr/bin/env bash
# Cuts the competition reel, about 1:50 (IWER emulator footage, labelled on every frame), from the
# shots and takes recorded on 2026-11-05: the DESK KO from two angles, a new player at 2x, five hero
# moves, every other move in a one-second montage, the three bosses, a brawl, real matches on three
# arenas, forge/workshop/board, then the DESK KO again at half speed under the end card.
# One title per shot. The music bed is synthesized by scripts/capture/music.py on the same clock,
# so cuts land on beats and the music stops before each KO and comes back with a hit.
#
#   scripts/reel-v4.sh [reel-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v4-1080p60.mp4}
S=$R/shots; M=$R/shots/more; T=$R/takes
W=1920; H=1080; FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
LOGO=$(realpath public/icons/icon-512.png)
LOOK="eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12"
TAG="drawtext=fontfile=$FONT:text='IWER EMULATOR  /  SYNTHETIC ROOM  /  NOT HEADSET FOOTAGE':fontcolor=white@0.75:fontsize=24:x=w-text_w-24:y=20:box=1:boxcolor=0x111419@0.5:boxborderw=7"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
enc=(-c:v libx264 -crf 15 -preset medium -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2)
segs=(); NOW=0; MUSIC=()
at() { python3 -c "print(round($NOW + $1, 3))"; } # reel time of an offset into the next segment
title() { # one title (+ optional short subtitle) for 2 s
  local t="drawtext=fontfile=$FONT:text='$1':fontcolor=0xffa24a:fontsize=76:x=48:y=40:box=1:boxcolor=0x111419@0.78:boxborderw=16:enable='lt(t,2)'"
  [ -z "${2:-}" ] || t+=",drawtext=fontfile=$FONT:text='$2':fontcolor=white:fontsize=42:x=52:y=146:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='lt(t,2)'"
  echo "$t"
}
label() { echo "drawtext=fontfile=$FONT:text='$1':fontcolor=white:fontsize=54:x=(w-text_w)/2:y=h-text_h-56:box=1:boxcolor=0x111419@0.8:boxborderw=12"; }

# seg NAME SRC START DUR [FILTERS]   env: PRE (crop first), SPEED (2 = 2x, 0.5 = half speed)
seg() {
  local name=$1 src=$2 start=$3 dur=$4 vf=${5:-} sp=${SPEED:-1} af=anull a=0
  [ -s "$src" ] || { echo "missing $src" >&2; exit 1; }
  [ "$sp" = 1 ] || af="atempo=$sp"
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" </dev/null | grep -q . || { a=1; af=anull; }
  ffmpeg -nostdin -y -loglevel error -ss "$start" -t "$(python3 -c "print($dur * $sp)")" -i "$src" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -filter_complex \
    "[0:v]setpts=PTS/$sp,${PRE:+$PRE,}scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,fps=$FPS,$LOOK${vf:+,$vf},$TAG[v];[$a:a]$af,apad[a]" \
    -map "[v]" -map "[a]" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name"); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
logo() { echo "null[m];movie=$LOGO,scale=$1:$1[lg];[m][lg]overlay=$2:$3${4:+:enable='$4'}"; }

# 1. The hook: name and logo, both hands squeeze, the rival goes off the desk corner (KO at 2.6 s).
MUSIC+=("0:1" "$(at 2.1):x" "hit:$(at 2.6)" "$(at 2.6):2")
seg 00-hook "$S/hook-ko-close.mp4" 1.2 4.0 "$(logo 132 48 40 'lt(t,2.6)'),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=110:x=200:y=42:box=1:boxcolor=0x111419@0.78:boxborderw=14:enable='lt(t,2.6)',drawtext=fontfile=$FONT:text='A hands-only spinning-top battler':fontcolor=white:fontsize=44:x=52:y=196:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='lt(t,2.6)'"
# 2. The same squeeze from low at the desk: the rival lands on the floor.
MUSIC+=("$(at 1.5):x" "hit:$(at 2.0)" "$(at 2.0):2")
PRE="crop=iw*0.9:ih*0.9:iw*0.1:ih*0.08" seg 01-side "$S/desk-ko-first-side.mp4" 2.0 3.5 "$(title 'YOUR DESK IS THE RING-OUT')"
# 3. A new player from home to the first knockout, at 2x, the clock in real seconds.
MUSIC+=("$(at 0):1")
SPEED=2 PRE="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.1" seg 02-first "$T/first.mp4" 0 14 "$(title 'A NEW PLAYER, UNCUT' 'Home to first knockout  /  2x speed'),drawtext=fontfile=$FONT:text='%{eif\\:t*2\\:d} s  (2x)':fontcolor=0xffa24a:fontsize=64:x=w-text_w-40:y=70:box=1:boxcolor=0x111419@0.74:boxborderw=14"
won=$(python3 -c "print(max(0, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/match-won-cards.mp4") - 2.7))")
PRE="crop=iw*0.55:ih*0.55:iw*0.225:ih*0.1" seg 03-won "$S/match-won-cards.mp4" "$won" 2.5 "$(title 'ONE NEW MOVE EVERY MATCH')"
# 4. Five hero moves, full frame.
MUSIC+=("$(at 0):2")
seg 04-squeeze "$S/close-squeeze.mp4" 0.4 2.5 "$(title 'SQUEEZE THE BOWL' 'Two hands bend the live arena')"
seg 05-flick "$S/flick.mp4" 0.2 2.5 "$(title 'FLICK' 'Your fingertip is part of the physics')"
seg 06-guard "$S/close-crossguard.mp4" 0.0 2.5 "$(title 'CROSSGUARD' 'Two still palms make a rail')"
seg 07-rub "$S/close-rub.mp4" 0.6 2.0 "$(title 'SPIN RUB' 'A fingertip spins your top back up')"
seg 08-stamp "$S/seal-stamp.mp4" 0.5 3.0 "$(title 'STAMP AN ULTIMATE' 'Pinch the seal, press it in')"
# 5. Every other move, about a second each, from the moment it acts (file, in-point, length, name).
MUSIC+=("$(at 0):3")
i=0
while read -r f s d n; do
  i=$((i + 1))
  head=""; [ $i -le 2 ] && head="$(title 'EVERY MOVE BY HAND' 'No controllers'),"
  PRE="crop=iw*0.8:ih*0.8:iw*0.1:ih*0.18" seg "09-m$(printf %02d $i)" "$M/$f.mp4" "$s" "$d" "$head$(label "$n")"
done <<'EOF'
ramp 0.6 1.0 RAMP
rim-spring 1.9 1.0 RIM SPRING
gust 1.1 1.0 FORGE GUST
cup-sling 0.5 0.5 CUP AND SLING
groove 1.1 1.0 FINGER GROOVE
ember 6.0 1.0 EMBER RIVET
wheel 0.9 1.0 FORGE WHEEL
outer-ring 3.9 1.5 OUTER RING CATCH
forge-twist 2.3 1.0 TWIST
forge-stretch 2.4 1.0 STRETCH
slap 4.0 1.0 SLAP THE TABLE
seal-rush 6.3 1.0 RUSH
seal-magnet 4.4 1.0 MAGNET
seal-tilt 4.5 1.0 TILT
seal-hammer 2.0 1.0 HAMMER
seal-ward 4.3 1.0 WARD
EOF
# 6. The bosses cast your ultimates back; a short break into them.
MUSIC+=("$(at 0):b" "hit:$(at 2.0)" "$(at 2.0):3")
B="crop=iw*0.76:ih*0.76:iw*0.12:ih*0.04"
PRE=$B seg 10-boss1 "$T/boss.mp4" 9.0 7.0 "$(title 'THREE BOSSES' 'Each casts your own ultimate back')"
PRE=$B seg 11-boss2 "$T/boss.mp4" 95.8 4.5 "$(title 'SAWTOOTH CASTS HAMMER')"
PRE=$B seg 12-boss3 "$T/boss.mp4" 190.3 4.5 "$(title 'BASTION CASTS ANVIL STRIKE')"
PRE=$B seg 13-crown "$T/boss.mp4" 205.4 3.5 "$(title 'BEAT ALL THREE')"
# 7. A four-top brawl on the opened-out arena.
PRE="crop=iw*0.9:ih*0.9:iw*0.05:0" seg 14-brawl "$T/brawl2.mp4" 51.4 14.0 "$(title 'FOUR-TOP BRAWLS' 'Last top spinning wins')"
# 8. Real matches on three of the arenas.
MUSIC+=("$(at 0):2")
seg 15-ar06 "$S/arenas/06.mp4" 0.0 2.0 "$(title '20 ARENAS')"
seg 16-ar12 "$S/arenas/12.mp4" 0.2 2.0
seg 17-ar15 "$S/arenas/15.mp4" 0.0 2.0
# 9. Forge, workshop, the home board.
MUSIC+=("$(at 0):1")
seg 18-forge "$S/forge.mp4" 7.8 6.0 "$(title 'FORGE IT BY HAND' 'Drag a part on, it fights differently')"
seg 19-workshop "$S/workshop.mp4" 7.6 3.5 "$(title 'BUILD YOUR OWN ARENA')"
PRE="crop=iw*0.4:ih*0.4:iw*0.3:ih*0.06" seg 20-board "$M/hub-map.mp4" 4.0 3.5 "$(title 'A REASON TO COME BACK' 'Daily order, streak, map  (demo save)')"
# 10. The DESK KO at half speed with its sound, the end card over it.
MUSIC+=("$(at 1.0):x" "hit:$(at 1.5)" "$(at 1.5):b")
SPEED=0.5 seg 21-end "$S/hook-ko-close.mp4" 3.1 7.0 "drawtext=fontfile=$FONT:text='0.5x':fontcolor=white:fontsize=40:x=40:y=h-90:box=1:boxcolor=0x111419@0.7:boxborderw=8:enable='lt(t,3.4)',split[sa][sb];[sb]gblur=sigma=16,eq=brightness=-0.35:saturation=0.7[sbb];[sa][sbb]overlay=enable='gte(t,3.4)',$(logo 180 '(W-w)/2' 230 'gte(t,3.4)'),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=430:enable='gte(t,3.4)',drawtext=fontfile=$FONT:text='Your desk is the ring-out.':fontcolor=0xe7edf4:fontsize=58:x=(w-text_w)/2:y=590:enable='gte(t,3.4)',drawtext=fontfile=$FONT:text='Play it in the Quest Browser  /  Meta Quest 3 and 3S  /  hands only':fontcolor=0xe7edf4@0.9:fontsize=40:x=(w-text_w)/2:y=690:enable='gte(t,3.4)',drawtext=fontfile=$FONT:text='Link on the Devpost page':fontcolor=0xffa24a:fontsize=44:x=(w-text_w)/2:y=760:enable='gte(t,3.4)'"

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
python3 scripts/capture/music.py "$TMP/music.wav" "$NOW" "${MUSIC[@]}"
# Game sound over the music (the music ducks under it), then about -14 LUFS, peaks under -1.5 dBTP.
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -i "$TMP/music.wav" -filter_complex \
  "[0:a]asplit[g][sc];[1:a]volume=${MUSIC_GAIN:-0.45},afade=t=out:st=$(python3 -c "print($NOW - 1.2)"):d=1.2[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=5:release=300[md];[g][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
[ -z "${MUSIC_OUT:-}" ] || cp "$TMP/music.wav" "$MUSIC_OUT"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
