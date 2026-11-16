#!/usr/bin/env python3
"""Synthesizes the reel's music bed (no samples, no third-party audio): 120 BPM, A minor.

  python3 scripts/capture/music.py out.wav LENGTH [t:level ...] [hit:t ...] [rise:a-b ...] [whoosh:t ...] [sting:t ...]

level 0 kick pulse, 1 + ticks, 2 + snare, saw bass, hats and kick pumping, 3 + arpeggio and chord
stabs, b = break (pad only, from where it starts), x = stop (silence). hit:t drops a boom, a chord
and a crash at t (grid kicks near it are skipped, so it never flams); rise:a-b swells from a and cuts
dead at b; whoosh:t is a reverse swell ending on t; sting:t is the final kick, crash and held chord.
The bus is soft-clipped (tanh) for density.
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


def dark(sig, k=0.08):
    """A one-pole lowpass: noise without the hiss (the game already has every high detail)."""
    out = np.empty_like(sig)
    v = 0.0
    for i, x in enumerate(sig):
        v += k * (x - v)
        out[i] = v
    return out / (np.abs(out).max() or 1)


def tone(freq, dur, harmonics=(1,), decay=None):
    t = np.arange(int(dur * SR)) / SR
    s = sum(np.sin(2 * np.pi * freq * h * t) / h for h in harmonics)
    return s * (env(len(t), decay) if decay else 1)


def hat(open_=False):
    n = np.diff(rng.standard_normal(int((0.25 if open_ else 0.06) * SR)), prepend=0)
    return n / 4 * env(len(n), 0.08 if open_ else 0.015)


def saw(freq, dur, decay=None, n=12):
    return tone(freq, dur, tuple(range(1, n + 1)), decay)


def riser(dur):
    """Noise swell plus a rising saw: ends at full level, cut dead on the drop."""
    t = np.arange(int(dur * SR)) / SR
    ramp = (t / dur) ** 2
    f = 110 * 2 ** (2 * t / dur)  # two octaves up
    up = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return ramp * (0.6 * np.diff(rng.standard_normal(len(t)), prepend=0) / 2 + 0.4 * up)


def whoosh(dur=0.6):
    """Reverse-swell noise peaking at its end (place it ending on the cut)."""
    n = np.diff(rng.standard_normal(int(dur * SR)), prepend=0) / 2
    e = np.linspace(0, 1, len(n)) ** 3
    return n * e


def crash(dur=2.0):
    return np.diff(rng.standard_normal(int(dur * SR)), prepend=0) / 2 * env(int(dur * SR), 0.5)


def add(buf, at, sig, gain):
    i = int(at * SR)
    if i >= len(buf):
        return
    sig = sig[: len(buf) - i]
    buf[i : i + len(sig)] += gain * sig


def main():
    out, length = sys.argv[1], float(sys.argv[2])
    sections, hits, rises, whooshes, stings = [], [], [], [], []
    for a in sys.argv[3:]:
        if a.startswith("hit:"):
            hits.append(float(a[4:]))
        elif a.startswith("rise:"):
            rises.append(tuple(map(float, a[5:].split("-"))))
        elif a.startswith("whoosh:"):
            whooshes.append(float(a[7:]))
        elif a.startswith("sting:"):
            stings.append(float(a[6:]))
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

    buf = np.zeros(int(length * SR) + SR)  # drums + fx
    mus = np.zeros_like(buf)  # bass, arp, pad: pumped by the kick
    pump = np.ones_like(buf)
    dip = 1 - 0.7 * env(int(BEAT * SR), 0.09)
    k = kick()
    prev = None
    for i in range(int(length / BEAT * 4) + 1):  # 16th-note steps
        t = i * BEAT / 4
        bar = int(t / (4 * BEAT)) % 4
        lv = level(t)
        step = i % 16
        entered, prev = lv != prev, lv
        if lv == "x":
            continue
        if lv == "b":
            if step == 0 or entered:  # the pad starts where the break starts, not on the next bar
                for f in CHORDS[bar]:
                    pad = tone(f / 2, 4 * BEAT, (1, 2), 1.2)
                    pad *= np.minimum(1, np.arange(len(pad)) / (0.3 * SR))
                    add(buf, t, pad, 0.10)
            continue
        n = int(lv)
        if step % 4 == 0 and not any(abs(t - h) < BEAT * 0.9 for h in hits):
            add(buf, t, k, 0.9)
            if n >= 2:
                i0 = int(t * SR); pump[i0:i0 + len(dip)] = np.minimum(pump[i0:i0 + len(dip)], dip[: len(pump) - i0])
        if n >= 2 and step % 2 == 1:
            add(buf, t, hat(step % 4 == 2 and n >= 3), 0.10)
        if n >= 1 and step % 4 == 2:
            add(buf, t, tone(1760, 0.05, (1,), 0.012), 0.035)  # a soft tick, not a noise hat
        if n >= 2 and step in (4, 12):
            add(buf, t, 0.5 * dark(noise(0.2, 0.05, False)) + tone(185, 0.2, (1, 2), 0.06), 0.24)
        if n >= 2 and step % 2 == 0:
            add(mus, t, saw(ROOTS[bar] * (2 if step % 4 == 2 else 1), BEAT / 2, 0.12, 16), 0.26)
        if n >= 3:
            f = CHORDS[bar][(i // 1) % 3] * (2 if step % 8 >= 4 else 1)
            add(mus, t, saw(f, BEAT / 4, 0.06, 10), 0.08)
            if step % 8 == 0:
                for cf in CHORDS[bar]:
                    add(mus, t, saw(cf, BEAT * 1.5, 0.35, 10), 0.05)  # off-grid-free chord stab
    for t in hits:
        add(buf, t, kick(), 1.2)
        add(buf, t, tone(41.2, 1.2, (1, 2), 0.35), 0.35)  # a low boom instead of a noise crash
        for f in CHORDS[0]:
            add(buf, t, tone(f / 4, 1.6, (1, 2), 0.6), 0.12)
    for a, b in rises:
        add(buf, a, riser(b - a), 0.35)
    for t in whooshes:
        add(buf, t - 0.6, whoosh(0.6), 0.35)
    for t in hits:
        add(buf, t, crash(2.0), 0.35)
    for t in stings:
        # A warm resolving chord (few harmonics, slow decay), not a buzzy saw stab.
        add(buf, t, kick(), 1.2); add(buf, t, crash(3.5), 0.16)
        add(buf, t, tone(41.2, 3.0, (1, 2), 1.0), 0.35)
        for f in CHORDS[0] + (440.0,):
            add(mus, t, tone(f, 4.0, (1, 2, 3), 1.8), 0.2)
            add(mus, t, tone(f / 2, 4.0, (1, 2), 2.2), 0.12)
    buf = buf + mus * pump
    buf = np.tanh(1.8 * buf / np.abs(buf).max())  # glue: lifts density, rounds peaks
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
