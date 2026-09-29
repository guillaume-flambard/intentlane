# Siri 27 content integration

The System App Schema path for a macOS 27 app, and what the audit report adds
about the route, the data, the architecture, the conditions and the quality of
the result. What IntentLane is and how to run it is in
[README.md](../../README.md).

## Siri AI content integration

For a new macOS 27 content integration, the primary target is the System App
Schema pair `.system.searchInApp` and `.system.open`, an `IndexedEntity`, and
an application-owned entity resolver. This is distinct from App Shortcuts: do
not add `shortcuts.phrases` unless the customer explicitly wants automation in
Shortcuts.

IntentLane can generate the safe mapping seam without guessing the customer's
database or navigation stack:

```sh
intentlane generate -c intentlane.yaml -o Mac/IntentLaneGenerated \
  --adapter-output Mac/IntentLaneAdapter.swift
```

The adapter file is created once and remains application-owned. It contains
TODOs for stable-ID lookup, approved records, registration and the Spotlight
index/update/delete lifecycle. A later run refuses to overwrite it unless
`--overwrite-adapter` is explicit. The template deliberately contains no App
Shortcuts registration. See
[the macOS 27 implementation research](APPLE-27-SYSTEM-SEARCH-OPEN-IMPLEMENTATION-RESEARCH.md)
for the Apple sources and the required positive, negative and reindex tests.

The report also qualifies the integration route, because the same work costs a different amount depending on how the app is built. It prints `route <route> (<confidence>)`, and the JSON output adds a `route` object with the evidence and a next action. `native` means a Swift or Xcode target carries the code, `bridged` means a cross-platform framework does (Expo, React Native, Capacitor, Flutter, Tauri) and the native target comes out of its build, `ineligible` means a web-only project that can carry App Intents only through a native target or a bridge, and `unknown` means nothing recognizable was found. A bridge whose native target is not generated yet is `bridged` with medium confidence rather than a guess.

The report then classifies the data the project would index, because an entity index is a privacy surface as much as a discovery one. It prints `data <classes> (privacy <state>)` and the JSON output adds a `data` object. The classes are read from the declared property names, so `sensitive` covers names such as `password`, `token` or `health`, `personal` covers `email`, `phone` or `location`, `public` covers `title`, `url` or `status`, and `unknown` means no declared property carried a recognizable signal. The privacy state is `declared` when the project ships a `PrivacyInfo.xcprivacy`, `missing` when the project conforms an entity to `IndexedEntity` without one, and `unknown` otherwise. The report names the file and the line behind every class, and it does not read inside the manifest, so the manifest React Native ships on your behalf counts as declared.

The report qualifies the data architecture last, because where the entities come from decides how fast a Siri journey can be demonstrated and therefore what a date or a price can promise. It prints `architecture <architecture> (<confidence>)` and the JSON output adds an `architecture` object with the evidence and a next action. `local` means the project declares a local store (`CoreData`, `SwiftData`, `FileManager`, `UserDefaults`), `synced` means it also syncs (`CloudKit`, `entitySync`), `remote` means the only signal is a network client (`URLSession`, `fetch`, `axios`), and `unknown` means nothing recognizable was found. A local store wins over a network client, because the store is what a Siri journey resolves against, and a sync wins over both.

Finally the report records the conditions a capability test depends on, because a Siri failure is easily blamed on the client code when the language, the region, the account or the Apple Intelligence hardware was never written down. It prints `conditions <n>/<total> recorded` and the JSON output adds a `conditions` object listing all nine conditions with their state and, when the machine can prove one, its value. Five of them are read locally and offline: the operating system version (`sw_vers`), the Xcode version (`xcodebuild -version`), the architecture, the locale and the region. The other four, the Apple Intelligence hardware, the signed-in account, the granted permissions and the test data, stay `unknown` until a person confirms them, and the next action names exactly which ones are still missing.

The report also reads the action quality signals it can see in the sources, because a Siri action that works is not the same as an action a person can use. It prints `quality <n>/<total> signals (<n> issue(s))` and the JSON output adds a `quality` object with the signals, the issues and the evidence. Five signals are looked for: a result the system can show (`.result(`), a view that works without a screen (`ShowsSnippetView` or the generated snippet view), a registered shortcut (`AppShortcut(`), the `applicationName` placeholder inside the phrases, and a confirmation before a risky action (`requestConfirmation(`). A shortcut phrase that omits the placeholder is raised as an issue, because the system does not register it.

The report finally states which capability catalogue it used and whether the inspected SDK is older or newer than it, because the availability values in the catalogue are derived from Xcode 27 and a newer SDK may ship capabilities the catalogue does not know. It prints `catalogue <version> (<state>)` and the JSON output adds a `catalogue` object with the catalogue version, the number of capabilities it holds, the inspected SDK version when there is one, and a next action. The state is `current` on the SDK the catalogue was derived from, `older` when the SDK is newer, `newer` when the SDK is older, and `unknown` when no SDK path was given.

The report scopes every capability to the Xcode targets that compile for the requested platform, because a multi-platform repository otherwise looks more capable than the app it builds. It reads `project.pbxproj`, follows each target's `baseConfigurationReference` into its `.xcconfig` files (including the `#include` chain) to learn its `SDKROOT`, expands the synchronized folders a target compiles, and only inspects the Swift files that target owns. It prints `targets <n> target(s) (<n> for <platform>)` and the JSON output adds a `targets` object with the targets, their platform and folders, and a next action. A file that no target owns is kept, because its platform is ambiguous, and a project without an Xcode project keeps the whole tree.

`--platform` also accepts `both`, which audits macOS and then iOS in one run. The single-platform outputs are unchanged, so nothing that already parses a report breaks. In `both` mode the text output prints two sections, each introduced by a `report <platform>` line; the JSON output becomes a `reports` collection holding two complete reports, macOS first, because two JSON documents in a row would not be valid JSON; and the SARIF output stays one document with one run per platform.
