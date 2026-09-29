# IntentLane example app

`apps/example-expo` end to end: the contract, the prebuild, and running the
generated App Intents on a device. What IntentLane is and how to run it is in
[README.md](../../README.md).

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
