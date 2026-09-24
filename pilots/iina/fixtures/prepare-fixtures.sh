#!/bin/bash
# IntentLane IINA pilot — prepare the local fixtures for the live evidence campaign.
#
# Three short, synthetic, freely usable clips, generated locally with ffmpeg. No
# personal media and no downloaded content is involved.
#
# One fixture is deliberately named differently from its embedded title, so the
# campaign exercises the divergence between what Siri resolves (the visible
# title) and what IINA's History window searches (the file path) instead of
# hiding it.
#
# Usage: prepare-fixtures.sh [destination]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:-$HERE/media}"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to prepare the fixtures." >&2
  exit 1
fi

mkdir -p "$DEST"

# name:file title
FIXTURES=(
  "Aurora.mp4:Aurora"
  "Borealis.mp4:Borealis"
  "fixture-03.mp4:Cygnus"
)

for fixture in "${FIXTURES[@]}"; do
  file="${fixture%%:*}"
  title="${fixture#*:}"
  target="$DEST/$file"
  if [[ -f "$target" ]]; then
    echo "keeping existing $file"
    continue
  fi
  # 3 seconds, 320x180, a synthetic test pattern, with the title tag IINA reads.
  ffmpeg -loglevel error -y \
    -f lavfi -i "testsrc=size=320x180:rate=15:duration=3" \
    -c:v libx264 -pix_fmt yuv420p -movflags +faststart \
    -metadata title="$title" \
    "$target"
  echo "created $file with title '$title'"
done

echo
echo "Fixtures in $DEST"
for fixture in "${FIXTURES[@]}"; do
  file="${fixture%%:*}"
  title="${fixture#*:}"
  embedded=$(ffprobe -v error -show_entries format_tags=title -of default=nw=1:nk=1 "$DEST/$file" 2>/dev/null || true)
  printf '  %-16s title=%-10s %s\n' "$file" "$embedded" "$(du -h "$DEST/$file" | cut -f1)"
  if [[ "$embedded" != "$title" ]]; then
    echo "  WARNING: $file does not carry the expected title '$title'." >&2
    exit 1
  fi
done
