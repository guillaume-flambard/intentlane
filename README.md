# IntentLane

IntentLane audits which Siri, Shortcuts and Apple Intelligence journeys an existing iOS or macOS app can actually support, then generates the native App Intents integration for the ones worth building.

It is two tools over one contract. `intentlane audit` reads a repository and never writes to it. `intentlane generate` compiles a versioned YAML file into Swift. Neither runs a model, and neither touches the network, so the same input always produces the same output.

## Why it exists

Apple Intelligence integration is easy to overclaim. An App Intent can compile, ship, and still leave the journey you built undiscoverable in Siri, because a green build proves registration and not understanding.

IntentLane keeps three claims apart on purpose: a green build, metadata extracted from the built app, and a journey a person observed in Siri. A project that declares only an `AppShortcutsProvider` stays `implemented` for Shortcuts and `unknown` for Siri discovery, and the report says so. Recording those separately is the product, not a detail of it.

The entry offer is a fixed-scope audit of one app, one target platform, and up to three named journeys. IntentLane is built for founders, product leads, and Apple platform teams who have to make that decision before committing a sprint. It does not promise universal voice control or guaranteed natural-language behaviour, and the score it prints is not a readiness claim.

## State

Version `0.1`, MIT licensed. The contract validates, the generator emits compilable Swift, and the audit scores a project against what the target platform actually ships. `pnpm test` runs 884 tests across 60 files; CI compiles the generated Swift for iOS and for macOS and extracts the App Intents metadata with the Xcode toolchain.

- **Phase 1 is done.** The `0.1` contract validates, and the generator emits `AppIntent` values for `string`, `integer`, `number`, `boolean`, `date`, `datetime`, `enum`, `entity` and `entity_list` parameters.
- **Phase 2 is done except its gate.** `init` and `doctor` exist, the Expo config plugin resolves the generator from the consuming project and is idempotent, and `apps/example-expo` proves the path from YAML to an installed simulator build. The gate, an external user reaching that in under 30 minutes, is not measured.
- **Phase 3 is complete on paper.** Primitive and enum parameters, static App Entities with a resolver protocol, localized titles and prompts, the risk policy, a result dialog with a snippet view, a macOS runner in CI, and two example apps. Its gate, five pilots of which two are existing apps, is not measured either.

One packaging gap, recorded in [OPEN-CORE-READINESS.md](docs/product/OPEN-CORE-READINESS.md): `@memolabs-apps/intentlane@0.1.0` is on the public npm registry and `@intentlane/expo` is not, because the account holds no rights in the `@intentlane` scope. The CLI is installable today. The Expo config plugin lives in this repository and has to be consumed from a clone until that scope exists, so the quick start below runs the CLI from a clone rather than pretending the plugin is on the registry.

## Quick start

```sh
git clone https://github.com/guillaume-flambard/intentlane.git
cd intentlane
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/index.cjs validate
node packages/cli/dist/index.cjs generate --output /tmp/intentlane-demo
node packages/cli/dist/index.cjs doctor
```

`pnpm build` writes `packages/cli/dist/index.cjs`, which is the same bundle the published CLI ships, so these commands run the artifact a consumer runs. `validate` checks the reference contract, `generate` writes the Swift, and `doctor` reports the toolchain, the config, the generated output, and whether this machine is served by the enhanced Siri.

To generate into your own project, the whole configuration is one YAML file:

```sh
npx intentlane init
npx intentlane validate
npx intentlane generate
```

`init` writes a two-intent `intentlane.yaml` derived from the directory name and refuses to overwrite an existing file unless you pass `--force`. It refuses at the root of this repository, where the reference fixture already lives. Every option is in the [CLI reference](docs/reference/CLI.md).

## The core idea

The generator stops at a seam. It emits the shape an Apple API requires, and nothing about your data, your navigation or your store. The app keeps the resolver, the handler and the business logic, and registers them at launch. A generated entity query returns an empty list until the app supplies a resolver, rather than failing.

