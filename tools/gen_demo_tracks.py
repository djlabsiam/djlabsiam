"""Original, programmatically synthesised 16-bar demo loops (no samples, no third-party material)."""
import os
import numpy as np
from scipy.signal import butter, lfilter
import lameenc

SR = 44100
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'audio')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(24)


def lp(x, f, o=2):
    b, a = butter(o, f / (SR / 2), 'low'); return lfilter(b, a, x)


def hp(x, f, o=2):
    b, a = butter(o, f / (SR / 2), 'high'); return lfilter(b, a, x)


def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)


def kick(dur=0.38, f0=48, sweep=130, decay=9, drive=1.6):
    t = np.arange(int(SR * dur)) / SR
    f = f0 + sweep * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t * decay)
    y += 0.25 * np.exp(-t * 400) * rng.standard_normal(len(t))
    return np.tanh(y * drive)


def snare(dur=0.22):
    t = np.arange(int(SR * dur)) / SR
    n = bp(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 22)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 28) * 0.6
    return np.tanh((n * 1.2 + tone))


def clap(dur=0.25):
    t = np.arange(int(SR * dur)) / SR
    n = bp(rng.standard_normal(len(t)), 900, 6000)
    env = np.zeros_like(t)
    for k, off in enumerate((0, .011, .022)):
        m = t >= off
        env[m] += np.exp(-(t[m] - off) * 160) * 0.7
    env += np.exp(-t * 20) * 0.5
    return np.tanh(n * env * 1.6)


def hat(dur=0.06, d=90):
    t = np.arange(int(SR * dur)) / SR
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * d) * 0.6


def ohat():
    return hat(0.28, 14) * 0.9


def saw(freq, dur, det=0.0, voices=1):
    t = np.arange(int(SR * dur)) / SR
    y = np.zeros_like(t)
    for v in range(voices):
        fr = freq * (1 + det * (v - (voices - 1) / 2))
        ph = np.cumsum(np.full_like(t, fr) / SR)
        y += 2 * (ph % 1) - 1
    return y / voices


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def adsr(n, a=.005, r=.08, d=3.0):
    t = np.arange(n) / SR
    e = np.exp(-t * d)
    e[:max(1, int(a * SR))] *= np.linspace(0, 1, max(1, int(a * SR)))
    k = int(r * SR)
    if k < n:
        e[-k:] *= np.linspace(1, 0, k)
    return e


def render(bpm, bars, build):
    beat = 60.0 / bpm
    n = int(round(bars * 4 * beat * SR))
    mix = {k: np.zeros(n) for k in ('kick', 'perc', 'bass', 'mel')}

    def put(ch, x, at):
        i = int(round(at * SR))
        for off in (0, n):                      # wrap tails so the loop is seamless
            j = i - off
            if j >= n:
                continue
            if j + len(x) <= 0:
                continue
            a0 = max(j, 0); a1 = min(j + len(x), n)
            mix[ch][a0:a1] += x[a0 - j:a1 - j]
    kt = []
    build(put, beat, bars, kt)
    # sidechain from kick positions
    duck = np.ones(n)
    tt = np.arange(n) / SR
    for k in kt:
        d = tt - k
        m = d >= 0
        duck[m] = np.minimum(duck[m], 1 - 0.75 * np.exp(-d[m] / 0.13))
    y = mix['kick'] * 1.0 + mix['perc'] * 0.8 + (mix['bass'] * 0.9 + mix['mel'] * 0.55) * duck
    y = np.tanh(y * 1.15)
    y = y / np.max(np.abs(y)) * 0.89
    return y


