#!/usr/bin/env bash
# Cuts the competition reel v6 (IWER emulator footage, labelled on every frame). v5 after a
# second-by-second review (2026-11-10): every in-point moved onto its moment (titles from the cut
# frame, score titles only once the HUD shows the score), the DESK KO hook slowed through the throw,
# one speed badge for every retimed clip (slow-mo frame-blended), FINGER GROOVE re-shot, four
# visibly different arenas named, the brawl on its two knockouts, the crown held before the end
# card, and the mix levelled so no section drops out.
# Story: DESK KO hook, a level-1 first match, the moves earned, forge and workshop, every move by
# hand, brawl and arenas, then the boss arc (Iron Keep casts your tilt, you lose 0-4; Bastion falls 5-0).
#
#   scripts/reel-v6.sh [reel-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v6-1080p60.mp4}
S=$R/shots; M=$R/shots/more; T=$R/takes
W=1920; H=1080; FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
LOGO=$(realpath public/icons/icon-512.png)
LOOK="eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12"
# The emulator tag, top right (TAGB=1: bottom right, where a game banner sits under it; TAG_UNTIL: off after t).
tag() {
  local y=20; [ "${TAGB:-}" = 1 ] && y="h-text_h-24"
  echo "drawtext=fontfile=$FONT:text='IWER EMULATOR  /  SYNTHETIC ROOM  /  NOT HEADSET FOOTAGE':fontcolor=white@0.8:fontsize=32:x=w-text_w-24:y=$y:box=1:boxcolor=0x111419@0.5:boxborderw=7${TAG_UNTIL:+:enable='lt(t,$TAG_UNTIL)'}"
}
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
enc=(-c:v libx264 -crf 15 -preset medium -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2)
segs=(); NOW=0; MUSIC=()
at() { python3 -c "print(round($NOW + $1, 3))"; } # reel time of an offset into the next segment
# title TEXT [SUB]: a story title from TA to TB s into the segment (default the cut frame to 2.8 s),
# bottom left (TPOS=top: top left, over a shot with hands along the bottom).
title() {
  local a=${TA:-0} b=${TB:-2.8} y1=h-250 y2=h-140
  [ "${TPOS:-}" = top ] && { y1=40; y2=150; }
  local t="drawtext=fontfile=$FONT:text='$1':fontcolor=0xffa24a:fontsize=76:x=48:y=$y1:box=1:boxcolor=0x111419@0.78:boxborderw=16:enable='between(t,$a,$b)'"
  [ -z "${2:-}" ] || t+=",drawtext=fontfile=$FONT:text='$2':fontcolor=white:fontsize=50:x=52:y=$y2:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='between(t,$(python3 -c "print($a + 0.15)"),$b)'"
  echo "$t"
}
label() { echo "drawtext=fontfile=$FONT:text='$1':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h-text_h-90:box=1:boxcolor=0x111419@0.8:boxborderw=12${2:+:enable='$2'}"; }

