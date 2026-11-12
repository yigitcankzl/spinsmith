#!/usr/bin/env bash
# Cuts the competition reel v8 (IWER emulator footage, labelled on every frame): v7 made punchier
# after a trailer, sound, judging and benchmark review (2026-11-12). A 5 s cold open of impacts
# (squeeze, the throw at half speed, DESK KO with a flash and a punch-in, Anvil Strike, Shatter, a
# side-on desk KO); how it works (a palm on the detected table places the arena, the rip launch, a
# first match, the two-hand squeeze); THE BASICS and the 16 moves, counted; forge, build, arenas,
# brawl, the boss arc; a money montage; the end card. Every segment is a multiple of 0.5 s, so every
# cut lands on the music's beat (120 BPM), and the music (scripts/capture/music.py) rises, drops
# and stops on the story's beats.
#
#   scripts/reel-v8.sh [reel-dir] [out-file]
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v8-1080p60.mp4}
S=$R/shots; M=$R/shots/more; T=$R/takes
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
# The one text slot: an orange line bottom left from TA to TB s into the segment (default the whole
# segment). Story beats and group headers use it; a move name uses it in white (move).
title() {
  echo "drawtext=fontfile=$FONT:text='$1':fontcolor=${TC:-0xffa24a}:fontsize=76:x=48:y=h-200:box=1:boxcolor=0x111419@0.8:boxborderw=16:enable='between(t,${TA:-0},${TB:-99})'"
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
  python3 -c "import sys; sys.exit(0 if $sp < 1 else 1)" && { pre="mpdecimate=hi=200:lo=100:frac=0.5,"; post="framerate=fps=$FPS${SCENE:+:scene=$SCENE}"; }
  ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$src" </dev/null | grep -q . || { a=1; af=anull; }
  # Takes recorded before the game's spin-grind fix (2026-11-10) carry its broadband hiss: soften it.
  [ "$a" = 0 ] && [ "$(stat -c %Y "$src")" -lt "${AUDIO_FIX_EPOCH:-1794268800}" ] && af="$af,afftdn=nf=-28,lowpass=f=7500"
  ffmpeg -nostdin -y -loglevel error -ss "$start" -t "$(python3 -c "print($dur * $sp + 0.1)")" -i "$src" -f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -filter_complex \
    "[0:v]${pre}setpts=(PTS-STARTPTS)/$sp,${PRE:+$PRE,}scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,$post,$LOOK${vf:+,$vf},$(tag "$sp")[v];[$a:a]$af,volume=${AGAIN:-1}${AEVAL:+:eval=frame},apad[a]" \
    -map "[v]" -an -t "$dur" "${enc[@]}" "$TMP/$name.mp4" -map "[a]" -t "$dur" "${wav[@]}" "$TMP/$name.wav"
  segs+=("$name"); NOW=$(python3 -c "print(round($NOW + $dur, 3))")
}
logo() { echo "null[m];movie=$LOGO,scale=$1:$1[lg];[m][lg]overlay=$2:$3${4:+:enable='$4'}"; }

C85="crop=iw*0.85:ih*0.85:iw*0.075:ih*0.075"
C9="crop=iw*0.9:ih*0.9:iw*0.05:ih*0.05"
C75="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.15"
SHARP="unsharp=5:5:0.5"

