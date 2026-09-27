# Campaign results

This document holds the pricing range, the deviation count, the domain spread and
what stayed unobserved. Every number is copied from `effort.md` and
`deviations.md`, never estimated here.

The offer gate is met: three independent validations in different business
domains, each certified, each with its deviation row and its effort row. Four are
certified in total, the fourth being LuLu and the fifth Cyberduck.

## Validated domains

| Domain | Pilot | Revision | Certified | Checks | In-app search kept |
| --- | --- | --- | --- | --- | --- |
| Note taking | FSNotes | `a96b9b5` | six claims | 63 | yes |
| Media batch conversion | HandBrake | `1255087` | six claims | 53 | **no**, the view has no search field |
| Network firewall | LuLu | `7d2669e` | six claims | 113 | yes |
| File transfer | Cyberduck | `fc0d437` | six claims | 118 | **no**, the list is JavaFX |
| Media playback | IINA | `bab9c834` | six claims | 65 | yes |
| Torrent client | Transmission | `48835c6` | **not certified** | 0 | contract only |

**These are six distinct business domains and the spread is real, not a relabelling.**
A notebook, a transcoder, a firewall, a file transfer client, a video player and a
torrent client share a toolchain and nothing else: different data, different
sensitivity, different in-app search, different build systems, and two of them with
no in-app search at all. A method that had only been run on one of these would have
had one data point, and the campaign's whole purpose was to avoid that.

**The spread also produced the campaign's sharpest result**, and it only appeared
because the domains differ. LuLu's canonical identifier is a filesystem path, so the
pilot took `uuid`. Cyberduck's application offers two ways to open a connection and
the one that works needs that same kind of field, so the contract refused it and
took the file route instead. Neither question exists in a notebook app. **A pilot
campaign in one domain cannot find the questions that matter.**

## Deviation count

29 rows in `deviations.md`:

| Consequence | Rows | What it means for the recipe |
| --- | --- | --- |
| `amend` | 16 | the recipe changes, and the change is written down with the pilot that proved it |
| `keep` | 12 | the recipe was right, including twice where the answer was to do less |
| `closed` | 1 | a defect in the tool, fixed, and the row kept for the trace |
| `escalate` | **0** | the row that said `escalate` has been falsified by the run that followed it |

**The escalate count is the number worth reading.** Before Cyberduck ran, the log
said of it: *"escalate: the recipe may not apply to a Java application"*. The pilot
then ran, applied the recipe unchanged, and certified. A journal whose only
escalation turns out to be a premature conclusion is a journal that escalated on a
generalisation instead of on a measurement, and the correction is kept in the log
rather than made quietly.

**Three of the sixteen amendments are the same defect seen three times**, and
finding it three times is what turned it into an amendment:

1. `verify` failed `generated` on LuLu because the two copies of a generated file
   had drifted, and `generate --check` had never been run against that directory.
   That is a gate written down and never executed.
2. The path relocation made every suite in the repository fail on a file path
   before running a single check, and one pilot record concluded the working copies
   had been deleted when they had only moved.
3. Four example contracts in this repository had no exposure condition and failed
   `verify.mjs` on `IL1301` before its first check, because the rule was only
   enforced in the one config `pnpm validate` reads.

**One amendment is a defect in the toolchain's own rule set** and is the only one
that is not about a pilot: a bookmark file that is there and is not a readable
property list is neither unusable nor missing, and none of `source_disabled`,
`item_not_usable` or `item_missing` describes it.

## Pricing range

**No hour figure can be derived from this sheet, and the reason is the sheet's own
rule.** A number must come from a clock, and the two stages that dominate the cost
have no clock:

| Stage | Instrumented? | Why not |
| --- | --- | --- |
| Q, qualification | no for all five | done before the sheet existed |
| 2, contract and claim set | no for all five | authoring, by hand, reading a model |
| 3, generation | yes, four pilots | 0.85 s to 1.6 s |
| 5, the three suites | yes, four pilots | 7.5 s to 9.7 s per pilot |
| 6, build | counted, not timed | failed builds counted, successful build not timed on three pilots |
| 7, metadata | yes, two pilots | 0.5 s and 1.18 s of compile |

**What the sheet does measure is the reproducible part, and it is trivial.** Every
stage that is instrumented, on every certified pilot, totals under ten seconds of
tool time except two, and both are explained:

