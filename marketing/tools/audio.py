"""Build the OfflineMate demo soundtrack: an original code-generated synth bed, whooshes and blips,
plus the Kokoro voiceover, ducked and mastered. Adapted from the Rhyme Solutions intro video tooling.
The music and effects are generated here (no samples), so there is nothing to license.

usage: python audio.py <vo_dir> <out.wav>
vo_dir holds line1.wav .. line6.wav from vo.py. Scene times match SCENES in video/overlay.html.
"""
import sys, pathlib
import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve, resample_poly, butter, sosfilt

SR, DUR = 48000, 35.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(5)
CUTS = [4.6, 9.0, 17.5, 23.0, 29.0]            # scene starts
VO_START = [0.5, 4.9, 9.3, 17.8, 23.3, 29.7]   # one per voiceover line
END_CARD = 29.0

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def env_adsr(n, a, r):
    e = np.ones(n); ai, ri = int(a * SR), int(r * SR)
    e[:ai] = np.linspace(0, 1, ai) ** 2; e[n - ri:] *= np.linspace(1, 0, ri) ** 2
    return e
def lp(x, fc, order=2): return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def place(buf, sig, at):
    i = int(at * SR); j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i]

def reverb(x, secs=2.8, mix=.32):
    n = int(secs * SR); ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
    ir = lp(ir, 6000); ir /= np.sqrt((ir ** 2).sum())
    return x * (1 - mix) + fftconvolve(x, ir)[:len(x)] * mix * 3

# ---- chords (C major, calm and bright): Cmaj9, G6/B, Am9, Fmaj7 ... 4.375 s each
prog = [[48, 55, 64, 71, 74], [47, 55, 62, 64, 71], [45, 52, 59, 64, 71], [41, 53, 60, 64, 69]] * 2
bar = DUR / len(prog)

def pad_voice(f, n, detune):
    ph = np.arange(n) / SR
    out = np.zeros(n)
    for d in (-detune, 0, detune):
        ff = f * (1 + d)
        for k in range(1, 7):                       # band-limited saw-ish
            out += np.sin(2 * np.pi * ff * k * ph + rng.random() * 6.28) / k
    return out / 9

L = np.zeros(N); R = np.zeros(N)
for ci, chord in enumerate(prog):
    start = ci * bar; n = int((bar + 1.6) * SR)
    e = env_adsr(n, 1.1, 1.8)
    for m in chord:
        place(L, pad_voice(hz(m), n, .0035) * e * .055, start)
        place(R, pad_voice(hz(m), n, .0045) * e * .055, start)
bright = np.clip((t - 1) / 28, 0, 1)               # filter opens over the piece
L = lp(L, 1000) * (1 - bright) + lp(L, 3800) * bright
R = lp(R, 1000) * (1 - bright) + lp(R, 3800) * bright

# ---- soft arpeggio, 100 bpm sixteenths, ping-pong delay; a breath before the end card
arp = np.zeros(N); step = 60 / 100 / 4
k = 0; tt = 1.2
while tt < 34.2:
    chord = prog[min(int(tt // bar), len(prog) - 1)]
    m = chord[[1, 2, 3, 4, 3, 2][k % 6]] + 12
    n = int(.5 * SR); ph = np.arange(n) / SR
    note = (np.sin(2 * np.pi * hz(m) * ph) + .3 * np.sin(4 * np.pi * hz(m) * ph)) * np.exp(-ph * 9)
    vel = .9 if k % 4 == 0 else .55
    if not (END_CARD - .4 <= tt < END_CARD + .4): place(arp, note * .05 * vel, tt)
    k += 1; tt += step
arp *= np.clip((t - 1.2) / 3.0, 0, 1)
dl = int(step * 3 * SR)
L += arp + np.concatenate([np.zeros(dl), arp[:-dl]]) * .35
R += arp * .8 + np.concatenate([np.zeros(dl * 2), arp[:-dl * 2]]) * .3

# ---- sub pulse on the beat through the feature scenes
beat = 60 / 100; tt = CUTS[0]
while tt < END_CARD - .4:
    n = int(.35 * SR); ph = np.arange(n) / SR
    thump = np.sin(2 * np.pi * (55 + 40 * np.exp(-ph * 30)) * ph) * np.exp(-ph * 11) * .09
    place(L, thump, tt); place(R, thump, tt); tt += beat

# ---- whooshes into each scene, impacts on the open and the end card, UI blips
fx = np.zeros(N)
def whoosh(center, length=.9, gain=.2):
    n = int(length * SR); x = hp(lp(rng.standard_normal(n), 5000), 300)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 3
    place(fx, x * e * gain, center - length * .6)
for c in CUTS: whoosh(c)
def impact(at, gain=.55):
    n = int(2.2 * SR); ph = np.arange(n) / SR
    boom = np.sin(2 * np.pi * (35 + 90 * np.exp(-ph * 9)) * ph) * np.exp(-ph * 2.6)
    crack = lp(rng.standard_normal(n), 3000) * np.exp(-ph * 18) * .5
    shimmer = sum(np.sin(2 * np.pi * hz(m) * ph) for m in (84, 88, 91, 95)) * np.exp(-ph * 1.6) * .05
    place(fx, (boom + crack + shimmer) * gain, at)
impact(0.55, .4); impact(END_CARD + .25, .5)
def blip(at, m=91, gain=.07):
    n = int(.25 * SR); ph = np.arange(n) / SR
    place(fx, np.sin(2 * np.pi * hz(m) * ph) * np.exp(-ph * 26) * gain, at)
blip(6.95, 93)                     # airplane mode tile
blip(11.75, 96, .05)               # send
blip(21.7, 91, .06)                # note saved
blip(26.0, 89, .05)                # model picker

music_L = reverb(L + fx * .9); music_R = reverb(R + fx * .9)

# ---- voiceover + ducking
vo_dir = pathlib.Path(sys.argv[1]); vo = np.zeros(N); active = np.zeros(N)
for i, at in enumerate(VO_START, 1):
    x, sr = sf.read(vo_dir / f"line{i}.wav")
    if x.ndim > 1: x = x.mean(1)
    x = hp(resample_poly(x, SR, sr), 80)
    place(vo, x, at); place(active, np.ones(len(x)), at)
vo /= np.abs(vo).max() + 1e-9
k = int(.25 * SR); duck = np.convolve(active, np.ones(k) / k, 'same')
gain = 1 - .55 * np.clip(duck, 0, 1)
fade = np.clip(t / .3, 0, 1) * np.clip((DUR - t) / 1.5, 0, 1)
out = np.stack([music_L * gain * fade + vo * .62, music_R * gain * fade + vo * .62], 1)
out = np.tanh(out * 1.4) / np.tanh(1.4)          # gentle saturation / limiting
out *= .93 / np.abs(out).max()
sf.write(sys.argv[2], out.astype(np.float32), SR, subtype='PCM_24')
print("wrote", sys.argv[2], f"{DUR}s")
