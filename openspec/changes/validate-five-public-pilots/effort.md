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
| P | The launch probe, the one stage that runs the built application |
| R | Carrying a runtime refusal into the contract, added by `carry-access-to-the-contract`: one schema field, three pilot contracts, and the migration of every inline fixture the field invalidated |

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
| HandBrake `e9398f3` | P | 0.6 s to the launch probe's decision, 12 checks on the probe itself, all under 1 s | `/usr/bin/time -p`, shell | the probe decides in under a second because it refuses early, and the 12 checks are what stand in for a launch this machine will not perform. The end-to-end launch is **not instrumented and not run**, because the agent process may not spawn into the Aqua session; the effort sheet says so rather than quoting a number from a run that did not happen |
| FSNotes `450619b` | P | 12 checks on the probe, all under 1 s | shell | same shape as HandBrake's, plus one check that the two probes carry the same three disclaimers, which is the test that makes this one probe reused rather than two |
| LuLu `7d2669e` | Q | not instrumented | manual | done before this sheet existed |
| LuLu `7d2669e` | 0 | 1 extra clone, 3 builds of a second project, 1 build of LuLu, then BUILD SUCCEEDED at exit 0 | shell, four `xcodebuild` runs | `Netiquette.app` is in `.gitignore` and produced by nothing, so the pilot built it; its deployment target was 10.10 then 10.15, which means two builds to find both. LuLu's own was 10.15 in six places |
| LuLu `7d2669e` | 1 | not instrumented | manual | the audit was not re-run for this pilot |
| LuLu `7d2669e` | 2 | not instrumented, authoring | manual | the classification is the cost here, and it was written before the contract by task 3.1 |
| LuLu `7d2669e` | 3 | 0.85 s for `generate --check` | `/usr/bin/time -p` on the check | fourth pilot in a row where generation is free once the contract is right |
| LuLu `7d2669e` | 4 | 45 core, 46 integration, 22 index checks, written before the implementation | shell, three runs | the field set is read back with `Mirror` and compared to the six classified fields, because this application's canonical identifier is a filesystem path |
| LuLu `7d2669e` | 5 | core 1.46 s, integration 3.68 s, index 2.32 s | `/usr/bin/time -p` on each suite | the suites are the gate, so their cost is counted once |
| LuLu `7d2669e` | 6 | 3 failed builds, then BUILD SUCCEEDED | shell, four `xcodebuild` runs | a missing `OSLog` import, then `os_log_info` and `os_log_with_type` which are macros in `os/log.h` and have no Swift symbol, then a real error and a 0. The `pid_t` cast was the fourth |
| LuLu `7d2669e` | 7 | 1.18 s compile, plus the processor | `/usr/bin/time -p` on the compile | the module name is `LuLu`, and a different one produces a plausible-looking bundle with the wrong name in it |
| LuLu `7d2669e` | 8 | under 1 s plus the gate suites, and **certified on the second run** | `/usr/bin/time -p` | the first run failed `generated` because the two copies of the generated file had drifted, and only the copy in `out/` is compared |
| Transmission `48835c6` | Q | not instrumented | manual | done before this sheet existed |
| Transmission `48835c6` | 0 | not started, and the pilot does not build | | recorded as blocked at task 2.3 with the cause named: no released cmake compiles Swift against Xcode 27 |
| Transmission `48835c6` | 1 | not started | | |
| Transmission `48835c6` | 2 | not started, authoring | manual | the contract is written and validates; the pilot stopped at generation because the build cannot receive the generated Swift |
| Transmission `48835c6` | 3 | not started | | |
| Transmission `48835c6` | 4 | not started | | |
| Transmission `48835c6` | 5 | not started | | |
| Transmission `48835c6` | 6 | not started | | |
| Transmission `48835c6` | 7 | not started | | |
| Transmission `48835c6` | 8 | not started | | |
| Cyberduck `fc0d437` | Q | not instrumented | manual | done before this sheet existed |
| Cyberduck `fc0d437` | 0 | `brew install ant maven` at 45 MB and 11 MB, then `mvn verify -DskipTests -Drevision=0` at **BUILD SUCCESS in 54.688 s**, after raising the deployment target in two Ant files | `brew`, Maven's own `Total time` | the JDK was already installed and `java_home` reported none, because Homebrew's is keg-only and unregistered. `-DskipSign` does not skip signing: the guard is the environment variable `SKIP_SIGN` |
| Cyberduck `fc0d437` | 1 | not instrumented | manual | the audit was not re-run for this pilot |
| Cyberduck `fc0d437` | 2 | not instrumented, authoring | manual | the classification found the field this application is about, and it was written before the contract |
| Cyberduck `fc0d437` | 3 | not instrumented separately | | `generate --check` was run and exited 0; the clock was not taken, so the cell says so rather than quoting a neighbouring pilot's number |
| Cyberduck `fc0d437` | 4 | 63 core, 35 integration, 20 index checks, written before the implementation | shell, three runs | the core suite writes a real `.duck` file carrying all thirteen keys `Host.serialize` can write and asserts the record that comes back renders none of the sensitive ones |
| Cyberduck `fc0d437` | 5 | core 1.09 s, integration 3.31 s, index 3.28 s | `/usr/bin/time -p` on each suite | the suites are the gate, so their cost is counted once |
| Cyberduck `fc0d437` | 6 | 2 failed builds of the `app` target, then BUILD SUCCEEDED | shell, three `xcodebuild` runs | the first failed because the generated file had not been added to the target, the second on a missing `OSLog` import. Five objects and a `Cyberduck.swiftmodule` in both architectures, checked rather than trusted |
| Cyberduck `fc0d437` | 7 | not instrumented separately | | the metadata extracted on the first run with no failed round, the only pilot for which that is true |
| Cyberduck `fc0d437` | 8 | under 1 s plus the gate suites, and **certified on the first run** | `/usr/bin/time -p` | the only pilot to certify on its first run |
