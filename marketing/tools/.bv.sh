#!/usr/bin/env bash
# Render all three formats, add the soundtrack, and write the web versions.
# Env: FFMPEG, PW_MODULE (see README). Run tools/build-screen.sh and tools/audio.py first.
set -euo pipefail
cd "$(dirname "$0")/.."
FF=${FFMPEG:-ffmpeg}
mkdir -p out
for f in vertical landscape square; do
  case $f in vertical) s=1080x1920;; landscape) s=1920x1080;; square) s=1080x1080;; esac
  node tools/render.mjs video $f raw/screen.mp4 raw/video-$f.mp4 30
  "$FF" -y -loglevel error -i raw/video-$f.mp4 -i raw/soundtrack.wav -map 0:v -map 1:a -c:v copy \
    -c:a aac -b:a 192k -shortest -movflags +faststart out/offlinemate-demo-$s.mp4
done
echo done
