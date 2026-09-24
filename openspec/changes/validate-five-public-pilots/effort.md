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
| 1 | Audit |
| 2 | Contract and claim set |
| 3 | Generation |
| 4 | Mapping, including 4.1 for a non-Swift target |
| 5 | Tests, including the exact negative |
| 6 | Build |
| 7 | Metadata |
| 8 | Certification |

## Sheet

| Pilot | Stage | Minutes | Recorded by | Note |
| --- | --- | --- | --- | --- |
| FSNotes `a96b9b5` | Q | not instrumented | manual | done before this sheet existed; see `candidates.md` |
| FSNotes `a96b9b5` | 1 | 3.4 s of tool time, plus reading | `/usr/bin/time -p` | re-measured after the tool fixes; the tool is fast, the reading is the cost |
| FSNotes `a96b9b5` | 2 | not instrumented, authoring | manual | the validate command itself is fast; the cost was reading the model and deciding what not to expose |
| FSNotes `a96b9b5` | 3 | 1.6 s of tool time | `/usr/bin/time -p` on each of validate, generate, `--check` | generation is effectively free once the contract is right; the cost of this stage was paid in stage 2 |
| FSNotes `a96b9b5` | 3 | pending | | |
| FSNotes `a96b9b5` | 4 | pending | | Swift target, so 4.1 does not apply |
| FSNotes `a96b9b5` | 5 | pending | | |
| FSNotes `a96b9b5` | 6 | pending | | |
| FSNotes `a96b9b5` | 7 | pending | | |
| FSNotes `a96b9b5` | 8 | pending | | |
| HandBrake `1255087` | Q | 3 | `time` around the audit | 77 `.m`, no Swift |
| HandBrake `1255087` | 1 to 8 | not started | | |
| LuLu `7d2669e` | Q | not instrumented | manual | done before this sheet existed |
| LuLu `7d2669e` | 1 to 8 | not started | | |
| Transmission `48835c6` | Q | not instrumented | manual | done before this sheet existed |
| Transmission `48835c6` | 1 to 8 | not started | | |
| Cyberduck `fc0d437` | Q | not instrumented | manual | done before this sheet existed |
| Cyberduck `fc0d437` | 1 to 8 | not started | | |
