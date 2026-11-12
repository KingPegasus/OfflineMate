"""Voiceover, soundtrack and captions for the use-case videos, driven by a timeline JSON.

usage:
  python uc_audio.py vo <kokoro-models-dir> <timeline.json>...   generate missing voiceover lines (video/vo-uc/)
  python uc_audio.py mix <timeline.json> <out.wav> <out.srt>      music + effects + voiceover, and captions

Timeline keys used here (paths relative to marketing/):
  duration, end (end card start), scenes[].t / promptAt / answerAt / after.at,
  vo: [{at, text}], music: {style: "calm" | "flashy", bpm}, flashes: [t], pops: [t]
The music and effects are generated in code (no samples), like tools/audio.py. Voice: Kokoro af_heart (Apache-2.0).
"""
import hashlib, json, pathlib, sys
import numpy as np
import soundfile as sf
from scipy.signal import fftconvolve, resample_poly, butter, sosfilt

ROOT = pathlib.Path(__file__).resolve().parent.parent
VO_DIR = ROOT / "video" / "vo-uc"
SR = 48000


def vo_path(text):
    return VO_DIR / (hashlib.sha1(text.encode()).hexdigest()[:12] + ".wav")


def cmd_vo(models, timelines):
    from kokoro_onnx import Kokoro
    VO_DIR.mkdir(parents=True, exist_ok=True)
    k = Kokoro(str(pathlib.Path(models) / "kokoro-v1.0.onnx"), str(pathlib.Path(models) / "voices-v1.0.bin"))
    for tl in timelines:
        data = json.loads(pathlib.Path(tl).read_text(encoding="utf-8"))
        speed = data.get("voSpeed", 1.05)
        for line in data.get("vo", []):
            p = vo_path(line["text"])
            if not p.exists():
                audio, sr = k.create(line["text"], voice="af_heart", speed=speed, lang="en-us")
                sf.write(p, audio, sr)
            d = sf.info(p).duration
            end = line["at"] + d
            print(f"{pathlib.Path(tl).stem:14} {line['at']:6.2f}-{end:6.2f} ({d:4.2f}s) {line['text']}")


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
def lp(x, fc, order=2): return sosfilt(butter(order, fc, 'low', fs=SR, output='sos'), x)
def hp(x, fc, order=2): return sosfilt(butter(order, fc, 'high', fs=SR, output='sos'), x)
def env(n, a, r):
    e = np.ones(n); ai, ri = max(1, int(a * SR)), max(1, int(r * SR))
    e[:ai] = np.linspace(0, 1, ai) ** 2; e[n - ri:] *= np.linspace(1, 0, ri) ** 2
    return e
def place(buf, sig, at):
    i = int(at * SR)
    if i >= len(buf): return
    if i < 0: sig, i = sig[-i:], 0
    j = min(len(buf), i + len(sig)); buf[i:j] += sig[:j - i]


