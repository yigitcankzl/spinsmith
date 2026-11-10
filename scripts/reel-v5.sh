#!/usr/bin/env bash
# Cuts the competition reel v5 (about 1:35, IWER emulator footage, labelled on every frame): a story
# from the shots and takes re-recorded on 2026-11-10 (no desk props, the game's spin hiss fixed,
# nearer cameras so no shot is cropped past 1.25x): the DESK KO hook with a slow push-in, a level-1
# first match, the moves earned, forge and workshop, every move by hand, brawl and arenas, then the
# boss arc (Iron Keep casts your tilt, you lose 0-4; Bastion falls 5-0, THE CROWN IS YOURS).
# One title per shot, held about 2.5 s. Music: scripts/capture/music.py on the cut's clock.
#
#   scripts/reel-v5.sh [reel-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v5-1080p60.mp4}
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
  local t="drawtext=fontfile=$FONT:text='$1':fontcolor=0xffa24a:fontsize=76:x=48:y=h-250:box=1:boxcolor=0x111419@0.78:boxborderw=16:enable='between(t,0.2,2.8)'"
  [ -z "${2:-}" ] || t+=",drawtext=fontfile=$FONT:text='$2':fontcolor=white:fontsize=50:x=52:y=h-140:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='between(t,0.4,2.8)'"
  echo "$t"
}
label() { echo "drawtext=fontfile=$FONT:text='$1':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h-text_h-90:box=1:boxcolor=0x111419@0.8:boxborderw=12"; }

