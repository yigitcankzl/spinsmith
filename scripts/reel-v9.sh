#!/usr/bin/env bash
# Cuts the competition reel v9 (IWER emulator footage, labelled on every frame): v8 after a
# frame-by-frame review (2026-11-13, Claude reviewers + Gemini): no flash frames, no repeated KOs, no
# severed forearm, no one-frame HUD at a cut; the moves re-shot as continuous takes from a mid camera
# that keeps the hands in frame (shots/v9); the final boss falls on screen (a real ring-out); no
# recycled montage; a larger end card. Every segment is a multiple of 0.5 s (120 BPM beat grid).
#
#   scripts/reel-v8.sh [reel-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v9-1080p60.mp4}
S=$R/shots; M=$R/shots/more; T=$R/takes; V=$R/shots/v9
W=1920; H=1080; FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
LOGO=$(realpath public/icons/icon-512.png)
LOOK="eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
enc=(-c:v libx264 -crf 15 -preset medium -tune animation -pix_fmt yuv420p)
# Each segment's sound goes to its own WAV and the WAVs are joined sample-exact: joining AAC segments
# adds ~30 ms a join, so the game sound drifted up to 1.5 s behind the picture by the end.
wav=(-c:a pcm_s16le -ar 48000 -ac 2)
segs=(); NOW=0; MUSIC=(); GAPS=() # GAPS: hits the game sound steps back for (0.3 s before each)
at() { python3 -c "print(round($NOW + $1, 3))"; } # reel time of an offset into the next segment
# The emulator tag, bottom right, with the clip's speed in it when retimed.
tag() {
  local sp=${1:-1} extra=""; [ "$sp" = 1 ] || extra="  /  ${sp}x SPEED"
  echo "drawtext=fontfile=$FONT:text='IWER EMULATOR  /  SYNTHETIC ROOM  /  NOT HEADSET FOOTAGE$extra':fontcolor=white@0.85:fontsize=32:x=w-text_w-24:y=h-text_h-24:box=1:boxcolor=0x111419@0.8:boxborderw=7"
}
# (No ':' in a caption: drawtext reads it as an option separator and falls back to another font.)
# The one text slot: an orange line bottom left from TA to TB s into the segment (default the whole
# segment). Story beats and group headers use it; a move name uses it in white (move).
title() {
  echo "drawtext=fontfile=$FONT:text='$1':fontcolor=${TC:-0xffa24a}:fontsize=76:x=48:y=${TY:-h-200}:box=1:boxcolor=0x111419@0.8:boxborderw=16:enable='gte(t,${TA:-0})*lt(t,${TB:-99})'"
}
move() { TC=white title "$@"; }
# Impact: a white flash out of the cut and a 0.25 s punch-in that settles (cold open and montage only).
FLASH="fade=t=in:st=0:d=0.12:color=white"
PUNCH="zoompan=z='if(lt(in_time,0.25),1.15-0.6*in_time,1)':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':s=${W}x${H}:fps=$FPS"