Generation is deterministic and offline. The same contract produces byte-identical Swift, and CI proves it by generating twice and diffing the two runs. Writes go to a temporary file and are renamed into place, so a failed run cannot leave half a source file behind.

Expo is one integration route, not the only one. The generated Swift is not iOS-specific: the same file compiles for macOS unchanged, and a native Swift target can commit it directly. `apps/example-macos` is the proof, and it needs no Xcode project.

## Layout

| Path | What it is |
| --- | --- |
| [`packages/schema`](packages/schema) | The shape of the contract: the zod schema, the exported JSON Schema, and the pilot-run and claim types. |
| [`packages/core`](packages/core) | The parser, the normalized IR and the `IL` diagnostics, plus the auditor, the compatibility score and the pilot evidence ledger. |
| [`packages/generator-apple`](packages/generator-apple) | The Swift generator and its golden snapshots. |
| [`packages/expo-plugin`](packages/expo-plugin) | The Expo config plugin, idempotent by contract. |
| [`packages/cli`](packages/cli) | The `intentlane` command, bundled to a single file. |
| [`apps/example-expo`](apps/example-expo) | An Expo app that proves the flow end to end. |
| [`apps/example-macos`](apps/example-macos) | A macOS contract with no Xcode project, plus the metadata assertions. |
| [`docs/INDEX.md`](docs/INDEX.md) | Every document that is not at the root, by theme. |

## Not here yet

Deliberately absent, each waiting for a pilot rather than for a plan: endpoint entity queries, HTTP execution, enum schema conformances, localization of the generated Swift beyond the default locale, deep-link routing inside the app, and EAS project configuration.

Three limits worth knowing before you rely on it. `required` is a contract statement the generator does not enforce yet, so every parameter is emitted as a plain `@Parameter`. The snippet view is generic and always returned, with no contract switch to disable it and no hook for an app-provided view. An intent that declares no `shortcuts.phrases` is reachable programmatically and never from Siri, which is deliberate rather than a bug.

[OPEN-RISKS.md](docs/reference/OPEN-RISKS.md) carries all 27 known limits as they were measured.

## Contributing

The Phase 3 gate needs five pilots, two of them on apps that already ship. Running the quick start on an app you own and reporting where the contract got in the way is the most useful contribution available, and the [pilot report form](.github/ISSUE_TEMPLATE/pilot-report.yml) collects what a usable report needs.

[CONTRIBUTING.md](CONTRIBUTING.md) states the real gate. A new capability starts in the schema with tests that reject the invalid shapes, generation stays deterministic and offline, every Swift emission has a golden snapshot, and the diagnostic codes `IL1001` to `IL1701` are part of the public surface. This repository is largely written with coding agents and [AGENT-GUIDE.md](AGENT-GUIDE.md) is the file they read.

## Links

- [docs/INDEX.md](docs/INDEX.md): the full documentation map, by theme.
- [CLI reference](docs/reference/CLI.md) and [contract reference](docs/reference/CONTRACT-REFERENCE.md).
- [Siri 27 content integration](docs/apple/SIRI-27-CONTENT-INTEGRATION.md), for the System App Schema path and what the report adds about it.
- [Example app](docs/reference/EXAMPLE-APP.md) and [the macOS example](docs/reference/MACOS-EXAMPLE.md).
- [Verification and continuous integration](docs/reference/VERIFICATION.md), and [open risks](docs/reference/OPEN-RISKS.md).
- [SPEC.md](SPEC.md): the normative contract. When the code and the spec disagree, the spec wins. [intentlane.yaml](intentlane.yaml) is the executable reference fixture.
- [AUDIT-GUIDE.md](docs/product/AUDIT-GUIDE.md) for the audit output, and [COMMERCIAL-READINESS.md](docs/product/COMMERCIAL-READINESS.md) for the claims this project is allowed to make.
- MIT licensed. See [LICENSE](LICENSE).
