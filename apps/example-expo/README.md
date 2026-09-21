# IntentLane Example (Expo)

Minimal Expo app used to prove the IntentLane quickstart end to end. It declares two
intents in `intentlane.yaml` and registers the generated Swift through the Expo config
plugin, so both actions show up in the iOS Shortcuts app without hand-written App Intents.

## What is here

| File | Role |
| --- | --- |
| `intentlane.yaml` | The contract: two intents (`open_inbox`, `create_idea`), one string parameter, English and French copy. |
| `app.json` | Expo config with `scheme: intentlaneexample` and the `@intentlane/expo` plugin pointing at `intentlane.yaml`. |
| `App.tsx` | The Expo screen. It is just a placeholder; the intents open app routes. |

## Try it without a device

Any of these run from this directory and need no Xcode build:

```sh
pnpm exec intentlane validate
pnpm exec intentlane generate --output ios/IntentLaneGenerated
pnpm exec intentlane generate --output ios/IntentLaneGenerated --check
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
`intentlaneexample://ideas/new?title=...`.

## Notes

- `pnpm install` here needs network access and a regenerated lockfile, because the
  workspace pins Expo packages that the root lockfile does not yet carry.
- Regenerating never touches files IntentLane does not own; the plugin only adds
  `IntentLaneGenerated.swift` to the `IntentLaneGenerated` group, and it does nothing on
  a second run.
