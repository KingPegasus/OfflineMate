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
# Clips re-recorded for 0.14.0 (Balanced, LFM 2.5 VL 1.6B; the new chat, Notes and Settings screens).
# 01 Airplane mode 4.6-9.0: quick settings open, Airplane mode on, closing
F+=$(seg 0 3.4 7.8 b)
# 02 Ask 9.0-17.5: typing, the message sent, then the full answer at real speed (only the wait for the first word is cut)
F+=$(seg 0 8.7 11.0 c1)
F+=$(seg 0 13.4 13.9 cs)
F+=$(seg 0 16.1 21.8 c2)
# 03 Notes 17.5-23.0: the Notes tab, typing a note, Save note
F+=$(seg 1 3.4 5.0 d1)
F+=$(seg 1 5.9 8.3 d2)
F+=$(seg 1 10.7 12.2 d3)
# 04 Sizes 23.0-29.0: Light, Balanced and Smartest in Settings, then the Light model sheet (held under the end card)
F+=$(seg 2 5.0 7.0 e1)
F+="[2:v]trim=9.6:13.6,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=6[e2];"
# Paint over status bar icons demo mode doesn't hide: the location icons before airplane mode goes on, and the
# notification icons Android posts next to the clock after it (not while quick settings is open).
F+="[a0][a1][b][c1][cs][c2][d1][d2][d3][e1][e2]concat=n=11:v=1:a=0,trim=0:35,setpts=PTS-STARTPTS,"
F+="drawbox=x=680:y=28:w=250:h=84:color=white:t=fill:enable='lt(t,4.75)',"
F+="drawbox=x=150:y=28:w=180:h=84:color=white:t=fill:enable='between(t,8.9,17.5)'[v]"
"$FF" -y -loglevel error -i raw/c1-cfr.mp4 -i raw/c2-cfr.mp4 -i raw/c3-cfr.mp4 -filter_complex "$F" -map "[v]" \
  -c:v libx264 -preset medium -crf 14 -pix_fmt yuv420p -r 30 raw/screen.mp4
echo "wrote raw/screen.mp4"
