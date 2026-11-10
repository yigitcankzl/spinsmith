#!/usr/bin/env bash
# Cuts the competition reel v7 (IWER emulator footage, labelled on every frame): v6 simplified after
# a clarity review (2026-11-10). Three acts on the pitch "Squeeze the arena. Throw them off your
# desk.": the desk KO and a first match; THE BASICS, then the 16 moves one at a time, full frame,
# counted (the five ultimates as one stamp, five results); forge, build, brawl, arenas and the boss
# arc. The short clips are the quiet capture (MatchSystem.quiet: no rival words, call cards, cue
# words or buttons), so the only text naming a move is its caption. One text slot (bottom left, one
# line, no subtitles); the emulator tag bottom right on every frame, a speed change written into it.
#
#   scripts/reel-v7.sh [reel-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v7-1080p60.mp4}
S=$R/shots; M=$R/shots/more; T=$R/takes
W=1920; H=1080; FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
LOGO=$(realpath public/icons/icon-512.png)
LOOK="eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
enc=(-c:v libx264 -crf 15 -preset medium -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2)
segs=(); NOW=0; MUSIC=()
at() { python3 -c "print(round($NOW + $1, 3))"; } # reel time of an offset into the next segment
# The emulator tag, bottom right, with the clip's speed in it when retimed.
tag() {
  local sp=${1:-1} extra=""; [ "$sp" = 1 ] || extra="  /  ${sp}x SPEED"
  echo "drawtext=fontfile=$FONT:text='IWER EMULATOR  /  SYNTHETIC ROOM  /  NOT HEADSET FOOTAGE$extra':fontcolor=white@0.85:fontsize=32:x=w-text_w-24:y=h-text_h-24:box=1:boxcolor=0x111419@0.8:boxborderw=7"
}
# The one text slot: an orange line bottom left from TA to TB s into the segment (default the cut
# frame to the end). Story beats and group headers use it; a move name uses it in white (move).
title() {
  echo "drawtext=fontfile=$FONT:text='$1':fontcolor=${TC:-0xffa24a}:fontsize=76:x=48:y=h-200:box=1:boxcolor=0x111419@0.8:boxborderw=16:enable='between(t,${TA:-0},${TB:-99})'"
}
move() { TC=white title "$@"; }

