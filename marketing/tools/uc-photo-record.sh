#!/usr/bin/env bash
# Record one photo-question clip: a fresh chat, the photo picked in the system photo picker, the prompt typed
# word by word, the real reply (waits until the reply's Copy button shows), then a short hold.
#   tools/uc-photo-record.sh <name> <grid_x> <grid_y> "<prompt>"
# grid_x/y: the photo's centre in the picker grid (find it with `tools/ui.sh dump` while the picker is open).
# Writes raw/uc/<name>.mp4 and raw/uc/<name>.events (seconds from recording start, for cutting).
# Assumes: status bar demo mode on, Gboard disabled, OfflineMate open, airplane mode on. Env: ADB, DEV.
set -euo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."
ADB=${ADB:-/h/toolchain/android-sdk/platform-tools/adb.exe}; DEV=${DEV:-emulator-5556}
name=$1; gx=$2; gy=$3; prompt=$4
a() { "$ADB" -s "$DEV" "$@"; }
mkdir -p raw/uc
ev=raw/uc/$name.events; : > "$ev"
t0=0
mark() { echo "$(awk -v a="$(date +%s.%N)" -v b="$t0" 'BEGIN{printf "%.2f", a-b}') $1" >> "$ev"; }
dump() { a shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; a exec-out cat /sdcard/ui.xml; }
center() {
  dump | tr '>' '\n' | grep -F -- "$1" | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | head -1 |
    grep -oE '[0-9]+' | paste -sd' ' | awk '{print int(($1+$3)/2), int(($2+$4)/2)}'
}

read -r nx ny < <(center "+ New chat"); a shell input tap "$nx" "$ny"; sleep 1.5
read -r px py < <(center 'Attach image from gallery') || true
[ -z "${px:-}" ] && { px=84; py=2081; }
read -r ix iy < <(center "Ask OfflineMate")

a shell rm -f /sdcard/uc.mp4
a shell screenrecord --bit-rate 16000000 --time-limit 180 /sdcard/uc.mp4 &
rec=$!
sleep 1.2; t0=$(date +%s.%N); sleep 1.0
mark start
a shell input tap "$px" "$py"; mark picker; sleep 3
a shell input tap "$gx" "$gy"; mark picked; sleep 2.0
a shell input tap "$ix" "$iy"; sleep 0.5
mark type
first=1
for w in $prompt; do
  [ $first = 1 ] || a shell input keyevent 62
  first=0
  enc=$(printf '%s' "$w" | sed -e "s/'/\\\\'/g" -e 's/?/\\?/g' -e 's/&/\\&/g' -e 's/(/\\(/g' -e 's/)/\\)/g' -e 's/:/\\:/g' -e 's/,/\\,/g')
  a shell input text "$enc"
done
mark typed
sleep 0.6
read -r sx sy < <(center 'text="Send"'); a shell input tap "$sx" "$sy"
mark send
# Wait for the first streamed text, then for the finished reply (its Copy button).
for _ in $(seq 1 80); do sleep 2; dump | grep -q 'text="Copy"' && break; done
mark replied
sleep 2.5
mark stop
a shell pkill -INT screenrecord || true
wait $rec || true
sleep 1
a pull /sdcard/uc.mp4 "raw/uc/$name.mp4" >/dev/null
echo "recorded raw/uc/$name.mp4"; cat "$ev"