# seg NAME SRC START DUR [FILTERS]   env: PRE (crop first), SPEED (2 = 2x, 0.5 = half speed)
seg() {
  local name=$1 src=$2 start=$3 dur=$4 vf=${5:-} sp=${SPEED:-1} af=anull a=0
  [ -s "$src" ] || { echo "missing $src" >&2; exit 1; }
  [ "$sp" = 1 ] || af="atempo=$sp"
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" </dev/null | grep -q . || { a=1; af=anull; }
  # Takes recorded before the game's spin-grind fix (2026-11-10) carry its broadband hiss: soften it.
  [ "$a" = 0 ] && [ "$(stat -c %Y "$src")" -lt "${AUDIO_FIX_EPOCH:-1794268800}" ] && af="$af,afftdn=nf=-28,lowpass=f=7500"
  ffmpeg -nostdin -y -loglevel error -ss "$start" -t "$(python3 -c "print($dur * $sp)")" -i "$src" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -filter_complex \
    "[0:v]setpts=PTS/$sp,${PRE:+$PRE,}scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,fps=$FPS,$LOOK${vf:+,$vf},$TAG[v];[$a:a]$af,apad[a]" \
    -map "[v]" -map "[a]" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name"); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
PUSH="zoompan=z='1+0.0015*on':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s=${W}x${H}:fps=$FPS"
# A slow push-in toward (cx, cy) (0..1 of the frame) from 1x to `z` over `d` s, eased in and out,
# drawn from a 2x frame so the zoom never shows soft upscaling.
ease() { echo "scale=$((W*2)):$((H*2)):flags=lanczos,zoompan=z='1+(${1:-1.15}-1)*(1-cos(PI*min(1,on/($FPS*${2:-3}))))/2':d=1:x='(iw-iw/zoom)*${3:-0.5}':y='(ih-ih/zoom)*${4:-0.5}':s=${W}x${H}:fps=$FPS"; }
logo() { echo "null[m];movie=$LOGO,scale=$1:$1[lg];[m][lg]overlay=$2:$3${4:+:enable='$4'}"; }

C85="crop=iw*0.85:ih*0.85:iw*0.075:ih*0.075"
C9="crop=iw*0.9:ih*0.9:iw*0.05:ih*0.05"
# The hand-in-frame clips (a higher camera): 1.33x at most, with a light sharpen after the scale.
C75="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.15"
SHARP="unsharp=5:5:0.5"
# 1. The hook: SPINSMITH, both hands squeeze, the rival goes off the desk corner, with a slow push-in.
MUSIC+=("0:1" "$(at 2.3):x" "hit:$(at 2.8)" "$(at 2.8):2")
seg 00-hook "$S/hook-ko-close.mp4" ${HOOK_AT:-1.0} 3.8 "$(ease 1.12 3.8 0.6 0.4),$(logo 132 48 40 'lt(t,2.4)'),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=110:x=200:y=42:box=1:boxcolor=0x111419@0.78:boxborderw=14:enable='lt(t,2.4)',drawtext=fontfile=$FONT:text='A hands-only mixed-reality top battler':fontcolor=white:fontsize=44:x=52:y=196:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='lt(t,2.4)'"
# 2. A level-1 player's first match in real time: the launch shown, you score first, the squeeze
# taught, and the rival goes off the desk.
MUSIC+=("$(at 0):1")
PRE=$C9 seg 01a-level1 "$T/first.mp4" ${L1_AT:-1.5} 4.0 "$(title 'LEVEL 1. YOUR FIRST MATCH' 'The game shows the launch')"
PRE=$C9 seg 01b-up "$T/first.mp4" ${UP_AT:-16.5} 3.0 "$(title 'UP 1-0')"
MUSIC+=("$(at 4.1):x" "hit:$(at 4.6)" "$(at 4.6):1")
PRE=$C9 seg 01c-hint "$T/first.mp4" ${HINT_AT:-28.9} 5.3 "$(title 'THEN IT TEACHES THE SQUEEZE' 'Both hands, and off the desk')"
won=$(python3 -c "print(max(0, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/match-won-cards.mp4") - 2.2))")
PRE="crop=iw*0.7:ih*0.7:iw*0.15:ih*0.12" seg 03-won "$S/match-won-cards.mp4" "$won" 2.0 "$(ease 1.08 2),$(title 'EVERY WIN UNLOCKS A MOVE')"
# 3. The core moves, each held long enough to see the hand, then what it does.
MUSIC+=("$(at 0):2")
seg 04-squeeze "$S/close-squeeze.mp4" 1.5 2.6 "$(title 'YOUR HANDS RESHAPE THE ARENA')"
PRE=$C75 seg 05-flick "$S/flick2.mp4" ${FLICK_AT:-0.4} 2.4 "$SHARP,$(title 'FLICK' 'Your fingertip is part of the physics')"
SPEED=0.5 seg 06-guard "$S/close-crossguard2.mp4" 0.30 1.4 "$(title 'CROSSGUARD' 'Two still palms make a rail  (half speed)')"
seg 06b-guard "$S/close-crossguard2.mp4" 1.0 0.9
PRE=$C75 seg 07-rub "$S/close-rub2.mp4" ${RUB_AT:-0.8} 2.4 "$SHARP,$(title 'SPIN RUB' 'A fingertip spins your top back up')"
seg 08-stamp "$S/seal-stamp.mp4" ${STAMP_AT:-0.4} 3.2 "$(title 'STAMP AN ULTIMATE' 'Pinch the seal, stamp it down')"
# 4. Forge a part on by hand; build an arena: pieces already down, the last ones going in.
MUSIC+=("$(at 0):1")
# The forge take without the second the game holds the top on the off-screen palm (a still bench).
FORGE_KEEP="${FORGE_KEEP:-3.4-5.4 6.9-10.0}"
sel=$(for r in $FORGE_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/forge3.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/forge-active.mp4"
seg 09-forge "$TMP/forge-active.mp4" 0 5.0 "$(title 'FORGE IT BY HAND' 'Drag a part on, it fights differently')"
# The workshop take, with the moments the hand is off at the tray (out of frame) left out: the four
# placements back to back (bumpers, slag pit, boost pad, pillar), then at 1.5x.
WS_KEEP="${WS_KEEP:-34.05-36.4 41.0-43.3 44.45-46.85 47.97-50.33}"
sel=$(for r in $WS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/workshop2.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/ws-active.mp4"
SPEED=1.5 PRE=$C9 seg 10-workshop "$TMP/ws-active.mp4" 0 6.0 "$(title 'BUILD YOUR OWN ARENA' 'Every piece placed by hand  (1.5x)')"
# 5. Every move by hand: four held, the five ultimates from the slap to the burst, then the other
# seven together (all 16 named and counted).
MUSIC+=("$(at 0):3")
i=0
while read -r f s d sp c n; do
  i=$((i + 1)); head=""; crop=$C9; sharp=""
  [ "$c" = w ] && { crop=$C75; sharp="$SHARP,"; }
  [ $i = 1 ] && head="$(title 'EVERY MOVE BY HAND' 'No controllers'),"
  [ "$sp" = 1 ] || n="$n  (slowed)"
  SPEED=$sp PRE=$crop seg "12-m$(printf %02d $i)" "$M/$f.mp4" "$s" "$d" "$sharp$head$(label "$n     $i / 16" | sed "s/boxborderw=12/boxborderw=12${head:+:enable='gte(t,2.8)'}/")"
done <<EOF
outer-ring ${OUTER_AT:-3.2} 2.4 1 n PALM CATCH
forge-twist 1.0 2.4 1 n TWIST
ember 5.8 2.0 1 n EMBER RIVET
slap2 ${SLAP_AT:-3.5} 2.4 0.75 w SLAP THE TABLE = STRIKE
seal-rush2 ${RUSH_AT:-3.9} 2.4 1 w RUSH ULTIMATE
seal-magnet2 ${MAGNET_AT:-3.8} 2.5 1 w MAGNET ULTIMATE
seal-tilt2 ${TILT_AT:-3.6} 2.4 1 w TILT ULTIMATE
seal-hammer2 ${HAMMER_AT:-0.8} 2.6 1 w HAMMER ULTIMATE
seal-ward2 ${WARD_AT:-3.6} 2.4 1 w WARD ULTIMATE
EOF
# The seven other moves in a 4x2 grid; the eighth cell holds the caption, so it never covers a move.
grid() {
  local dur=5.0 inputs=() f="" lay="" k=0
  while read -r src st name; do
    inputs+=(-ss "$st" -t "$dur" -i "$M/$src.mp4")
    f+="[$k:v]$C9,scale=480:540:force_original_aspect_ratio=increase:flags=lanczos,crop=480:540,fps=$FPS,$LOOK,drawtext=fontfile=$FONT:text='$name':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=h-text_h-18:box=1:boxcolor=0x111419@0.8:boxborderw=8[t$k];"
    lay+="$(( (k % 4) * 480 ))_$(( (k / 4) * 540 ))|"; k=$((k + 1))
  done
  f+="color=c=0x111419:s=480x540:r=$FPS:d=$dur,drawtext=fontfile=$FONT:text='+ 7 MORE':fontcolor=0xffa24a:fontsize=64:x=(w-text_w)/2:y=h/2-80,drawtext=fontfile=$FONT:text='MOVES':fontcolor=0xffa24a:fontsize=64:x=(w-text_w)/2:y=h/2-10,drawtext=fontfile=$FONT:text='10-16 of 16':fontcolor=white:fontsize=36:x=(w-text_w)/2:y=h/2+70[t$k];"
  lay+="$(( (k % 4) * 480 ))_$(( (k / 4) * 540 ))"
  ffmpeg -nostdin -y -loglevel error "${inputs[@]}" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -filter_complex \
    "$f$(for n in $(seq 0 $k); do printf '[t%d]' "$n"; done)xstack=inputs=$((k + 1)):layout=$lay,$TAG[v]" \
    -map "[v]" -map $k:a -t "$dur" "${enc[@]}" "$TMP/12-grid.mp4"
  segs+=(12-grid); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
grid <<EOF
ramp 0.6 RAMP
rim-spring 2.0 RIM SPRING
gust 1.6 FORGE GUST
cup-sling 0.3 CUP AND SLING
groove 1.2 FINGER GROOVE
wheel 2.5 FORGE WHEEL
forge-stretch 2.1 STRETCH
EOF
# 6. Breadth: a four-top brawl, then three arenas.
MUSIC+=("$(at 0):2")
PRE=$C9 seg 17-brawl "$T/brawl2.mp4" 57.4 6.0 "$(title 'FOUR-TOP BRAWLS' 'Last top spinning wins')"
PRE=$C85 seg 18-ar15 "$S/arenas/15.mp4" 0.25 2.2 "$(title '20 ARENAS' 'Each one plays differently')"
PRE=$C85 seg 19-ar12 "$S/arenas/12.mp4" 0.7 2.2
PRE=$C85 seg 20-ar06 "$S/arenas/06.mp4" 0.8 2.2
# 7. The boss arc: Iron Keep casts your own tilt and both hands answer; it throws you, you lose 0-4.
MUSIC+=("$(at 0):b" "hit:$(at 1.5)" "$(at 1.5):3")
seg 13-boss1 "$T/boss-ironkeep.mp4" ${IRON_AT:-87.8} 6.0 "$(title 'BOSSES CAST YOUR OWN MOVES' 'Iron Keep tilts the arena, both hands answer')"
MUSIC+=("$(at 0.4):x")
seg 14-lost "$T/boss-ironkeep.mp4" ${LOST_AT:-116.3} 2.9 "$(title 'LOST 0-4')"
MUSIC+=("$(at 0.8):b" "hit:$(at 2.3)" "$(at 2.3):3")
seg 15-bastion "$T/boss-bastion1.mp4" ${BASTION_AT:-88.0} 5.0 "$(title 'TWO BOUTS LATER, THE FINAL BOSS' 'Bastion casts Anvil Strike')"
# 8. Bastion falls 5-0, THE CROWN IS YOURS, then the end card over it.
MUSIC+=("$(at 3.4):b")
seg 21-end "$T/boss-bastion1.mp4" ${CROWN_AT:-117.6} 8.0 "$(label 'THE FINAL BOSS FALLS, 5-0' | sed "s/boxborderw=12/boxborderw=12:enable='lt(t,4.4)'/"),split[sa][sb];[sb]gblur=sigma=24,eq=brightness=-0.55:saturation=0.6[sbb];[sa][sbb]overlay=enable='gte(t,4.8)',$(logo 180 '(W-w)/2' 210 'gte(t,4.8)'),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=410:enable='gte(t,4.8)',drawtext=fontfile=$FONT:text='Squeeze the arena. Throw them off your desk.':fontcolor=0xe7edf4:fontsize=60:x=(w-text_w)/2:y=570:enable='gte(t,4.8)',drawtext=fontfile=$FONT:text='Play it in the Quest Browser  /  Meta Quest 3 and 3S  /  hands only':fontcolor=0xe7edf4:fontsize=50:x=(w-text_w)/2:y=680:enable='gte(t,4.8)',drawtext=fontfile=$FONT:text='Link on the Devpost page':fontcolor=0xffa24a:fontsize=50:x=(w-text_w)/2:y=760:enable='gte(t,4.8)'"

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
python3 scripts/capture/music.py "$TMP/music.wav" "$NOW" "${MUSIC[@]}"
# Game sound over the music (the music ducks under it), then about -14 LUFS, peaks under -1.5 dBTP.
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -i "$TMP/music.wav" -filter_complex \
  "[0:a]asplit[g][sc];[1:a]volume=${MUSIC_GAIN:-0.3},afade=t=out:st=$(python3 -c "print($NOW - 3)"):d=2.5[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=5:release=300[md];[g][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,afade=t=out:st=$(python3 -c "print($NOW - 1.5)"):d=1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
[ -z "${MUSIC_OUT:-}" ] || cp "$TMP/music.wav" "$MUSIC_OUT"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
# Freeze check: any held picture over 0.3 s outside the end card is reported (the source may stall).
ffmpeg -nostdin -i "$FINAL" -t "$(python3 -c "print($NOW - 4)")" -vf "freezedetect=n=0.002:d=0.3" -map 0:v -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | paste - - || echo "no freezes over 0.3 s"
