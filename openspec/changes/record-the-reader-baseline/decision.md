# Why the reader audit baseline was re-recorded

## The disagreement

Three artifacts in this repository disagreed about what the `reader` example app
is, and the CI job `Extract the App Intents metadata for macOS` was red because
of it.

| Artifact | Claim |
| --- | --- |
| `packages/core/src/audit-detect.ts` | `reader` is a Shortcuts-only schema domain |
| `apps/example-macos/baseline/reader-macos.json` | the reader audit is `schema-backed` |
| `.github/workflows/ci.yml` | the reader audit is `schema-backed` |

## Which one is right

The code. `openspec/changes/add-asri-adapter-templates/proposal.md` records the
reason in the decision that introduced the classification:

> The previous NetNewsWire pilot hid that gap behind a Reader schema. Apple
> classifies Reader as Shortcuts-only, so it cannot be used to claim Siri AI
> discovery.

and the matching spec makes it a requirement, not an observation:

> The system SHALL treat primary Siri AI schemas and Shortcuts-only schemas as
> different offers, and audit output classifies it as Shortcuts-only and it
> cannot satisfy a Siri requirement.

The baseline and the two assertions were written before that decision and were
never revisited. Reporting the reader example as `schema-backed` would let a
customer claim Siri AI discovery through a schema Apple does not expose to
Siri, in a tool whose entire purpose is to keep machine facts and marketing
apart. That is the failure this repository exists to prevent.

## What the re-recording absorbed

Re-recording the baseline also absorbed a second, unrelated staleness. The
baseline was recorded under scoring model `1.0` with 28 applicable
capabilities. The model is now `1.1` with 51. The delta was therefore two
changes at once:

- 5 regressions, all downstream of the Shortcuts-only classification:
  `proof.siri-surface`, `semantics.app-schema`, `semantics.schema-completeness`,
  `semantics.schema-intent`, `semantics.schema-entity`, each `implemented` or
  `detected` down to `unknown`.
- 1 progression: `semantics.shortcuts-only-schema`, `unknown` to `implemented`.
- 23 added capabilities, **every one of them `unknown`**. Recording `unknown`
  claims nothing; it records that the audit did not detect them.

`quality.issues` is empty in both the old baseline and the new one, so nothing
was stamped over.

## Why the assertions changed rather than the code

The alternative was to remove `reader` from `SHORTCUTS_ONLY_SCHEMA_DOMAINS` so
the existing assertions kept passing. That was rejected: it contradicts a
recorded product decision in two places, and it would produce a false claim in
a client-facing report.

## Consequence for the guard

`ci.yml` runs the reader audit through `audit-diff --fail-on regression` against
this baseline. A baseline recorded under a retired scoring model cannot serve as
a regression guard across a model generation, so re-recording was required for
the job to pass at all, not merely convenient. The guard now reports
`0 regression(s), 0 added, 0 removed` against a fresh run.
