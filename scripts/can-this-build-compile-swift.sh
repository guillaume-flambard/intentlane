#!/bin/bash
# Can this project's own build compile Swift?
#
# Stage 0 of the pilot recipe asks this before a contract is written, because a
# build that was never told Swift exists accepts a .swift source, exits zero and
# produces no object for it. The failure is invisible: BUILD SUCCEEDED, and a
# build with no App Intents in it.
#
# Two signals, because either alone lies:
#
#   project   does the project's build enable Swift? A CMake project that never
#             calls enable_language(SWIFT) and declares no LANGUAGES will accept
#             a Swift source and compile nothing.
#   toolchain can this machine's cmake compile a Swift source at all? Homebrew's
#             cmake 4.4.3 ships the Swift documentation and not
#             CMakeSwiftInformation.cmake, so enable_language(SWIFT) dies with
#             Unknown extension ".swift".
#
# A pilot needs both to say yes. Neither is a substitute for the other: a
# project can enable Swift on a machine whose build tool cannot, and a machine
# can have a capable toolchain behind a project that never asked.
#
# Usage: scripts/can-this-build-compile-swift.sh <fork-path>
#
# Exit 0 always, unless the path is unusable. Read the two lines it prints.
set -uo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <fork-path>" >&2
  exit 1
fi

FORK="$1"
if [ ! -d "$FORK" ]; then
  echo "no-such-directory: $FORK" >&2
  exit 1
fi

# --- signal 1, the project -------------------------------------------------
project="unknown"
if [ -f "$FORK/CMakeLists.txt" ]; then
  if grep -qE 'enable_language\(\s*SWIFT' "$FORK/CMakeLists.txt"; then
    project="declares-SWIFT"
  elif grep -qE 'LANGUAGES[^)]*Swift' "$FORK/CMakeLists.txt"; then
    project="declares-SWIFT"
  else
    project="does-not-declare-SWIFT"
  fi
elif [ -f "$FORK/$FORK.xcodeproj/project.pbxproj" ] || compgen -G "$FORK/*.xcodeproj" > /dev/null; then
  project="xcode-project"
fi

# --- signal 2, the toolchain ----------------------------------------------
toolchain="unknown"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/intentlane-swiftprobe.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
note=""

printf 'print("intentlane swift probe")\n' > "$WORK/SwiftProbe.swift"
printf 'int main(void) { return 0; }\n' > "$WORK/main.c"
# The probe asks for Swift explicitly. Testing the silent case instead would
# measure the project's omission rather than the toolchain, and conflating the
# two is how a pilot ends up blaming cmake for something the project did.
cat > "$WORK/CMakeLists.txt" <<'CMAKE'
cmake_minimum_required(VERSION 3.24)
project(intentlane_swift_probe C CXX)
enable_language(SWIFT)
add_executable(probe main.c)
target_sources(probe PRIVATE SwiftProbe.swift)
CMAKE

if [ "$project" = "xcode-project" ] || [ "$project" = "unknown" ]; then
  # An Xcode project is built by xcodebuild, so asking cmake would measure the
  # wrong tool and could report a capable machine as incapable. Ask swiftc, which
  # is the compiler Xcode would use anyway.
  if command -v swiftc > /dev/null 2>&1; then
    if swiftc -emit-object -o "$WORK/SwiftProbe.o" "$WORK/SwiftProbe.swift" > "$WORK/log" 2>&1; then
      toolchain="compiles-Swift"
    else
      toolchain="cannot-compile-Swift"
      note="$(grep -m1 'error' "$WORK/log" | sed 's/^ *//')"
    fi
  else
    toolchain="no-swiftc"
  fi
elif command -v cmake > /dev/null; then
  if cmake -B "$WORK/build" -S "$WORK" > "$WORK/log" 2>&1 \
    && cmake --build "$WORK/build" >> "$WORK/log" 2>&1; then
    if [ -n "$(find "$WORK/build" -name 'SwiftProbe.swift.o' 2>/dev/null)" ]; then
      toolchain="compiles-Swift"
    else
      toolchain="accepts-Swift-and-compiles-nothing"
    fi
  elif grep -q 'Unknown extension ".swift"' "$WORK/log" 2>/dev/null; then
    toolchain="cannot-enable-Swift"
    note="$(grep -m1 'CMakeSwiftInformation\|Unknown extension' "$WORK/log" | sed 's/^ *//')"
  elif grep -q 'CMAKE_SWIFT_COMPILER not set' "$WORK/log" 2>/dev/null; then
    toolchain="cannot-enable-Swift"
    note="CMAKE_SWIFT_COMPILER not set after EnableLanguage"
  else
    toolchain="unsettled"
  fi
fi

echo "project:   $project"
echo "toolchain: $toolchain${note:+ ($note)}"

case "$project:$toolchain" in
  *:cannot-enable-Swift)
    echo "verdict:   NO. Replacing the build tool is a decision for the person who owns the machine."
    ;;
  does-not-declare-SWIFT:*)
    echo "verdict:   NO. The project never enabled Swift, so a generated source would be accepted and silently skipped."
    ;;
  declares-Swift:compiles-Swift|xcode-project:compiles-Swift)
    echo "verdict:   YES. Both signals agree."
    ;;
  xcode-project:*)
    echo "verdict:   ASK. An Xcode project was found but only the build tool was tested; run the project once to be sure."
    ;;
  unsettled:*|*:unsettled|unknown:*)
    echo "verdict:   ASK. A signal did not settle. Read scripts/can-this-build-compile-swift.sh before trusting it."
    ;;
  *)
    echo "verdict:   ASK. Unrecognised combination, treated as not settled."
    ;;
esac
