# IntentLane

IntentLane is a deterministic compiler from a versioned YAML contract to Apple App Intents. No model runs in the build path: the same YAML always produces the same Swift. The generated Swift is not platform-specific: it compiles for iOS and for macOS, and the Xcode toolchain extracts the same App Intents metadata from either. Expo is the first integration path, because an Expo app regenerates its native directory on every prebuild and needs a plugin to put the Swift back; a plain Swift target just commits the generated file. See [macOS](#macos).

## Status

Phase 1 is done: the `0.1` contract validates, and the generator emits compilable Swift `AppIntent` values for `open_app` actions with `string`, `integer`, `number`, `boolean`, `date`, `datetime`, `enum` and `entity` parameters, plus an `AppShortcutsProvider` for intents that declare phrases.

Phase 2 is done except its gate: `init` and `doctor` exist, the Expo config plugin resolves the generator from the consuming project and registers the generated Swift and the `<locale>.lproj` resources in the Xcode target idempotently, and `apps/example-expo` proves the flow from YAML to an installed simulator build. The gate (an external user following the quickstart in under 30 minutes) is not measured yet.

Phase 3 is complete on paper: primitive and enum parameters, static App Entities with a resolver protocol, localized titles and prompts, the risk policy, a result dialog with a snippet view, a macOS runner in CI, and two example apps. Its gate (five pilots, two of them existing apps) is not measured either. The macOS target is proven separately by `apps/example-macos`, without Expo and without an Xcode project.

Still out of scope: endpoint entity queries, HTTP execution, enum schema conformances, localization of the generated Swift beyond the default locale, deep-link routing inside the app, and EAS project configuration. IntentLane does not write `eas.json`; [Running on a device](#running-on-a-device) covers the build itself.

## Quickstart

From an Expo app directory, install the two packages:

```sh
npm install --save-dev @intentlane/cli @intentlane/expo
```

`@intentlane/cli` is one bundled file with no runtime dependency, so it pulls in neither `commander`, nor `yaml`, nor `zod`. `@intentlane/expo` is the Expo config plugin that runs the generator during a prebuild. Install both, because the plugin resolves the CLI from your app directory.

Then:

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

`intentlane audit [directory]`

- `--platform <macos|ios>`: target platform, default `macos`.
- `--format <text|json|sarif>`: report format, default `text`; `sarif` emits SARIF 2.1.0.
- `--output <file>`: write the report to a file instead of stdout.
- `--min-macos <major.minor>`, `--min-ios <major.minor>`: record the deployment floor in the report target.
- `--build-metadata <path>`: inspect an existing `Metadata.appintents` directory or `extract.actionsdata` file, which promotes `foundation` and `semantics` capabilities from `implemented` to `tested`.
- `--sdk-path <path>`: read the installed SDK's `SDKSettings.json`, record its version in the report, and mark a capability `unsupported` when the SDK is older than the version that capability needs.
- `--strict`: exit non-zero when a high-confidence blocker was found. A capability the target platform does not ship (`ILA100`) is informational and never blocks, so `--strict` stays usable on a clean macOS project; an SDK older than the capability needs (`ILA160`) does block.

`audit` analyses a project read-only and never writes to it. Every capability comes out as `unsupported`, `unknown`, `detected`, `implemented`, `tested` or `feasible`, with the evidence it used and the next action. A project that only declares an `AppShortcutsProvider` stays `implemented` for Shortcuts and `unknown` for Siri discovery: shortcuts alone never prove schema-backed Siri or Apple Intelligence. The auditor's diagnostics are prefixed `ILA`.

Every report also carries a compatibility score. It is deterministic: each capability the target platform ships is worth up to three points, `detected` earns one, `implemented` two and `tested` three, and a capability the platform does not ship is left out of the denominator. The text output prints it on a `score <n>/100 (<band>, <discovery>) <points>/<maximum> points` line, and the JSON output adds a `score` object with the same numbers plus a count of every state. The band is `none` at zero, `early` up to 33, `partial` up to 66, `close` below 100 and `ready` at 100. `discovery` separates the two promises: `schema-backed` when a `semantics` capability is at least `implemented`, `shortcuts-only` when only the Shortcuts surface is, and `none` otherwise.

The report also qualifies the integration route, because the same work costs a different amount depending on how the app is built. It prints `route <route> (<confidence>)`, and the JSON output adds a `route` object with the evidence and a next action. `native` means a Swift or Xcode target carries the code, `bridged` means a cross-platform framework does (Expo, React Native, Capacitor, Flutter, Tauri) and the native target comes out of its build, `ineligible` means a web-only project that can carry App Intents only through a native target or a bridge, and `unknown` means nothing recognizable was found. A bridge whose native target is not generated yet is `bridged` with medium confidence rather than a guess.

The report then classifies the data the project would index, because an entity index is a privacy surface as much as a discovery one. It prints `data <classes> (privacy <state>)` and the JSON output adds a `data` object. The classes are read from the declared property names, so `sensitive` covers names such as `password`, `token` or `health`, `personal` covers `email`, `phone` or `location`, `public` covers `title`, `url` or `status`, and `unknown` means no declared property carried a recognizable signal. The privacy state is `declared` when the project ships a `PrivacyInfo.xcprivacy`, `missing` when the project conforms an entity to `IndexedEntity` without one, and `unknown` otherwise. The report names the file and the line behind every class, and it does not read inside the manifest, so the manifest React Native ships on your behalf counts as declared.

The report qualifies the data architecture last, because where the entities come from decides how fast a Siri journey can be demonstrated and therefore what a date or a price can promise. It prints `architecture <architecture> (<confidence>)` and the JSON output adds an `architecture` object with the evidence and a next action. `local` means the project declares a local store (`CoreData`, `SwiftData`, `FileManager`, `UserDefaults`), `synced` means it also syncs (`CloudKit`, `entitySync`), `remote` means the only signal is a network client (`URLSession`, `fetch`, `axios`), and `unknown` means nothing recognizable was found. A local store wins over a network client, because the store is what a Siri journey resolves against, and a sync wins over both.

Finally the report records the conditions a capability test depends on, because a Siri failure is easily blamed on the client code when the language, the region, the account or the Apple Intelligence hardware was never written down. It prints `conditions <n>/<total> recorded` and the JSON output adds a `conditions` object listing all nine conditions with their state and, when the machine can prove one, its value. Five of them are read locally and offline: the operating system version (`sw_vers`), the Xcode version (`xcodebuild -version`), the architecture, the locale and the region. The other four, the Apple Intelligence hardware, the signed-in account, the granted permissions and the test data, stay `unknown` until a person confirms them, and the next action names exactly which ones are still missing.

The report also reads the action quality signals it can see in the sources, because a Siri action that works is not the same as an action a person can use. It prints `quality <n>/<total> signals (<n> issue(s))` and the JSON output adds a `quality` object with the signals, the issues and the evidence. Five signals are looked for: a result the system can show (`.result(`), a view that works without a screen (`ShowsSnippetView` or the generated snippet view), a registered shortcut (`AppShortcut(`), the `applicationName` placeholder inside the phrases, and a confirmation before a risky action (`requestConfirmation(`). A shortcut phrase that omits the placeholder is raised as an issue, because the system does not register it.

The report finally states which capability catalogue it used and whether the inspected SDK is older or newer than it, because the availability values in the catalogue are derived from Xcode 27 and a newer SDK may ship capabilities the catalogue does not know. It prints `catalogue <version> (<state>)` and the JSON output adds a `catalogue` object with the catalogue version, the number of capabilities it holds, the inspected SDK version when there is one, and a next action. The state is `current` on the SDK the catalogue was derived from, `older` when the SDK is newer, `newer` when the SDK is older, and `unknown` when no SDK path was given.

`--platform` also accepts `both`, which audits macOS and then iOS in one run. The single-platform outputs are unchanged, so nothing that already parses a report breaks. In `both` mode the text output prints two sections, each introduced by a `report <platform>` line; the JSON output becomes a `reports` collection holding two complete reports, macOS first, because two JSON documents in a row would not be valid JSON; and the SARIF output stays one document with one run per platform.

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

`IntentLaneEntityResolvers` is main-actor isolated, so the registration happens on the main actor. Until the app registers a resolver, the query returns an empty list rather than failing. The example app does register one; see [Example app](#example-app).

`display.title` and `display.subtitle` name the properties the system shows, `identifier` names the property that carries the stable identifier, and an entity parameter references an entity by id:

```yaml
parameters:
  - id: related
    type: entity
    entity: idea
    required: false
```

The version 0.1 only generates the `static` query. `query.mode: endpoint` is rejected with IL1401, an unknown or missing entity reference with IL1301, a duplicated entity id or Swift type name collision with IL1601, and an entity title missing its default locale with IL1201.

## App schemas

An intent or an entity may declare the App Schema it conforms to. That is how Siri and Apple Intelligence attach an action to a domain they already understand, instead of treating it as a custom action:

```yaml
entities:
  - id: sound
    title: { en: Ambient sound, fr: Son d'ambiance }
    identifier: id
    display:
      title: title
    query:
      mode: static
    schema: audio.ambientSound

intents:
  - id: stop_capture
    title: { en: Stop capture, fr: Arrêter la capture }
    parameters: []
    execution:
      mode: open_app
      route: /stop
    schema: camera.stopCapture
```

The generator puts the conformance in front of the declaration:

```swift
@AppEntity(schema: .audio.ambientSound)
struct IntentLaneSoundEntity: AppEntity {

@AppIntent(schema: .camera.stopCapture)
struct StopCapture: AppIntent {
```

A conformed entity emits `var` properties instead of `let` and drops its `typeDisplayRepresentation`, because `@AppEntity(schema:)` applies a property wrapper and takes the display name from the schema. In the extracted metadata, a conformed intent fills `assistantDefinedSchemas` and adds the `AssistantIntent` system protocol, which is exactly the gap the macOS target made visible.

The schema set is deliberately small. It is derived from the public App Schema surface of Xcode 27 (27A266a), cross-checked against the metadata extractor's own table, and it only holds schemas the generated shape can satisfy: an intent whose schema declares no parameter, no return value and no system protocol, and an entity whose schema requires at most two string properties, declared in order as `display.title` then `display.subtitle`. Today that is three intents (`audio.createStation`, `camera.stopCapture`, `camera.switchDevice`) and twenty entities (`audio.ambientSound`, `notes.account`, `spreadsheet.document`, `wordProcessor.template`, and others). Enum conformances are not generated yet.

A schema that exists but that IntentLane cannot satisfy is refused with IL1401, and the message says what is missing. The same code covers a reference that is not `domain.member`, a reference Xcode does not know, a schema of the other kind, a conformed intent that declares a parameter or a return value, a conformed entity whose display properties do not follow the schema order, and a schema that needs a newer iOS than the app declares in `min_ios`.

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

## Native execution

`open_app` opens a URL and lets the app react. `native` is the other way around: the app does the work, and IntentLane only declares the shape.

```yaml
- id: pin_link
  title: { en: Pin a link, fr: Épingler un lien }
  parameters:
    - { id: link, type: entity, entity: link, required: true }
  execution:
    mode: native
    handler: PinLinkHandler
  result:
    dialog: { en: The link is pinned, fr: "Le lien est épinglé" }
    returns: link
```

The generator emits the handler protocol, the main-actor registry and the `perform()` that reads it:

```swift
protocol PinLinkHandler {
  func perform(link: IntentLaneLinkEntity) async throws -> IntentLaneLinkEntity
}

@MainActor
enum IntentLaneIntentHandlers {
  static var pin_link: (any PinLinkHandler)?
}
```

The app registers its implementation at launch with `IntentLaneIntentHandlers.pin_link = PinLink()`. Until it does, `perform()` throws `IntentLaneHandlerError.missingHandler("pin_link")` instead of failing silently. `result.returns` names an entity of the contract, which adds `ReturnsValue<IntentLaneLinkEntity>` to the return type and makes the system carry the created or updated value. Without `returns`, `perform()` returns a dialog alone and the metadata records no output value. A `native` intent declares neither `route` nor `mapping`; `http` is refused with IL1401.

## Generated files

IntentLane owns the output directory. The generator writes the Swift source, one strings table per non-default locale, and a manifest:

- `IntentLaneGenerated.swift`, carrying the `Generated by IntentLane. Do not edit.` banner.
- `<locale>.lproj/IntentLane.strings`, one per locale declared in `app.locales` other than the default locale.
- `intentlane.manifest.json`, containing the schema version, the source input hash, and the hash of each generated file.

Every user-visible string in the generated Swift reads the dedicated `IntentLane` strings table, and the entry key is the default-locale text itself. A missing or unreadable table therefore degrades to the English literal instead of a broken token. `intentlane generate --check` verifies every generated file, not just the Swift. When a generated file no longer matches the hash recorded in the manifest, `--check` reports `IL1701` for that file, which means it was edited by hand after generation, and it reports stale output separately when the contract itself changed.

Writes go to a temporary file and are renamed into place, so a failed run cannot leave a half-written source file.

## Example app

`apps/example-expo` is Kollio, a Kollio-like idea list that proves the quickstart end to end. It declares four intents (`open_inbox`, `create_idea`, `open_idea`, `delete_idea`), one `idea` entity, and English and French copy. The screen lists ideas, and it routes the URLs the intents open: create an idea from a query, open one, delete one. The URL parser and the router live in `apps/example-expo/src` and are unit tested. A second local plugin, `apps/example-expo/plugins/withIdeaResolver.cjs`, closes the entity loop: it writes a Swift resolver, registers it in the app target, and merges the registration call into `AppDelegate.swift`, while the app publishes its ideas to `NSUserDefaults` on every change. An iOS prebuild registers the generated Swift in the Sources phase, `fr.lproj/IntentLane.strings` in the Resources phase, and `IdeaResolver.swift` in the Sources phase:

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

## macOS

The generated Swift is not iOS-specific. The same file, with no edit, compiles for macOS and the Xcode toolchain extracts the same App Intents metadata from it. That matters on macOS 27, where Siri and Apple Intelligence only see an app's actions and content when the app declares them with App Intents.

`apps/example-macos` is the proof, and it needs no Xcode project. It holds a contract (`intentlane.yaml`), the protocol list the compiler expects (`protocols.json`), and `verify.mjs`, which runs the whole chain:

```sh
node apps/example-macos/verify.mjs
```

The script generates the Swift, compiles it for the local macOS SDK, then runs `appintentsmetadataprocessor` from the Xcode toolchain and asserts the extracted metadata. The compile step needs both flags together, `-emit-const-values` and `-const-gather-protocols-list <protocols.json>`, or the compiler writes no `.swiftconstvalues` file and the processor refuses to run. Both flags exist in Xcode 27 and not before, so the script checks for the second one and stops with a clear message on an older toolchain.

What the script proves: five actions, `outputFlags: 7` on the four `open_app` actions and `4` on the native `PinLink`, `DeleteLink` as the only action with an explicit authentication policy, the `IntentLaneLinkEntity` entity, its `IntentLaneLinkQuery`, the `IntentLaneSaveLinkTag` enum, the `IntentLaneLinkEntity` value returned by `PinLink`, and four registered shortcuts.

What is still missing is the assistant schema layer. `systemProtocols`, `assistantDefinedSchemas` and `assistantDefinedSchemaTraits` come out empty on every action, so Siri treats these intents as custom actions instead of attaching them to the domains it already understands. Conforming an intent to an app schema (`@AppIntent(schema:)`, `@AppEntity(schema:)`, `@AppEnum(schema:)`) is the next step, and it is the same kind of deterministic boilerplate the compiler exists to produce.

One contract wart: the schema requires `min_ios` on every app, and it is meaningless for a macOS target. The macOS example carries it and the field stays inert, because nothing here reads it.

## Verification

```sh
pnpm test
pnpm build
pnpm validate
pnpm exec tsx packages/cli/src/index.ts generate --output .intentlane/generated --check
xcrun --sdk iphonesimulator swiftc -c -target arm64-apple-ios18.0-simulator .intentlane/generated/IntentLaneGenerated.swift -o /tmp/intentlane-generated.o
node apps/example-macos/verify.mjs
```

The contract is defined in [SPEC.md](SPEC.md); [intentlane.yaml](intentlane.yaml) is the executable reference fixture. Compiler rules for agents live in [AGENT-GUIDE.md](AGENT-GUIDE.md).

## Continuous integration

[.github/workflows/ci.yml](.github/workflows/ci.yml) runs on every push to `main`, on every pull request, and on demand. It has four jobs.

- `checks`, on `ubuntu-latest`: installs from the lockfile, typechecks, builds the CLI bundle, runs the test suite, validates the reference contract, regenerates the artifacts, fails when they are stale, and generates a second copy in `/tmp` to prove the output is byte-for-byte deterministic.
- `swift`, a matrix over `macos-15` and `macos-26`: compiles the generated Swift for both the reference fixture and the example app with `swiftc` against the iOS simulator SDK. This is the minimal Xcode matrix, and each run prints the Xcode and SDK versions it used.
- `macos`, on `xcode-27` (the only hosted image that ships Xcode 27, and therefore the macOS 27 SDK): runs `node apps/example-macos/verify.mjs`, which generates the macOS contract, compiles it for the runner's macOS SDK, extracts the App Intents metadata with `appintentsmetadataprocessor`, and asserts the actions, the flags, the authentication policy, the entity, the query, the enum and the shortcuts. The script reads the SDK version and the Xcode build from the machine, so it adapts to whatever toolchain the runner ships, and it fails with an actionable message when that toolchain predates Xcode 27. It then audits both generated fixtures and asserts the reported states: the shelf fixture stays `implemented` for App Intents with its Siri discovery `unknown`, and the studio fixture reaches `tested` for its schema capabilities while live Siri stays at most `detected`. The audit runs read the installed SDK through `--sdk-path` and the extracted metadata through `--build-metadata`, so a regression in detection, in the SDK reading or in the metadata promotion fails the job.
- `simulator`, on `macos-26`: builds the CLI bundle with `pnpm bundle` (the plugin runs `node <cli>/dist/index.cjs`, not the TypeScript source), prebuilds `apps/example-expo`, builds the Release app for the simulator with `xcodebuild`, then reads `Metadata.appintents/extract.actionsdata` and the compiled `fr.lproj/IntentLane.strings` from the product. It asserts the four actions exist, that every action carries `outputFlags: 7` (dialog, snippet view and opened URL), that `DeleteIdea` is the only one with an explicit authentication policy, that the entity and its query are indexed, that the shortcuts are registered, and that the French table holds the translated confirmation prompt and parameter title.

The generated Swift is compiled and built on macOS runners only; the fast checks run everywhere.

## Contributing

IntentLane is at the pilot stage, so the most useful thing you can do is run it on an Expo app you already ship and report where the contract got in the way, ideally with the [pilot report form](.github/ISSUE_TEMPLATE/pilot-report.yml). The Phase 3 gate needs five pilots, two of them existing apps.

[CONTRIBUTING.md](CONTRIBUTING.md) says what helps most, what to include in a bug report, and the rules the code follows. The short version: a new capability starts in the schema with tests that reject the invalid shapes, generation stays deterministic and offline, and every Swift emission has a golden snapshot.

This project is MIT licensed. See [LICENSE](LICENSE). The schema version policy and the future `intentlane migrate` command are described in [MIGRATION.md](MIGRATION.md).

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
- An entity query returns nothing until the app registers its resolver. `IntentLaneEntityResolvers.<entity>` starts `nil`, so the generated query returns an empty list rather than failing, and Siri shows no entity suggestion until the app assigns an implementation. The example app registers one; a generated app has to.
- The example's entity transport is `Settings` and `NSUserDefaults`. It carries the idea list from JS to the Swift resolver without a native module, but it is a demo shortcut: a real app would read its own store from Swift, and the entity list is only as fresh as the last publish.
- Entity property names come straight from `display.title` and `display.subtitle`. The generator neither verifies that the app's own model uses those names nor reads any data source.
- The `sensitive` level adds no constraint of its own. The generator enforces `confirmation` and `authentication`, and only `destructive` triggers a validation rule, so `sensitive` currently documents intent without changing the output.
- `confirmation: never` cannot override the user's own Shortcuts setting; iOS may still ask before running an intent.
- The confirmation action label is system-provided. `ConfirmationActionName` has no public initializer, so the accept and decline labels follow the system language instead of the contract.
- The snippet is generic and always shown. Every generated intent returns `IntentLaneSnippetView`, with no contract switch to disable it and no hook for an app-provided view. An app that wants its own snippet would have to edit the generated file, which regeneration overwrites.
- The snippet imports SwiftUI into the generated file. A target that does not link SwiftUI would fail to compile it, and nothing in the contract warns about that.
- Schema conformances cover a small set. Only three intents and twenty entities of the Xcode 27 public App Schema surface are conformable, because the generated shape cannot carry the other schemas' parameter types, return values or system protocols. Enum conformances are not generated. The interesting domains (`notes.createNote`, `calendar.createEvent`, `reminders.createReminder`, `mail.createDraft`) stay out of reach until the contract can express more parameter types.
- The contract requires `min_ios` on every app, including a macOS target where it means nothing. Nothing reads it outside the Expo plugin, so it stays inert, but the field name is wrong for the platform.
- A parameter named `url` used to collide with the local route URL in `perform()`, because the generator declared `let url = <route>` before building the snippet and the opened URL. The local variable is now `intentLaneURL`, a name a contract cannot produce, since parameter identifiers must match `/^[a-z][a-z0-9_]*$/`.
- A `native` intent throws `IntentLaneHandlerError.missingHandler` until the app registers its handler. The registry is main-actor isolated and starts empty, so an app that forgets the registration gets a runtime error rather than a compile error.
- The generator never checks that a native handler really returns the entity named by `result.returns`. The protocol states the type, the metadata carries the output type, and the app's implementation is on its own.
- A schema is validated against iOS availability only. The contract has no macOS deployment floor, so a schema that macOS does not support passes validation and fails later, at build or at runtime. `min_ios` is compared numerically against the schema's iOS availability, and the schema table is versioned on Xcode 27.0 (27A266a).
- The CLI reports its version from a constant in `packages/cli/src/index.ts`, because the bundled file cannot read `package.json` at runtime. That constant can drift from `packages/cli/package.json` when the version is bumped.