# seg NAME SRC START DUR [FILTERS]   env: PRE (crop first), SPEED (2 = 2x, 0.5 = half speed), AGAIN (sound gain)
# A retimed clip carries one badge ("0.5x SPEED") for its whole length; slow motion drops the
# capture's repeated frames and blends between the real ones, so it never judders.
seg() {
  local name=$1 src=$2 start=$3 dur=$4 vf=${5:-} sp=${SPEED:-1} af=anull a=0 pre="" post="fps=$FPS"
  [ -s "$src" ] || { echo "missing $src" >&2; exit 1; }
  [ "$sp" = 1 ] || { af="atempo=$sp"; vf="drawtext=fontfile=$FONT:text='${sp}x SPEED':fontcolor=0xffa24a:fontsize=40:x=w-text_w-24:y=78:box=1:boxcolor=0x111419@0.7:boxborderw=8${vf:+,$vf}"; }
  python3 -c "import sys; sys.exit(0 if $sp < 1 else 1)" && { pre="mpdecimate=hi=200:lo=100:frac=0.5,"; post="framerate=fps=$FPS"; }
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" </dev/null | grep -q . || { a=1; af=anull; }
  # Takes recorded before the game's spin-grind fix (2026-11-10) carry its broadband hiss: soften it.
  [ "$a" = 0 ] && [ "$(stat -c %Y "$src")" -lt "${AUDIO_FIX_EPOCH:-1794268800}" ] && af="$af,afftdn=nf=-28,lowpass=f=7500"
  ffmpeg -nostdin -y -loglevel error -ss "$start" -t "$(python3 -c "print($dur * $sp + 0.1)")" -i "$src" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -filter_complex \
    "[0:v]${pre}setpts=(PTS-STARTPTS)/$sp,${PRE:+$PRE,}scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,$post,$LOOK${vf:+,$vf},$(tag)[v];[$a:a]$af,volume=${AGAIN:-1},apad[a]" \
    -map "[v]" -map "[a]" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name"); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
ease() { echo "scale=$((W*2)):$((H*2)):flags=lanczos,zoompan=z='1+(${1:-1.15}-1)*(1-cos(PI*min(1,on/($FPS*${2:-3}))))/2':d=1:x='(iw-iw/zoom)*${3:-0.5}':y='(ih-ih/zoom)*${4:-0.5}':s=${W}x${H}:fps=$FPS"; }
logo() { echo "null[m];movie=$LOGO,scale=$1:$1[lg];[m][lg]overlay=$2:$3${4:+:enable='$4'}"; }

C85="crop=iw*0.85:ih*0.85:iw*0.075:ih*0.075"
C9="crop=iw*0.9:ih*0.9:iw*0.05:ih*0.05"
C75="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.15"
SHARP="unsharp=5:5:0.5"
# 1. The hook: SPINSMITH over both hands squeezing; the throw off the desk at half speed; DESK KO!
BRAND="$(logo 132 48 40),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=110:x=200:y=42:box=1:boxcolor=0x111419@0.78:boxborderw=14,drawtext=fontfile=$FONT:text='A hands-only mixed-reality top battler':fontcolor=white:fontsize=44:x=52:y=196:box=1:boxcolor=0x111419@0.66:boxborderw=10"
HOOKC="crop=iw*0.8:ih*0.8:iw*0.14:ih*0.06"
MUSIC+=("0:1" "hit:1.6" "1.6:2")
PRE=$HOOKC seg 00a-hook "$S/hook-ko-close.mp4" 1.5 1.6 "$BRAND"
PRE=$HOOKC SPEED=0.5 AGAIN=2 seg 00b-throw "$S/hook-ko-close.mp4" 3.1 1.6 "$BRAND,$(TA=0.3 TB=1.6 title 'YOUR REAL DESK IS THE RING-OUT')"
PRE=$HOOKC seg 00c-ko "$S/hook-ko-close.mp4" 3.9 1.05 "$BRAND"
# 2. A level-1 player's first match in real time: the launch shown, your ramp scores first, then
# the squeeze taught and the rival thrown off the desk.
MUSIC+=("$(at 0):1")
PRE=$C9 seg 01a-level1 "$T/first.mp4" ${L1_AT:-2.3} 3.4 "$(TB=3.4 title 'LEVEL 1, YOUR FIRST MATCH' 'The game shows the launch')"
PRE=$C9 seg 01b-up "$T/first.mp4" ${UP_AT:-16.6} 3.4 "$(TB=2.6 title 'PINCH A RAMP' 'Into the slag pit'),$(TA=2.65 TB=3.4 title 'UP 1-0')"
MUSIC+=("$(at 3.3):x" "hit:$(at 3.7)" "$(at 3.7):1")
PRE="crop=iw*0.88:ih*0.88:iw*0.06:ih*0.12" seg 01c-hint "$T/first.mp4" ${HINT_AT:-30.3} 4.5 "$(TB=3.6 title 'THEN IT TEACHES THE SQUEEZE' 'Both hands, and off the desk')"
won=$(python3 -c "print(max(0, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/match-won-cards.mp4") - 2.0))")
PRE="crop=iw*0.7:ih*0.7:iw*0.15:ih*0.12" seg 03-won "$S/match-won-cards.mp4" "$won" 1.8 "$(ease 1.08 1.8),$(TPOS=top TB=1.8 title 'EVERY WIN UNLOCKS A MOVE')"
# 3. The core moves, each from the hand to what it does.
MUSIC+=("$(at 0):2")
seg 04-squeeze "$S/close-squeeze.mp4" 1.5 1.8 "$(TPOS=top TB=1.8 title 'YOUR HANDS RESHAPE THE ARENA')"
PRE=$C75 seg 05-flick "$S/flick2.mp4" ${FLICK_AT:-1.1} 1.9 "$SHARP,$(TB=1.9 title 'FLICK' 'Your fingertip is part of the physics')"
SPEED=0.5 seg 06-guard "$S/close-crossguard2.mp4" 0.30 1.9 "$(TPOS=top TB=1.9 title 'CROSSGUARD' 'Two still palms make a rail')"
PRE=$C75 seg 07-rub "$S/close-rub2.mp4" ${RUB_AT:-1.05} 1.4 "$SHARP,$(TPOS=top TB=1.4 title 'SPIN RUB' 'A fingertip spins your top back up')"
seg 08-stamp "$S/seal-stamp.mp4" ${STAMP_AT:-0.4} 2.8 "$(TB=2.8 title 'STAMP AN ULTIMATE' 'Pinch the seal, stamp it down')"
# 4. Forge a part on by hand; build an arena: the four placements.
MUSIC+=("$(at 0):2")
# The forge take without the stretches the game holds the top on the off-screen palm workbench (a
# still bench, then the top flying back in): pick the Halo ring, it snaps on; pick the Anvil, the dials change.
FORGE_KEEP="${FORGE_KEEP:-3.9-5.45 7.3-9.95}"
sel=$(for r in $FORGE_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/forge3.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/forge-active.mp4"
seg 09-forge "$TMP/forge-active.mp4" 0 4.15 "$(TB=4.15 title 'FORGE IT BY HAND' 'Drag a part on, the stats change')"
WS_KEEP="${WS_KEEP:-34.05-36.4 41.0-43.3 44.45-46.85 47.97-50.33}"
sel=$(for r in $WS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/workshop2.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/ws-active.mp4"
SPEED=2 PRE=$C9 seg 10-workshop "$TMP/ws-active.mp4" 0 4.5 "$(TB=4.5 title 'BUILD YOUR OWN ARENA' 'Every piece placed by hand')"
# 5. Every move by hand: four held, the five ultimates from the slap or stamp to the burst, then
# the other seven together (all 16 named and counted).
MUSIC+=("$(at 0):3")
i=0
while read -r f s d sp c n; do
  i=$((i + 1)); head=""; crop=$C9; sharp=""; on=""
  [ "$c" = w ] && { crop=$C75; sharp="$SHARP,"; }
  [ "$c" = s ] && { crop="crop=iw*0.75:ih*0.75:iw*0.16:ih*0.11"; sharp="$SHARP,"; }
  [ $i = 1 ] && { head="$(TB=1.3 title 'EVERY MOVE BY HAND' 'No controllers'),"; on="gte(t,1.3)"; }
  SPEED=$sp PRE=$crop seg "12-m$(printf %02d $i)" "$M/$f.mp4" "$s" "$d" "$sharp$head$(label "$n     $i / 16" "$on")"
done <<EOF
forge-twist 0.8 2.6 1 n TWIST
outer-ring ${OUTER_AT:-1.1} 2.4 1 n PALM CATCH
ember ${EMBER_AT:-3.7} 1.9 1 n EMBER RIVET
slap2 ${SLAP_AT:-3.5} 2.4 0.75 s SLAP THE TABLE = ANVIL STRIKE
seal-rush2 ${RUSH_AT:-3.9} 2.4 1 w RUSH ULTIMATE
seal-magnet2 ${MAGNET_AT:-3.8} 2.5 1 w MAGNET ULTIMATE
seal-tilt2 ${TILT_AT:-3.6} 2.4 1 w TILT ULTIMATE
seal-hammer2 ${HAMMER_AT:-1.7} 2.6 1 w HAMMER ULTIMATE
seal-ward2 ${WARD_AT:-3.6} 2.4 1 w WARD ULTIMATE
EOF
# The seven other moves in a 4x2 grid, each tile timed so its effect lands inside the window, with
# their own game sound; the eighth cell holds the count, so it never covers a move.
grid() {
  local dur=${GRID_DUR:-2.6} inputs=() f="" lay="" k=0 mix=""
  while read -r src st name; do
    inputs+=(-ss "$st" -t "$dur" -i "$M/$src.mp4")
    f+="[$k:v]crop=iw*0.8:ih*0.8:iw*0.1:ih*0.15,scale=480:540:force_original_aspect_ratio=increase:flags=lanczos,crop=480:540,fps=$FPS,$LOOK,drawtext=fontfile=$FONT:text='$name':fontcolor=white:fontsize=34:x=(w-text_w)/2:y=h-text_h-18:box=1:boxcolor=0x111419@0.8:boxborderw=8[t$k];"
    mix+="[$k:a]"
    lay+="$(( (k % 4) * 480 ))_$(( (k / 4) * 540 ))|"; k=$((k + 1))
  done
  f+="color=c=0x111419:s=480x540:r=$FPS:d=$dur,drawtext=fontfile=$FONT:text='MOVES':fontcolor=0xffa24a:fontsize=64:x=(w-text_w)/2:y=h/2-110,drawtext=fontfile=$FONT:text='10-16':fontcolor=0xffa24a:fontsize=96:x=(w-text_w)/2:y=h/2-40,drawtext=fontfile=$FONT:text='OF 16':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=h/2+70,drawtext=fontfile=$FONT:text='IWER EMULATOR':fontcolor=white@0.8:fontsize=28:x=(w-text_w)/2:y=h-140,drawtext=fontfile=$FONT:text='SYNTHETIC ROOM':fontcolor=white@0.8:fontsize=28:x=(w-text_w)/2:y=h-105,drawtext=fontfile=$FONT:text='NOT HEADSET FOOTAGE':fontcolor=white@0.8:fontsize=28:x=(w-text_w)/2:y=h-70[t$k];"
  lay+="$(( (k % 4) * 480 ))_$(( (k / 4) * 540 ))"
  ffmpeg -nostdin -y -loglevel error "${inputs[@]}" -filter_complex \
    "$f$(for n in $(seq 0 $k); do printf '[t%d]' "$n"; done)xstack=inputs=$((k + 1)):layout=$lay[v];${mix}amix=inputs=$k:normalize=0,volume=0.45[a]" \
    -map "[v]" -map "[a]" -t "$dur" "${enc[@]}" "$TMP/12-grid.mp4"
  segs+=(12-grid); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
grid <<EOF
ramp 2.5 RAMP
rim-spring 2.0 RIM SPRING
gust 1.6 FORGE GUST
cup-sling 3.7 CUP AND SLING
groove3 2.4 FINGER GROOVE
wheel 1.5 FORGE WHEEL
forge-stretch 2.1 STRETCH
EOF
# 6. Breadth: a four-top brawl from both hands to two knockouts, then four arenas, each named.
MUSIC+=("$(at 0):2")
PRE=$C9 seg 17-brawl "$T/brawl2.mp4" ${BRAWL_AT:-27.25} 4.5 "$(TB=3.0 title 'FOUR-TOP BRAWLS' 'Last top spinning wins')"
AR="$(TB=9 title '20 ARENAS' 'Each one plays differently')"
seg 18-ar12 "$S/arenas/12.mp4" 0.5 1.8 "$AR,$(label 'GLACIER STEPS')"
PRE="crop=iw*0.7:ih*0.7:iw*0.15:ih*0.2" seg 19-ar03 "$S/arenas/03.mp4" 0.5 1.8 "$AR,$(label 'CLOCKWORK SPIRE')"
PRE=$C85 seg 20-ar10 "$S/arenas/10.mp4" 0.5 1.8 "$AR,$(label 'NEON SPEEDWAY')"
seg 20b-ar06 "$S/arenas/06.mp4" 0.6 1.8 "$AR,$(label 'TITAN CRATER')"
# 7. The boss arc: Iron Keep casts your own tilt and both hands answer; it throws you, you lose 0-4.
MUSIC+=("$(at 0):b" "hit:$(at 1.5)" "$(at 1.5):3")
seg 13-boss1 "$T/boss-ironkeep.mp4" ${IRON_AT:-89.0} 5.5 "$(TB=3.2 title 'BOSSES CAST YOUR OWN MOVES' 'Iron Keep casts TILT, both hands answer')"
MUSIC+=("$(at 0.4):x")
seg 14-lost "$T/boss-ironkeep.mp4" ${LOST_AT:-116.3} 2.65 "$(TA=1.2 TB=2.65 title 'LOST 0-4')"
MUSIC+=("$(at 0.8):b" "hit:$(at 2.3)" "$(at 2.3):3")
TAGB=1 seg 15-bastion "$T/boss-bastion1.mp4" ${BASTION_AT:-88.0} 5.0 "$(title 'TWO BOUTS LATER, THE FINAL BOSS' 'Bastion casts Anvil Strike')"
# 8. The finishing blow at half speed, Bastion falls 5-0 (the HUD already shows it), LEVEL 9, THE
# CROWN IS YOURS held, then the end card fading in over it and out at the end.
CARD=${CARD_AT:-5.2}
MUSIC+=("$(at 3.4):b")
TAGB=1 seg 21a-finish "$T/boss-bastion1.mp4" ${FINISH_AT:-117.6} 0.85
TAGB=1 SPEED=0.5 seg 21b-blow "$T/boss-bastion1.mp4" 118.45 1.2
FADE="alpha='min(1,(t-$CARD)/0.3)'"
END0=$NOW; ENDD=$(python3 -c "print($CARD + 5.0)")
TAGB=1 TAG_UNTIL=$CARD seg 21-end "$T/boss-bastion1.mp4" ${CROWN_AT:-119.05} $ENDD "$(TB=3.3 title 'THE FINAL BOSS FALLS, 5-0'),split[sa][sb];[sb]gblur=sigma=24,eq=brightness=-0.55:saturation=0.6,format=yuva420p,fade=t=in:st=$CARD:d=0.3:alpha=1[sbb];[sa][sbb]overlay,format=yuv420p,$(logo 180 '(W-w)/2' 210 "gte(t,$CARD)"),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=410:enable='gte(t,$CARD)':$FADE,drawtext=fontfile=$FONT:text='Squeeze the arena. Throw them off your desk.':fontcolor=0xe7edf4:fontsize=60:x=(w-text_w)/2:y=570:enable='gte(t,$CARD)':$FADE,drawtext=fontfile=$FONT:text='Play it in the Quest Browser  /  Meta Quest 3 and 3S  /  hands only':fontcolor=0xe7edf4:fontsize=50:x=(w-text_w)/2:y=680:enable='gte(t,$CARD)':$FADE,drawtext=fontfile=$FONT:text='Link on the Devpost page':fontcolor=0xffa24a:fontsize=50:x=(w-text_w)/2:y=760:enable='gte(t,$CARD)':$FADE,fade=t=out:st=$(python3 -c "print($ENDD - 0.4)"):d=0.4"

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
python3 scripts/capture/music.py "$TMP/music.wav" "$NOW" "${MUSIC[@]}"
# Game sound over the music (the music ducks under it), levelled over a ~6 s window so no section
# drops out or jumps (at most 15 dB of lift), then about -14 LUFS, peaks under -1.5 dBTP.
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -i "$TMP/music.wav" -filter_complex \
  "[0:a]asplit[g][sc];[1:a]volume=${MUSIC_GAIN:-0.3},afade=t=out:st=$(python3 -c "print($NOW - 3)"):d=2.5[m];[m][sc]sidechaincompress=threshold=0.04:ratio=5:attack=5:release=300[md];[g][md]amix=inputs=2:normalize=0,dynaudnorm=f=250:g=25:m=6:p=0.7,loudnorm=I=-14:TP=-1.5:LRA=9,volume='if(between(t,$(python3 -c "print($END0 - 1.2)"),$(python3 -c "print($END0 + 4)")),0.7,1)':eval=frame,afade=t=out:st=$(python3 -c "print($NOW - 1.5)"):d=1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
[ -z "${MUSIC_OUT:-}" ] || cp "$TMP/music.wav" "$MUSIC_OUT"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
# Segment starts (for chapters and review).
t=0; for s in "${segs[@]}"; do printf "%6.2f %s\n" "$t" "$s"; t=$(python3 -c "print($t + $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/$s.mp4"))"); done
# Freeze check: any held picture over 0.3 s before the crown (the crown text is held on purpose).
ffmpeg -nostdin -i "$FINAL" -t "$(python3 -c "print($END0 + 3.4)")" -vf "freezedetect=n=0.002:d=0.3" -map 0:v -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | paste - - || echo "no freezes over 0.3 s"
