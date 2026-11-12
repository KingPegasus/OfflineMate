#!/usr/bin/env bash
# Build use-case videos: screen track, soundtrack + captions, then each format with audio.
#   tools/uc-build.sh <timeline-id> [formats]      e.g. tools/uc-build.sh alarm "vertical square"
# Timelines live in video/usecases/<id>.json (made by tools/uc_timelines.py). Outputs go to out/usecases/.
# Env: FFMPEG, PW_MODULE, PW_EXECUTABLE, PY (Python with numpy, scipy, soundfile), KOKORO (models dir).
set -euo pipefail
cd "$(dirname "$0")/.."
FF=${FFMPEG:-ffmpeg}; PY=${PY:-python}
id=$1; formats=${2:-"vertical landscape square"}
tl=video/usecases/$id.json
mkdir -p out/usecases raw/uc
"$PY" tools/uc_screen.py "$tl"
[ -n "${KOKORO:-}" ] && "$PY" tools/uc_audio.py vo "$KOKORO" "$tl" >/dev/null
"$PY" tools/uc_audio.py mix "$tl" "raw/uc/$id.wav" "out/usecases/offlinemate-$id.en.srt"
for f in $formats; do
  case $f in vertical) s=1080x1920;; landscape) s=1920x1080;; square) s=1080x1080;; esac
  node tools/render-uc.mjs "$tl" "$f" "raw/uc/$id-$f.mp4" 30
  "$FF" -y -loglevel error -i "raw/uc/$id-$f.mp4" -i "raw/uc/$id.wav" -map 0:v -map 1:a -c:v copy \
    -c:a aac -b:a 192k -shortest -movflags +faststart "out/usecases/offlinemate-$id-$s.mp4"
  echo "wrote out/usecases/offlinemate-$id-$s.mp4"
done
