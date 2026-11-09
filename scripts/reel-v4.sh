#!/usr/bin/env bash
# Cuts the competition reel, about 1:40 (IWER emulator footage, labelled on every frame), from the
# shots and takes recorded on 2026-11-05: the DESK KO from two angles, the first match at 3x, five hero
# moves, forge/workshop/board, every other move in a one-second montage, the three bosses, a brawl,
# real matches on three arenas, then the low DESK KO at half speed under the end card.
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
TAG="drawtext=fontfile=$FONT:text='IWER EMULATOR  /  SYNTHETIC ROOM  /  NOT HEADSET FOOTAGE':fontcolor=white@0.8:fontsize=32:x=w-text_w-24:y=20:box=1:boxcolor=0x111419@0.5:boxborderw=7"
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
label() { echo "drawtext=fontfile=$FONT:text='$1':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h-text_h-90:box=1:boxcolor=0x111419@0.8:boxborderw=12"; }

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
# The hook's KO: hold the frame where the rival leaves the desk edge, punch in 2x on it, flash once.
freeze() { echo "loop=loop=30:size=1:start=108,setpts=N/$FPS/TB,split[h1][h2];[h2]crop=iw/2:ih/2:iw*${KO_X:-0.62}-iw/4:ih*${KO_Y:-0.44}-ih/4,scale=$W:$H:flags=lanczos[hz];[h1][hz]overlay=enable='between(t,1.8,2.3)',drawtext=fontfile=$FONT:text='OFF THE DESK EDGE':fontcolor=0xffa24a:fontsize=96:x=(w-text_w)/2:y=h*0.12:box=1:boxcolor=0x111419@0.8:boxborderw=14:enable='between(t,1.8,2.3)',eq=brightness=0.3:enable='between(t,1.8,1.85)',"; }
PUSH="zoompan=z='1+0.0015*on':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s=${W}x${H}:fps=$FPS"
logo() { echo "null[m];movie=$LOGO,scale=$1:$1[lg];[m][lg]overlay=$2:$3${4:+:enable='$4'}"; }

