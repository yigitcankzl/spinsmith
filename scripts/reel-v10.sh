#!/usr/bin/env bash
# Cuts the competition reel v10 (IWER emulator footage, labelled on every frame): v9 re-timed for a
# first watch. Each move gets its lead-in, the gesture and its result (2-3 s), its caption says what the
# hand does above the move's name, and the 16 moves come in three groups, each opened by a 1 s card.
# v9 was: v8 after a
# frame-by-frame review (2026-11-13, Claude reviewers + Gemini): no flash frames, no repeated KOs, no
# severed forearm, no one-frame HUD at a cut; the moves re-shot as continuous takes from a mid camera
# that keeps the hands in frame (shots/v9); the final boss falls on screen (a real ring-out); no
# recycled montage; a larger end card. Every segment is a multiple of 0.5 s (120 BPM beat grid).
#
#   scripts/reel-v10.sh [reel-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v10-1080p60.mp4}
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
# What the hand does: a smaller orange line above the move's name.
how() { echo "drawtext=fontfile=$FONT:text='$1':fontcolor=0xffa24a:fontsize=52:x=48:y=h-288:box=1:boxcolor=0x111419@0.8:boxborderw=12"; }
# A group card: the next take blurred and dimmed, the group's name and its moves centred.
card() {
  seg "$1" "$2" "$3" 1.0 "split[ca][cb];[cb]gblur=sigma=26,eq=brightness=-0.5:saturation=0.6,format=yuva420p[cbb];[ca][cbb]overlay,format=yuv420p,drawtext=fontfile=$FONT:text='$4':fontcolor=0xff8a2a:fontsize=150:x=(w-text_w)/2:y=(h-text_h)/2-70,drawtext=fontfile=$FONT:text='$5':fontcolor=0xe7edf4:fontsize=70:x=(w-text_w)/2:y=(h)/2+90"
}
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
CPALM="crop=iw*0.8:ih*0.8:iw*0.17:ih*0.15"  # Palm Catch: the arena and the catching hand at the right
CSTEEP="crop=iw*0.76:ih*0.76:iw*0.12:ih*0.06"    # v9 steep camera
CWHEEL="crop=iw*0.48:ih*0.48:iw*0.2:ih*0.27" # v9 wheel camera: the Forge Wheel and the arena

# COLD OPEN (0-4): squeeze, the throw, DESK KO. One KO, no flashes.
HOOKC="crop=iw*0.66:ih*0.66:iw*0.15:ih*0.2"
PLATFORM="drawtext=fontfile=$FONT:text='FOR META QUEST 3  /  HANDS ONLY  /  NO CONTROLLERS':fontcolor=white:fontsize=40:x=w-text_w-40:y=36:box=1:boxcolor=0x111419@0.75:boxborderw=10"
BRAND="$(logo 120 48 40),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=100:x=186:y=44:box=1:boxcolor=0x111419@0.78:boxborderw=14"
# v11: the hook is one side-on DESK KO (shots/v12/koSideC, judge report 2026-11-16): both hands squeeze,
# the rival skids off the real desk edge and lands on the floor, the desk edge in frame. The flat
# "FINDS YOUR REAL TABLE" press shot is gone; the open is still 4 s.
KOC="crop=iw*0.92:ih*0.92:iw*0.04:ih*0.04"
MUSIC+=("0:x" "rise:0.3-2.3" "hit:2.3" "2.3:3")
PRE=$KOC seg 00a-squeeze "$S/v12/koSideC.mp4" ${HOOK_AT:-2.0} 1.0 "$PLATFORM,$(title 'SQUEEZE THE ARENA.')"
SLOWDUP=1 SPEED=0.6 PRE=$KOC AGAIN=2 seg 00c-ko "$S/v12/koSideC.mp4" ${KO_AT:-3.0} 3.0 "$BRAND,$(TB=0.9 title 'THROW THEM OFF YOUR DESK.')"

# ACT 1. How it works: the rip.
MUSIC+=("$(at 0):1")
AGAIN=0.7 seg 01b-rip "$V/${RIP_TAKE:-rip2}.mp4" ${RIP_AT:-1.9} 2.5 "$(title 'PINCH. PULL. RIP.')"
MUSIC+=("$(at 0):2")
# 01c (the first match) is gone: its only usable window showed a palm sunk under the arena floor.
# The squeeze lesson (01d) is gone: the cold open already shows squeeze -> DESK KO with the same banner.

