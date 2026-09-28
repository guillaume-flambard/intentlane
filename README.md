# IntentLane

[![CI](https://github.com/guillaume-flambard/intentlane/actions/workflows/ci.yml/badge.svg)](https://github.com/guillaume-flambard/intentlane/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

IntentLane audits an existing iOS or macOS repository and tells the team which
Siri, Spotlight, Shortcuts, and Apple Intelligence journeys are feasible, which
parts already exist, and what evidence is still missing.

It is both a deterministic developer tool and the engine behind a fixed-scope
compatibility audit. The auditor is read-only. The generator leaves data access,
permissions, navigation, and side effects in application-owned adapters.

## What it decides

- Which App Intents, entities, and App Schemas the target already carries.
- Whether the integration is native, bridged, ineligible, or still unknown.
- Which claims are supported by source, build metadata, tests, or observation.
- What one to three named user journeys would require before implementation.

IntentLane keeps build success, extracted metadata, Spotlight indexing, and a
journey observed in Siri as separate claims. It does not promise universal voice
control or guaranteed natural-language behavior.

## Try the published CLI

The public package today is `@memolabs-apps/intentlane@0.1.0`. Install it in the
repository you want to inspect:

```sh
npm install --save-dev @memolabs-apps/intentlane@0.1.0
npx intentlane audit . --platform macos
```

Use `--platform ios` for an iOS target, or request machine-readable output:

```sh
npx intentlane audit . --platform macos --format json --output intentlane-audit.json
```

The audit does not modify the inspected repository. It reports evidence,
confidence, gaps, and a next action for each capability.

The package also exposes the versioned `0.1` contract workflow:

```sh
npx intentlane init
npx intentlane validate
npx intentlane generate
npx intentlane doctor
```

`init` refuses to overwrite an existing contract unless `--force` is explicit.
`generate` owns only its output directory. `generate --check` exits non-zero when
the generated output is stale or was edited by hand.

## Published package and `main`

The npm package is the last published snapshot. The `main` branch is ahead of
that package and contains work that has not been released to npm yet, including
the client deliverable renderer, the Studio application, and broader schema
support. Those capabilities are source-visible and CI-tested, but they are not
part of the installable `0.1.0` promise.

The Expo config plugin is also present in this repository and used by the
example app, but it is not published on npm today. Do not add it to an external
application yet. Contributors can exercise it from this workspace with
`apps/example-expo`.

## Evidence on `main`

The current CI workflow verifies:

- TypeScript typechecking and the complete automated test suite.
- Contract validation and byte-for-byte deterministic generation.
- Generated Swift compilation across the supported runner matrix.
- App Intents metadata extraction on macOS.
- An Expo prebuild and Release simulator build.

The live workflow result is the source for current counts and status. Documents
do not copy a test total that becomes stale after the next capability lands.

Evidence has limits:

| Layer | What it proves | What it does not prove |
| --- | --- | --- |
| Source inspection | A capability is declared or implemented in a target. | That the target builds. |
| Build and metadata | Apple tooling accepted and registered the capability. | That Siri selects it. |
| Automated application tests | The resolver, permissions, routing, and side effects satisfy the app contract. | That a system surface displays the result. |
| Human observation | A named journey appeared and completed under recorded conditions. | That every phrasing or environment will behave the same way. |

No public case study currently claims a verified Siri conversation. The first
external-user quickstart measurement is also still open.

## Repository map

| Path | Purpose |
| --- | --- |
| `packages/schema` | The versioned YAML contract and validation. |
| `packages/core` | Audit, evidence, diagnostics, normalized data, and release gates. |
| `packages/generator-apple` | Deterministic Swift generation. |
| `packages/expo-plugin` | The unpublished Expo config plugin. |
| `packages/cli` | The `intentlane` command. |
| `apps/example-macos` | A project-free macOS metadata extraction fixture. |
| `apps/example-expo` | The workspace-only Expo integration fixture. |
| `apps/studio` | The unreleased macOS operator application. |
| `pilots` | Public-app pilot contracts and automated evidence. |
| `docs` | Product, architecture, Apple, audit, and pilot documentation. |

Start with [the documentation index](docs/INDEX.md). The normative contract is
[SPEC.md](SPEC.md), and the audit output is described in
[AUDIT-GUIDE.md](docs/product/AUDIT-GUIDE.md).

## Contribution paths

The most useful contributions are:

- A reproducible report from running the published audit on a public or
  non-confidential app.
- A contract shape the current schema cannot express.
- A diagnostic that is missing or unclear.
- Documentation that disagrees with released behavior.
- A focused test for an Apple SDK behavior already present in the repository.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening an issue or pull request.
Never paste proprietary source, secrets, private filesystem paths, or client data
into a public issue. Security reports follow
[SECURITY.md](.github/SECURITY.md).

## Fixed-scope audit

For an existing iOS or macOS app, the commercial entry point is one repository,
one target platform, and up to three named journeys. The deliverable is an
evidence report, a feasible journey map, the implementation and safety gaps,
and a bounded implementation plan.

The public offer boundary is in
[AUDIT-OFFER.md](docs/product/AUDIT-OFFER.md). To discuss an app privately,
contact [Guillaume Flambard](https://www.linkedin.com/in/guillaume-flambard).

## License

IntentLane is available under the [MIT License](LICENSE).