# COLD OPEN (0-5): the pitch in impacts. Game sound alone under the squeeze, a riser into the KO.
HOOKC="crop=iw*0.8:ih*0.8:iw*0.14:ih*0.06"
PLATFORM="drawtext=fontfile=$FONT:text='BUILT FOR META QUEST 3  /  HANDS ONLY':fontcolor=white:fontsize=40:x=48:y=40:box=1:boxcolor=0x111419@0.75:boxborderw=10"
BRAND="$(logo 120 48 40),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=100:x=186:y=44:box=1:boxcolor=0x111419@0.78:boxborderw=14"
MUSIC+=("0:x" "rise:1.0-2.5" "hit:2.5" "2.5:3")
PRE=$HOOKC seg 00a-squeeze "$S/hook-ko-close.mp4" ${HOOK_AT:-1.5} 1.0 "$PLATFORM,$(title 'SQUEEZE THE ARENA.')"
PRE=$HOOKC SPEED=0.5 AGAIN=2 seg 00b-throw "$S/hook-ko-close.mp4" ${THROW_AT:-3.1} 1.5 "$PLATFORM,$(title 'THROW THEM OFF YOUR DESK.')"
PRE=$HOOKC seg 00c-ko "$S/hook-ko-close.mp4" ${KO_AT:-3.9} 0.5 "$PUNCH,$FLASH,$BRAND"
seg 00d-side "$S/desk-ko-first-side.mp4" 3.25 1.0 "$FLASH,$BRAND"
PRE=$C9 seg 00e-anvil "$T/boss.mp4" 16.8 0.5 "$PUNCH,$FLASH,$BRAND"

