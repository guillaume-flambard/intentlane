# Effort sheet

One row per stage per pilot, in minutes, with the tooling that recorded it. This
sheet is the only input to the price in `results.md`, so a stage with no row
cannot be quoted.

The rule is that a number must come from a clock, not from memory. When a stage
was not instrumented, the cell says so. A fabricated or remembered number is
worse than a gap, because the gap is visible and the number is not.

## Stages

The eight stages of `recipe.md`, plus the qualification that precedes them.

| Stage | Name |
| --- | --- |
| Q | Qualification: licence, revision, language, route, sensitivity |
| 0 | The repository must build from a clean checkout |
| 1 | Audit |
| 2 | Contract and claim set |
| 3 | Generation |
| 4 | Mapping, including 4.1 for a non-Swift target |
| 5 | Tests, including the exact negative |
| 6 | Build |
| 7 | Metadata |
| 8 | Certification |
| W | Wiring the application's own mutation events to the index, added by `chain-the-remaining-pilots` after the first two pilots certified `indexSync` without it |

## Sheet

| Pilot | Stage | Minutes | Recorded by | Note |
| --- | --- | --- | --- | --- |
| FSNotes `a96b9b5` | Q | not instrumented | manual | done before this sheet existed; see `candidates.md` |
| FSNotes `a96b9b5` | 1 | 3.4 s of tool time, plus reading | `/usr/bin/time -p` | re-measured after the tool fixes; the tool is fast, the reading is the cost |
| FSNotes `a96b9b5` | 2 | not instrumented, authoring | manual | the validate command itself is fast; the cost was reading the model and deciding what not to expose |
| FSNotes `a96b9b5` | 3 | 1.6 s of tool time | `/usr/bin/time -p` on each of validate, generate, `--check` | generation is effectively free once the contract is right; the cost of this stage was paid in stage 2 |
| FSNotes `a96b9b5` | 3 | pending | | |
| FSNotes `a96b9b5` | 4 | not measured separately | manual | the cost sits in stage 5, because the mapping was written test-first |
| FSNotes `a96b9b5` | 5 | 4 test suites run, all under 5 s each | shell, four runs | two red runs, then green; 63 checks total |
| FSNotes `a96b9b5` | 6 | 17.9 s to the first error, successful rebuild not timed | `/usr/bin/time -p` on the first attempt only | one failed build on a missing `AppKit` import, then a clean one |
| FSNotes `a96b9b5` | 7 | 0.5 s compile, plus one failed metadata round | `/usr/bin/time -p` on the compile | first round failed on a missing protocol list, then succeeded |
| FSNotes `a96b9b5` | 8 | under 1 s plus the gate suites | `/usr/bin/time -p` on the compile | reruns the suites; the claim costs nothing of its own |
| HandBrake `1255087` | Q | 3 | `time` around the audit | 77 `.m`, no Swift |
| HandBrake `1255087` | 0 | 6 packages, 87 s of component download, then BUILD SUCCEEDED | `brew install`, `xcodebuild -downloadComponent`, `/usr/bin/time -p` | the cost is prerequisites, not code: six Homebrew packages, a 838.9 MB Metal Toolchain, a stale-directory cleanup and a remote correction |
| HandBrake `1255087` | 1 | 3 s of tool time, counted inside Q | `/usr/bin/time -p` | route `native/high`, 8 macOS targets |
| HandBrake `1255087` | 2 | not instrumented, authoring | manual | the object choice came from reading the model, not from running a tool |
| HandBrake `1255087` | 3 | under 1 s for validate, generate and check | `/usr/bin/time -p` on generate | same as FSNotes: generation is free once the contract is right |
| HandBrake `1255087` | 4 | 53 checks, three suites, none needing HandBrake | shell, four runs | 23 pure rules, 21 integration, 9 index; the mapping was written test-first, same two reds as FSNotes |
| HandBrake `1255087` | 5 | under 5 s for the suites | shell | the suites are the gate, so their cost is counted once, in stage 4 |
| HandBrake `1255087` | 6 | 2 failed builds, then BUILD SUCCEEDED, incremental after a full `make` | `/usr/bin/time -p` | both failures were real: the bridging header missed `HBAppDelegate`, and the registration was not main-actor isolated |
| HandBrake `1255087` | 7 | 0.5 s compile plus the processor | `/usr/bin/time -p` | one intent instead of two, and exactly that intent in the metadata |
| HandBrake `1255087` | 8 | under 1 s plus the gate suites | `/usr/bin/time -p` | certified on the first run |
| FSNotes `450619b` | W | 137.9 s to compile 233 app files and link, then 13 checks | `/usr/bin/time -p` on the deletion suite | this is the only suite that compiles the application. It reads the file list from the project file, links the SwiftPM objects Xcode already built, and runs under an isolated `HOME` because `Storage` writes a trash directory into the developer's `Documents` on first use. Most of the 138 s is Swift type-checking 233 files, not the test |
| HandBrake `e9398f3` | W | 9.7 s to compile six Objective-C files, link against libhandbrake, then 13 checks | `/usr/bin/time -p` on the deletion suite | 14 times cheaper than the Swift one, and the difference is the language, not the method: this suite drives the same kind of real object FSNotes does |
| LuLu `7d2669e` | Q | not instrumented | manual | done before this sheet existed |
| LuLu `7d2669e` | 0 | not started | | |
| LuLu `7d2669e` | 1 | not started | | |
| LuLu `7d2669e` | 2 | not started | | |
| LuLu `7d2669e` | 3 | not started | | |
| LuLu `7d2669e` | 4 | not started | | |
| LuLu `7d2669e` | 5 | not started | | |
| LuLu `7d2669e` | 6 | not started | | |
| LuLu `7d2669e` | 7 | not started | | |
| LuLu `7d2669e` | 8 | not started | | |
| Transmission `48835c6` | Q | not instrumented | manual | done before this sheet existed |
| Transmission `48835c6` | 0 | not started | | |
| Transmission `48835c6` | 1 | not started | | |
| Transmission `48835c6` | 2 | not started | | |
| Transmission `48835c6` | 3 | not started | | |
| Transmission `48835c6` | 4 | not started | | |
| Transmission `48835c6` | 5 | not started | | |
| Transmission `48835c6` | 6 | not started | | |
| Transmission `48835c6` | 7 | not started | | |
| Transmission `48835c6` | 8 | not started | | |
| Cyberduck `fc0d437` | Q | not instrumented | manual | done before this sheet existed |
| Cyberduck `fc0d437` | 0 | not started | | |
| Cyberduck `fc0d437` | 1 | not started | | |
| Cyberduck `fc0d437` | 2 | not started | | |
| Cyberduck `fc0d437` | 3 | not started | | |
| Cyberduck `fc0d437` | 4 | not started | | |
| Cyberduck `fc0d437` | 5 | not started | | |
| Cyberduck `fc0d437` | 6 | not started | | |
| Cyberduck `fc0d437` | 7 | not started | | |
| Cyberduck `fc0d437` | 8 | not started | | |
