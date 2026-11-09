#!/usr/bin/env bash
# Cut the 35 s screen track from the raw emulator recordings (real-time playback, idle gaps trimmed).
# Scene timings must match SCENES in video/overlay.html.
set -euo pipefail
cd "$(dirname "$0")/.."
FF=${FFMPEG:-ffmpeg}

# screenrecord writes variable-frame-rate video (frames only when the screen changes),
# so convert each clip to a constant 30 fps first; otherwise trims lose time.
for c in c1 c2 c3; do
  "$FF" -y -loglevel error -i raw/$c.mp4 -vf "fps=30,format=yuv420p" -c:v libx264 -preset fast -crf 12 raw/$c-cfr.mp4
done

seg() { echo "[$1:v]trim=$2:$3,setpts=PTS-STARTPTS[$4];"; }
F=""
# Intro 0-4.6: hold the first chat frame, then the start of clip 1.
F+="[0:v]trim=0:0.04,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=3,trim=0:2.6,setpts=PTS-STARTPTS[a0];"
F+=$(seg 0 0 2.0 a1)
# 01 Airplane mode 4.6-9.0
F+=$(seg 0 2.0 6.4 b)
# 02 Ask 9.0-17.5: typing, then the full answer at real speed
F+=$(seg 0 10.9 13.6 c1)
F+=$(seg 0 14.0 19.8 c2)
# 03 Notes 17.5-23.0
F+=$(seg 1 3.3 5.2 d1)
F+=$(seg 1 7.6 9.6 d2)
F+=$(seg 1 11.9 13.5 d3)
# 04 Tiers 23.0-29.0: tier list, then the Lite model picker (held under the end card)
F+=$(seg 2 3.4 6.4 e1)
F+="[2:v]trim=18.0:21.0,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=6[e2];"
# Android re-posts a system notification icon next to the clock; paint over it while the white app status bar is on screen
# (not under quick settings, and not under the model picker, where the status bar is dimmed).
F+="[a0][a1][b][c1][c2][d1][d2][d3][e1][e2]concat=n=10:v=1:a=0,trim=0:35,setpts=PTS-STARTPTS,drawbox=x=150:y=28:w=80:h=90:color=white:t=fill:enable='not(between(t,4.7,8.7))*lt(t,25.95)'[v]"
"$FF" -y -loglevel error -i raw/c1-cfr.mp4 -i raw/c2-cfr.mp4 -i raw/c3-cfr.mp4 -filter_complex "$F" -map "[v]" \
  -c:v libx264 -preset medium -crf 14 -pix_fmt yuv420p -r 30 raw/screen.mp4
echo "wrote raw/screen.mp4"