# seg NAME SRC START DUR [FILTERS]   env: PRE (crop first), SPEED (2 = 2x, 0.5 = half speed),
# AGAIN (sound gain), SCENE (slow motion: cut, don't blend, across a jump in the capture)
seg() {
  local name=$1 src=$2 start=$3 dur=$4 vf=${5:-} sp=${SPEED:-1} af=anull a=0 pre="" post="fps=$FPS"
  [ -s "$src" ] || { echo "missing $src" >&2; exit 1; }
  python3 -c "import sys; sys.exit(0 if abs($dur * 2 - round($dur * 2)) < 1e-6 else 1)" || echo "warning: $name $dur s is off the beat grid" >&2
  [ "$sp" = 1 ] || af="atempo=$sp"
  python3 -c "import sys; sys.exit(0 if $sp < 1 else 1)" && { pre="mpdecimate=hi=200:lo=100:frac=0.5,"; post="framerate=fps=$FPS${SCENE:+:scene=$SCENE}"; [ -n "${SLOWDUP:-}" ] && { pre=""; post="fps=$FPS"; }; }
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" </dev/null | grep -q . || { a=1; af=anull; }
  # Takes recorded before the game's spin-grind fix (2026-11-10) carry its broadband hiss: soften it.
  [ "$a" = 0 ] && [ "$(stat -c %Y "$src")" -lt "${AUDIO_FIX_EPOCH:-1794268800}" ] && af="$af,afftdn=nf=-28,lowpass=f=7500"
  ffmpeg -nostdin -y -loglevel error -ss "$start" -t "$(python3 -c "print($dur * $sp + 0.1)")" -i "$src" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -filter_complex \
    "[0:v]${pre}setpts=(PTS-STARTPTS)/$sp,${PRE:+$PRE,}scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,$post,$LOOK${vf:+,$vf},$(tag "$sp")${POST:+,$POST}[v];[$a:a]$af,volume=${AGAIN:-1}${AEVAL:+:eval=frame},apad[a]" \
    -map "[v]" -an -t "$dur" "${enc[@]}" "$TMP/$name.mp4" -map "[a]" -t "$dur" "${wav[@]}" "$TMP/$name.wav"
  segs+=("$name"); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
logo() { echo "null[m];movie=$LOGO,scale=$1:$1[lg];[m][lg]overlay=$2:$3${4:+:enable='$4'}"; }

C85="crop=iw*0.85:ih*0.85:iw*0.075:ih*0.075"
C9="crop=iw*0.9:ih*0.9:iw*0.05:ih*0.05"
C75="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.15"
SHARP="unsharp=5:5:0.5"
CMID="crop=iw*0.54:ih*0.54:iw*0.25:ih*0.17"   # v9 mid camera: the arena and the reaching hand
CMIDLOW="crop=iw*0.62:ih*0.62:iw*0.19:ih*0.3" # v9 mid camera, low: a hand coming in from the near side
CSLAP="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.05"   # v9 slap retake: the arena and the striking hand below it
CHIGH="crop=iw*0.75:ih*0.75:iw*0.22:ih*0.1"   # v9 high camera: the arena and the right hand beside it
CSLAPR="crop=iw*0.6:ih*0.6:iw*0.35:ih*0.28"  # v9 slap: the right half of the arena and the striking hand
CCLOSE="crop=iw*0.66:ih*0.66:iw*0.17:ih*0.02"  # v9 close camera: the arena and both resting hands
CSTEEP="crop=iw*0.76:ih*0.76:iw*0.12:ih*0.06"    # v9 steep camera
CWHEEL="crop=iw*0.48:ih*0.48:iw*0.2:ih*0.27" # v9 wheel camera: the Forge Wheel and the arena

# COLD OPEN (0-3.5): squeeze, the throw, DESK KO. One KO, no flashes, tight on the arena.
HOOKC="crop=iw*0.62:ih*0.62:iw*0.17:ih*0.36"
PLATFORM="drawtext=fontfile=$FONT:text='META QUEST 3  /  HANDS ONLY  /  NO CONTROLLERS':fontcolor=white:fontsize=40:x=w-text_w-40:y=36:box=1:boxcolor=0x111419@0.75:boxborderw=10"
BRAND="$(logo 120 48 40),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=100:x=186:y=44:box=1:boxcolor=0x111419@0.78:boxborderw=14"
MUSIC+=("0:x" "rise:0.3-1.8" "hit:1.8" "1.8:3")
PRE=$HOOKC seg 00a-squeeze "$S/hook-ko-close.mp4" ${HOOK_AT:-1.6} 1.0 "$PLATFORM,$(title 'SQUEEZE THE ARENA.')"
# The take has a capture jump at 3.05: the second shot starts past it, the throw-off and DESK KO! in one piece.
PRE="crop=iw*0.66:ih*0.66:iw*0.15:ih*0.2" AGAIN=2 seg 00c-ko "$S/hook-ko-close.mp4" ${KO_AT:-3.1} 2.0 "$BRAND,$(TB=0.9 title 'THROW THEM OFF YOUR DESK.')"

# ACT 1. How it works: the detected table, the rip, a first match, the two-hand squeeze.
MUSIC+=("$(at 0):1")
# The press take without the game's 0.3 s hitch as the arena forms.
PRESS_KEEP="${PRESS_KEEP:-3.8-4.87 5.19-6.65}"
sel=$(for r in $PRESS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/press-place.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/press-active.mp4"
PRE="crop=iw*0.45:ih*0.45:iw*0.27:ih*0.27" AGAIN=1.5 seg 01a-press "$TMP/press-active.mp4" ${PRESS_AT:-0.05} 1.0 "$(title 'FINDS YOUR REAL TABLE')"
AGAIN=0.7 seg 01b-rip "$V/${RIP_TAKE:-rip2}.mp4" ${RIP_AT:-2.55} 1.0 "$(title 'PINCH. PULL. RIP.')"
MUSIC+=("$(at 0):2")
# 01c (the first match) is gone: its only usable window showed a palm sunk under the arena floor.
# The squeeze lesson (01d) is gone: the cold open already shows squeeze -> DESK KO with the same banner.

# ACT 2. The basics, then the 16 moves, each full frame and counted; the five ultimates are one
# gesture (stamp a seal) with five results, so they run as one group.
# clip in dur speed crop header name  (header "-" for none; crop n = C9, w = the hand camera C75,
# m = the v9 mid camera, s = the v9 steep camera, l = the v9 wheel camera; a clip with a / is under shots/)
moves() {
  local i=0 k=0
  while read -r f s d sp c head n; do
    k=$((k + 1)); local crop=$C9 sharp="" text="" num=""
    case $c in w) crop=$C75; sharp="$SHARP," ;; m) crop=$CMID ;; b) crop=$CMIDLOW ;; a) crop=$CSLAP ;; h) crop=$CHIGH ;; r) crop=$CSLAPR ;; k) crop=$CCLOSE ;; s) crop=$CSTEEP ;; l) crop=$CWHEEL ;; esac
    [ "${COUNT:-1}" = 1 ] && { i=$((i + 1)); num="   $i/16"; }
    n=${n//_/ }; head=${head//_/ }
    if [ "$head" = - ]; then text="$(move "$n$num")"
    else text="$(TY=${HTY:-h-200} TB=${HTB:-0.8} title "$head"),$(TA=${HTB:-0.8} move "$n$num")"; fi
    local src=$M/$f.mp4; [[ $f == */* ]] && src=$S/$f.mp4; [[ $f == /* ]] && src=$f.mp4
    SLOWDUP=1 SPEED=$sp PRE=$crop seg "$1-$(printf %02d $k)" "$src" "$s" "$d" "$sharp$text"
  done
}
MUSIC+=("$(at 0):2")
# The basics are not among the 16 (they need no unlock): named, not counted. They live in shots/.
M=$S COUNT=0 HTB=0.4 moves 11-basic <<EOF
v9/flick ${FLICK_AT:-3.58} 1.0 1 m - BASIC_/_FLICK
v9/guard ${GUARD_AT:-2.58} 1.0 0.5 n - BASIC_/_CROSSGUARD
v9/rub ${RUB_AT:-2.5} 1.5 1 s - BASIC_/_SPIN_RUB
EOF
# Palm Catch: one continuous take (shots/v9/palm28, the capture-only slow park keeps the hand in frame).
# Cup and Sling: the catch (cut as the hand leaves) and the sling, a hard cut between them.
CUP_KEEP="${CUP_KEEP:-2.75-3.7 4.95-6.0}"
sel=$(for r in $CUP_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/v9/cup7.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/cup-active.mp4"
MUSIC+=("whoosh:$(at 0)" "$(at 0):3" "rise:$(at 14.0)-$(at 15.75)" "$(at 15.75):x" "hit:$(at 16.0)" "$(at 16.0):3"); GAPS+=("$(at 16.0)")
HTB=1.0 moves 12-move <<EOF
v9/twist ${TWIST_AT:-2.0} 2.0 1 n 16_MOVES,_NO_CONTROLLERS TWIST
v9/stretch ${STRETCH_AT:-4.0} 1.0 1 n - STRETCH
v9/${WHEEL_TAKE:-wheel2} ${WHEEL_AT:-2.75} 1.0 2 ${WHEEL_CROP:-l} - FORGE_WHEEL
v9/ramp ${RAMP_AT:-1.98} 1.0 1 s - RAMP
v9/spring ${SPRING_AT:-3.5} 1.5 1 m - RIM_SPRING
v9/gust ${GUST_AT:-2.5} 1.0 1 s - FORGE_GUST
v9/palm28 ${OUTER_AT:-1.7} 2.0 1 n - PALM_CATCH
v9/groove7 ${GROOVE_AT:-4.2} 1.5 1 k - FINGER_GROOVE
$TMP/cup-active 0 2.0 1 k - CUP_AND_SLING
v9/ember30 ${EMBER_AT:-4.55} 1.5 1 s - EMBER_RIVET
v9/${SLAP_TAKE:-slap3} ${SLAP_AT:-7.75} 1.5 0.5 ${SLAP_CROP:-h} - SLAP_THE_DESK_=_ANVIL_STRIKE
v9/seal-rush27 ${RUSH_AT:-1.7} 2.0 1 m 1_STAMP,_5_ULTIMATES RUSH
v9/${MAGNET_TAKE:-seal-magnet2} ${MAGNET_AT:-2.9} 1.0 1 m - MAGNET
v9/seal-tilt ${TILT_AT:-3.25} 1.0 1 m - TILT
v9/seal-hammer27 ${HAMMER_AT:-2.5} 1.0 1 m - HAMMER
v9/seal-ward27 ${WARD_AT:-2.6} 1.0 1 m - WARD
EOF

# ACT 3. Make it yours, then everyone else: forge, build, arenas, a brawl, the bosses.
MUSIC+=("whoosh:$(at 0)" "$(at 0):2")
# The forge: one continuous piece of the take, the part swap (HALO to ANVIL) as the hand comes in.
AGAIN=3 PRE="crop=iw*0.7:ih*0.7:iw*0.12:ih*0.155" seg 21-forge "$S/forge3.mp4" ${FORGE_AT:-7.9} 1.5 "$(title 'FORGE YOUR TOP')"
WS_KEEP="${WS_KEEP:-34.05-36.4 41.0-43.3 44.45-46.85 47.97-50.33}"
sel=$(for r in $WS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/workshop2.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/ws-active.mp4"
AGAIN=3 PRE="crop=iw*0.72:ih*0.66:iw*0.14:ih*0.02" seg 22-workshop "$TMP/ws-active.mp4" ${WS_AT:-1.05} 1.0 "$(title 'BUILD YOUR ARENA')"
AR="$(title '20 ARENAS')"
AGAIN=2 PRE=$C85 seg 23-ar12 "$S/arenas/12.mp4" 1.65 0.5 "$AR"
AGAIN=2 PRE="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.1" seg 24-ar07 "$S/arenas/07.mp4" 0.5 0.5 "$AR"
PRE=$C85 seg 25-ar10 "$S/arenas/10.mp4" 0.52 0.5 "$AR"
MUSIC+=("$(at 0):3")
AGAIN=0.7 PRE=$C9 seg 26-brawl "$T/brawl2.mp4" ${BRAWL_AT:-27.15} 1.0 "$(title 'FOUR-TOP BRAWLS')"
MUSIC+=("$(at 0):b" "rise:$(at 0.1)-$(at 0.45)" "$(at 0.45):x" "hit:$(at 0.5)" "$(at 0.5):3"); GAPS+=("$(at 0.5)")
seg 31-boss1 "$T/boss-ironkeep.mp4" ${IRON_AT:-90.9} 1.0 "$(title 'BOSSES CAST YOUR MOVES')"
# The Iron Keep loss (32-lost) is gone: first-watch judges read a loss right before the finale as a wince.
MUSIC+=("$(at 0):b" "rise:$(at 0.1)-$(at 0.5)")
AGAIN=0.5 seg 33-bastion "$T/boss-bastion3.mp4" ${BASTION_AT:-110.5} 0.5 "$(title 'BASTION AT THE RIM. STAMP!')"
# The finishing blow in silence: the clash throws Bastion to the rim, the hand strikes, Bastion goes
# over the rim; the win drops in on SLAG! The result screen is cropped past its buttons and score.
# The strike window (the rival at the rim, the ultimate armed): the hand stamps the seal, at half speed, cut (and held) before the result screen, then SLAG! at half speed as Bastion goes in a burst of sparks at the rim.
MUSIC+=("$(at 0):x")
SLOWDUP=1 SPEED=0.5 AGAIN=0.5 PRE="select='lt(t,0.88)'" seg 35a-strike "$T/boss-bastion3.mp4" ${STRIKE_AT:-111.0} 1.0 "$(title 'BASTION AT THE RIM. STAMP!')"
MUSIC+=("hit:$(at 0)" "$(at 0):3")
SLOWDUP=1 SPEED=0.5 AGAIN=0.5 PRE="crop=iw*0.4:ih*0.4:iw*0.42:ih*0.26" seg 35b-slag "$T/boss-bastion3.mp4" ${SLAG_AT:-112.0} 1.0 "$(TA=0 title 'THE FINAL BOSS FALLS')"
# The end card over the crown take, blurred; the sting on its first frame.
MUSIC+=("$(at -0.25):x" "sting:$(at 0)"); GAPS+=("$NOW")
ENDD=${END_DUR:-3.0}
AGAIN=0 POST="fade=t=in:st=0:d=0.15,fade=t=out:st=$(python3 -c "print($ENDD - 0.4)"):d=0.4" seg 50-end "$T/boss-bastion1.mp4" ${CARD_AT:-123.7} $ENDD "split[sa][sb];[sb]gblur=sigma=24,eq=brightness=-0.55:saturation=0.6,format=yuva420p[sbb];[sa][sbb]overlay,format=yuv420p,$(logo 240 '(W-w)/2' 120),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=190:x=(w-text_w)/2:y=370,drawtext=fontfile=$FONT:text='Squeeze the arena. Throw them off your desk.':fontcolor=0xe7edf4:fontsize=76:x=(w-text_w)/2:y=600,drawtext=fontfile=$FONT:text='Meta Quest 3 and 3S  /  Quest Browser  /  hands only':fontcolor=0xe7edf4:fontsize=74:x=(w-text_w)/2:y=720,drawtext=fontfile=$FONT:text='Link on the Devpost page':fontcolor=0xffc58a:fontsize=84:x=(w-text_w)/2:y=830"

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
printf "file '%s.wav'\n" "${segs[@]/#/$TMP/}" > "$TMP/alist.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/alist.txt" -c copy "$TMP/game.wav"
python3 scripts/capture/music.py "$TMP/music.wav" "$NOW" "${MUSIC[@]}"
GAPX=$(python3 -c "import sys; print('1-0.8*min(1,' + '+'.join(f'between(t,{float(a)-0.3:.3f},{float(a):.3f})' for a in sys.argv[1:]) + ')')" "${GAPS[@]}")
echo "video $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/joined.mp4") game $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/game.wav") cut $NOW"
# The game levelled on its own (so the music's silences survive), its 110 Hz dipped for the kick;
# the music up front, ducking gently under the game; then about -14 LUFS, peaks under -1.5 dBTP.
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -i "$TMP/game.wav" -i "$TMP/music.wav" -filter_complex \
  "[1:a]dynaudnorm=f=250:g=25:m=4:p=0.7,equalizer=f=110:t=q:w=1:g=-3,volume='$GAPX':eval=frame,asplit[g][sc];[2:a]volume=${MUSIC_GAIN:-0.55},highpass=f=35[m];[m][sc]sidechaincompress=threshold=0.12:ratio=3:attack=10:release=200[md];[g][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.8:LRA=11,alimiter=limit=0.8:level=false[a]" \
  -map 0:v -map "[a]" -t "$NOW" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
t=0; for s in "${segs[@]}"; do printf "%6.2f %s\n" "$t" "$s"; t=$(python3 -c "print($t + $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/$s.mp4"))"); done
# Freeze check: any held picture over 0.3 s before the end card.
ffmpeg -nostdin -i "$FINAL" -t "$(python3 -c "print($NOW - $ENDD)")" -vf "freezedetect=n=0.002:d=0.3" -map 0:v -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | paste - - || echo "no freezes over 0.3 s"
