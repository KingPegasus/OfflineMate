"""Find when the answer starts streaming and when it stops in a photo-question clip.

usage: python uc_photo_detect.py <name>...      (reads raw/uc/<name>-cfr.mp4 and raw/uc/<name>.events)
Prints, in seconds of the -cfr clip: picked, type, typed, send (events + the 1.2 s screenrecord lead),
stream (first change in the chat area after the send) and done (last change). screenrecord drops an
occasional all-black frame on a static screen; those are skipped.
"""
import os, pathlib, subprocess, sys
import numpy as np

FF = os.environ.get("FFMPEG", "ffmpeg")
W, H = 180, 275  # the chat area (y 300-1950), downscaled

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEAD = 1.2


def events(name):
    ev = {}
    for line in (ROOT / "raw" / "uc" / f"{name}.events").read_text().split("\n"):
        if line.strip():
            t, k = line.split(); ev[k] = float(t) + LEAD
    return ev


def main(names):
    for name in names:
        ev = events(name)
        frames = []
        raw = subprocess.run([FF, "-loglevel", "error", "-i", str(ROOT / "raw" / "uc" / f"{name}-cfr.mp4"), "-vf",
                              f"fps=10,crop=1080:1650:0:300,scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                             check=True, capture_output=True).stdout
        a = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(float)
        frames = [(i / 10, g) for i, g in enumerate(a)]
        ref = None; stream = done = None
        for t, g in frames:
            if t < ev["send"] + 2.5 or g.mean() < 4: continue
            if ref is None: ref = g; prev = g; continue
            if stream is None and np.abs(g - ref).mean() > 1.0: stream = t
            if stream is not None and np.abs(g - prev).mean() > .15: done = t
            prev = g
        print(f"{name:12} picked {ev['picked']:.2f} type {ev['type']:.2f} typed {ev['typed']:.2f} send {ev['send']:.2f} "
              f"stream {stream} done {done}")


if __name__ == "__main__":
    main(sys.argv[1:])
