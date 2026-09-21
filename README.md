# IntentLane

IntentLane is a deterministic compiler from a versioned YAML contract to Apple App Intents for Expo applications. No model runs in the build path: the same YAML always produces the same Swift.

## Status

Phase 1 is done: the `0.1` contract validates, and the generator emits compilable Swift `AppIntent` values for `open_app` actions with `string`, `integer`, `number`, `boolean`, `date`, `datetime`, `enum` and `entity` parameters, plus an `AppShortcutsProvider` for intents that declare phrases.

Phase 2 is done except its gate: `init` and `doctor` exist, the Expo config plugin resolves the generator from the consuming project and registers the generated Swift and the `<locale>.lproj` resources in the Xcode target idempotently, and `apps/example-expo` proves the flow from YAML to an installed simulator build. The gate (an external user following the quickstart in under 30 minutes) is not measured yet.

Still out of scope: endpoint entity queries, native and HTTP execution, localization of the generated Swift beyond the default locale, deep-link routing inside the app, and EAS project configuration. IntentLane does not write `eas.json`; [Running on a device](#running-on-a-device) covers the build itself.

## Quickstart

From an Expo app directory:

```sh
npx intentlane init
npx intentlane validate
npx intentlane generate
```

`init` writes a two-intent `intentlane.yaml` derived from the directory name, refuses to overwrite an existing file unless you pass `--force`, and never touches anything else. Edit that file, then keep the generated Swift fresh. To let the Expo build run the generator for you, declare the plugin:

```json
{
  "expo": {
    "scheme": "your-scheme",
    "plugins": [["@intentlane/expo", { "configFile": "intentlane.yaml" }]]
  }
}
```

The plugin adds one `withDangerousMod` for iOS that writes into `<platformProjectRoot>/<projectName>/IntentLaneGenerated`, and one `withXcodeProject` that creates the `IntentLaneGenerated` group and adds `IntentLaneGenerated.swift` to the app target exactly once. A second prebuild produces a byte-identical Xcode project.

Check the environment at any point:

```sh
npx intentlane doctor
```

`doctor` reports `node`, `config`, `schema`, `generated`, `xcode`, and `plugin` checks and exits non-zero only on errors.

## CLI

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

## Parameter types

A parameter declares an `id`, a `type` and `required`. The generator maps each type to its Swift counterpart and, for `open_app` execution, converts the value into the URL query:

| Contract type | Swift type | Query value |
| --- | --- | --- |
| `string` | `String` | the value itself |
| `integer` | `Int` | `String(value)` |
| `number` | `Double` | `String(value)` |
| `boolean` | `Bool` | `"true"` or `"false"` |
| `date` | `DateComponents` | `YYYY-MM-DD` |
| `datetime` | `Date` | ISO 8601 |
| `enum` | generated `AppEnum` | the case `rawValue` |
| `entity` | generated `AppEntity` | `value.id` |

An `enum` parameter declares its cases under `values`, one localized label per case:

```yaml
parameters:
  - id: priority
    type: enum
    required: true
    values:
      low: { en: Low, fr: Basse }
      high: { en: High, fr: Haute }
```

The generator emits `enum IntentLane<Intent><Parameter>: String, AppEnum` with one `case` per value, and every label goes into the `IntentLane` strings table. Case names therefore stay stable identifiers while Siri and the Shortcuts app show the translated label. An enum without values is rejected (IL1301), and `values` on a parameter that is not an enum is rejected too (IL1301).

A parameter may also declare a `title` and a `prompt`, both localized maps:

```yaml
parameters:
  - id: title
    type: string
    required: true
    title: { en: Idea title, fr: Titre de l'idée }
    prompt: { en: What is the idea?, fr: Quelle est l'idée ? }
```

The `title` becomes the label the system shows and the display name of a generated `AppEnum`, and the `prompt` becomes the dialog Siri asks for the value (`requestValueDialog`). Both go into the `IntentLane` strings table. Without a `title`, the generator falls back to the raw parameter id; without a `prompt`, no value dialog is emitted. A `title` missing its default locale is rejected with IL1201.

## Entities

An entity describes a value the system can hand back to an intent, such as an idea selected from the app's own data:

```yaml
entities:
  - id: idea
    title: { en: Idea, fr: Idée }
    identifier: id
    display:
      title: title
      subtitle: status
    query:
      mode: static
```

The generator emits `struct IntentLane<Entity>Entity: AppEntity`, its `EntityQuery`, and a resolver protocol the app implements:

```swift
protocol IntentLaneIdeaResolver {
  func ideaEntities(for identifiers: [String]) async throws -> [IntentLaneIdeaEntity]
  func suggestedIdeaEntities() async throws -> [IntentLaneIdeaEntity]
}
```

IntentLane never writes business logic. The app supplies the data and registers its resolver in the generated holder, which the query reads at runtime:

```swift
IntentLaneEntityResolvers.idea = MyIdeaResolver()
```

`display.title` and `display.subtitle` name the properties the system shows, `identifier` names the property that carries the stable identifier, and an entity parameter references an entity by id:

```yaml
parameters:
  - id: related
    type: entity
    entity: idea
    required: false
```

The version 0.1 only generates the `static` query. `query.mode: endpoint` is rejected with IL1401, an unknown or missing entity reference with IL1301, a duplicated entity id or Swift type name collision with IL1601, and an entity title missing its default locale with IL1201.

## Risk policy

An intent declares how dangerous it is:

```yaml
risk:
  level: destructive
  confirmation: always
  authentication: required
  confirmation_prompt: { en: Delete this idea?, fr: Supprimer cette idée ? }
```

The generator turns the confirmation and authentication fields into App Intents behaviour:

| Contract | Generated Swift |
| --- | --- |
| `confirmation: always` | `try await requestConfirmation(actionName: .continue, dialog: ...)` before the action runs |
| `confirmation: optional` or `never` | nothing, the app decides at runtime |
| `authentication: required` | `static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication` |
| `authentication: none` | `static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed` |
| `authentication: inherited` | nothing, the system policy applies |

`confirmation_prompt` is the dialog text, localized through the `IntentLane` strings table. Without it, the confirmation shows the intent title. The accept button label comes from the system (`ConfirmationActionName.continue`); the platform exposes no public initializer for that type, so the contract cannot name the accept and decline actions.

The `level` participates in validation rather than generation: a `destructive` intent without `confirmation: always` is rejected with IL1501, and a confirmation prompt missing its default locale with IL1201.

## Results and snippets

Every generated intent returns a result that combines three things: the opened URL, the spoken dialog, and a SwiftUI snippet shown by the Shortcuts app and Siri:

```swift
func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView & OpensIntent {
  let url = IntentLaneRoute.make(scheme: "example", path: "/ideas/new", query: ["title": title])
  return .result(
    opensIntent: OpenURLIntent(url),
    dialog: IntentDialog(LocalizedStringResource("Your idea is ready", table: "IntentLane")),
    view: IntentLaneSnippetView(title: LocalizedStringResource("Create an idea", table: "IntentLane"), fields: [(LocalizedStringResource("Idea title", table: "IntentLane"), title)])
  )
}
```

The snippet view is declared once for the whole file. It shows the intent title and one row per parameter, using the same string conversions as the URL query, so an `enum` contributes its `rawValue`, an `entity` its identifier, and a `date` its `YYYY-MM-DD` form. An intent without parameters shows the title alone. Field labels are `LocalizedStringResource` values, so they read the `IntentLane` table like every other visible string.

## Generated files

IntentLane owns the output directory. The generator writes the Swift source, one strings table per non-default locale, and a manifest:

- `IntentLaneGenerated.swift`, carrying the `Generated by IntentLane. Do not edit.` banner.
- `<locale>.lproj/IntentLane.strings`, one per locale declared in `app.locales` other than the default locale.
- `intentlane.manifest.json`, containing the schema version, the source input hash, and the hash of each generated file.

Every user-visible string in the generated Swift reads the dedicated `IntentLane` strings table, and the entry key is the default-locale text itself. A missing or unreadable table therefore degrades to the English literal instead of a broken token. `intentlane generate --check` verifies every generated file, not just the Swift.

Writes go to a temporary file and are renamed into place, so a failed run cannot leave a half-written source file.

## Example app

`apps/example-expo` is Kollio, a Kollio-like idea list that proves the quickstart end to end. It declares four intents (`open_inbox`, `create_idea`, `open_idea`, `delete_idea`), one `idea` entity, and English and French copy. The screen lists ideas, and it routes the URLs the intents open: create an idea from a query, open one, delete one. The URL parser and the router live in `apps/example-expo/src` and are unit tested. An iOS prebuild registers the generated Swift in the Sources phase and `fr.lproj/IntentLane.strings` in the Resources phase:

```sh
cd apps/example-expo
pnpm install
pnpm prebuild
```

## Running on a device

The generated App Intents are native Swift. Expo Go cannot run them, because the Swift only exists after a native build and the shortcuts only exist in an app that actually contains them. Both paths below run the generator through the config plugin, so the plugin declaration from the quickstart is all the project needs.

Local build, with Xcode and no Expo account:

```sh
npx expo install expo-dev-client
npx expo run:ios --device
```

`run:ios` prebuilds when the project has no native directory yet, then builds and installs on the attached iPhone. A physical device needs developer mode enabled and a unique `ios.bundleIdentifier` in `app.json`.

EAS build:

```sh
npm install --global eas-cli
eas login
eas build --platform ios --profile development
```

The CLI offers to create `eas.json` with a `development` profile. Add `"ios": { "simulator": true }` to that profile for a simulator build, which installs on a simulator only. A build for a physical iPhone needs an Apple Developer account for signing. `eas build --local` does the same work on your machine.

Rebuild after a change to native code, to `app.json`, or to the Expo SDK. Otherwise `npx expo start` is enough, and it talks to the development build instead of Expo Go.

Once the app is installed, iOS indexes its App Shortcuts, so they appear in the Shortcuts app and work with Siri without any registration step. That is how App Shortcuts are designed: they are "available as soon as someone installs your app". Run `intentlane generate --check` before a build to confirm the Swift still matches the contract.

## Verification

```sh
pnpm test
pnpm build
pnpm validate
pnpm exec tsx packages/cli/src/index.ts generate --output .intentlane/generated --check
xcrun --sdk iphonesimulator swiftc -c -target arm64-apple-ios18.0-simulator .intentlane/generated/IntentLaneGenerated.swift -o /tmp/intentlane-generated.o
```

The contract is defined in [SPEC.md](SPEC.md); [intentlane.yaml](intentlane.yaml) is the executable reference fixture. Compiler rules for agents live in [AGENT-GUIDE.md](AGENT-GUIDE.md).

## Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to `main`, on every pull request, and on demand. It has three jobs.

- `checks`, on `ubuntu-latest`: installs from the lockfile, typechecks, runs the test suite, validates the reference contract, regenerates the artifacts, fails when they are stale, and generates a second copy in `/tmp` to prove the output is byte-for-byte deterministic.
- `swift`, a matrix over `macos-15` and `macos-26`: compiles the generated Swift for both the reference fixture and the example app with `swiftc` against the iOS simulator SDK. This is the minimal Xcode matrix, and each run prints the Xcode and SDK versions it used.
- `simulator`, on `macos-26`: prebuilds `apps/example-expo`, builds the Release app for the simulator with `xcodebuild`, then reads `Metadata.appintents/extract.actionsdata` and the compiled `fr.lproj/IntentLane.strings` from the product. It asserts the four actions exist, that every action carries `outputFlags: 7` (dialog, snippet view and opened URL), that `DeleteIdea` is the only one with an explicit authentication policy, that the entity and its query are indexed, that the shortcuts are registered, and that the French table holds the translated confirmation prompt and parameter title.

The generated Swift is compiled and built on macOS runners only; the fast checks run everywhere.

## Contributing

IntentLane is at the pilot stage, so the most useful thing you can do is run it on an Expo app you already ship and report where the contract got in the way. The Phase 3 gate needs five pilots, two of them existing apps.

[CONTRIBUTING.md](CONTRIBUTING.md) says what helps most, what to include in a bug report, and the rules the code follows. The short version: a new capability starts in the schema with tests that reject the invalid shapes, generation stays deterministic and offline, and every Swift emission has a golden snapshot.

This project is MIT licensed. See [LICENSE](LICENSE).

## Open risks

- An intent without `shortcuts.phrases` for the default locale is reachable programmatically but never from Siri, and it is intentionally left out of the `AppShortcutsProvider`. Whether that deserves its own diagnostic is undecided.
- A phrase that omits `${appName}` produces a shortcut iOS will not register. The generator substitutes `${appName}` with `\(.applicationName)` but does not yet warn on phrases that never use it.
- The generated Swift hardcodes the default locale. Per-locale Swift output is not implemented; the Swift always carries default-locale text as the strings-table keys.
- Shortcut phrases stay literal in the default locale. Localizing `AppShortcut` phrases through a strings file does not work (Apple developer forums, "App Intents Siri Phrases Localization"), and WWDC25 session 244 requires the `applicationName` placeholder in every phrase. Titles, descriptions, dialogs and shortcut titles are localized; `shortcuts.phrases` are not.
- `knownRegions` is left untouched. The plugin mirrors what Expo does for `expo.locales` on iOS (`@expo/config-plugins/build/ios/Locales.js`), which registers `<locale>.lproj` groups and resources without editing `knownRegions`. Whether iOS selects `fr.lproj/IntentLane.strings` while `fr` is absent from `knownRegions` was not verified on a device.
- Stale localization directories are not pruned. Dropping a locale from `app.locales` leaves its `<locale>.lproj` directory on disk and its Xcode registration in place. Expo has the same limitation (`TODO: Should we delete all before running?` in `Locales.js`).
- Two intents that share the same default-locale text but carry different translations collide in the strings table. The first one in canonical intent order wins; the other keeps its default-locale text.
- `required` is not reflected in the generated Swift. Every parameter is emitted as a plain `@Parameter` with no default, so `required: true` is a contract statement the compiler does not enforce yet.
- Generated enum type names are `IntentLane<Intent Swift name><PascalCase parameter id>`. Two intents whose names combine into the same identifier would collide, and no diagnostic covers that case.
- The generated entity code compiles under Swift 5 and fails under Swift 6 strict concurrency: `defaultQuery` would need to be a `let`, and the resolver holder would need a `Sendable` protocol. The example project builds with `SWIFT_VERSION = 5.0`.
- An entity query returns nothing until the app registers its resolver. `IntentLaneEntityResolvers.<entity>` starts `nil`, so the generated query returns an empty list rather than failing, and Siri shows no entity suggestion until the app assigns an implementation.
- Entity property names come straight from `display.title` and `display.subtitle`. The generator neither verifies that the app's own model uses those names nor reads any data source.
- The `sensitive` level adds no constraint of its own. The generator enforces `confirmation` and `authentication`, and only `destructive` triggers a validation rule, so `sensitive` currently documents intent without changing the output.
- `confirmation: never` cannot override the user's own Shortcuts setting; iOS may still ask before running an intent.
- The confirmation action label is system-provided. `ConfirmationActionName` has no public initializer, so the accept and decline labels follow the system language instead of the contract.
- The snippet is generic and always shown. Every generated intent returns `IntentLaneSnippetView`, with no contract switch to disable it and no hook for an app-provided view. An app that wants its own snippet would have to edit the generated file, which regeneration overwrites.
- The snippet imports SwiftUI into the generated file. A target that does not link SwiftUI would fail to compile it, and nothing in the contract warns about that.