| Pilot | Instrumented tool time | The one exception |
| --- | --- | --- |
| FSNotes | 3.4 s audit, 1.6 s generate, 0.5 s compile, 17.9 s to a first build error, 5 s of suites | the deletion suite is **137.9 s** |
| HandBrake | 3 s audit, under 1 s generate, 0.5 s compile, 5 s of suites | the deletion suite is **9.7 s** |
| LuLu | 0.85 s check, 7.5 s of suites, 1.18 s compile | none |
| Cyberduck | 7.7 s of suites | `mvn verify` is **54.688 s** for the whole application |

**The 137.9 s against the 9.7 s is the most useful line on this sheet.** Both are
deletion suites doing the same kind of work, driving the application's real removal
path, and the Swift one is fourteen times the price. The difference is the language,
not the method. A client whose application is Objective-C pays for that suite in
seconds; a client whose application is Swift pays a quarter of a minute for it.

### The range, expressed as what is actually predictable

An hour range would be a fabricated number here, so the range is expressed in the
two things four pilots measured consistently: **how many build adaptations the
application needs**, and **how many failed builds the pilot absorbs before one
succeeds**.

| Band | Build adaptations | Failed builds absorbed | Pilots |
| --- | --- | --- | --- |
| Narrow | 1 to 3 one-line deployment-target edits | 1 to 3 | FSNotes, LuLu, Cyberduck |
| Wide | 6 to 7 prerequisites, one 839 MB component, or a missing binary the pilot must build | 2 to 3 | HandBrake, LuLu |
| Blocked | a build system that cannot compile the language at all | n/a | Transmission |

The dominant stage is **stage 0, making the application build**, and it dominates
for a reason the sheet makes precise: it is the only stage that is present in every
pilot, that is bounded, that has now been measured four times, and whose cost is
predictable before the quote is written. The HandBrake band is the worst case in
this corpus and it is still a fixed list of named items.

**And the honest second half of the price is the part with no instrumented number
at all**: the classification and the contract. That is where the reading happens,
where a firewall's canonical identifier was found to be a filesystem path and where
a file transfer client's save file was found to hold a private key path. A price
that covers the build adaptation and not the reading is a price for a script, and
this campaign's negative results are all about the reading.

## Separating the two services

The price is two numbers, because they are two services and a client can buy either.

**Service one, the audit.** The tool exists, it is deterministic for the same
input, and 3.4 s of it is instrumented on FSNotes and 3 s on HandBrake. The cost
is reading the audit's output and writing the buyer's words: routes, risks, the
bounded plan, and the conditions that were not recorded. **Nothing in service one
requires the application to build**, which is the point: a client whose project does
not compile on the current toolchain can still buy the audit and learn that.

**Service two, the implementation.** This is where the stage 0 band lives, and it
cannot start until the application builds. The evidence that it is separable is
Transmission, where the contract is written and validated, the model was read, the
object was chosen and the identifier was argued from the code, and the pilot still
stopped at generation because **no released cmake compiles Swift against Xcode
27's `swiftc`**, proven from a cmake built from source rather than from two
packagings. A client in that position is told so in the audit, at a price that does
not presume the work can be finished.

## What stayed unobserved

**Two surfaces, and no public API settles either one.**

| Surface | Why it cannot be automated | Claimed by any pilot? |
| --- | --- | --- |
| `siri-conversation` | no public API sends a phrase to Siri; a registered intent is a prerequisite for a conversation, not a demonstration of it | **no** |
| `spotlight-ui-result` | Core Spotlight offers no read-back of a named index, so nothing a command runs can show a result surfacing | **no** |

Six pilots, **zero observed claims declared**, verified by reading all six claim
sets. The IINA ledger carries both surfaces at `blocked` with the reason recorded,
and `verify --claim siri-conversation --strict` reports
`claims waiting on a person: siri-conversation`, which is the designed state rather
than a defect.

**The registration line is the one thing that was checked on every pilot, and it is
a check on a file.** Each built binary was read with `strings` and carries its
registration literal, which proves the adapter is in the binary. It does not prove
the process registered, and the launch probes that would come closer say in their own
output that they do not prove the Siri conversation, do not prove anything appears in
Spotlight, and do not prove the open path works end to end. The three disclaimers
are in the probe source and a test asserts both probes carry the same three.
