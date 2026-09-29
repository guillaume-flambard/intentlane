# IntentLane CLI reference

Every command, every option, and what each one reports. What IntentLane is and
how to run it is in [README.md](../../README.md).

## CLI

The program reports its version with `intentlane --version` (`-V`) and prints usage with `intentlane --help`.

`intentlane init`

- `--config <file>`: file to create, default `intentlane.yaml`.
- `--app-id`, `--app-name`, `--url-scheme`: override the derived defaults.
- `--force`: overwrite an existing config.

`intentlane validate`

- `--config <file>`: YAML source, default `intentlane.yaml`.
- Prints structured diagnostics such as `IL1501` and exits non-zero on errors.

`intentlane generate`

- `--config <file>`: YAML source, default `intentlane.yaml`.
- `--output <directory>`: generated-source directory, default `ios/IntentLaneGenerated`.
- `--check`: verify the output without writing it, non-zero when stale.

`intentlane doctor`

- `--config <file>`: YAML source, default `intentlane.yaml`.
- `--output <directory>`: generated-source directory, default `ios/IntentLaneGenerated`.
- `--probe-model`: compile and run a Foundation Models availability probe, slower.

`doctor` reports one Apple precondition beyond the toolchain: whether the
enhanced Siri is served on this machine. Apple's Siri action routing ships in
waves, and a machine that is not served cannot route a request to any App Intent
whatever the quality of the implementation. Reading it matters because the
on-device language model reports itself available on a waitlisted machine, so
`SystemLanguageModel.isAvailable == true` is not a routing precondition. The
check reports the OS version, the SDK version and the configured Siri languages
alongside the state, and marks unavailable values rather than omitting them.

A blocked routing state never changes the result of a build. Generation,
compilation and metadata evidence stay valid on that machine, and only the Siri
layer of a capability ledger becomes `blocked`.

`intentlane verify`

Runs the release gates for one client integration: valid contract, fresh
generated source, an application-owned test command, extracted App Intents
metadata and optional pilot evidence. It deliberately reports live Siri and
Spotlight evidence separately from a green build. See
[AUTOMATED-VERIFICATION.md](../spec/AUTOMATED-VERIFICATION.md) for the command and
the client test contract.

`intentlane audit [directory]`

- `--platform <macos|ios>`: target platform, default `macos`.
- `--format <text|json|sarif>`: report format, default `text`; `sarif` emits SARIF 2.1.0.
- `--output <file>`: write the report to a file instead of stdout.
- `--min-macos <major.minor>`, `--min-ios <major.minor>`: record the deployment floor in the report target.
- `--build-metadata <path>`: inspect an existing `Metadata.appintents` directory or `extract.actionsdata` file, which promotes `foundation` and `semantics` capabilities from `implemented` to `tested`.
- `--sdk-path <path>`: read the installed SDK's `SDKSettings.json`, record its version in the report, and mark a capability `unsupported` when the SDK is older than the version that capability needs.
- `--strict`: exit non-zero when a high-confidence blocker was found. A capability the target platform does not ship (`ILA100`) is informational and never blocks, so `--strict` stays usable on a clean macOS project; an SDK older than the capability needs (`ILA160`) does block.

[AUDIT-GUIDE.md](../product/AUDIT-GUIDE.md) is the reading companion for that output: every option, every report block, the diagnostic codes and the recipe for baselining a pilot candidate.

`audit` analyses a project read-only and never writes to it. Every capability comes out as `unsupported`, `unknown`, `detected`, `implemented`, `tested` or `feasible`, with the evidence it used and the next action. A project that only declares an `AppShortcutsProvider` stays `implemented` for Shortcuts and `unknown` for Siri discovery: shortcuts alone never prove schema-backed Siri or Apple Intelligence. The auditor's diagnostics are prefixed `ILA`.

The report also states whether a schema domain is complete. A domain counts as complete when the project conforms at least one intent and at least one entity to it, which is what a usable journey needs: the action and the content it acts on. A domain with only one side is `detected` and reports `ILA130`, naming the counts, so a half migrated domain cannot pass `--strict`.

The advanced groups stay advisory until a pilot asks for them. `discovery`, `cross-app`, `relevance` and `execution` cover indexed entities, transfer and handoff, donations and relevance, sync and long-running work, and IntentLane adds each of them only with a documented pilot journey, a platform matrix and safety fixtures. A project that does not implement one reports `ILA150` with the group named, and the gap never blocks `--strict`, because an advisory finding is a scope hint rather than a defect.

Every report also carries a compatibility score. It is deterministic: each capability the target platform ships is worth up to three points, `detected` earns one, `implemented` two and `tested` three, and a capability the platform does not ship is left out of the denominator. The text output prints it on a `score <n>/100 (<band>, <discovery>) <points>/<maximum> points` line, and the JSON output adds a `score` object with the same numbers plus a count of every state. The band is `none` at zero, `early` up to 33, `partial` up to 66, `close` below 100 and `ready` at 100. `discovery` separates the two promises: `schema-backed` when a `semantics` capability is at least `implemented`, `shortcuts-only` when only the Shortcuts surface is, and `none` otherwise.

`intentlane deliverable <report.json>`

- `--out <file>`: write the document to a file instead of stdout.

Renders the client document from a report the audit already wrote. It is a
separate command rather than a fourth `--format` value, so the report contract
stays the report: a deliverable can be re-rendered from a report a client
already has, without re-auditing anything.

Every figure in the document is read from the report rather than computed from
it, score included, so the document can never disagree with the report it
describes. The document is in English, which is a known limit rather than a
design choice, and it carries a section for a person to record what they
observed on a device, written empty because the audit observes nothing: it
reads a repository and never runs the application.

The command refuses a report it cannot use, exits non-zero, names the file and
writes nothing at all: a report that is not JSON, a file that is not there, a
document that parses without being a report, and a report with no `score` block,
since rendering that one would mean inventing the figures.
