"""Cut a usable 16-bar section out of each of the owner's full tracks (beat-grid aligned) and encode web mp3s."""
import os, sys, wave, json
import numpy as np
from scipy.signal import stft
import lameenc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'assets', 'audio', 'User generate audio')   # full-length originals as 16-bit stereo WAV, named house.wav ... (not committed)
OUT = os.path.join(ROOT, 'assets', 'audio')
FILES = [('house', 'house.wav', 126), ('hiphop', 'hiphop.wav', 92), ('trap', 'trap.wav', 100),
         ('techno', 'techno.wav', 135), ('funk', 'disco.wav', 120)]   # id (-> demo-<id>.mp3), source file, rough bpm
BARS = 16
report = {}


def load(path):
    w = wave.open(path); n = w.getnframes(); sr = w.getframerate(); ch = w.getnchannels()
    a = np.frombuffer(w.readframes(n), '<i2').astype(np.float32).reshape(-1, ch) / 32768
    return a, sr


def onset_env(mono, sr, hop=512):
    f, t, Z = stft(mono, sr, nperseg=1024, noverlap=1024 - hop)
    M = np.log1p(np.abs(Z) * 30)
    d = np.maximum(0, np.diff(M, axis=1)).sum(axis=0)
    return d / (d.max() + 1e-9), sr / hop


def comb(env, fps, bpm, phase_frames):
    per = fps * 60.0 / bpm
    n = int((len(env) - phase_frames) // per)
    idx = phase_frames + per * np.arange(n)
    i0 = idx.astype(int); fr = idx - i0
    return float((env[i0] * (1 - fr) + env[np.minimum(i0 + 1, len(env) - 1)] * fr).sum() / max(n, 1))


for tid, fn, est in FILES:
    a, sr = load(os.path.join(SRC, fn))
    mono = a.mean(axis=1)
    env, fps = onset_env(mono, sr)
    # refine bpm (0.02 resolution) and phase on the whole track
    best = (-1, est, 0)
    for bpm in np.arange(est - 2.0, est + 2.0, 0.02):
        per = fps * 60.0 / bpm
        for ph in np.arange(0, per, 0.5):
            sc = comb(env, fps, bpm, ph)
            if sc > best[0]:
                best = (sc, bpm, ph)
    _, bpm, ph = best
    beat = 60.0 / bpm
    first = ph / fps                       # time of the first beat
    nbeats = int((len(mono) / sr - first) / beat)
    # energy per beat
    rms = np.array([np.sqrt((mono[int((first + i * beat) * sr):int((first + (i + 1) * beat) * sr)] ** 2).mean() + 1e-12) for i in range(nbeats)])
    med = float(np.median(rms[rms > 0.02])) if (rms > 0.02).any() else 0.05
    for bars, thr, win in ((16, .5, 4), (12, .5, 4), (8, .5, 4), (8, .35, 8), (4, .3, 8)):   # longest steady phrase available
        L = bars * 4
        cands = []
        for i in range(8, nbeats - L - 4):
            if i % 4 != 0:
                continue
            seg = rms[i:i + L]
            roll = np.convolve(seg, np.ones(win) / win, mode='valid')
            if roll.min() < thr * med or seg.mean() < 0.7 * med:   # relative to this file's typical loudness (stems differ)
                continue
            before = rms[i - 8:i].mean()
            jump = seg[:8].mean() - before
            # prefer a section whose body is steady and which starts with a drop/entry
            sc = jump * 2.0 + seg.mean() - 1.5 * seg.std()
            cands.append((sc, i))
        if cands:
            break
    cands.sort(reverse=True)
    sc, i = cands[0]
    t0 = first + i * beat
    t1 = t0 + L * beat
    s0, s1 = int(t0 * sr), int(t1 * sr)
    seg = a[s0:s1].copy()
    fade = int(0.006 * sr)
    seg[:fade] *= np.linspace(0, 1, fade)[:, None]
    seg[-int(0.03 * sr):] *= np.linspace(1, 0, int(0.03 * sr))[:, None]
    pk = np.abs(seg).max()
    seg = seg / pk * 0.92 if pk > 0 else seg
    pcm = (np.clip(seg, -1, 1) * 32767).astype('<i2').tobytes()
    enc = lameenc.Encoder(); enc.set_bit_rate(160); enc.set_in_sample_rate(sr); enc.set_channels(2); enc.set_quality(2)
    data = enc.encode(pcm) + enc.flush()
    out = os.path.join(OUT, f'demo-{tid}.mp3'); open(out, 'wb').write(data)
    report[tid] = {'bpm': round(float(bpm), 2), 'start_s': round(t0, 2), 'dur_s': round(t1 - t0, 2), 'kb': len(data) // 1024,
                   'mean_rms': round(float(rms[i:i + L].mean()), 3), 'jump': round(float(rms[i:i + 8].mean() - rms[i - 8:i].mean()), 3)}
    print(tid, report[tid])