# seg NAME SRC START DUR [FILTERS]   env: PRE (crop first), SPEED (2 = 2x, 0.5 = half speed), AGAIN (sound gain)
# Slow motion drops the capture's repeated frames and blends between the real ones, so it never judders.
seg() {
  local name=$1 src=$2 start=$3 dur=$4 vf=${5:-} sp=${SPEED:-1} af=anull a=0 pre="" post="fps=$FPS"
  [ -s "$src" ] || { echo "missing $src" >&2; exit 1; }
  [ "$sp" = 1 ] || af="atempo=$sp"
  python3 -c "import sys; sys.exit(0 if $sp < 1 else 1)" && { pre="mpdecimate=hi=200:lo=100:frac=0.5,"; post="framerate=fps=$FPS${SCENE:+:scene=$SCENE}"; }
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" </dev/null | grep -q . || { a=1; af=anull; }
  ffmpeg -nostdin -y -loglevel error -ss "$start" -t "$(python3 -c "print($dur * $sp + 0.1)")" -i "$src" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -filter_complex \
    "[0:v]${pre}setpts=(PTS-STARTPTS)/$sp,${PRE:+$PRE,}scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,$post,$LOOK${vf:+,$vf},$(tag "$sp")[v];[$a:a]$af,volume=${AGAIN:-1}${AEVAL:+:eval=frame},apad[a]" \
    -map "[v]" -map "[a]" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name"); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
logo() { echo "null[m];movie=$LOGO,scale=$1:$1[lg];[m][lg]overlay=$2:$3${4:+:enable='$4'}"; }

C85="crop=iw*0.85:ih*0.85:iw*0.075:ih*0.075"
C9="crop=iw*0.9:ih*0.9:iw*0.05:ih*0.05"
C75="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.15"
SHARP="unsharp=5:5:0.5"

# ACT 1. Squeeze the arena, throw them off your desk: the pitch on the hook, then a first match.
HOOKC="crop=iw*0.8:ih*0.8:iw*0.14:ih*0.06"
BRAND="$(logo 120 48 40),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=100:x=186:y=44:box=1:boxcolor=0x111419@0.78:boxborderw=14"
MUSIC+=("0:1" "hit:1.6" "1.6:2")
PRE=$HOOKC seg 00a-hook "$S/hook-ko-close.mp4" ${HOOK_AT:-1.5} 1.6 "$(title 'SQUEEZE THE ARENA.')"
PRE=$HOOKC SPEED=0.5 AGAIN=2 seg 00b-throw "$S/hook-ko-close.mp4" ${THROW_AT:-3.1} 1.6 "$(title 'THROW THEM OFF YOUR DESK.')"
PRE=$HOOKC seg 00c-ko "$S/hook-ko-close.mp4" ${KO_AT:-3.9} 0.8 "$BRAND"
MUSIC+=("$(at 0):1")
PRE=$C9 seg 01b-pit "$T/first.mp4" ${UP_AT:-16.6} 3.4 "$(title 'YOUR FIRST MATCH')"
MUSIC+=("$(at 3.3):x" "hit:$(at 3.7)" "$(at 3.7):1")
PRE="crop=iw*0.88:ih*0.88:iw*0.06:ih*0.12" seg 01c-squeeze "$T/first.mp4" ${HINT_AT:-30.3} 4.2 "$(TB=3.6 title 'GRAB THE RIM. SQUEEZE.')"

# ACT 2. The basics, then the 16 moves, each full frame and counted; the five ultimates are one
# gesture (stamp a seal) with five results, so they run as one group.
MUSIC+=("$(at 0):2")
# clip in dur speed crop header name  (header "-" for none; crop n = C9, w = the hand camera C75)
moves() {
  local i=0 k=0
  while read -r f s d sp c head n; do
    k=$((k + 1)); local crop=$C9 sharp="" text="" num=""
    [ "$c" = w ] && { crop=$C75; sharp="$SHARP,"; }
    [ "${COUNT:-1}" = 1 ] && { i=$((i + 1)); num="   $i/16"; }
    n=${n//_/ }; head=${head//_/ }
    if [ "$head" = - ]; then text="$(move "$n$num")"
    else text="$(TB=${HTB:-1.2} title "$head"),$(TA=${HTB:-1.2} move "$n$num")"; fi
    SPEED=$sp PRE=$crop seg "$1-$(printf %02d $k)" "$M/$f.mp4" "$s" "$d" "$sharp$text"
  done
}
# The basics are not among the 16 (they need no unlock): named, not counted. They live in shots/.
M=$S COUNT=0 HTB=0.9 moves 11-basic <<EOF
flick2 ${FLICK_AT:-0.3} 1.7 1 w THE_BASICS FLICK
close-crossguard2 ${GUARD_AT:-0.2} 1.9 0.5 n - CROSSGUARD
close-rub2 ${RUB_AT:-0.3} 1.6 1 w - SPIN_RUB
EOF
MUSIC+=("$(at 0):3")
moves 12-move <<EOF
forge-twist ${TWIST_AT:-1.0} 2.4 1 n 16_MOVES,_NO_CONTROLLERS TWIST
forge-stretch ${STRETCH_AT:-1.9} 1.8 1 n - STRETCH
wheel ${WHEEL_AT:-1.4} 1.8 1 n - FORGE_WHEEL
ramp ${RAMP_AT:-0.3} 2.2 1 n - RAMP
rim-spring ${SPRING_AT:-1.0} 1.8 1 n - RIM_SPRING
gust ${GUST_AT:-0.7} 1.8 1 n - FORGE_GUST
outer-ring ${OUTER_AT:-0.8} 1.8 1 n - PALM_CATCH
groove3 ${GROOVE_AT:-2.5} 1.8 1 n - FINGER_GROOVE
cup-sling ${CUP_AT:-0.2} 1.8 1 n - CUP_AND_SLING
ember ${EMBER_AT:-3.6} 1.8 1 n - EMBER_RIVET
slap2 ${SLAP_AT:-3.8} 1.9 1 w - SLAP_=_ANVIL_STRIKE
seal-rush2 ${RUSH_AT:-3.8} 2.4 1 w ONE_STAMP,_FIVE_ULTIMATES RUSH
seal-magnet2 ${MAGNET_AT:-3.9} 1.9 1 w - MAGNET
seal-tilt2 ${TILT_AT:-4.0} 1.9 1 w - TILT
seal-hammer2 ${HAMMER_AT:-0.9} 1.9 1 w - HAMMER
seal-ward2 ${WARD_AT:-3.9} 1.9 1 w - WARD
EOF

# ACT 3. Make it yours, then everyone else: forge, build, brawl, arenas, the bosses.
MUSIC+=("$(at 0):2")
FORGE_KEEP="${FORGE_KEEP:-3.9-5.45 7.3-9.95}"
sel=$(for r in $FORGE_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/forge3.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/forge-active.mp4"
FORGE0=$NOW; AGAIN=2 seg 21-forge "$TMP/forge-active.mp4" 0 4.15 "$(title 'FORGE YOUR TOP')"
WS_KEEP="${WS_KEEP:-34.05-36.4 41.0-43.3 44.45-46.85 47.97-50.33}"
sel=$(for r in $WS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/workshop2.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/ws-active.mp4"
SPEED=2 AGAIN=2 PRE="crop=iw*0.88:ih*0.80:iw*0.06:ih*0.03" seg 22-workshop "$TMP/ws-active.mp4" 0 4.0 "$(title 'BUILD YOUR ARENA')"
BRAWL0=$NOW; PRE=$C9 seg 23-brawl "$T/brawl2.mp4" ${BRAWL_AT:-27.25} 4.5 "$(title 'FOUR-TOP BRAWLS')"
AR="$(title '20 ARENAS')"
seg 24-ar12 "$S/arenas/12.mp4" 1.65 1.5 "$AR"
AGAIN=2 PRE="crop=iw*0.7:ih*0.7:iw*0.15:ih*0.2" seg 25-ar03 "$S/arenas/03.mp4" 0.5 1.5 "$AR"
PRE=$C85 seg 26-ar10 "$S/arenas/10.mp4" 0.5 1.5 "$AR"
MUSIC+=("$(at 0):b" "hit:$(at 1.5)" "$(at 1.5):3")
seg 31-boss1 "$T/boss-ironkeep.mp4" ${IRON_AT:-89.0} 5.5 "$(title 'BOSSES CAST YOUR MOVES')"
MUSIC+=("$(at 0.4):x")
seg 32-lost "$T/boss-ironkeep.mp4" ${LOST_AT:-116.3} 2.65 "$(TA=1.2 title 'LOST 0-4')"
MUSIC+=("$(at 0.8):b" "hit:$(at 2.3)" "$(at 2.3):3")
seg 33-bastion "$T/boss-bastion1.mp4" ${BASTION_AT:-88.0} 5.0 "$(TB=2.8 title 'THE FINAL BOSS')"
# The finishing blow at half speed, Bastion falls 5-0 (the HUD shows it), LEVEL 9, THE CROWN IS
# YOURS held, then the end card fading in over it and out at the end.
CARD=${CARD_AT:-5.0}
MUSIC+=("$(at 3.4):b")
seg 34-finish "$T/boss-bastion1.mp4" ${FINISH_AT:-117.6} 0.85
SPEED=0.5 SCENE=3 seg 35-blow "$T/boss-bastion1.mp4" 118.45 1.2
FADE="alpha='min(1,(t-$CARD)/0.3)'"
END0=$NOW; ENDD=$(python3 -c "print($CARD + 5.0)")
AEVAL=1 AGAIN="'if(lt(t,$CARD),1,max(0,1-(t-$CARD)/0.3))'" seg 36-end "$T/boss-bastion1.mp4" ${CROWN_AT:-119.05} $ENDD "$(TB=3.3 title 'THE FINAL BOSS FALLS'),split[sa][sb];[sb]gblur=sigma=24,eq=brightness=-0.55:saturation=0.6,format=yuva420p,fade=t=in:st=$CARD:d=0.3:alpha=1[sbb];[sa][sbb]overlay,format=yuv420p,$(logo 180 '(W-w)/2' 210 "gte(t,$CARD)"),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=410:enable='gte(t,$CARD)':$FADE,drawtext=fontfile=$FONT:text='Squeeze the arena. Throw them off your desk.':fontcolor=0xe7edf4:fontsize=60:x=(w-text_w)/2:y=570:enable='gte(t,$CARD)':$FADE,drawtext=fontfile=$FONT:text='Play it in the Quest Browser  /  Meta Quest 3 and 3S  /  hands only':fontcolor=0xe7edf4:fontsize=50:x=(w-text_w)/2:y=680:enable='gte(t,$CARD)':$FADE,drawtext=fontfile=$FONT:text='Link on the Devpost page':fontcolor=0xffa24a:fontsize=50:x=(w-text_w)/2:y=760:enable='gte(t,$CARD)':$FADE,fade=t=out:st=$(python3 -c "print($ENDD - 0.4)"):d=0.4"

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
python3 scripts/capture/music.py "$TMP/music.wav" "$NOW" "${MUSIC[@]}"
# Game sound over the music (the music ducks under it), levelled over a ~6 s window so no section
# drops out or jumps, then about -14 LUFS, peaks under -1.5 dBTP; the win's cheer 3 dB down and the
# quiet forge and workshop 5 dB up (a limiter keeps their peaks in).
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -i "$TMP/music.wav" -filter_complex \
  "[0:a]asplit[g][sc];[1:a]volume=${MUSIC_GAIN:-0.3},afade=t=out:st=$(python3 -c "print($NOW - 3)"):d=2.5[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=5:release=300[md];[g][md]amix=inputs=2:normalize=0,dynaudnorm=f=250:g=25:m=6:p=0.7,loudnorm=I=-14:TP=-1.8:LRA=9,volume='if(between(t,$(python3 -c "print($END0 - 1.2)"),$(python3 -c "print($END0 + 4)")),0.7,if(between(t,$FORGE0,$BRAWL0),1.8,1))':eval=frame,alimiter=limit=0.8:level=false,afade=t=out:st=$(python3 -c "print($NOW - 1.5)"):d=1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
t=0; for s in "${segs[@]}"; do printf "%6.2f %s\n" "$t" "$s"; t=$(python3 -c "print($t + $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/$s.mp4"))"); done
# Freeze check: any held picture over 0.3 s before the crown (the crown text is held on purpose).
ffmpeg -nostdin -i "$FINAL" -t "$(python3 -c "print($END0 + 3.4)")" -vf "freezedetect=n=0.002:d=0.3" -map 0:v -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | paste - - || echo "no freezes over 0.3 s"