# 1. The hook: name and logo, both hands squeeze, the rival goes off the desk corner (KO at 2.2 s).
MUSIC+=("0:1" "$(at 1.3):x" "hit:$(at 1.8)" "$(at 2.3):2")
PRE="crop=iw*0.7:ih*0.7:iw*0.12:ih*0.08" seg 00-hook "$S/hook-ko-close.mp4" 1.7 3.5 "$(freeze)$(logo 132 48 40 'lt(t,1.8)'),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=110:x=200:y=42:box=1:boxcolor=0x111419@0.78:boxborderw=14:enable='lt(t,1.8)',drawtext=fontfile=$FONT:text='A hands-only mixed-reality top battler':fontcolor=white:fontsize=44:x=52:y=196:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='lt(t,1.8)'"
# 2. The same squeeze from low at the desk: the rival lands on the floor.
MUSIC+=("$(at 1.5):x" "hit:$(at 2.0)" "$(at 2.0):2")
SIDE="crop=iw*0.9:ih*0.9:iw*0.1:ih*0.08"
PRE=$SIDE seg 01-side "$S/desk-ko-first-side.mp4" 2.0 3.0 "eq=brightness=0.3:enable='between(t,2.0,2.05)',$(title 'YOUR DESK IS THE RING-OUT')"
# 3. The first match from home to the first knockout, at 3x, the clock in real seconds.
MUSIC+=("$(at 0):1")
SPEED=3 PRE="crop=iw*0.56:ih*0.56:iw*0.22:ih*0.13" seg 02-first "$T/first.mp4" 0 9.5 "$(title 'FIRST KNOCKOUT, UNCUT' 'From the home screen  /  3x speed'),drawtext=fontfile=$FONT:text='%{eif\\:t*3\\:d} s  (3x)':fontcolor=0xffa24a:fontsize=64:x=w-text_w-40:y=70:box=1:boxcolor=0x111419@0.74:boxborderw=14"
won=$(python3 -c "print(max(0, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/match-won-cards.mp4") - 1.7))")
PRE="crop=iw*0.55:ih*0.55:iw*0.225:ih*0.1" seg 03-won "$S/match-won-cards.mp4" "$won" 1.2 "$PUSH,$(title 'ONE NEW MOVE EVERY MATCH')"
PRE="crop=iw*0.4:ih*0.4:iw*0.3:ih*0.06" seg 03b-board "$M/hub-map.mp4" 5.1 1.5 "$PUSH,$(title 'A REASON TO COME BACK' 'Daily order, streak, map  (demo save)')"
# 4. Five hero moves, full frame, then the forge and workshop.
MUSIC+=("$(at 0):2")
seg 04-squeeze "$S/close-squeeze.mp4" 1.9 1.6 "$(title 'SQUEEZE THE BOWL' 'Two hands bend the live arena')"
PRE="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.15" seg 05-flick "$S/flick2.mp4" 0.6 1.7 "$(title 'FLICK' 'Your fingertip is part of the physics')"
# Crossguard: the rail forms at half speed (labelled), then the hit at full speed.
G="crop=iw*0.7:ih*0.7:iw*0.15:ih*0.08"
SPEED=0.5 PRE=$G seg 06-guard "$S/close-crossguard2.mp4" 0.30 1.2 "$(title 'CROSSGUARD' 'Two still palms make a rail  (half speed)')"
PRE=$G seg 06b-guard "$S/close-crossguard2.mp4" 0.90 0.7
PRE="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.15" seg 07-rub "$S/close-rub2.mp4" 0.6 1.6 "$(title 'SPIN RUB' 'A fingertip spins your top back up')"
seg 08-stamp "$S/seal-stamp.mp4" 0.5 2.5 "$(title 'STAMP AN ULTIMATE' 'Pinch the seal, stamp it down')"
PRE="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.28" seg 09-forge "$S/forge.mp4" 9.4 2.5 "$(title 'FORGE IT BY HAND' 'Drag a part on, it fights differently')"
seg 10-workshop "$S/workshop.mp4" 7.9 2.0 "eq=brightness=0.25:enable='lt(t,0.05)',$(title 'BUILD YOUR OWN ARENA')"
# 5. Every move by hand: four held long enough to read (the hand, then what it does), then the other
# twelve as a quick strip, all counted (file, in-point, length, speed, crop, name). Crops: n = the
# fight view, w = the higher hand-in-frame camera of the 2026-11-09 re-records.
MUSIC+=("$(at 0):3")
i=0
while read -r f s d sp c n; do
  i=$((i + 1)); head=""
  [ $i = 1 ] && head="eq=brightness=0.25:enable='lt(t,0.05)',$(title 'EVERY MOVE BY HAND' 'No controllers'),"
  [ $i = 5 ] && head="$(title '+ 12 MORE MOVES'),"
  crop="crop=iw*0.8:ih*0.8:iw*0.1:ih*0.18"; [ "$c" = w ] && crop="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.15"
  [ "$f" = slap2 ] && crop="crop=iw*0.5:ih*0.5:iw*0.29:ih*0.3"
  [ "$sp" = 1 ] || n="$n  (slowed)"
  SPEED=$sp PRE=$crop seg "12-m$(printf %02d $i)" "$M/$f.mp4" "$s" "$d" "$head$(label "$n     $i / 16")"
