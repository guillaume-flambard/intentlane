# IntentLane capability audit guide

`intentlane audit` answers one question before any code changes: what can this
app already do with Siri, Apple Intelligence, Shortcuts and Spotlight, and what
is missing. It reads a repository and never writes to it, so it is safe to run
on a fork, a checkout or a pilot candidate.

This guide is the reading companion for the audit output. The pilot process
around it lives in [PILOT-PLAYBOOK.md](PILOT-PLAYBOOK.md), and the specification
of the auditor itself is [AUDITOR-SPEC.md](AUDITOR-SPEC.md).

## Run the audit

```sh
npx intentlane audit ./path/to/app --platform macos --format json --output audit.json
```

| Option | Meaning |
| --- | --- |
| `--platform <macos\|ios\|both>` | Target platform. `both` runs macOS then iOS and returns two reports. |
| `--format <text\|json\|sarif>` | Output format. SARIF is 2.1.0 and carries one run per platform. |
| `--output <file>` | Write the report to a file instead of standard output. |
| `--min-macos`, `--min-ios` | Deployment floor to record in the target. |
| `--sdk-path <path>` | Read the installed SDK `SDKSettings.json` and record its version. |
| `--build-metadata <path>` | Read an existing `Metadata.appintents` directory or `extract.actionsdata` file. |
| `--strict` | Exit non-zero when a high-confidence blocker is found. |

The audit runs offline, needs no Apple account and never builds the project.

## Read the report

The text output starts with the target and the score, then one line per block
that applies, then one line per capability:

```text
target Notes (macos 27.0)
score 24/100 (early, schema-backed) 20/84 points
route native (high)
data public (privacy declared)
architecture local (high)
conditions 5/9 recorded
quality 5/5 signals (0 issue(s))
catalogue 27.0 (current)
macos implemented foundation.app-intent (high)
```

- **`score`** measures how much of the capability catalogue the project reaches.
  A conformance that moves a capability from `implemented` to `tested` therefore
  moves the score, and a protocol-backed schema conformance shows up as the
  `semantics` capabilities reaching `implemented`.
  Each capability the target platform ships is worth up to three points:
  `detected` earns one, `implemented` two and `tested` three. A capability the
  platform does not ship is left out of the denominator instead of lowering the
  score. The band is `none`, `early`, `partial`, `close` or `ready`.
- **`discovery`** is the field that matters most for a pilot. It is
  `schema-backed` when a `semantics` capability is at least `implemented`,
  `shortcuts-only` when only the Shortcuts surface is, and `none` otherwise. A
  project can therefore be `shortcuts-only` and still score low on schema work,
  which is the difference the whole audit exists to expose.
- **`route`** says how the app is built: `native`, `bridged` (a cross-platform
  framework produces the native target), `ineligible` (web only) or `unknown`.
- **`data`** names the data classes read from declared property names and
  whether a privacy manifest ships when the project indexes entities.
- **`architecture`** says where the content comes from: `local`, `synced`,
  `remote` or `unknown`. A remote-only project needs `IntentValueQuery` and a
  latency plan before a date or a price is promised.
- **`conditions`** records the conditions a capability test depends on. Five are
  read locally (OS version, Xcode version, architecture, locale, region) and
  four stay `unknown` until a person confirms them (Apple Intelligence hardware,
  account, permissions, test data).
- **`quality`** reads the action signals: a result the system can show, a view,
  a registered shortcut, the `applicationName` placeholder and a confirmation
  before a risky action. A phrase without the placeholder is raised as an issue.
- **`catalogue`** names the catalogue version and whether the inspected SDK is
  older or newer than it.
- **`targets`** scopes the findings to the Xcode targets that compile for the
  requested platform. It follows each target's `.xcconfig` chain for `SDKROOT`
  and expands the synchronized folders it compiles, so an intent only the iOS
  target builds is not reported as implemented on macOS. A file no target owns
  is kept, because its platform is ambiguous.

Each capability line carries a state, and the states are ordered:
`unsupported` (the target platform does not ship it), `unknown` (no evidence
either way), `detected` (declared without everything it needs), `implemented`,
`tested` (metadata proves it is registered) and `feasible` (bounded remaining
work).

## Diagnostic codes

