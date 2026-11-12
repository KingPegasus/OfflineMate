"""Export marketing renders into website/ (WebP screenshots, OG image, web video + poster).

usage: python web_assets.py [images|video|all]
Run from anywhere; paths are relative to the repo. Needs Pillow (with WebP) and ffmpeg (FFMPEG env var,
else imageio-ffmpeg's bundled binary).
"""
import os, pathlib, subprocess, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUT = ROOT / "marketing" / "out"
WEB = ROOT / "website"

FRAMES = ["chat", "notes", "onboarding", "picker-lite", "tools", "settings", "tools-chat"]
TABLET_FRAMES = ["chat", "notes", "picker-lite"]


def ffmpeg():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


def images():
    (WEB / "screenshots").mkdir(exist_ok=True)
    for name in FRAMES:
        im = Image.open(OUT / "web" / f"frame-{name}.png").convert("RGBA")
        im = im.resize((480, 990), Image.LANCZOS)          # shown at ~300-460 CSS px; 480 covers 1.5x screens
        dst = WEB / "screenshots" / f"{name}.webp"
        im.save(dst, "WEBP", quality=82, method=6)
        print("wrote", dst.relative_to(ROOT), dst.stat().st_size // 1024, "KB")
    for name in TABLET_FRAMES:
        im = Image.open(OUT / "web" / f"frame-tablet-{name}.png").convert("RGBA")
        im = im.resize((1600, 1100), Image.LANCZOS)        # shown up to ~1000 CSS px wide (chat) or ~500 (pair)
        dst = WEB / "screenshots" / f"tablet-{name}.webp"
        im.save(dst, "WEBP", quality=82, method=6)
        print("wrote", dst.relative_to(ROOT), dst.stat().st_size // 1024, "KB")
    og = Image.open(OUT / "web" / "og-image.png").convert("RGB")
    og.save(WEB / "og-image.jpg", "JPEG", quality=86, optimize=True, progressive=True)
    print("wrote website/og-image.jpg", (WEB / "og-image.jpg").stat().st_size // 1024, "KB")


def video():
    media = WEB / "media"; media.mkdir(exist_ok=True)
    src = OUT / "offlinemate-demo-1920x1080.mp4"
    ff = ffmpeg()
    run = lambda *a: subprocess.run([ff, "-y", "-loglevel", "error", *a], check=True)
    # 1280x720 is plenty for the page's video box; keep audio (the player starts muted).
    run("-i", str(src), "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", "24",
        "-profile:v", "high", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart",
        str(media / "offlinemate-demo.mp4"))
    run("-i", str(src), "-vf", "scale=1280:-2:flags=lanczos", "-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36",
        "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-c:a", "libopus", "-b:a", "96k",
        str(media / "offlinemate-demo.webm"))
    # Poster: the chat answer, before playback starts.
    run("-ss", "17.2", "-i", str(src), "-frames:v", "1", "-vf", "scale=1280:-2", "-q:v", "3", str(media / "demo-poster.jpg"))
    # WebVTT captions for the <track> element, converted from the .srt.
    srt = (OUT / "offlinemate-demo.en.srt").read_text(encoding="utf-8")
    vtt = "WEBVTT\n\n" + "\n".join(l.replace(",", ".") if "-->" in l else l for l in srt.splitlines()) + "\n"
    (media / "offlinemate-demo.en.vtt").write_text(vtt, encoding="utf-8")
    for f in ("offlinemate-demo.mp4", "offlinemate-demo.webm", "demo-poster.jpg", "offlinemate-demo.en.vtt"):
        print("wrote", f"website/media/{f}", (media / f).stat().st_size // 1024, "KB")


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    if what in ("images", "all"): images()
    if what in ("video", "all"): video()