def house(put, beat, bars, kt):
    K, C, H, O = kick(), clap(), hat(), ohat()
    roots = [57, 57, 53, 55]          # A  A  F  G
    chords = [[57, 60, 64, 67], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]]
    for bar in range(bars):
        b0 = bar * 4 * beat
        for q in range(4):
            if bar < 15 or q < 3:
                put('kick', K, b0 + q * beat); kt.append(b0 + q * beat)
            if bar >= 2:
                put('perc', O, b0 + q * beat + beat / 2)
            if bar >= 3:
                put('perc', H, b0 + q * beat + beat * .75); put('perc', H * .6, b0 + q * beat + beat * .25)
        if bar >= 1:
            for q in (1, 3):
                put('perc', C, b0 + q * beat)
        if bar >= 4:
            r = roots[(bar // 2) % 4] - 24
            for s in range(16):
                if s % 4 == 0:
                    continue
                at = b0 + s * beat / 4
                f = midi(r + (12 if s % 8 == 6 else 0))
                x = lp(saw(f, beat / 4 * 0.9, 0), 420) * adsr(int(beat / 4 * 0.9 * SR), d=7)
                put('bass', x * 1.4, at)
        if bar >= 8:
            ch = chords[(bar // 2) % 4]
            for at_q in (0.5, 1.5, 2.5, 3.5):
                for nn in ch:
                    x = lp(saw(midi(nn), beat * .35, .004, 3), 2400) * adsr(int(beat * .35 * SR), d=9)
                    put('mel', x * .5, b0 + at_q * beat)


def hiphop(put, beat, bars, kt):
    K = kick(.5, 42, 90, 6.5, 1.8); S = snare(); H = hat(); O = hat(.12, 40)
    for bar in range(bars):
        b0 = bar * 4 * beat
        for at in (0, 2.5, 3.75 if bar % 2 else 3.25):
            put('kick', K, b0 + at * beat); kt.append(b0 + at * beat)
        put('perc', S * 1.1, b0 + 1 * beat); put('perc', S * 1.1, b0 + 3 * beat)
        for e in range(8):
            sw = (beat / 2) * (0.18 if e % 2 else 0)
            put('perc', H * (0.9 if e % 2 == 0 else 0.5), b0 + e * beat / 2 + sw)
        if bar % 4 == 3:
            put('perc', O, b0 + 3.5 * beat)
        if bar >= 2:
            notes = [(0, 33, 1.5), (1.5, 33, .5), (2.5, 36, 1.0), (3.5, 31, .5)] if bar % 2 == 0 else [(0, 29, 1.5), (2, 31, 1.0), (3, 36, 1.0)]
            for at, nn, ln in notes:
                n_s = int(ln * beat * SR)
                x = np.sin(2 * np.pi * midi(nn) * np.arange(n_s) / SR) * adsr(n_s, .004, .06, 2.2)
                put('bass', np.tanh(x * 2.2) * .9, b0 + at * beat)
        if bar >= 4:
            ch = [[57, 60, 64, 71], [53, 57, 60, 67]][(bar // 2) % 2]
            for nn in ch:
                n_s = int(beat * 2 * SR)
                x = lp(saw(midi(nn), beat * 2, .003, 2), 1500) * adsr(n_s, .01, .2, 2.5)
                put('mel', x * .35, b0)


def techno(put, beat, bars, kt):
    K = kick(.34, 50, 150, 10, 2.0); H = hat(.05, 110); O = hat(.12, 30); C = clap()
    for bar in range(bars):
        b0 = bar * 4 * beat
        for q in range(4):
            put('kick', K, b0 + q * beat); kt.append(b0 + q * beat)
            put('perc', O, b0 + q * beat + beat / 2)
            if bar >= 2:
                put('perc', H * .7, b0 + q * beat + beat * .75)
        if bar >= 4:
            for q in (1, 3):
                put('perc', C * .7, b0 + q * beat)
        if bar >= 2:
            for s in range(16):
                if s % 4 != 0:
                    at = b0 + s * beat / 4
                    x = lp(saw(midi(33), beat / 4 * .85, 0), 190 + 90 * (bar % 4)) * adsr(int(beat / 4 * .85 * SR), d=9)
                    put('bass', x * 1.5, at)
        if bar >= 8:
            for at in (0.75, 1.75, 2.25, 3.5):
                for nn in (57, 60, 64) if bar % 4 < 2 else (55, 58, 62):
                    x = lp(saw(midi(nn), beat * .22, .006, 3), 3200) * adsr(int(beat * .22 * SR), d=14)
                    put('mel', x * .4, b0 + at * beat)


def dnb(put, beat, bars, kt):
    K = kick(.3, 52, 120, 11, 1.7); S = snare(); H = hat(.05, 110); G = hat(.04, 150)
    for bar in range(bars):
        b0 = bar * 4 * beat
        for at in ((0, 2.5) if bar % 2 == 0 else (0, 1.75, 2.5)):
            put('kick', K, b0 + at * beat); kt.append(b0 + at * beat)
        put('perc', S * 1.2, b0 + 1 * beat); put('perc', S * 1.2, b0 + 3 * beat)
        if bar % 4 == 3:
            put('perc', S * .8, b0 + 3.5 * beat); put('perc', S * .7, b0 + 3.75 * beat)
        for e in range(16):
            put('perc', (H if e % 2 == 0 else G) * .55, b0 + e * beat / 4)
        if bar >= 4:
            seq = [33, 33, 36, 31] if bar % 4 < 2 else [29, 29, 31, 36]
            for q in range(4):
                n_s = int(beat * SR)
                x = lp(saw(midi(seq[q] - 12), beat, .01, 3), 380 + 40 * q) * adsr(n_s, .005, .05, 1.2)
                put('bass', np.tanh(x * 2.4) * .8, b0 + q * beat)
        if bar >= 8:
            ch = [57, 64, 67, 72] if bar % 4 < 2 else [53, 60, 64, 69]
            for nn in ch:
                n_s = int(beat * 4 * SR)
                x = lp(saw(midi(nn), beat * 4, .004, 3), 2000) * adsr(n_s, .08, .3, .8)
                put('mel', x * .22, b0)


def funk(put, beat, bars, kt):
    K = kick(.32, 55, 90, 11, 1.4); S = snare(); H = hat(.05, 100); O = hat(.2, 18)
    for bar in range(bars):
        b0 = bar * 4 * beat
        for q in range(4):
            put('kick', K, b0 + q * beat); kt.append(b0 + q * beat)
            put('perc', O * .7, b0 + q * beat + beat / 2)
        for q in (1, 3):
            put('perc', S * .9, b0 + q * beat)
        for e in range(16):
            if e % 2 == 1 or bar >= 2:
                put('perc', H * (.5 if e % 4 else .8), b0 + e * beat / 4)
        if bar >= 2:
            root = [45, 45, 50, 43][(bar // 2) % 4]
            for q in range(8):
                at = b0 + q * beat / 2
                nn = root + (12 if q % 2 else 0)
                x = lp(saw(midi(nn), beat / 2 * .8, 0), 700) * adsr(int(beat / 2 * .8 * SR), d=6)
                put('bass', x * 1.2, at)
        if bar >= 4:
            ch = [[57, 60, 64, 67], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]][(bar // 2) % 4]
            for at in (0.75, 1.5, 2.75, 3.5):
                for nn in ch:
                    x = lp(saw(midi(nn), beat * .25, .004, 2), 2800) * adsr(int(beat * .25 * SR), d=12)
                    put('mel', x * .4, b0 + at * beat)


TRACKS = [('house', 124, house), ('hiphop', 92, hiphop), ('techno', 132, techno), ('dnb', 174, dnb), ('funk', 112, funk)]
for name, bpm, fn in TRACKS:
    y = render(bpm, 16, fn)
    pcm = (np.clip(y, -1, 1) * 32767).astype('<i2').tobytes()
    enc = lameenc.Encoder(); enc.set_bit_rate(96); enc.set_in_sample_rate(SR); enc.set_channels(1); enc.set_quality(2)
    data = enc.encode(pcm) + enc.flush()
    p = os.path.join(OUT, f'demo-{name}.mp3'); open(p, 'wb').write(data)
    print(name, bpm, 'BPM', round(len(y) / SR, 1), 's', len(data) // 1024, 'KB')
