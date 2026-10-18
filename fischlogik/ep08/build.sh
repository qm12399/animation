#!/bin/sh
# Fischlogik Folge 8: one-command build (render -> mix -> mux)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
# cloud container: use the preinstalled Chromium; local: leave unset so Playwright finds its own
CLOUD_CHROME=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
[ -n "$PLAYWRIGHT_CHROME" ] || { [ -x "$CLOUD_CHROME" ] && export PLAYWRIGHT_CHROME=$CLOUD_CHROME; } || true
PY=${PY:-$LIB/.venv/bin/python}
cd "$LIB"
node core/render/events.mjs "$HERE" --size 720x1280
[ -n "$SKIP_VIDEO" ] || node core/render/video.mjs "$HERE" --fps 30 --workers ${WORKERS:-4} --size 720x1280 --out "$HERE/out/video.mp4"
"$PY" "$HERE/../engine/mix.py" "$HERE"
sh "$HERE/../engine/mux.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/fischlogik-folge-08.mp4"
