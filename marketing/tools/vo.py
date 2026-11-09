"""Generate voiceover lines with Kokoro (af_heart, Apache-2.0).

usage: python vo.py <models_dir> <out_dir>
Writes line1.wav .. lineN.wav plus durations.json.
"""
import json, sys, pathlib
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = [
    "Meet OfflineMate. An AI assistant that runs right on your phone.",
    "Turn on airplane mode. It keeps working.",
    "Ask anything. The answer is written on your device, not in the cloud.",
    "Save a note, and it stays on your phone.",
    "Pick the model that fits your phone. Lite, Standard, or Full.",
    "OfflineMate. Private A.I. that works offline. By Rhyme Solutions.",
]

models, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
k = Kokoro(str(models / "kokoro-v1.0.onnx"), str(models / "voices-v1.0.bin"))
durs = {}
for i, text in enumerate(LINES, 1):
    audio, sr = k.create(text, voice="af_heart", speed=1.0, lang="en-us")
    sf.write(out / f"line{i}.wav", audio, sr)
    durs[f"line{i}"] = round(len(audio) / sr, 2)
    print(i, durs[f"line{i}"], text)
(out / "durations.json").write_text(json.dumps(durs, indent=2))
