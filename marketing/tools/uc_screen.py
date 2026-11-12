"""Cut a timeline's screen track from the raw emulator clips.

usage: python uc_screen.py <timeline.json>
Reads timeline["clips"]: [{"src": "raw/uc/alarm.mp4", "from": 1.2, "to": 9.8, "hold": 2.5, "holdEnd": 0}],
in playback order. "hold" freezes the clip's first frame for that many seconds before it plays (used under the
hook line); "holdEnd" freezes the last frame. Clips play at real speed. Writes timeline["screen"] as all-intra
H.264 so the page can seek any frame exactly. Env: FFMPEG.
"""
import json, os, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
FF = os.environ.get("FFMPEG", "ffmpeg")


def cfr(src):
    """screenrecord writes variable frame rate; convert once to constant 30 fps so trims keep time."""
    src = ROOT / src
    out = src.with_name(src.stem + "-cfr.mp4")
    if not out.exists() or out.stat().st_mtime < src.stat().st_mtime:
        subprocess.run([FF, "-y", "-loglevel", "error", "-i", str(src), "-vf", "fps=30,format=yuv420p",
                        "-c:v", "libx264", "-preset", "fast", "-crf", "12", str(out)], check=True)
    return out


def main(tl_path):
    tl = json.loads(pathlib.Path(tl_path).read_text(encoding="utf-8"))
    inputs, parts = [], []
    for i, c in enumerate(tl["clips"]):
        inputs += ["-i", str(cfr(c["src"]))]
        f = f"[{i}:v]trim={c['from']}:{c['to']},setpts=PTS-STARTPTS"
        if c.get("hold"):
            f += f",tpad=start_mode=clone:start_duration={c['hold']}"
        if c.get("holdEnd"):
            f += f",tpad=stop_mode=clone:stop_duration={c['holdEnd']}"
        parts.append(f + f"[s{i}]")
    n = len(tl["clips"])
    graph = ";".join(parts) + ";" + "".join(f"[s{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0,fps=30,format=yuv420p[v]"
    out = ROOT / tl["screen"]
    out.parent.mkdir(parents=True, exist_ok=True)
    # All-intra (-g 1) so the browser seeks straight to each frame.
    subprocess.run([FF, "-y", "-loglevel", "error", *inputs, "-filter_complex", graph, "-map", "[v]",
                    "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-g", "1", "-pix_fmt", "yuv420p", str(out)], check=True)
    print("wrote", out.relative_to(ROOT))


if __name__ == "__main__":
    main(sys.argv[1])
