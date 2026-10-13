#!/usr/bin/env bash
# Emulator helpers for the dev server (IWER via the IWSDK CLI). Usage: scripts/emu.sh <cmd> [args]
#   enter        enter XR with tracked hands, head seated in front of the arena
#   front        head back to the seated pose, looking down at the arena
#   look X Y Z   turn the head toward a world point
#   shot [file]  screenshot; prints the PNG path (copied to file if given)
#   logs [n] [pattern]  recent console lines (default: game tags)
#   key K        press a key (dev keys, see README)
set -euo pipefail
C="timeout 90 npx @iwsdk/cli"
cmd=${1:-}; shift || true
case "$cmd" in
  enter)
    active=0
    for _ in 1 2 3; do
      $C xr enter --input-json '{}' >/dev/null 2>&1 || true
      sleep 2
      if $C xr status 2>/dev/null | grep -q '"sessionActive": true'; then
        active=1
        break
      fi
    done
    if [ "$active" != 1 ]; then
      echo "XR session did not become active" >&2
      exit 1
    fi
    $C xr set-input-mode --input-json '{"mode":"hand"}' >/dev/null 2>&1
    sleep 1; "$0" front ;;
  front)
    $C xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.6,"z":0},"orientation":{"pitch":-28,"yaw":0,"roll":0}}' >/dev/null 2>&1 ;;
  look)
    $C xr look-at --input-json "{\"device\":\"headset\",\"target\":{\"x\":$1,\"y\":$2,\"z\":$3}}" >/dev/null 2>&1 ;;
  shot)
    p=$($C browser screenshot 2>&1 | grep -oE '/tmp/iwsdk-screenshot[^"]+' | head -1)
    if [ -n "${1:-}" ]; then cp "$p" "$1"; echo "$1"; else echo "$p"; fi ;;
  logs)
    $C browser logs --input-json "{\"count\":${1:-60}}" 2>&1 | grep -oE "${2:-\[(MATCH|LABEL|SHAPE|STRIKE|HUB|FORGE|BUILD)\][^\"\\\\]*|rror[^\"\\\\]{0,200}}" | uniq ;;
  key)
    $C browser interact --input-json "{\"steps\":[{\"action\":\"press\",\"key\":\"$1\"}]}" >/dev/null 2>&1 ;;
  *) sed -n 2,10p "$0"; exit 1 ;;
esac
