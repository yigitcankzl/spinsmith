#!/usr/bin/env bash
# Cuts the competition reel (IWER emulator footage, labelled on every frame) from the shots and
# takes recorded on 2026-11-05: the DESK KO over a real desk corner first, the room proof, a new
# player, the guided first match, every hand move (close-ups, then labelled 2x2 grids), the
# ultimates, the three bosses, a four-top brawl, comfort, arenas, forge, the home board, an end card.
#
#   scripts/reel-v3.sh [reel-dir] [out-file]
# reel-dir holds shots/, shots/more/ and takes/ (see its README.txt). Source in-points are the
# variables below; review a take's contact sheet before changing them.
set -euo pipefail
cd "$(dirname "$0")/.."

R=${1:-$HOME/Desktop/spinsmith-videos/reel-2026-11-05}
FINAL=${2:-$R/spinsmith-reel-v3-1080p60.mp4}
S=$R/shots; M=$R/shots/more; T=$R/takes
W=1920; H=1080; FPS=60
FONT=$(realpath public/fonts/Rajdhani-Bold.woff2)
LABEL=${LABEL:-IWER EMULATOR  /  SYNTHETIC 3D ROOM AND TABLE  /  NOT HEADSET FOOTAGE}
LOOK="eq=contrast=1.08:saturation=1.12:brightness=0.03:gamma=1.12"
TAG="drawtext=fontfile=$FONT:text='$LABEL':fontcolor=white@0.8:fontsize=24:x=w-text_w-24:y=20:box=1:boxcolor=0x111419@0.55:boxborderw=7"

# In-points (seconds) in the takes; set from their contact sheets.
FIRST_AT=${FIRST_AT:-0.0};  FIRST_LEN=${FIRST_LEN:-10.5}
BOSS_AT=${BOSS_AT:-1.6};    BOSS_LEN=${BOSS_LEN:-14}
BOSS_KO_AT=${BOSS_KO_AT:-}; BOSS_KO_LEN=${BOSS_KO_LEN:-3.4}
BOSS2_AT=${BOSS2_AT:-};     BOSS2_LEN=${BOSS2_LEN:-5.6}
BOSS3_AT=${BOSS3_AT:-};     BOSS3_LEN=${BOSS3_LEN:-3.6}
BRAWL_AT=${BRAWL_AT:-0.8};  BRAWL_LEN=${BRAWL_LEN:-15}
HOOK_AT=${HOOK_AT:-2.0};    HOOK_LEN=${HOOK_LEN:-5.0}

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
segs=()
audio_in() { # the source's audio, or silence when it has none
  if ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$1" | grep -q .; then echo "$2:a"; else echo "silent"; fi
}
enc=(-c:v libx264 -crf 15 -preset medium -tune animation -pix_fmt yuv420p -c:a aac -b:a 256k -ar 48000 -ac 2)

# One shot: scaled to 1080p (PRE crops first), a title and subtitle for 2.6 s, the disclosure tag.
clip() {
  local name=$1 src=$2 start=$3 dur=$4 title=$5 sub=$6
  [ -s "$src" ] || { echo "skip $name (missing $src)" >&2; return 0; }
  local a; a=$(audio_in "$src" 0)
  local amap=(-map 0:a); [ "$a" = silent ] && amap=(-f lavfi -t "$dur" -i anullsrc=r=48000:cl=stereo -map 1:a)
  ffmpeg -y -loglevel error -ss "$start" -t "$dur" -i "$src" "${amap[@]:0:${#amap[@]}-2}" -filter_complex \
    "[0:v]${PRE:+$PRE,}scale=$W:$H:force_original_aspect_ratio=increase:flags=lanczos,crop=$W:$H,fps=$FPS,$LOOK,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=76:x=48:y=40:box=1:boxcolor=0x111419@0.78:boxborderw=16:enable='lt(t,2.6)',drawtext=fontfile=$FONT:text='$sub':fontcolor=white:fontsize=40:x=52:y=146:box=1:boxcolor=0x111419@0.66:boxborderw=10:enable='lt(t,2.6)',$TAG${EXTRA:+,$EXTRA}[v]" \
    -map "[v]" "${amap[@]: -2}" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name")
}

