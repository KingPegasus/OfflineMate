#!/usr/bin/env bash
# Small adb helpers for driving the emulator by on-screen text.
#   ui.sh tap "Choose Lite"     tap the first node whose text/desc contains the string
#   ui.sh dump                  print text nodes with their centres
#   ui.sh shot out.png          screenshot
export MSYS_NO_PATHCONV=1
ADB=${ADB:-/h/Android/Sdk/platform-tools/adb.exe}
DEV=${DEV:-emulator-5554}
a() { "$ADB" -s "$DEV" "$@"; }
dumpxml() { a shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; a exec-out cat /sdcard/ui.xml; }
nodes() {
  dumpxml | tr '>' '\n' | grep -oE '(text|content-desc)="[^"]+"[^>]*bounds="\[[0-9]+,[0-9]+\]\[[0-9]+,[0-9]+\]"' |
  sed -E 's/^(text|content-desc)="([^"]*)".*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]"/\3 \4 \5 \6 \2/' |
  awk '{x=int(($1+$3)/2); y=int(($2+$4)/2); $1=$2=$3=$4=""; sub(/^ +/,""); print x, y, $0}'
}
case "$1" in
  dump) nodes ;;
  tap)
    line=$(nodes | grep -F -- "$2" | head -1)
    [ -z "$line" ] && { echo "not found: $2" >&2; exit 1; }
    set -- $line; a shell input tap "$1" "$2"; echo "tapped $1,$2" ;;
  shot) a exec-out screencap -p > "$2" ;;
  *) echo "usage: ui.sh dump|tap <text>|shot <file>" >&2; exit 2 ;;
esac