# ACT 1. How it works: the detected table, the rip, a first match, the two-hand squeeze.
MUSIC+=("$(at 0):1")
# The press take without the game's 0.3 s hitch as the arena forms.
PRESS_KEEP="${PRESS_KEEP:-3.8-4.87 5.19-6.65}"
sel=$(for r in $PRESS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/press-place.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/press-active.mp4"
PRE="crop=iw*0.7:ih*0.7:iw*0.15:ih*0.18" AGAIN=1.5 seg 01a-press "$TMP/press-active.mp4" 0 2.5 "$(title 'FINDS YOUR REAL TABLE')"
AGAIN=0.7 seg 01b-rip "$S/rip-launch.mp4" ${RIP_AT:-1.0} 3.0 "$(title 'PINCH. PULL. RIP.')"
MUSIC+=("$(at 0):2")
AGAIN=1.5 PRE=$C9 seg 01c-pit "$T/first.mp4" ${UP_AT:-16.6} 3.0 "$(title 'YOUR FIRST MATCH')"
MUSIC+=("$(at 3.2):x" "hit:$(at 3.5)" "$(at 3.5):2"); GAPS+=("$(at 3.5)")
seg 01d-squeeze "$T/first.mp4" ${HINT_AT:-30.5} 4.0 "$(TB=3.3 title 'BOTH HANDS, TRACKED. SQUEEZE.')"

# ACT 2. The basics, then the 16 moves, each full frame and counted; the five ultimates are one
# gesture (stamp a seal) with five results, so they run as one group.
# clip in dur speed crop header name  (header "-" for none; crop n = C9, w = the hand camera C75)
moves() {
  local i=0 k=0
  while read -r f s d sp c head n; do
    k=$((k + 1)); local crop=$C9 sharp="" text="" num=""
    [ "$c" = w ] && { crop=$C75; sharp="$SHARP,"; }
    [ "${COUNT:-1}" = 1 ] && { i=$((i + 1)); num="   $i/16"; }
    n=${n//_/ }; head=${head//_/ }
    if [ "$head" = - ]; then text="$(move "$n$num")"
    else text="$(TB=${HTB:-0.8} title "$head"),$(TA=${HTB:-0.8} move "$n$num")"; fi
    SPEED=$sp PRE=$crop seg "$1-$(printf %02d $k)" "$M/$f.mp4" "$s" "$d" "$sharp$text"
  done
}
MUSIC+=("$(at 0):2")
# The basics are not among the 16 (they need no unlock): named, not counted. They live in shots/.
M=$S COUNT=0 moves 11-basic <<EOF
flick2 ${FLICK_AT:-0.5} 1.5 1 w THE_BASICS FLICK
close-crossguard2 ${GUARD_AT:-0.2} 2.0 0.5 n - CROSSGUARD
close-rub2 ${RUB_AT:-0.4} 1.5 1 w - SPIN_RUB
EOF
MUSIC+=("whoosh:$(at 0)" "$(at 0):3" "rise:$(at 16.0)-$(at 17.75)" "$(at 17.75):x" "hit:$(at 18.0)" "$(at 18.0):3"); GAPS+=("$(at 18.0)")
moves 12-move <<EOF
forge-twist ${TWIST_AT:-1.4} 2.0 1 n 16_MOVES,_NO_CONTROLLERS TWIST
forge-stretch ${STRETCH_AT:-2.1} 1.5 1 n - STRETCH
wheel ${WHEEL_AT:-1.6} 1.5 1 n - FORGE_WHEEL
ramp ${RAMP_AT:-0.6} 1.5 1 n - RAMP
rim-spring ${SPRING_AT:-1.2} 1.5 1 n - RIM_SPRING
gust ${GUST_AT:-1.0} 1.5 1 n - FORGE_GUST
outer-ring ${OUTER_AT:-0.8} 2.0 1 n - PALM_CATCH
groove3 ${GROOVE_AT:-2.8} 2.0 1 n - FINGER_GROOVE
cup-sling ${CUP_AT:-0.2} 1.5 1 n - CUP_AND_SLING
ember ${EMBER_AT:-3.7} 1.5 1 n - EMBER_RIVET
slap2 ${SLAP_AT:-3.8} 1.5 1 w - SLAP_=_ANVIL_STRIKE
seal-rush2 ${RUSH_AT:-3.9} 2.0 1 w ONE_STAMP,_FIVE_ULTIMATES RUSH
seal-magnet2 ${MAGNET_AT:-4.5} 1.0 1 w - MAGNET
seal-tilt2 ${TILT_AT:-4.5} 1.0 1 w - TILT
seal-hammer2 ${HAMMER_AT:-1.8} 1.0 1 w - HAMMER
seal-ward2 ${WARD_AT:-4.5} 1.0 1 w - WARD
EOF

# ACT 3. Make it yours, then everyone else: forge, build, arenas, a brawl, the bosses.
MUSIC+=("whoosh:$(at 0)" "$(at 0):2")
FORGE_KEEP="${FORGE_KEEP:-3.9-5.45 7.3-9.95}"
sel=$(for r in $FORGE_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/forge3.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/forge-active.mp4"
AGAIN=3 seg 21-forge "$TMP/forge-active.mp4" 0 4.0 "$(title 'FORGE YOUR TOP')"
WS_KEEP="${WS_KEEP:-34.05-36.4 41.0-43.3 44.45-46.85 47.97-50.33}"
sel=$(for r in $WS_KEEP; do printf "between(t,%s,%s)+" "${r%-*}" "${r#*-}"; done); sel=${sel%+}
ffmpeg -nostdin -y -loglevel error -i "$S/workshop2.mp4" -vf "select='$sel',setpts=N/FRAME_RATE/TB" -af "aselect='$sel',asetpts=N/SR/TB" -c:v libx264 -crf 12 -preset fast -c:a aac -b:a 256k "$TMP/ws-active.mp4"
SPEED=2 AGAIN=3 PRE="crop=iw*0.84:ih*0.78:iw*0.08:ih*0.03" seg 22-workshop "$TMP/ws-active.mp4" 0 4.0 "$(title 'BUILD YOUR ARENA')"
AR="$(title '20 ARENAS')"
AGAIN=2 seg 23-ar12 "$S/arenas/12.mp4" 1.65 1.0 "$AR"
AGAIN=2 PRE="crop=iw*0.7:ih*0.7:iw*0.15:ih*0.2" seg 24-ar03 "$S/arenas/03.mp4" 0.5 1.0 "$AR"
PRE=$C85 seg 25-ar10 "$S/arenas/10.mp4" 0.5 1.0 "$AR"
MUSIC+=("$(at 0):3")
AGAIN=0.7 PRE=$C9 seg 26-brawl "$T/brawl2.mp4" ${BRAWL_AT:-27.25} 4.0 "$(title 'FOUR-TOP BRAWLS')"
MUSIC+=("$(at 0):b" "rise:$(at 0.5)-$(at 1.25)" "$(at 1.25):x" "hit:$(at 1.5)" "$(at 1.5):3"); GAPS+=("$(at 1.5)")
seg 31-boss1 "$T/boss-ironkeep.mp4" ${IRON_AT:-89.5} 4.5 "$(title 'BOSSES CAST YOUR MOVES')"
MUSIC+=("$(at 0):x")
AGAIN=0.4 seg 32-lost "$T/boss-ironkeep.mp4" ${LOST_AT:-116.3} 2.5 "$(TA=1.2 title 'IRON KEEP WINS. FORGE ON.')"
MUSIC+=("$(at 0):b" "rise:$(at 1.0)-$(at 3.0)" "hit:$(at 3.0)" "$(at 3.0):3")
seg 33-bastion "$T/boss-bastion1.mp4" ${BASTION_AT:-88.0} 5.5 "$(TB=2.8 title 'THE FINAL BOSS')"
# The finishing blow in silence, the win drops in on SLAG! (0.3 s into the blow), LEVEL 9, THE CROWN IS YOURS.
MUSIC+=("$(at 0):x")
seg 34-finish "$T/boss-bastion1.mp4" ${FINISH_AT:-117.6} 1.0
MUSIC+=("hit:$(at 0.3)" "$(at 0.5):3")
AGAIN=0.4 seg 35-blow "$T/boss-bastion1.mp4" 118.6 1.0
AGAIN=0.5 seg 36-crown "$T/boss-bastion1.mp4" ${CROWN_AT:-120.8} 3.0 "$(TB=1.5 title 'THE FINAL BOSS FALLS')"
# Money montage: the biggest hits from the long takes, all by hand (none used elsewhere).
MUSIC+=("hit:$(at 0)")
MT="$(title 'HANDS ONLY. NO CONTROLLERS.')"
PRE="crop=iw*0.75:ih*0.75:iw*0.125:ih*0.1" seg 41-m1 "$T/boss-bastion1.mp4" 98.45 1.0 "$PUNCH,$FLASH,$MT"
AGAIN=0.7 PRE=$C9 seg 42-m2 "$T/boss.mp4" 56.0 0.5 "$FLASH,$MT"
PRE="crop=iw*0.85:ih*0.85:iw*0.075:0" seg 43-m3 "$T/boss-bastion3.mp4" 110.85 1.0 "$FLASH,$MT"
seg 45-m5 "$S/hero-ko.mp4" 4.3 0.5 "$FLASH,$MT"
# The end card over the crown take, blurred; the sting on its first frame.
MUSIC+=("$(at -0.25):x" "sting:$(at 0)"); GAPS+=("$NOW")
ENDD=${END_DUR:-4.0}
AGAIN=0 seg 50-end "$T/boss-bastion1.mp4" ${CARD_AT:-123.7} $ENDD "split[sa][sb];[sb]gblur=sigma=24,eq=brightness=-0.55:saturation=0.6,format=yuva420p[sbb];[sa][sbb]overlay,format=yuv420p,$(logo 180 '(W-w)/2' 210),drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=410,drawtext=fontfile=$FONT:text='Squeeze the arena. Throw them off your desk.':fontcolor=0xe7edf4:fontsize=60:x=(w-text_w)/2:y=570,drawtext=fontfile=$FONT:text='Play it in the Quest Browser  /  Meta Quest 3 and 3S  /  hands only':fontcolor=0xe7edf4:fontsize=50:x=(w-text_w)/2:y=680,drawtext=fontfile=$FONT:text='Link on the Devpost page':fontcolor=0xffa24a:fontsize=50:x=(w-text_w)/2:y=760,fade=t=out:st=$(python3 -c "print($ENDD - 0.4)"):d=0.4"

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
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
t=0; for s in "${segs[@]}"; do printf "%6.2f %s\n" "$t" "$s"; t=$(python3 -c "print($t + $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$TMP/$s.mp4"))"); done
# Freeze check: any held picture over 0.3 s before the end card.
ffmpeg -nostdin -i "$FINAL" -t "$(python3 -c "print($NOW - $ENDD)")" -vf "freezedetect=n=0.002:d=0.3" -map 0:v -f null - 2>&1 | grep -o "freeze_start: [0-9.]*\|freeze_duration: [0-9.]*" | paste - - || echo "no freezes over 0.3 s"
