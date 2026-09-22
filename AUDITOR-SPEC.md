# IntentLane capability auditor specification

## Purpose

`intentlane audit` is a read-only repository analyser. For each requested
macOS or iOS target, it reports which Siri, Apple Intelligence, Shortcuts and
system-surface capabilities are supported by the target SDK, implemented by the
app, tested, feasible with bounded work, or blocked.

It is the service entry point. A generic App Intent can expose an action in
Shortcuts and Spotlight, but schema-backed Siri and Apple Intelligence journeys
need the relevant App Schema, entities, queries and real app implementation.
The capability inventory and Apple sources live in
[APPLE-27-APP-INTENTS-RESEARCH.md](APPLE-27-APP-INTENTS-RESEARCH.md).

## Boundaries

- Read-only: no change to the audited repository, lockfile, Xcode project,
  build products or credentials.
- Local by default: no source, telemetry, secret or proprietary data leaves the
  machine.
- Evidence, never inference: absence is `unknown`, not `missing`.
- macOS and iOS have distinct availability and results.
- Shortcuts-only schemas are reported as automation support, never Siri or
  Apple Intelligence discovery.

## Command contract

```text
intentlane audit [directory]
  --platform macos|ios|both
  --sdk-path <path>
  --min-macos <major.minor>
  --min-ios <major.minor>
  --format text|json|sarif
  --output <file>
  --build-metadata <path>
  --strict
```

The first release accepts Xcode projects, Swift packages, or Expo and React
Native apps with an iOS project. It must run without network access, an Apple
account or a build. `--build-metadata` may inspect an existing `.app` bundle
but never creates one.

## Evidence precedence

1. Target and deployment floor in the app project.
2. Build settings and Swift `@available` declarations.
3. App Intents source, metadata and test targets.
4. App configuration and dependencies, only for integration style.
5. IntentLane YAML, only as supporting evidence.

Ignore generated build folders, caches and vendored dependencies. Each evidence
item carries path, line when known, platform, confidence and observation time.

## Capability catalogue

Version the catalogue from the installed SDK and supplement it with the Apple
inventory. Each record has identifier, surface, platform availability, required
companions, evidence patterns, safety notes and commercial classification.

| Group | Required subjects |
| --- | --- |
| Foundation | `AppIntent`, parameters, result traits, `AppShortcutsProvider`, localisation |
| Semantics | App Schemas, schema completeness, entities and enums |
| Discovery | queries, `IndexedEntity`, Spotlight lifecycle |
| Cross-app | `Transferable`, intent values, view annotations |
| Relevance | donations, relevant entities, sync, ownership |
| Execution | native handlers, execution targets, long-running work, cancellation |
| Proof | confirmation, authentication, `AppIntentsTesting`, Shortcuts, Spotlight, Siri |

Schema records are exactly `siri_eligible`, `shortcuts_only`, or `unknown`.
They retain exact SDK symbols and availability instead of a blanket claim.

## JSON finding contract

```json
{
  "reportVersion": "1.0",
  "target": {"name": "App", "platform": "macos", "deploymentTarget": "27.0"},
  "capability": "schema.system.open",
  "state": "feasible",
  "confidence": "high",
  "evidence": [{"kind": "swift", "path": "Sources/App/Item.swift", "line": 42}],
  "requirements": ["AppEntity(schema:)", "schema-complete open action"],
  "gaps": [{"code": "ILA120", "message": "No schema-conformant open intent found."}],
  "nextAction": "Implement the domain package or scope this journey out."
}
```

`state` is one of: `unsupported`, `unknown`, `detected`, `implemented`,
`tested`, `feasible`. `tested` means a matching automated test or extracted
metadata exists. Only the pilot evidence ledger can mark a journey `verified`.

## Classification rules

1. Generic App Intent plus App Shortcuts is implemented for Shortcuts, not Siri
   discovery.
2. A schema declaration is detected until required companions, parameters,
   results and execution path exist.
3. `IndexedEntity` needs an indexing lifecycle, not just a conformance.
4. Write, delete, send, share and public-data journeys require confirmation,
   authentication and ownership evidence. Missing evidence is a high-severity
   finding.
5. Platform guards without deployment-target evidence are unknown.
6. Metadata proves registration, never live entity resolution or Siri language
   execution.
7. A journey is feasible only when the target SDK supports it and the missing
   business-logic scope is bounded.

## Acceptance criteria

1. Deterministic reports for macOS, iOS and unsupported fixtures.
2. Tests prevent generic shortcuts being classified as Siri discovery.
3. Tests label Shortcuts-only schemas correctly.
4. Tests distinguish iOS-only from macOS capability.
5. Existing IntentLane macOS schema output is `tested` for metadata, but not
   live Siri execution.
6. The audited worktree remains unchanged.
7. `pnpm test`, `pnpm build` and audit fixture tests pass.

Phase sequencing is normative in [SIRI-27-ROADMAP.md](SIRI-27-ROADMAP.md).