| Code | Meaning | Blocks `--strict` |
| --- | --- | --- |
| `ILA100` | The capability is not available on the target platform. | No, it is informational. |
| `ILA110` | The capability is declared without the companions it requires. | Yes. |
| `ILA130` | A schema domain conforms only one side, an action or its content. | Yes. |
| `ILA140` | Shortcut-only evidence does not establish Siri or Apple Intelligence discovery. | Yes. |
| `ILA150` | The capability belongs to an advanced group that IntentLane adds only with a pilot journey. | No, it is advisory. |
| `ILA160` | The capability needs a newer SDK than the one inspected. | Yes. |
| `ILA170` | The file is not valid audit JSON. | No, `audit-diff` exits before any delta. |
| `ILA171` | The report version is not the supported `1.0`. | No, `audit-diff` exits before any delta. |
| `ILA172` | A platform is present on one side of the diff only. | No, `audit-diff` exits before any delta. |
| `ILA173` | The evidence an entry cites is not evidence for that capability. | Yes. |
| `ILA174` | A capability needs a ledger observation no run can produce. | No, it is why the claim stays pending. |
| `ILA175` | The evidence ledger's conditions do not match the claim it supports. | Yes, `--strict` exits non-zero. |
| `ILA176` | A pilot manifest is malformed: a missing path, an empty claim set, or a gate that is not an object. | Yes, `verify` refuses to run. |
| `ILA177` | A pilot manifest declares a claim that is not in the registry. | Yes, certification refuses to run on a claim it cannot resolve. |
| `ILA178` | A declared claim has no command, so nothing can settle it. | Yes, `verify` refuses to certify it. |
| `ILA179` | A run journal is not a JSON document, or a step claims `pass` with no evidence, or a `blocked` step carries no diagnostic. | Yes, `pilot run` refuses to resume on it. |
| `ILA180` | A run journal has the wrong type where the schema expects one, for example a commit that is not a revision or an attempt count above the repair budget. | Yes, `pilot run` refuses to resume on it. |

`ILA120` is reserved and not emitted yet.

`ILA173` to `ILA178` are emitted by the pilot machinery rather than by the audit
itself: the evidence and ledger codes by `intentlane evidence validate`, and the
manifest codes by `intentlane verify --pilot`. They live in the same registry
because they block the same commands under `--strict`, and the registry is
exported as `AUDIT_DIAGNOSTIC_CODES` from `@intentlane/core`.

`ILA179` and `ILA180` come from the run journal, which `intentlane pilot run`
reads to decide where to resume. A journal is refused rather than repaired, because
a run that trusts a malformed record will skip a step it never did.

## Baseline a pilot candidate

1. Pin the upstream revision and record the licence, the build path, the Xcode
   and OS versions, and the deployment floor.
2. Run the audit on that exact revision in all three formats and keep the files
   next to the evidence ledger. The JSON is the machine-readable baseline.
3. Record what the report says about existing shortcuts and intents, and about
   the missing schema-backed discovery, as evidence rather than assumption.
4. Re-run the same command after the implementation, then compare the two
   JSON reports without re-reading the repository:

   ```sh
   npx intentlane audit-diff baseline.json candidate.json
   npx intentlane audit-diff baseline.json candidate.json --format json --output delta.json
   npx intentlane audit-diff baseline.json candidate.json --fail-on regression
   ```

   The join key is the platform and capability pair, so a fork compares
   against its upstream even when the target names differ. A state that moves
   down the public order is a regression, a state that moves up is a
   progression, and a capability that appears or disappears is an unclassified
   change, never an inferred gain. SDK, catalogue, conditions, target, route,
   architecture, data and quality differences are reported as context, without
   a positive or negative rank, and the score is derived from each report, not
   compared as primary proof. `--fail-on regression` renders the delta first
   and exits non-zero only when at least one regression exists, which makes it
   a CI gate. A file that is not valid audit JSON fails with `ILA170`, an
   unknown report version with `ILA171`, and a platform present on one side
   only with `ILA172`; in each case no partial delta is emitted.
5. Add `--build-metadata` once a build exists, so the capabilities that the
   extracted metadata proves move from `implemented` to `tested`.

## Boundaries

- The audit is read-only. The audited worktree is unchanged, and its fingerprint
  is the same before and after.
- Evidence, never inference. An absence is `unknown`, not `missing`.
- A generic `AppShortcutsProvider` is never reported as Siri or Apple
  Intelligence discovery. Shortcuts are automation support.
- The audit observes the repository, the installed SDK and extracted metadata.
  It never observes a live Siri session, so `proof.siri-surface` stays at most
  `detected` until a person records a manual test.
- An `.xcodeproj` in the tree is not proof that the audited platform is native
  there. A repository can ship a macOS crash reporter or a macOS audio library as
  Xcode projects while its application is C++ built with waf, which is what Ardour
  does. The route therefore needs positive evidence that no target compiles for
  the audited platform before it downgrades, and a target whose platform could not
  be resolved is still treated as a target rather than as an absence.
- A target inherits its build settings from the project, so `SDKROOT` is often
  declared once on the project's build configuration list and never on the target.
  A target-level setting still wins over the project one. CotEditor declares
  `SDKROOT = macosx` that way, and reading only the target resolved no platform
  and reported discovery over the whole tree.
- A missing directory is refused by name rather than answered with an empty
  report, because an empty report is indistinguishable from a project that
  implements nothing.
- Apple documents certain schema domains as Shortcuts-only. A conformance in one
  of them is never used as evidence that Siri AI understands the application, and
  the score reports those domains separately so the two cannot be confused.
