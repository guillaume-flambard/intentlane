# Kollio, the IntentLane example app

A small Expo app used to prove the IntentLane quickstart end to end. It is a Kollio-like
idea list: it shows ideas, creates one from a query, opens one, and deletes one. The four
actions and the `idea` entity are declared in `intentlane.yaml`, and the generated Swift is
registered through the Expo config plugin, so the actions show up in the iOS Shortcuts app
without a hand-written App Intent. The `idea` entity is served by a small Swift resolver that
the example registers at launch.

## What is here

| File | Role |
| --- | --- |
| `intentlane.yaml` | The contract: four intents (`open_inbox`, `create_idea`, `open_idea`, `delete_idea`), one `idea` entity, English and French copy. |
| `app.json` | Expo config with `scheme: intentlaneexample` and the `@intentlane/expo` plugin pointing at `intentlane.yaml`. |
| `App.tsx` | The screen: header, last route banner, idea list, hint. |
| `src/routes.ts` | Parses an IntentLane URL into segments and a query. No React Native import, so it is unit tested. |
| `src/ideas.ts` | The `Idea` type, the seed ideas, the query to idea conversion, and the entity projection. |
| `src/router.ts` | Applies a parsed route to the state: create, delete, select, inbox. |
| `src/publish.ts` | Writes the ideas to `NSUserDefaults` so the Swift entity resolver can read them. |
| `plugins/applyIdeaResolver.cjs` | The local config plugin helpers: write the Swift resolver, register it, patch the AppDelegate. |
| `plugins/withIdeaResolver.cjs` | The plugin entry point that Expo calls, declared in `app.json`. |

## Routes the intents open

`IntentLaneRoute.make` builds URLs with `URLComponents` and no host, so the real shape is
`scheme:/path` with a single slash. The app routes four of them:

| Route | Intent | Effect |
| --- | --- | --- |
| `/inbox` | `open_inbox` | Reports the number of ideas. |
| `/ideas/new?title=...&effort=...&due=...&priority=...` | `create_idea` | Creates an idea and selects it. |
| `/ideas?idea=...` | `open_idea` | Highlights the idea. |
| `/ideas/delete?idea=...` | `delete_idea` | Removes the idea. |

Query values arrive percent-encoded and are decoded by the parser, so a title with a space
arrives as `Hello world` from `title=Hello%20world`.

## Try it without a device

Any of these run from this directory and need no Xcode build:

```sh
pnpm exec intentlane validate
pnpm exec intentlane generate --output ios/IntentLaneGenerated
pnpm exec intentlane generate --output ios/IntentLaneGenerated --check
pnpm test
```

`--check` exits non-zero when the generated Swift is stale, which is what CI should run.

## Build the iOS app

The plugin copies the generated Swift into the Xcode project and adds it to the app
target during prebuild, so there is no manual Xcode step.

```sh
pnpm install
pnpm prebuild
pnpm ios
```

After the app is installed, open the Shortcuts app and look for "Create an idea" and
"Open the inbox". Saying "Create an idea in IntentLane Example" opens
`intentlaneexample:/ideas/new?title=...`.

Opening a custom scheme from outside the app makes iOS show an "Open in IntentLane
Example?" alert first. That alert is SpringBoard asking for confirmation, not an app bug.

## The entity resolver

The generated Swift declares `IntentLaneIdeaResolver` and an empty
`IntentLaneEntityResolvers.idea`, because IntentLane never emits business logic. The example
fills that hole with a local config plugin, `plugins/withIdeaResolver.cjs`, declared in
`app.json` as `"./plugins/withIdeaResolver.cjs"`:

- It writes `ios/<project>/IntentLaneNative/IdeaResolver.swift` and adds it to the app
  target, so `IntentLaneIdeaResolverImplementation` decodes the published JSON into
  `IntentLaneIdeaEntity` values.
- It merges `IntentLaneEntityResolverRegistration.register()` into `AppDelegate.swift`,
  right after `bindReactNativeFactory(factory)`, inside an Expo `@generated` block.
- It registers `IntentLaneEntityResolvers.idea` on the main actor at launch.

The transport is `Settings` from React Native, which writes to `NSUserDefaults.standard`.
`App.tsx` publishes on every change to the idea list, under the key `intentlane.ideas`, and
the Swift resolver reads the same key. That keeps the entity query working without adding a
native module or a file dependency.

The plugin is idempotent: a second prebuild leaves `project.pbxproj`, `AppDelegate.swift`
and `IdeaResolver.swift` byte for byte identical.

## Notes

- `pnpm install` here needs network access and a regenerated lockfile, because the
  workspace pins Expo packages that the root lockfile does not yet carry.
- Regenerating never touches files IntentLane does not own; the plugin only adds
  `IntentLaneGenerated.swift` to the `IntentLaneGenerated` group, and it does nothing on
  a second run.
- A config plugin referenced as a file path must carry its extension. Expo resolves a
  direct file reference with plain `require.resolve`, which does not try `.cjs`, so
  `"./plugins/withIdeaResolver"` fails with `Failed to resolve plugin for module`.
- The `idea` entity is only as fresh as the last publish. The resolver reads whatever the
  app wrote, so an idea created by Siri appears in the entity list after the next publish.