# Four shots at once, each with a big label; the title stays up the whole time. Audio: all four mixed.
grid() {
  local name=$1 title=$2 dur=$3; shift 3
  local inputs=() filters="" i=0 amix="" n=0
  while [ $# -ge 3 ]; do
    local src=$1 start=$2 label=$3; shift 3
    [ -s "$src" ] || { echo "skip $name (missing $src)" >&2; return 0; }
    inputs+=(-ss "$start" -t "$dur" -i "$src")
    filters+="[$i:v]scale=$((W/2)):$((H/2)):force_original_aspect_ratio=increase:flags=lanczos,crop=$((W/2)):$((H/2)),fps=$FPS,$LOOK,drawtext=fontfile=$FONT:text='$label':fontcolor=white:fontsize=50:x=24:y=h-text_h-26:box=1:boxcolor=0x111419@0.78:boxborderw=12[c$i];"
    if [ "$(audio_in "$src" $i)" != silent ]; then amix+="[$i:a]"; n=$((n + 1)); fi
    i=$((i + 1))
  done
  [ "$n" -gt 0 ] || { amix="[a0]"; filters+="anullsrc=r=48000:cl=stereo,atrim=0:$dur[a0];"; n=1; }
  ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex \
    "${filters}[c0][c1][c2][c3]xstack=inputs=4:layout=0_0|w0_0|0_h0|w0_h0,drawbox=x=iw/2-3:y=0:w=6:h=ih:color=0x111419:t=fill,drawbox=x=0:y=ih/2-3:w=iw:h=6:color=0x111419:t=fill,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=70:x=(w-text_w)/2:y=h/2-text_h/2:box=1:boxcolor=0x111419@0.85:boxborderw=16:enable='lt(t,1.6)',$TAG[v];${amix}amix=inputs=$n:normalize=0,volume=0.7[a]" \
    -map "[v]" -map "[a]" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name")
}

# Two moves side by side, each cropped to the bowl, its name big under it; the title stays up 1.4 s.
pair() {
  local name=$1 title=$2 dur=$3 a=$4 as=$5 al=$6 b=$7 bs=$8 bl=$9
  [ -s "$a" ] && [ -s "$b" ] || { echo "skip $name" >&2; return 0; }
  ffmpeg -y -loglevel error -ss "$as" -t "$dur" -i "$a" -ss "$bs" -t "$dur" -i "$b" -filter_complex \
    "[0:v]crop=iw*0.5:ih:iw*0.25:0,scale=$((W/2)):$H:flags=lanczos,fps=$FPS,$LOOK,drawtext=fontfile=$FONT:text='$al':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=h-text_h-60:box=1:boxcolor=0x111419@0.8:boxborderw=14[l];[1:v]crop=iw*0.5:ih:iw*0.25:0,scale=$((W/2)):$H:flags=lanczos,fps=$FPS,$LOOK,drawtext=fontfile=$FONT:text='$bl':fontcolor=white:fontsize=66:x=(w-text_w)/2:y=h-text_h-60:box=1:boxcolor=0x111419@0.8:boxborderw=14[r];[l][r]hstack,drawbox=x=iw/2-3:y=0:w=6:h=ih:color=0x111419:t=fill,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=70:x=48:y=40:box=1:boxcolor=0x111419@0.8:boxborderw=16:enable='lt(t,1.4)',$TAG[v];[0:a][1:a]amix=inputs=2:normalize=0,volume=0.75[au]" \
    -map "[v]" -map "[au]" -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name")
}

# Two shots side by side with a label under each (the room proof, Large text off/on).
split() {
  local name=$1 title=$2 dur=$3 a=$4 as=$5 al=$6 b=$7 bs=$8 bl=$9
  ffmpeg -y -loglevel error -ss "$as" -t "$dur" -i "$a" -ss "$bs" -t "$dur" -i "$b" -filter_complex \
    "[0:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$((W/2)):$H:${SPLIT_AX:-$W*0.36}:0,fps=$FPS,$LOOK[l];[1:v]scale=$W:$H:force_original_aspect_ratio=increase,crop=$((W/2)):$H:${SPLIT_BX:-$W*0.46}:0,fps=$FPS,$LOOK[r];[l][r]hstack,drawbox=x=iw/2-3:y=0:w=6:h=ih:color=0x111419:t=fill,drawtext=fontfile=$FONT:text='$title':fontcolor=0xffa24a:fontsize=76:x=48:y=40:box=1:boxcolor=0x111419@0.78:boxborderw=16:enable='lt(t,2.6)',drawtext=fontfile=$FONT:text='$al':fontcolor=white:fontsize=44:x=w/4-text_w/2:y=h-130:box=1:boxcolor=0x111419@0.8:boxborderw=12,drawtext=fontfile=$FONT:text='$bl':fontcolor=0xffa24a:fontsize=44:x=3*w/4-text_w/2:y=h-130:box=1:boxcolor=0x111419@0.8:boxborderw=12,$TAG[v]" \
    -map "[v]" -map 1:a? -t "$dur" "${enc[@]}" "$TMP/$name.mp4"
  segs+=("$name")
}

# 1. The hook: both hands squeeze the bowl and the rival goes off the real desk corner.
EXTRA="drawtext=fontfile=$FONT:text='EMULATOR FOOTAGE (IWER), NOT A HEADSET':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=h-110:box=1:boxcolor=0x111419@0.8:boxborderw=12:enable='lt(t,2.2)'" \
  clip 00-hook "$S/hook-ko.mp4" "$HOOK_AT" "$HOOK_LEN" "THE ARENA IS THE WEAPON" "Squeeze the bowl with both hands  /  throw the rival off your real desk  (first match, guided)"
# 2. The room proof: the same first-match squeeze without a table and on a detected table.
split 01-room "YOUR DESK IS THE RING-OUT" 4.4 "$S/tray-squeeze.mp4" "${TRAY_AT:-5.4}" "NO TABLE FOUND  -  A NORMAL RING-OUT" "$S/desk-ko-first-side.mp4" 0.7 "TABLE DETECTED  -  OFF THE DESK +1"
# 3. A new player from home, with a running clock.
EXTRA="drawtext=fontfile=$FONT:text='FROM HOME  %{eif\\:t\\:d\\:2}.%{eif\\:mod(t*10\\,10)\\:d} s':fontcolor=0xffa24a:fontsize=64:x=w-text_w-40:y=70:box=1:boxcolor=0x111419@0.74:boxborderw=14" \
  PRE="crop=iw*0.8:ih*0.8:iw*0.1:ih*0.05" clip 02-first "$T/first.mp4" "$FIRST_AT" "$FIRST_LEN" "A NEW PLAYER, UNCUT" "Carry the top in  /  the ghost hand shows the rip  /  first ramp"
# 5. Its last card: one new move every match.
PRE="crop=iw*0.55:ih*0.55:iw*0.225:ih*0.1" clip 04-won "$S/match-won-cards.mp4" "$(python3 -c "print(max(0, $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$S/match-won-cards.mp4") - ${WON_LEN:-2.8} - 0.2))")" "${WON_LEN:-2.8}" "ONE NEW MOVE EVERY MATCH" "The last card names the next move and the next rival"
# 6. The core moves up close.
clip 05-squeeze "$S/close-squeeze.mp4" 0.3 3.0 "TWO HANDS ON THE RIM" "Squeeze  /  stretch  /  tilt  /  twist the live bowl"
clip 06-flick "$S/flick.mp4" 0.2 2.7 "FLICK" "Your fingertip is part of the physics"
clip 07-guard "$S/close-crossguard.mp4" 0.0 2.6 "CROSSGUARD" "Two still palms make a rail that saves you"
clip 08-rub "$S/close-rub.mp4" 0.6 2.4 "SPIN RUB" "A fingertip along your rim spins it back up"
clip 09-strike "$S/seal-stamp.mp4" 0.8 3.6 "STAMP AN ULTIMATE" "Pinch the seal  /  press it into the bowl"
# 7. Every other move, two at a time, each from the moment it acts.
pair 10a "ONE HAND" "${PAIR_LEN:-2.6}" "$M/ramp.mp4" 0.5 "RAMP" "$M/rim-spring.mp4" 0.9 "RIM SPRING"
pair 10b "ONE HAND" "${PAIR_LEN:-2.6}" "$M/gust.mp4" 0.4 "FORGE GUST" "$M/cup-sling.mp4" 0.6 "CUP AND SLING"
pair 11a "FINGERTIPS" "${PAIR_LEN:-2.6}" "$M/groove.mp4" 0.6 "FINGER GROOVE" "$M/ember.mp4" "${EMBER_AT:-3.2}" "EMBER RIVET"
pair 11b "PALMS AND THE TABLE" "${PAIR_LEN:-2.6}" "$M/wheel.mp4" 0.4 "FORGE WHEEL" "$M/outer-ring.mp4" "${OUTER_AT:-3.4}" "OUTER RING CATCH"
pair 12a "BEND THE ARENA" "${PAIR_LEN:-2.6}" "$M/forge-twist.mp4" 0.5 "TWIST AND TILT" "$M/forge-stretch.mp4" 0.6 "STRETCH"
pair 12b "THE ULTIMATES" "${PAIR_LEN:-2.6}" "$M/slap.mp4" 1.0 "SLAP THE TABLE" "$M/seal-rush.mp4" "${ULT_AT:-1.3}" "RUSH"
pair 13a "THE ULTIMATES" "${PAIR_LEN:-2.6}" "$M/seal-magnet.mp4" "${ULT_AT:-1.3}" "MAGNET" "$M/seal-tilt.mp4" "${ULT_AT:-1.3}" "TILT"
[ -s "$M/seal-hammer.mp4" ] && pair 13b "THE ULTIMATES" 2.6 "$M/seal-hammer.mp4" "${ULT_AT:-1.3}" "HAMMER" "$M/seal-ward.mp4" "${WARD_AT:-1.5}" "WARD" || clip 13b "$M/seal-ward.mp4" "${WARD_AT:-1.5}" "${PAIR_LEN:-2.6}" "WARD" "A ring that turns the rival away"
# 8. The bosses cast your ultimates back.
[ -n "${BOSSI_AT:-}" ] && PRE="crop=iw*0.76:ih*0.76:iw*0.12:ih*0.0" clip 135-bossintro "$T/boss.mp4" "$BOSSI_AT" "${BOSSI_LEN:-2.8}" "THREE BOSSES" "Each one casts one of your ultimates back at you"
PRE="crop=iw*0.76:ih*0.76:iw*0.12:ih*0.0" clip 14-boss "$T/boss.mp4" "$BOSS_AT" "$BOSS_LEN" "IRON KEEP CASTS TILT" "A ghost palm warns you  /  answer with your own"
[ -n "$BOSS_KO_AT" ] && PRE="crop=iw*0.8:ih*0.8:iw*0.06:ih*0.05" clip 15-bossko "$T/boss.mp4" "$BOSS_KO_AT" "$BOSS_KO_LEN" "THROW THE BOSS OFF YOUR DESK" "Edge run  /  DESK KO"
[ -n "$BOSS2_AT" ] && PRE="crop=iw*0.76:ih*0.76:iw*0.12:ih*0.06" clip 16-boss2 "${BOSS2_SRC:-$T/boss.mp4}" "$BOSS2_AT" "$BOSS2_LEN" "SAWTOOTH CASTS HAMMER" "Each boss owns one seal"
[ -n "$BOSS3_AT" ] && PRE="crop=iw*0.76:ih*0.76:iw*0.12:ih*0.06" clip 17-boss3 "$T/boss.mp4" "$BOSS3_AT" "$BOSS3_LEN" "BASTION CASTS ANVIL STRIKE" "Three chapters, three bosses"
# 9. A four-top brawl on the opened-out arena.
PRE="crop=iw*0.8:ih*0.8:iw*0.1:0" clip 18-brawl "$T/brawl.mp4" "$BRAWL_AT" "$BRAWL_LEN" "FOUR-TOP BRAWLS" "The arena opens out  /  last top spinning takes the heat"
# 10. Comfort: Large text off / on in the same fight shot (one of eleven settings on the dial).
SPLIT_AX=$((W*27/100)) SPLIT_BX=$((W*17/100)) split 20-bigtext "COMFORT DIAL  -  LARGE TEXT" 3.0 "$S/flick.mp4" "${BIG_AT:-0.6}" "LARGE TEXT OFF" "$S/bigtext-fight.mp4" "${BIG_AT:-0.6}" "LARGE TEXT ON"
# 11. One fight, eight arenas: the arena turns into the next every 1.2 s under the same two tops
# (takes/cycle.mp4 from scripts/capture/arena-cycle.mjs); each arena named as it arrives.
if [ -s "$T/cycle.mp4" ] && [ -s "$T/cycle-log.json" ]; then
  CYCLE_AT=${CYCLE_AT:-$(jq '.log[0][0] + 0.1' "$T/cycle-log.json")}
  names=$(jq -r --argjson a "$CYCLE_AT" '.log as $l | [range(0; $l|length)] | map(($l[.][0] - $a) as $s | (if . + 1 < ($l|length) then $l[.+1][0] - $a else 99 end) as $e | "drawtext=fontfile=FONT:text=\u0027\($l[.][1] | ascii_upcase)\u0027:fontcolor=white:fontsize=60:x=(w-text_w)/2:y=h-150:box=1:boxcolor=0x111419@0.8:boxborderw=14:enable=\u0027between(t,\([$s,0]|max),\($e))\u0027") | join(",")' "$T/cycle-log.json")
  CYCLE_LEN=${CYCLE_LEN:-$(jq --argjson a "$CYCLE_AT" '.log[-1][0] - $a + 1.2' "$T/cycle-log.json")}
  EXTRA="${names//FONT/$FONT}" PRE="crop=iw*0.84:ih*0.84:iw*0.08:ih*0.04" clip 21-arenas "$T/cycle.mp4" "$CYCLE_AT" "$CYCLE_LEN" "TWENTY ARENAS" "One fight, eight of them  /  every one plays its own way"
else
  grid 21-arenas "TWENTY ARENAS" 3.6 "$S/arenas/05.mp4" 0.3 "TERRACES" "$S/arenas/06.mp4" 0.3 "CRATER" "$S/arenas/12.mp4" 0.3 "ICE" "$S/arenas/15.mp4" 0.3 "PITS"
fi
# 12. Forge and workshop.
clip 22-forge "$S/forge.mp4" "${FORGE_AT:-2.8}" "${FORGE_LEN:-8.5}" "FORGE IT BY HAND" "Drag a part onto your top  /  it fights differently  /  226 builds"
clip 23-workshop "$S/workshop.mp4" "${WORKSHOP_AT:-7.6}" "${WORKSHOP_LEN:-3.4}" "BUILD THE BATTLEGROUND" "Shape the floor  /  place pits and bumpers"
# 13. The home board: today's order and streak, then the Circuit Map (a demo save).
PRE="${BOARD_PRE:-crop=iw*0.4:ih*0.4:iw*0.3:ih*0.06}" clip 24-board "$M/hub-map.mp4" "${BOARD_AT:-1.4}" "${BOARD_LEN:-4.0}" "A REASON TO COME BACK" "Daily order  /  streak  /  Circuit Map  /  challenge code  (demo save)"
# 14. End card, the game's motif under it.
ffmpeg -y -loglevel error -ss 3.6 -t "${END_LEN:-5}" -i "$S/hook-ko.mp4" \
  -f lavfi -i "aevalsrc='0.25*(sin(2*PI*587*t)*exp(-4*t)+gte(t,0.15)*sin(2*PI*880*t)*exp(-4*(t-0.15))+gte(t,0.3)*sin(2*PI*698*t)*exp(-4*(t-0.3))+gte(t,0.45)*sin(2*PI*1175*t)*exp(-3*(t-0.45)))':s=48000:c=stereo:d=${END_LEN:-5}" \
  -map 0:v -map 1:a -vf "scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=$FPS,gblur=sigma=16,eq=brightness=-0.42:saturation=0.7,drawtext=fontfile=$FONT:text='SPINSMITH':fontcolor=0xff8a2a:fontsize=130:x=(w-text_w)/2:y=(h-text_h)/2-90,drawtext=fontfile=$FONT:text='The arena is the weapon. Your desk is the ring-out.':fontcolor=0xe7edf4:fontsize=54:x=(w-text_w)/2:y=h/2+40,drawtext=fontfile=$FONT:text='Hands only  /  seated  /  Meta Quest 3 and 3S  /  play it in the Quest Browser, link on the Devpost page':fontcolor=0xe7edf4@0.75:fontsize=34:x=(w-text_w)/2:y=h/2+125,$TAG" \
  -t "${END_LEN:-5}" "${enc[@]}" "$TMP/25-end.mp4"
segs+=(25-end)

printf "file '%s.mp4'\n" "${segs[@]/#/$TMP/}" > "$TMP/list.txt"
ffmpeg -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -c copy "$TMP/joined.mp4"
# Loudness for a video site: about -14 LUFS integrated, peaks under -1.5 dBTP.
ffmpeg -y -loglevel error -i "$TMP/joined.mp4" -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 256k -ar 48000 -movflags +faststart "$FINAL"
echo "$FINAL ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$FINAL") s)"
