#!/bin/sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/home/user/lemomo-ai/lemo-opuscar}; export LIB
export PLAYWRIGHT_CHROME=${PLAYWRIGHT_CHROME:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}
cd "$LIB"
node core/render/events.mjs "$HERE" --size 720x1280
node core/render/video.mjs "$HERE" --fps 30 --workers 4 --size 720x1280 --out "$HERE/out/video.mp4"
"$LIB/.venv/bin/python" "$HERE/mix.py"
sh "$HERE/mux.sh" "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/out/test10.mp4"
