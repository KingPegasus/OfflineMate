#!/usr/bin/env bash
# Record one use-case clip on the emulator: a fresh chat, the prompt typed word by word, the real reply,
# then (optionally) the result in another app or tab.
#   tools/uc-record.sh <name> "<prompt>" <reply_wait_s> [after]
#     after: clock   - open the Clock app's alarm list
#            notes   - open the Notes tab
#            none    - stay on the chat (default)
# Writes raw/uc/<name>.mp4 and raw/uc/<name>.events (seconds from recording start, for cutting).
# Assumes: status bar demo mode on, Gboard disabled (pm disable-user com.google.android.inputmethod.latin),
# OfflineMate open on the Chat tab. Env: ADB.
set -euo pipefail
export MSYS_NO_PATHCONV=1
cd "$(dirname "$0")/.."
ADB=${ADB:-/h/toolchain/android-sdk/platform-tools/adb.exe}
name=$1; prompt=$2; wait=${3:-8}; after=${4:-none}
a() { "$ADB" "$@"; }
mkdir -p raw/uc
ev=raw/uc/$name.events; : > "$ev"
t0=0
mark() { echo "$(awk -v a="$(date +%s.%N)" -v b="$t0" 'BEGIN{printf "%.2f", a-b}') $1" >> "$ev"; }
center() { # center of the first node whose text/desc contains $1
  a shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  a exec-out cat /sdcard/ui.xml | tr '>' '\n' | grep -F -- "$1" | grep -oE 'bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' | head -1 |
    grep -oE '[0-9]+' | paste -sd' ' | awk '{print int(($1+$3)/2), int(($2+$4)/2)}'
}

# Fresh chat before recording starts.
read -r nx ny < <(center "+ New chat"); a shell input tap "$nx" "$ny"; sleep 1.5
read -r ix iy < <(center "Ask OfflineMate")
read -r sx sy < <(center 'text="Send"')

a shell rm -f /sdcard/uc.mp4
a shell screenrecord --bit-rate 16000000 --time-limit 170 /sdcard/uc.mp4 &
rec=$!
sleep 1.2; t0=$(date +%s.%N); sleep 1.3
mark start
a shell input tap "$ix" "$iy"; sleep 0.6
mark type
first=1
for w in $prompt; do
  [ $first = 1 ] || a shell input keyevent 62
  first=0
  enc=$(printf '%s' "$w" | sed -e "s/'/\\\\'/g" -e 's/?/\\?/g' -e 's/&/\\&/g' -e 's/(/\\(/g' -e 's/)/\\)/g' -e 's/:/\\:/g')
  a shell input text "$enc"
done
mark typed
sleep 0.7
a shell input tap "$sx" "$sy"
mark send
sleep "$wait"
mark replied
sleep 2
case $after in
  clock)
    a shell am start -a android.intent.action.SHOW_ALARMS >/dev/null; mark clock; sleep 4.5 ;;
  return) # the alarm tool opens the Clock app itself: scroll its list to the top, then come back to the chat reply
    for _ in $(seq 1 40); do a shell dumpsys window | grep -q "mCurrentFocus.*deskclock" && break; sleep 0.5; done
    mark clock; sleep 0.8
    a shell input swipe 540 700 540 1900 250; sleep 2.6
    a shell monkey -p com.offlinemate.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1; mark returned; sleep 3.5 ;;
  notes)
    read -r tx ty < <(center 'text="Notes"'); a shell input tap "$tx" "$ty"; mark notes; sleep 4 ;;
esac
mark stop
a shell pkill -INT screenrecord || true
wait $rec || true
sleep 1
a pull /sdcard/uc.mp4 "raw/uc/$name.mp4" >/dev/null
echo "recorded raw/uc/$name.mp4"; cat "$ev"
