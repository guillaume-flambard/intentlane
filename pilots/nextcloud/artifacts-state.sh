#!/bin/bash
# Lists the binary artifacts (xcframeworks) of the resolved Swift packages and where they are.
W="$HOME/projects/_worktrees/nextcloud-ios"
for d in "$W/DerivedData/SourcePackages" "$W/SourcePackages"; do
  [ -d "$d/artifacts" ] || continue
  echo "== $d/artifacts"
  for p in "$d"/artifacts/*/; do
    n="$(find "$p" -maxdepth 4 -name '*.xcframework' | wc -l | tr -d ' ')"
    echo "$(basename "$p"): $n xcframework(s), $(du -sh "$p" | cut -f1)"
  done
done
echo "-- binary download lines in the logs"
grep -ihE "artifact|downloading binary|binary" "$W"/logs/build-pristine.log "$W"/logs/resolve.log 2>/dev/null | head -6 | cut -c1-200