done <<'EOF'
outer-ring 3.9 2.2 1 n PALM CATCH
forge-twist 1.4 2.2 1 n TWIST
ember 7.4 2.0 1 n EMBER RIVET
slap2 4.3 1.8 0.75 w SLAP THE TABLE
ramp 0.6 0.7 1 n RAMP
rim-spring 2.4 0.7 1 n RIM SPRING
gust 1.95 0.7 1 n FORGE GUST
cup-sling 0.3 0.7 1 n CUP AND SLING
groove 1.65 0.7 1 n FINGER GROOVE
wheel 2.9 0.7 1 n FORGE WHEEL
forge-stretch 2.1 0.7 1 n STRETCH
seal-rush2 4.75 0.8 1 w RUSH
seal-magnet2 4.85 0.8 1 w MAGNET
seal-tilt2 6.9 0.8 1 w TILT
seal-hammer2 2.2 0.8 1 w HAMMER
seal-ward2 2.0 0.8 1 w WARD
EOF
# 6. The bosses cast your ultimates back; a short break into them.
MUSIC+=("$(at 0):b" "hit:$(at 1.5)" "$(at 1.5):3")
B="crop=iw*0.55:ih*0.55:iw*0.2:ih*0.15"
PRE=$B seg 13-boss1 "$T/boss.mp4" 9.9 3.5 "$(title 'THREE BOSSES' 'Each boss uses your ultimate against you' | sed "s/lt(t,2)/between(t,0.5,2.5)/g")"
PRE=$B seg 14-boss2 "$T/boss.mp4" 96.6 3.7 "$(title 'SAWTOOTH CASTS HAMMER')"
B2="crop=iw*0.7:ih*0.7:iw*0.14:ih*0.06"
PRE=$B2 seg 15-boss3 "$T/boss.mp4" 190.3 4.5 "$(title 'BASTION CASTS ANVIL STRIKE')"
PRE=$B2 seg 16-crown "$T/boss.mp4" 205.9 3.0 "$(label 'BEAT ALL THREE')"
# 7. A four-top brawl on the opened-out arena.
PRE="crop=iw*0.9:ih*0.9:iw*0.05:0" seg 17-brawl "$T/brawl2.mp4" 54.9 9.5 "$(title 'FOUR-TOP BRAWLS' 'Last top spinning wins')"
# 8. Real matches on three of the arenas, ending on your point.
PRE="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.15" seg 18-ar15 "$S/arenas/15.mp4" 0.0 1.2 "$(title '20 ARENAS' 'Three of them, real matches')"
seg 19-ar12 "$S/arenas/12.mp4" 0.9 2.0
seg 20-ar06 "$S/arenas/06.mp4" 1.0 2.0
# 9. The low-angle DESK KO at half speed with its sound, the end card over it.
MUSIC+=("$(at 1.1):x" "hit:$(at 1.6)" "$(at 1.6):b")
SPEED=0.5 PRE=$SIDE seg 21-end "$S/desk-ko-first-side.mp4" 3.2 6.4 "drawtext=fontfile=$FONT:text='HALF SPEED':fontcolor=white:fontsize=40:x=40:y=h-90:box=1:boxcolor=0x111419@0.7:boxborderw=8:enable='lt(t,3.4)',split[sa][sb];[sb]gblur=sigma=16,eq=brightness=-0.35:saturation=0.7[sbb];[sa][sbb]overlay=enable='gte(t,3.4)',$(logo 180 '(W-w)/2' 210 'gte(t,3.4)'),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=410:enable='gte(t,3.4)',drawtext=fontfile=$FONT:text='Your desk is the ring-out.':fontcolor=0xe7edf4:fontsize=60:x=(w-text_w)/2:y=570:enable='gte(t,3.4)',drawtext=fontfile=$FONT:text='Play it in the Quest Browser  /  Meta Quest 3 and 3S  /  hands only':fontcolor=0xe7edf4:fontsize=50:x=(w-text_w)/2:y=680:enable='gte(t,3.4)',drawtext=fontfile=$FONT:text='Link on the Devpost page':fontcolor=0xffa24a:fontsize=50:x=(w-text_w)/2:y=760:enable='gte(t,3.4)'"

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
python3 scripts/capture/music.py "$TMP/music.wav" "$NOW" "${MUSIC[@]}"
# Game sound over the music (the music ducks under it), then about -14 LUFS, peaks under -1.5 dBTP.
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -i "$TMP/music.wav" -filter_complex \
  "[0:a]asplit[g][sc];[1:a]volume=${MUSIC_GAIN:-0.45},afade=t=out:st=$(python3 -c "print($NOW - 3)"):d=2.5[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=5:release=300[md];[g][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=$(python3 -c "print($NOW - 1.5)"):d=1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
[ -z "${MUSIC_OUT:-}" ] || cp "$TMP/music.wav" "$MUSIC_OUT"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
