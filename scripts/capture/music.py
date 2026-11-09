#!/usr/bin/env python3
"""Synthesizes the reel's music bed (no samples, no third-party audio): 120 BPM, A minor.

  python3 scripts/capture/music.py out.wav LENGTH [t:level ...] [hit:t ...]

level 0 kick pulse, 1 + hats, 2 + snare and bass, 3 + arpeggio, b = break (pad only),
x = stop (silence). hit:t drops a crash and a low hit at t seconds (a cut on the beat).
"""
import sys
import wave

import numpy as np

SR = 48000
BEAT = 0.5  # 120 BPM
CHORDS = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (261.63, 329.63, 392.0), (196.0, 246.94, 293.66)]  # Am F C G
ROOTS = [55.0, 43.65, 65.41, 49.0]


def env(n, decay):
    return np.exp(-np.arange(n) / SR / decay)


def kick():
    t = np.arange(int(0.35 * SR)) / SR
    f = 45 + 75 * np.exp(-t / 0.04)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.12)


rng = np.random.default_rng(7)


def noise(dur, decay, high=True):
    n = rng.standard_normal(int(dur * SR))
    if high:
        n = np.diff(n, prepend=0)
    return n * env(len(n), decay)


def tone(freq, dur, harmonics=(1,), decay=None):
    t = np.arange(int(dur * SR)) / SR
    s = sum(np.sin(2 * np.pi * freq * h * t) / h for h in harmonics)
    return s * (env(len(t), decay) if decay else 1)


def add(buf, at, sig, gain):
    i = int(at * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += gain * sig


def main():
    out, length = sys.argv[1], float(sys.argv[2])
    sections, hits = [], []
    for a in sys.argv[3:]:
        if a.startswith("hit:"):
            hits.append(float(a[4:]))
        else:
            t, lv = a.split(":")
            sections.append((float(t), lv))
    sections.sort()

    def level(t):
        lv = "0"
        for s, v in sections:
            if t >= s:
                lv = v
        return lv

    buf = np.zeros(int(length * SR) + SR)
    k = kick()
    for i in range(int(length / BEAT * 4) + 1):  # 16th-note steps
        t = i * BEAT / 4
        bar = int(t / (4 * BEAT)) % 4
        lv = level(t)
        step = i % 16
        if lv == "x":
            continue
        if lv == "b":
            if step == 0:
                for f in CHORDS[bar]:
                    pad = tone(f / 2, 4 * BEAT, (1, 2), 1.2)
                    pad *= np.minimum(1, np.arange(len(pad)) / (0.3 * SR))
                    add(buf, t, pad, 0.10)
            continue
        n = int(lv)
        if step % 4 == 0:
            add(buf, t, k, 0.9)
        if n >= 1 and step % 4 == 2:
            add(buf, t, noise(0.06, 0.02), 0.10)
        if n >= 2 and step in (4, 12):
            add(buf, t, noise(0.2, 0.07, False) + tone(185, 0.2, (1,), 0.05), 0.28)
        if n >= 2 and step % 2 == 0:
            add(buf, t, tone(ROOTS[bar] * (2 if step % 4 == 2 else 1), BEAT / 2, (1, 2, 3, 4), 0.12), 0.30)
        if n >= 3:
            f = CHORDS[bar][(i // 1) % 3] * (2 if step % 8 >= 4 else 1)
            add(buf, t, tone(f, BEAT / 4, (1, 3, 5), 0.05), 0.07)
    for t in hits:
        add(buf, t, noise(1.6, 0.5), 0.35)
        add(buf, t, kick(), 1.2)
        for f in CHORDS[0]:
            add(buf, t, tone(f / 4, 1.6, (1, 2), 0.6), 0.12)
    buf = buf[: int(length * SR)]
    buf *= 10 ** (-1 / 20) / max(1e-9, np.abs(buf).max())
    pcm = (np.repeat(buf[:, None], 2, axis=1) * 32767).astype("<i2")
    with wave.open(out, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


if __name__ == "__main__":
    main()
