#!/usr/bin/env python3
"""Lays the voice-over (docs/VIDEO-SCRIPT.md, read as one take) onto a rendered reel.

  python3 scripts/capture/vo-mix.py reel.mp4 voice.mp3 out.mp4

The take is split at its pauses (silencedetect); each phrase is placed on its shot (CUES: phrase
number -> reel time) and never before the previous phrase ends. The reel's own mix (music + game)
ducks under the voice; then about -14 LUFS like the reel.
"""
import re
import subprocess
import sys

reel, voice, out = sys.argv[1:4]

# Phrase numbers follow the script, as the take splits it (43 phrases). Times are v11 moments (v10c plus a
# 2 s journey beat at 12.5 and a 2 s DESK KO before the end card) read off
# 4 fps sheets: each verb lands as the hand does it, just before the game's banner (not on the cut).
CUES = {2: 0.15, 3: 1.0, 4: 2.55, 5: 4.3, 9: 6.7, 10: 8.5, 11: 10.45, 12: 14.4, 13: 16.3, 14: 18.4,
        15: 20.0, 16: 22.0, 17: 24.0, 18: 25.3, 19: 27.9, 20: 29.6, 21: 31.0, 22: 32.0, 23: 34.8,
        24: 35.8, 25: 37.4, 26: 39.7, 27: 42.0, 29: 44.2, 30: 46.8, 31: 49.5, 32: 51.4, 33: 54.3,
        34: 56.3, 35: 59.9, 36: 62.5, 38: 63.9, 39: 66.15, 40: 67.9, 41: 70.6}
# Dropped to keep the voice on its pictures (the captions already say them): 1 "Grab the arena." (the
# open starts on "Squeeze..."), 8 "No controllers, just your hands.", 37 "Four-top brawls.".
# 39 "Catch the final boss at the rim" stays: without it the "stamp." after it stands alone.
DROP = {1, 8, 37}
# The cold open is 6.5 s of picture: its phrases run 1.15x with tight gaps.
TEMPO = {i: 1.15 for i in range(2, 8)}
GAP = 0.12

log = subprocess.run(["ffmpeg", "-nostdin", "-i", voice, "-af", "silencedetect=n=-35dB:d=0.18", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([0-9.]+)", log)]
ends = [float(x) for x in re.findall(r"silence_end: ([0-9.]+)", log)]
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", voice],
                           capture_output=True, text=True).stdout)
edges = [0.0] + ends
phrases = [(a, b) for a, b in zip(edges, starts + [dur]) if b - a > 0.05]
assert len(phrases) == 43, f"expected 43 phrases, found {len(phrases)}: re-check CUES against the take"

placed, t = [], 0.0
for i, (a, b) in enumerate(phrases, 1):
    if i in DROP:
        continue
    t = max(CUES.get(i, 0.0), t)
    k = TEMPO.get(i, 1.0)
    placed.append((i, a - 0.03, b + 0.06, t, k))
    t += (b - a) / k + (0.05 if i in TEMPO else GAP)
for i, a, b, at, k in placed:
    print(f"{i:2d} {at:6.2f}-{at + (b - a) / k:6.2f}  (take {a:.2f}-{b:.2f}, {k}x)")

parts, labels = [], []
for n, (i, a, b, at, k) in enumerate(placed):
    d = (b - max(0, a)) / k
    parts.append(f"[1:a]atrim={max(0, a):.3f}:{b:.3f},asetpts=PTS-STARTPTS,atempo={k},afade=t=in:d=0.02,"
                 f"afade=t=out:st={d - 0.04:.3f}:d=0.04,adelay={int(at * 1000)}:all=1[p{n}]")
    labels.append(f"[p{n}]")
graph = ";".join(parts) + ";" + "".join(labels) + f"amix=inputs={len(labels)}:normalize=0,"
graph += ("highpass=f=90,acompressor=threshold=0.08:ratio=3:attack=5:release=80,equalizer=f=3000:t=q:w=1:g=2,"
          "volume=1.6,asplit[v][key];"
          "[0:a][key]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[bed];"
          "[bed][v]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.8:LRA=11,alimiter=limit=0.72:level=false[a]")
subprocess.run(["ffmpeg", "-nostdin", "-y", "-loglevel", "error", "-i", reel, "-i", voice, "-filter_complex", graph,
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-ar", "48000",
                "-movflags", "+faststart", out], check=True)
print(out)