# ACT 2. The basics, then the 16 moves, each full frame and counted; the five ultimates are one
# gesture (stamp a seal) with five results, so they run as one group.
# clip in dur speed crop header name  (header "-" for none; crop n = C9, w = the hand camera C75,
# m = the v9 mid camera, s = the v9 steep camera, l = the v9 wheel camera; a clip with a / is under shots/)
moves() {
  local i=$(( ${FIRST:-1} - 1 )) k=0
  while read -r f s d sp c head hw n; do
    k=$((k + 1)); local crop=$C9 sharp="" text="" num=""
    case $c in w) crop=$C75; sharp="$SHARP," ;; m) crop=$CMID ;; b) crop=$CMIDLOW ;; a) crop=$CSLAP ;; h) crop=$CHIGH ;; r) crop=$CSLAPR ;; k) crop=$CCLOSE ;; f) crop="crop=iw:ih:0:0" ;; t) crop="crop=iw*0.55:ih*0.55:iw*0.2:ih*0.25" ;; q) crop=$CPALM ;; p) crop="crop=iw*0.64:ih*0.64:iw*0.2:ih*0.14" ;; g) crop="crop=iw*0.5:ih*0.5:iw*0.25:ih*0.17" ;; s) crop=$CSTEEP ;; l) crop=$CWHEEL ;; esac
    [ "${COUNT:-1}" = 1 ] && { i=$((i + 1)); num="   $i/16"; }
    n=${n//_/ }; head=${head//_/ }; hw=${hw//_/ }
    if [ "$head" = - ]; then text="$(move "$n$num")${hw:+,$(how "$hw")}"
    else text="$(TY=${HTY:-h-200} TB=${HTB:-0.8} title "$head"),$(TA=${HTB:-0.8} move "$n$num")"; fi
    local src=$M/$f.mp4; [[ $f == */* ]] && src=$S/$f.mp4; [[ $f == /* ]] && src=$f.mp4
    SLOWDUP=1 SPEED=$sp PRE=$crop seg "$1-$(printf %02d $k)" "$src" "$s" "$d" "$sharp$text"
  done
}
MUSIC+=("$(at 0):2")
# Three extra moves outside the 16: named, not counted. They live in shots/.
M=$S COUNT=0 HTB=0.4 moves 11-basic <<EOF
v9/flick ${FLICK_AT:-2.7} 2.0 1 m - SWING_A_FINGERTIP_THROUGH_A_TOP EXTRA_/_FLICK
v9/guard ${GUARD_AT:-2.3} 2.0 0.5 n - TWO_PALMS_ON_THE_RIM EXTRA_/_CROSSGUARD
v9/rub ${RUB_AT:-2.55} 2.0 1 s - FINGERTIP_ALONG_YOUR_RIM EXTRA_/_SPIN_RUB
EOF
# Palm Catch: one continuous take (shots/v9/palm28, the capture-only slow park keeps the hand in frame).
# Cup and Sling: the catch from cup36 (the palm over the top as CUP CAUGHT lands, steep camera), then the
# sling from cup7 (SLUNG!), each framed on its own; a straight cut between the two takes.
ffmpeg -nostdin -y -loglevel error -i "$S/v9/cup36.mp4" -i "$S/v9/cup7.mp4" -filter_complex "[0:v]trim=${CUP_A:-4.85}:${CUP_A2:-5.95},setpts=PTS-STARTPTS,crop=iw*0.76:ih*0.76:iw*0.12:ih*0.06,scale=1920:1080,setsar=1,fps=60[a];[1:v]trim=${CUP_B:-4.7}:${CUP_B2:-6.1},setpts=PTS-STARTPTS,crop=iw*0.66:ih*0.66:iw*0.17:ih*0.02,scale=1920:1080,setsar=1,fps=60[b];[a][b]concat=n=2:v=1:a=0[v];[0:a]atrim=${CUP_A:-4.85}:${CUP_A2:-5.95},asetpts=PTS-STARTPTS[x];[1:a]atrim=${CUP_B:-4.7}:${CUP_B2:-6.1},asetpts=PTS-STARTPTS[y];[x][y]concat=n=2:v=0:a=1[au]" -map "[v]" -map "[au]" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/cup-active.mp4"
# The journey in one beat (judge report 2026-11-16): a won match names the next match's new move.
SPEED=1.5 AGAIN=1 PRE="crop=iw*0.44:ih*0.44:iw*0.28:ih*0.13" seg 11-journey "$S/match-won-cards.mp4" ${JOURNEY_AT:-5.4} 2.0 "unsharp=5:5:0.6,$(title 'ONE NEW MOVE PER MATCH'),$(how 'WIN, AND THE NEXT MATCH TEACHES IT')"
# Three groups, each opened by a card; the count runs on across them.
MUSIC+=("whoosh:$(at 0)" "$(at 0):3")
card 12-card1 "$S/v9/twist10.mp4" 0.5 'SHAPE THE ARENA' 'MOVES 1 TO 4  /  HANDS ON THE RIM'
HTB=1.0 moves 12-moveA <<EOF
v9/twist10 ${TWIST_AT:-3.4} 2.5 1 n - BOTH_HANDS_TWIST_THE_RIM TWIST
v9/stretch10 ${STRETCH_AT:-3.1} 2.0 1 n - PULL_THE_RIM_APART,_THE_BOWL_WIDENS STRETCH
v9/${WHEEL_TAKE:-wheel10} ${WHEEL_AT:-2.4} 2.0 1 ${WHEEL_CROP:-l} - TURN_THE_WHEEL,_THE_BOWL_FLOWS FORGE_WHEEL
v9/ramp ${RAMP_AT:-1.85} 2.0 0.5 s - PINCH_THE_FLOOR,_DRAG_A_RAMP RAMP
EOF
card 13-card2 "$S/v9/spring.mp4" 2.5 'WORK YOUR TOP' 'MOVES 5 TO 11  /  ONE HAND'
FIRST=5 HTB=1.0 moves 13-moveB <<EOF
v9/spring11 ${SPRING_AT:-2.0} 2.5 1 p - PINCH_THE_RIM,_PULL,_LET_GO,_IT_SPRINGS RIM_SPRING
v9/gust11b ${GUST_AT:-2.4} 2.0 0.75 g - SWEEP_YOUR_PALM_ACROSS,_A_GUST_HITS FORGE_GUST
v9/palm28 ${OUTER_AT:-1.4} 2.5 1 q - CATCH_YOUR_TOP,_PUT_IT_BACK PALM_CATCH
v9/groove7 ${GROOVE_AT:-3.7} 2.5 1 k - SLIDE_A_FINGERTIP,_CUT_A_GROOVE FINGER_GROOVE
$TMP/cup-active 0 2.5 1 f - CUP_IT,_THEN_SLING_IT CUP_AND_SLING
v9/ember10 ${EMBER_AT:-4.1} 3.0 1 s - PINCH_A_HOT_RIVET,_PLANT_IT EMBER_RIVET
v9/${SLAP_TAKE:-slap3} ${SLAP_AT:-7.95} 2.0 0.5 ${SLAP_CROP:-h} - SLAP_THE_DESK ANVIL_STRIKE
EOF
MUSIC+=("rise:$(at -2.0)-$(at -0.25)" "$(at -0.25):x" "hit:$(at 0)" "$(at 0):3"); GAPS+=("$(at 0)")
card 14-card3 "$S/v9/seal-rush27.mp4" 1.5 'STAMP THE SEAL' 'MOVES 12 TO 16  /  5 ULTIMATES'
FIRST=12 HTB=1.0 moves 14-moveC <<EOF
v9/seal-rush27 ${RUSH_AT:-1.9} 3.0 1 m - STAMP,_YOUR_TOP_CHARGES RUSH
v9/${MAGNET_TAKE:-seal-magnet2} ${MAGNET_AT:-2.1} 2.5 1 m - STAMP,_A_WELL_PULLS_THEM_IN MAGNET
v9/seal-tilt10 ${TILT_AT:-2.0} 2.5 1 t - STAMP,_THE_ARENA_TILTS TILT
v9/seal-hammer10 ${HAMMER_AT:-2.3} 3.0 1 s - STAMP,_THE_HAMMER_FALLS HAMMER
v9/seal-ward27 ${WARD_AT:-2.1} 2.0 1 m - STAMP,_A_RING_WALL_GUARDS_YOU WARD
EOF

# ACT 3. Make it yours, then everyone else: forge, build, arenas, a brawl, the bosses.
MUSIC+=("whoosh:$(at 0)" "$(at 0):2")
# The forge: one continuous piece of the take, the part swap (HALO to ANVIL) as the hand comes in.
# One whole part swap (first watchers could not read a 1.5 s glimpse): the hand pinches a ring from the
# tray, the old ring flies off, the new one lands and the stat board renames the top.
AGAIN=3 PRE="crop=iw*0.62:ih*0.62:iw*0.15:ih*0.16" seg 21-forge "$S/forge3.mp4" ${FORGE_AT:-8.4} 3.5 "$(title 'FORGE YOUR TOP'),$(how 'PINCH A NEW RING, YOUR TOP REBUILDS')"
WS_KEEP="${WS_KEEP:-34.05-36.4 41.0-43.3 44.45-46.85 47.97-50.33}"
sel=$(for r in $WS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/workshop2.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/ws-active.mp4"
AGAIN=3 PRE="crop=iw*0.6:ih*0.6:iw*0.2:ih*0.26" seg 22-workshop "$TMP/ws-active.mp4" ${WS_AT:-0.0} 3.0 "$(title 'BUILD YOUR ARENA'),$(how 'PINCH A PIECE, DROP IT IN THE BOWL')"
AR="$(title '20 ARENAS')"
AGAIN=2 PRE=$C85 seg 23-ar12 "$S/arenas/12.mp4" 1.65 0.5 "$AR"
AGAIN=2 PRE="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.1" seg 24-ar07 "$S/arenas/07.mp4" 0.5 0.5 "$AR"
PRE=$C85 seg 25-ar10 "$S/arenas/10.mp4" 0.52 0.5 "$AR"
MUSIC+=("$(at 0):3")
AGAIN=0.7 PRE=$C9 seg 26-brawl "$T/brawl2.mp4" ${BRAWL_AT:-27.15} 1.0 "$(title 'FOUR-TOP BRAWLS')"
# The finale builds without a break (first watchers found the stop-start ending choppy).
MUSIC+=("$(at 0):3")
seg 31-boss1 "$T/boss-ironkeep.mp4" ${IRON_AT:-90.9} 1.0 "$(title 'BOSSES CAST YOUR MOVES')"
# The Iron Keep loss (32-lost) is gone: first-watch judges read a loss right before the finale as a wince.
# (33-bastion is gone: first-watch judges saw nothing happen in it; the strike opens earlier instead.)
# The finishing blow under a riser: the clash throws Bastion to the rim, the hand strikes, Bastion goes
# over the rim; the win drops in on SLAG! The result screen is cropped past its buttons and score.
# The strike window (the rival at the rim, the ultimate armed): the hand stamps the seal, at half speed, cut (and held) before the result screen, then SLAG! at half speed as Bastion goes in a burst of sparks at the rim.
MUSIC+=("rise:$(at 0)-$(at 1.5)")
SLOWDUP=1 SPEED=0.5 AGAIN=0.5 PRE="select='lt(t,1.38)'" seg 35a-strike "$T/boss-bastion3.mp4" ${STRIKE_AT:-110.75} 1.5 "$(TY=40 title 'BASTION AT THE RIM. STAMP!')"
MUSIC+=("hit:$(at 0)" "$(at 0):3")
SLOWDUP=1 SPEED=0.5 AGAIN=0.5 PRE="crop=iw*0.4:ih*0.4:iw*0.42:ih*0.26" seg 35b-slag "$T/boss-bastion3.mp4" ${SLAG_AT:-111.9} 1.0 "unsharp=7:7:0.9,$(TA=0 title 'THE FINAL BOSS FALLS')"
# The idea once more before the end card: the whole desk from the side, the rival off its edge and on the floor.
SLOWDUP=1 SPEED=0.75 AGAIN=1.5 PRE="crop=iw*0.76:ih*0.76:iw*0.08:ih*0.14" seg 36-desk "$S/v12/koSide.mp4" ${DESK_AT:-3.05} 2.0 "$(title 'YOUR DESK IS THE RING-OUT')"
# The sting on the end card's first frame.
MUSIC+=("$(at -0.25):x" "sting:$(at 0)"); GAPS+=("$NOW")
ENDD=${END_DUR:-3.5}
# The end card: live tops spinning behind (soft, darkened toward the left), the wordmark left-aligned
# and sliding in on the sting, one orange rule, one line, then where to play. No icon tile, no centred stack.
EC="gblur=sigma=5,geq=lum='lum(X,Y)*(0.16+0.55*X/W)':cb='128+(cb(X,Y)-128)*(0.25+0.6*X/W)':cr='128+(cr(X,Y)-128)*(0.25+0.6*X/W)'"
EC+=",drawtext=fontfile=$FONT:text='HANDS ONLY  /  NO CONTROLLERS':fontcolor=0xff8a2a:fontsize=42:x=156:y=300:alpha='min(1,t/0.2)'"
EC+=",drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=white:fontsize=250:x='150-60*max(0,1-t/0.22)':y=370:alpha='min(1,t/0.12)'"
EC+=",drawbox=x=156:y=618:w='560*min(1,max(0,(t-0.15)/0.3))':h=8:color=0xff8a2a@1:t=fill"
EC+=",drawtext=fontfile=$FONT:text='Squeeze the arena. Throw them off your desk.':fontcolor=0xe7edf4:fontsize=66:x=152:y=652:alpha='min(1,max(0,(t-0.35)/0.25))'"
EC+=",drawtext=fontfile=$FONT:text='PLAY FREE IN THE QUEST BROWSER':fontcolor=0xffc58a:fontsize=46:x=152:y=760:alpha='min(1,max(0,(t-0.7)/0.25))'"
AGAIN=0 POST="fade=t=out:st=$(python3 -c "print($ENDD - 1.0)"):d=1.0" PRE="crop=iw*0.42:ih*0.42:iw*0.3:ih*0.3" seg 50-end "$T/brawl2.mp4" ${CARD_AT:-32.0} $ENDD "$EC"

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
printf "file '%s.wav'\n" "${segs[@]/#/$TMP/}" > "$TMP/alist.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/alist.txt" -c copy "$TMP/game.wav"
python3 scripts/capture/music.py "$TMP/music.wav" "$NOW" "${MUSIC[@]}"
GAPX=$(python3 -c "import sys; print('1-0.8*min(1,' + '+'.join(f'between(t,{float(a)-0.3:.3f},{float(a):.3f})' for a in sys.argv[1:]) + ')')" "${GAPS[@]}")
echo "video $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/joined.mp4") game $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/game.wav") cut $NOW"
# The game compressed and held low (its spin hum stays under the music, its hits still read), its lows
# cut for the kick; the music up front; then about -14 LUFS, peaks under -1.5 dBTP.
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -i "$TMP/game.wav" -i "$TMP/music.wav" -filter_complex \
  "[1:a]highpass=f=150,equalizer=f=110:t=q:w=1:g=-3,acompressor=threshold=0.1:ratio=4:attack=5:release=120,volume=${GAME_GAIN:-0.45},volume='$GAPX':eval=frame[g];[2:a]volume=${MUSIC_GAIN:-1.0},highpass=f=35[md];[g][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.8:LRA=11,alimiter=limit=0.72:level=false[a]" \
  -map 0:v -map "[a]" -t "$NOW" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
t=0; for s in "${segs[@]}"; do printf "%6.2f %s\n" "$t" "$s"; t=$(python3 -c "print($t + $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/$s.mp4"))"); done
# Freeze check: any held picture over 0.3 s before the end card.
ffmpeg -nostdin -i "$FINAL" -t "$(python3 -c "print($NOW - $ENDD)")" -vf "freezedetect=n=0.002:d=0.3" -map 0:v -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | paste - - || echo "no freezes over 0.3 s"
