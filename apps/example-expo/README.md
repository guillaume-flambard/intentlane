# Kollio, the IntentLane example app

A small Expo app used to prove the IntentLane quickstart end to end. It is a Kollio-like
idea list: it shows ideas, creates one from a query, opens one, and deletes one. The four
actions and the `idea` entity are declared in `intentlane.yaml`, and the generated Swift is
registered through the Expo config plugin, so the actions show up in the iOS Shortcuts app
without a hand-written App Intent.

## What is here

| File | Role |
| --- | --- |
| `intentlane.yaml` | The contract: four intents (`open_inbox`, `create_idea`, `open_idea`, `delete_idea`), one `idea` entity, English and French copy. |
| `app.json` | Expo config with `scheme: intentlaneexample` and the `@intentlane/expo` plugin pointing at `intentlane.yaml`. |
| `App.tsx` | The screen: header, last route banner, idea list, hint. |
| `src/routes.ts` | Parses an IntentLane URL into segments and a query. No React Native import, so it is unit tested. |
| `src/ideas.ts` | The `Idea` type, the seed ideas, and the query to idea conversion. |
| `src/router.ts` | Applies a parsed route to the state: create, delete, select, inbox. |

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

## Notes

- `pnpm install` here needs network access and a regenerated lockfile, because the
  workspace pins Expo packages that the root lockfile does not yet carry.
- Regenerating never touches files IntentLane does not own; the plugin only adds
  `IntentLaneGenerated.swift` to the `IntentLaneGenerated` group, and it does nothing on
  a second run.
- The `idea` entity resolves to an empty list until the app registers a resolver, which
  the example does not do yet.
