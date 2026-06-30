#!/bin/bash
# Render the 5 Web Store listing slides to PNG via headless Chrome.
# Uses a temporary local HTTP server because Chrome headless does not reliably
# load CSS background-images from file:// URLs even with --allow-file-access.
# Outputs to ../screenshots/listing/01.png .. 05.png at exactly 1280x800.
set -e

CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [ ! -x "$CHROME" ]; then
  echo "Chrome not found at $CHROME"
  exit 1
fi

PORT=8765
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$DIR/.." && pwd)"
OUT="$ROOT/screenshots/listing"
mkdir -p "$OUT"

# Start a temporary HTTP server rooted at the project so /screenshots/raw/*.png
# resolves and background-image url("/screenshots/...") works.
python3 -m http.server "$PORT" --directory "$ROOT" >/dev/null 2>&1 &
SERVER_PID=$!
trap "kill $SERVER_PID 2>/dev/null || true" EXIT

# Wait for server to be ready
for _ in 1 2 3 4 5; do
  if curl -s "http://localhost:$PORT/" >/dev/null 2>&1; then break; fi
  sleep 0.2
done

for i in 1 2 3 4 5; do
  url="http://localhost:$PORT/listing/slide-$i.html"
  dst="$OUT/0$i.png"
  printf "[%d/5] rendering %s\n" "$i" "slide-$i.html"
  "$CHROME" \
    --headless=new \
    --disable-gpu \
    --hide-scrollbars \
    --window-size=1280,800 \
    --force-device-scale-factor=1 \
    --virtual-time-budget=3000 \
    --screenshot="$dst" \
    "$url" 2>/dev/null
  dims=$(sips -g pixelWidth -g pixelHeight "$dst" 2>/dev/null | grep -E 'pixel(Width|Height)' | tr -d ' ' | paste -sd, -)
  size=$(stat -f%z "$dst" 2>/dev/null)
  printf "    → %s (%s, %s bytes)\n" "$dst" "$dims" "$size"
done

echo ""
echo "Done. Output: $OUT"
ls -lh "$OUT"