def cmd_mix(tl_path, out_wav, out_srt):
    tl = json.loads(pathlib.Path(tl_path).read_text(encoding="utf-8"))
    DUR = float(tl["duration"]); N = int(SR * DUR); t = np.arange(N) / SR
    rng = np.random.default_rng(7)
    music = tl.get("music", {}); flashy = music.get("style") == "flashy"
    bpm = music.get("bpm", 124 if flashy else 100); beat = 60 / bpm
    end_card = tl.get("end", DUR)
    cuts = sorted({s["t"][0] for s in tl["scenes"] if s["t"][0] > 0.1} | ({tl["title"]["t"][1]} if tl.get("title") else set()))

    def reverb(x, secs=2.4, mix=.28):
        n = int(secs * SR); ir = rng.standard_normal(n) * np.exp(-np.linspace(0, 7, n))
        ir = lp(ir, 6000); ir /= np.sqrt((ir ** 2).sum())
        return x * (1 - mix) + fftconvolve(x, ir)[:len(x)] * mix * 3

    # Chords: C major (calm) or A minor drive (flashy), one chord per bar of 4 beats.
    prog = [[48, 55, 64, 71, 74], [43, 55, 62, 67, 71], [45, 52, 60, 64, 71], [41, 53, 60, 64, 69]]
    if flashy: prog = [[45, 52, 60, 64, 72], [41, 53, 60, 65, 69], [48, 55, 64, 67, 72], [43, 55, 62, 67, 71]]
    bar = beat * 4
    L = np.zeros(N); R = np.zeros(N)
    def pad_voice(f, n, detune):
        ph = np.arange(n) / SR; out = np.zeros(n)
        for d in (-detune, 0, detune):
            for k in range(1, 7): out += np.sin(2 * np.pi * f * (1 + d) * k * ph + rng.random() * 6.28) / k
        return out / 9
    ci = 0; start = 0.0
    while start < DUR:
        chord = prog[ci % len(prog)]; n = int((bar + 1.2) * SR); e = env(n, .6 if flashy else 1.0, 1.2)
        for m in chord:
            place(L, pad_voice(hz(m), n, .004) * e * .05, start)
            place(R, pad_voice(hz(m), n, .005) * e * .05, start)
        ci += 1; start += bar
    L = lp(L, 3200 if flashy else 2400); R = lp(R, 3200 if flashy else 2400)

    # Arpeggio (sixteenths), ping-pong delay.
    arp = np.zeros(N); step = beat / 4; k = 0; tt = 0.4
    while tt < end_card - .3:
        chord = prog[int(tt // bar) % len(prog)]
        m = chord[[1, 2, 3, 4, 3, 2][k % 6]] + 12
        n = int(.4 * SR); ph = np.arange(n) / SR
        note = (np.sin(2 * np.pi * hz(m) * ph) + .3 * np.sin(4 * np.pi * hz(m) * ph)) * np.exp(-ph * (12 if flashy else 9))
        place(arp, note * (.05 if k % 4 == 0 else .03), tt); k += 1; tt += step
    dl = int(step * 3 * SR)
    L += arp + np.concatenate([np.zeros(dl), arp[:-dl]]) * .35
    R += arp * .8 + np.concatenate([np.zeros(dl * 2), arp[:-dl * 2]]) * .3

    # Drums: soft sub pulse (calm) or four-on-the-floor kick, claps and hats (flashy).
    drums = np.zeros(N)
    first = (tl["title"]["t"][1] if tl.get("title") else 0.0)
    tt = first; b = 0
    while tt < end_card - .2:
        n = int(.4 * SR); ph = np.arange(n) / SR
        if flashy:
            kick = np.sin(2 * np.pi * (48 + 110 * np.exp(-ph * 38)) * ph) * np.exp(-ph * 9) * .5
            place(drums, kick, tt)
            if b % 2 == 1:
                clap = hp(rng.standard_normal(int(.2 * SR)), 900) * np.exp(-np.arange(int(.2 * SR)) / SR * 28) * .22
                place(drums, clap, tt)
            hat = hp(rng.standard_normal(int(.05 * SR)), 7000) * np.exp(-np.arange(int(.05 * SR)) / SR * 90) * .1
            place(drums, hat, tt + beat / 2)
        else:
            thump = np.sin(2 * np.pi * (55 + 40 * np.exp(-ph * 30)) * ph) * np.exp(-ph * 11) * .09
            place(drums, thump, tt)
        tt += beat; b += 1

    # Effects: whooshes into cuts, impacts on flashes / title / end card, blips when a prompt is sent and answered.
    fx = np.zeros(N)
    def whoosh(center, length=.8, gain=.18):
        n = int(length * SR); x = hp(lp(rng.standard_normal(n), 5000), 300)
        place(fx, x * np.sin(np.pi * np.linspace(0, 1, n)) ** 3 * gain, center - length * .6)
    def riser(at, length=1.2, gain=.16):
        n = int(length * SR); ph = np.arange(n) / SR
        x = hp(rng.standard_normal(n), 1500) * (ph / length) ** 2
        tone = np.sin(2 * np.pi * (300 + 900 * (ph / length) ** 2) * ph) * (ph / length) ** 2 * .3
        place(fx, (x + tone) * gain, at - length)
    def impact(at, gain=.5):
        n = int(2.0 * SR); ph = np.arange(n) / SR
        boom = np.sin(2 * np.pi * (35 + 90 * np.exp(-ph * 9)) * ph) * np.exp(-ph * 2.6)
        crack = lp(rng.standard_normal(n), 3000) * np.exp(-ph * 18) * .5
        shimmer = sum(np.sin(2 * np.pi * hz(m) * ph) for m in (84, 88, 91, 95)) * np.exp(-ph * 1.6) * .05
        place(fx, (boom + crack + shimmer) * gain, at)
    def blip(at, m=91, gain=.07):
        n = int(.25 * SR); ph = np.arange(n) / SR
        place(fx, np.sin(2 * np.pi * hz(m) * ph) * np.exp(-ph * 26) * gain, at)
    for c in cuts: whoosh(c)
    if tl.get("title"): impact(tl["title"]["t"][0] + .3, .4)
    for f in tl.get("flashes", []): impact(f, .35 if flashy else .25)
    for r in tl.get("risers", []): riser(r)
    for s in tl["scenes"]:
        if s.get("promptAt") is not None and s.get("prompt"):
            blip(s["promptAt"] + len(s["prompt"]) / s.get("cps", 22) + .1, 96, .05)
        if s.get("answerAt") is not None: blip(s["answerAt"], 91, .06)
    if end_card < DUR: impact(end_card + .2, .45)

    mL = reverb(L + drums * (1.0 if flashy else 1.0) + fx * .9); mR = reverb(R + drums + fx * .9)
    if flashy:  # drums dry and punchy
        mL = reverb(L + fx * .9) + drums; mR = reverb(R + fx * .9) + drums

    # Voiceover with ducking; captions from the same lines.
    vo = np.zeros(N); active = np.zeros(N); cues = []
    for line in tl.get("vo", []):
        x, sr = sf.read(vo_path(line["text"]))
        if x.ndim > 1: x = x.mean(1)
        x = hp(resample_poly(x, SR, sr), 80)
        place(vo, x, line["at"]); place(active, np.ones(len(x)), line["at"])
        cues.append((line["at"], min(DUR, line["at"] + len(x) / SR), line["text"]))
    if np.abs(vo).max() > 0: vo /= np.abs(vo).max()
    kk = int(.25 * SR); duck = np.convolve(active, np.ones(kk) / kk, 'same')
    gain = 1 - (.45 if flashy else .55) * np.clip(duck, 0, 1)
    fade = np.clip(t / .2, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
    out = np.stack([mL * gain * fade + vo * .62, mR * gain * fade + vo * .62], 1)
    out = np.tanh(out * 1.4) / np.tanh(1.4)
    out *= .93 / np.abs(out).max()
    sf.write(out_wav, out.astype(np.float32), SR, subtype='PCM_24')

    def ts(s):
        ms = int(round(s * 1000)); return f"{ms // 3600000:02}:{ms // 60000 % 60:02}:{ms // 1000 % 60:02},{ms % 1000:03}"
    with open(out_srt, "w", encoding="utf-8", newline="\n") as f:
        for i, (a, b, text) in enumerate(cues, 1):
            f.write(f"{i}\n{ts(a)} --> {ts(b)}\n{text}\n\n")
    print("wrote", out_wav, out_srt, f"{DUR}s")


if __name__ == "__main__":
    if sys.argv[1] == "vo": cmd_vo(sys.argv[2], sys.argv[3:])
    elif sys.argv[1] == "mix": cmd_mix(*sys.argv[2:5])
    else: sys.exit(__doc__)
