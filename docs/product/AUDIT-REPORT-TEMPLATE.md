# IntentLane audit report template

This is the skeleton for the client deliverable produced from an
`intentlane audit` run. It exists so every report sent to a buyer has the same
shape, states automated facts before human judgement, and keeps the manual
evidence separate from the machine evidence.

Rules for filling it in:

- Every number in sections 1 and 2 is copied from the audit output, never
  recomputed, never paraphrased into a metric the tool does not produce
  (there is no "semantic coverage percentage"; there is a score over the
  capability catalogue with its band and denominator rules).
- An absence is `unknown`, not `missing`. If the auditor left an aspect
  `unknown`, the report says `unknown` and section 4 or 5 explains why.
- Section 3 is written by a person, after reading the report and, when a
  communal demand exists, after a manual Siri, Spotlight or Shortcuts test.
- The report is dated, pinned to the audited revision, and reproducible: a
  client must be able to re-run the command and get the same machine facts.

## 1. Facts from the audit run

Copy these lines from the text report. Do not interpolate.

```text
target ________ (macos/ios ______)
score ____/100 (band ______) ____/____ points
route ______ (confidence)
data ______
architecture ______
conditions ____/9 recorded
quality ____/____ signals (____ issue(s))
catalogue ______ (____)
```

Mandatory context lines, copied verbatim:

- audited revision: full SHA and date, plus repo URL or fork provenance.
- command run (exact flags from `npx @memolabs-apps/intentlane audit ...`, including
  `--platform`, `--min-macos`/`--min-ios`, `--sdk-path` when provided).
- Xcode version and OS version of the machine that ran the audit.
- licence and build path recorded at baselining.

## 2. Discovery block, the part that decides the pilot

State `discovery` exactly as reported (`schema-backed`, `shortcuts-only`,
`none`). If the value is `shortcuts-only`, the report must say, in one
sentence, why that does not establish Siri or Apple Intelligence discovery
(`ILA140` evidence class), and what the first bounded step to change it is.

List the capability lines that apply, verbatim, sorted by their materiality
to the buyer's named journeys rather than by audit order. For each line:

```text
<capability> <state> (<code>)
```

Then the shortlist of diagnostics that matter, with their `ILA` code and the
one-line meaning from `AUDIT-GUIDE.md`.

## 3. Named journeys, human judgement, after reading the report

One short block per journey the buyer actually wants, in their vocabulary:

```text
Journey: < buyer wording >
Current state: < what section 1 and 2 prove, with codes >
What Siri needs to understand: < entities, actions, schema domain >
Missing work: < implemented -> tested steps, or detected -> implemented >
Unknowns: < hardware/account/permissions/test data conditions >
```

Journey judgements cite section 1 facts, never override them. If a journey
claims something the audit does not support, it is written as an assumption
with an owner and a test, not as a fact.

## 4. Unknowns and manual evidence ledger

The four conditions the audit cannot observe on its own:

```text
Apple Intelligence hardware and OS setting confirmations by the client
account sign-in and locale of the test device
permissions granted during a manual test
test data (what makes discovery real)
```

Manual Siri/Spotlight/Shortcuts acceptance is never replaced by this
template: it lives in the pilot runbook and is recorded as its own evidence
step (`proof.siri-surface` stays at most `detected` until a person records
the manual test).

## 5. Proposed next gate

Pick exactly one:

- `audit-diff` after implementation: baseline `audit.json` and
  `candidate.json` compared with `--fail-on regression` as the CI gate.
- `--build-metadata` step: move `implemented` capabilities to `tested` from
  the extracted metadata once the client's build exists.
- personal test session: the manual Siri/Spotlight acceptance script for the
  highest-value journey.

One closing paragraph, buyer vocabulary, no percentages invented: what is
proven, what is feasible, what is worth a sprint. The offer, scope and
pricing live in `AUDIT-OFFER.md`, not here.
