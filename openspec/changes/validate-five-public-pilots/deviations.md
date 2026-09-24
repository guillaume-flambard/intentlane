# Deviation log

One row per point where a pilot could not follow `recipe.md` as written. This is
the measurement instrument for repeatability: five pilots that each needed a
different invention mean the recipe is not yet a method, and that is the finding,
not a failure of the pilot.

A deviation is recorded when the stage had to be done differently, when the
recipe's command could not settle the stage, or when the recipe turned out to be
ambiguous. It is not recorded for a stage that simply took longer.

## Format

| Field | Meaning |
| --- | --- |
| Pilot | Application name, with the pinned revision |
| Stage | The stage number and name from the recipe |
| Recipe said | What v1 instructs, quoted closely enough to identify |
| This pilot needed | What was actually done |
| Why | The reason, in terms of the application or the platform |
| Extra effort | Minutes beyond the recipe, with how they were measured |
| Consequence | What this says about the recipe: keep, amend, or cannot automate |

## Log

| Pilot | Stage | Recipe said | This pilot needed | Why | Extra effort | Consequence |
| --- | --- | --- | --- | --- | --- | --- |
| FSNotes `a96b9b5` | 1, audit | Audit the pinned revision and keep the JSON | Re-audit after two tool fixes, then re-measure | The first classification used a tool that missed an inherited SDKROOT and could claim a native route with no target | 0, already spent fixing the tool | keep |
| FSNotes `a96b9b5` | 4, mapping | Map the client object | Not started | Not reached | 0 | not reached |
| FSNotes `a96b9b5` | 5, tests | Contract, integration and the exact negative | Not started | Not reached | 0 | not reached |
| FSNotes `a96b9b5` | 6, build | Build the app target | Not started | Not reached | 0 | not reached |
| FSNotes `a96b9b5` | 7, metadata | Extract and compare metadata | Not started | Not reached | 0 | not reached |
| FSNotes `a96b9b5` | 8, certification | `verify --strict` certifies the declared set | Not started | Not reached | 0 | not reached |
| HandBrake `1255087` | 4.1, mapping | Map the client object in Swift | Requires adding Swift to an Objective-C app target first | The app target is 77 `.m` files and no Swift; App Intents is Swift | not measured, pilot not started | amend: 4.1 is mandatory for 4 of 5 candidates |
| HandBrake `1255087` | 8, certification | `verify --strict` certifies the declared set | Not started | Not reached | 0 | not reached |
| LuLu `7d2669e` | 4.1, mapping | Map the client object in Swift | Requires adding Swift to an Objective-C app target first | The app target is 27 `.m` files and no Swift | not measured, pilot not started | amend: same as HandBrake |
| Transmission `48835c6` | 4.1, mapping | Map the client object in Swift | Requires adding Swift to an Objective-C app target first | The app target is 81 `.m` files and no Swift | not measured, pilot not started | amend: same as HandBrake |
| Cyberduck `fc0d437` | 4.1, mapping | Map the client object in Swift | Requires Swift in a thin Objective-C shell over a Java application | The Xcode app target is 6 `.m` files; the application itself is Java | not measured, pilot not started | escalate: the recipe may not apply to a Java application |

## Notes on the entries already recorded

- The FSNotes stage 1 entry is a real deviation, and an unusual one: the recipe
  was followed exactly, and the measurement instrument was wrong. The audit
  misread an inherited SDKROOT, so the qualification was re-run on a fixed tool.
  It is logged because a pilot that is reclassified for any reason is a pilot
  whose first number cannot be trusted.
- The four 4.1 entries are recorded before the pilots start, which is not how
  this log is meant to be used. They are here because the measurement is already
  made: the language of each app target is known from stage 1. The effort column
  stays empty until the stage actually runs, because an estimate recorded as a
  measurement would corrupt the sheet this campaign exists to produce.
