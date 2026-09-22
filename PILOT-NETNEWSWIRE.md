# NetNewsWire pilot, before and after

This is the short before-and-after artifact for the first public macOS 27
pilot. It records what changed, the commands that reproduce it, and what
remains unproven. NetNewsWire is a third-party application; nothing here
suggests that its authors reviewed, endorsed or accepted any of this work, and
the fork was never pushed upstream.

## Candidate

| Fact | Value |
| --- | --- |
| Upstream repository | `https://github.com/Ranchero-Software/NetNewsWire` |
| Revision | `0184ca38c586078117a21f96f68eef78d39b8f68` |
| Licence | MIT |
| Build | `NetNewsWire.xcodeproj`, scheme `NetNewsWire`, target macOS 27 |
| Toolchain | Xcode 27.0 (27A266a), Swift 6.2 in the macOS target |

## What the app had before

NetNewsWire ships one App Intent and one shortcut provider, both under `iOS/`:
`AddFeedAppIntent` and `NetNewsWireAppShortcuts`. It has no `AppEntity`, no
`AppEnum`, no `EntityQuery` and no schema conformance. On macOS 27 the audit
therefore credited it with nothing: the iOS-only intent is not compiled by a
macOS target, which is the target-scoped audit rule.

## What changed in the fork

The fork is a disposable clone outside the product repository. Three files were
added or edited:

- `Mac/IntentLanePilot/IntentLaneGenerated.swift`, generated from a contract
  that conforms one entity to `reader.page` and one intent to
  `reader.openPage`.
- `Mac/IntentLanePilot/IntentLaneArticleAdapter.swift`, the adapter the app
  owns: a resolver over `AccountManager` and a handler that marks an article
  read.
- `Mac/AppDelegate.swift`, two local edits: a deep-link entry point and one
  registration call at launch.

The contract is short. The entity declares `display: { title: label }` and
`schema: reader.page`; `open_article` declares `execution: { mode: native }`,
`schema: reader.openPage` and `target: article`, so the system performs the
open and the intent carries no handler of its own.

## Reproduction

```sh
git clone --depth 1 https://github.com/Ranchero-Software/NetNewsWire.git
cd NetNewsWire
git checkout 0184ca38c586078117a21f96f68eef78d39b8f68
bash buildscripts/updateSecrets.sh
node <intentlane>/packages/cli/dist/index.cjs generate -c <contract> -o Mac/IntentLanePilot
xcodebuild -project NetNewsWire.xcodeproj -scheme NetNewsWire \
  -configuration Debug -destination 'platform=macOS' \
  -derivedDataPath <build> CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
xcodebuild test -project NetNewsWire.xcodeproj -scheme NetNewsWire \
  -destination 'platform=macOS' -derivedDataPath <build> \
  -only-testing:NetNewsWireTests/IntentLanePilotTests \
  EXCLUDED_SOURCE_FILE_NAMES='*.applescript' \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO
```

`updateSecrets.sh` is not optional: `SecretKey.swift` is generated from a
template and is not versioned, so the build fails without it. The AppleScript
exclusion is needed because three upstream scripting resources do not compile
under this toolchain.

## Evidence

The nine hosted acceptance cases pass, including the four that need the pilot
feed: subscribe, find Alpha, mark Beta read and reset it, and the negative case
that must never match Gamma.

The extracted metadata of the real `NetNewsWire.app` carries what the schema
asks for:

- `IntentLaneArticleEntity` with `assistantDefinedSchemas` naming
  `ReaderPageEntity`.
- `OpenArticle` with `openAppWhenRun` true, `outputFlags` 0, and the system
  protocols `AssistantIntent` and `OpenEntity` alongside `ReaderOpenPageIntent`.

The audit of the fork moves in four steps:

| State | Score | Discovery |
| --- | --- | --- |
| Before any IntentLane Swift | 0/100 (none) | none |
| After the native intents and the entity | 10/100 (early) | shortcuts-only |
| After conforming the entity to `reader.page` | 15/100 (early) | schema-backed |
| After conforming the action to `reader.openPage` | 19/100 (early) | schema-backed |

The score is low because it measures breadth across the whole catalogue, not
the quality of these journeys. The `discovery` field is the honest signal: it
moves from `shortcuts-only` to `schema-backed`, which is the difference the
product exists to make.

## Defects the pilot found in IntentLane

Two real defects were fixed in the product, not in the fork:

1. The generated code failed under Swift 6 concurrency: the entity query was a
   `static var` and the resolver and handler protocols were not `Sendable`.
2. A conformed entity could not be constructed, because `@Property` inside an
   `AppEntity` is a typealias to `EntityProperty`, a final class with no
   `init(wrappedValue:)`, so the generated entity now declares an explicit
   initializer.

## Not proven

- Shortcuts. The `shortcuts` command lists user shortcuts, not the App
  Shortcuts an application provides, so this surface was not exercised.
- Spotlight. No indexing lifecycle was implemented or observed.
- Siri. No process can drive Siri, so the manual positive and negative cases
  are still open. The metadata proves registration, never live resolution or
  language execution.

Because of those three, the pilot has not reached a terminal evidence ledger,
and no marketing claim should be made from it beyond the metadata and audit
facts above.
