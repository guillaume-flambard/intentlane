# Verification and continuous integration

The commands that gate a change, what each one proves, and the four CI jobs.
What IntentLane is and how to run it is in [README.md](../../README.md).

## Verification

```sh
pnpm test
pnpm build
pnpm validate
pnpm exec tsx packages/cli/src/index.ts generate --output .intentlane/generated --check
xcrun --sdk iphonesimulator swiftc -c -target arm64-apple-ios18.0-simulator .intentlane/generated/IntentLaneGenerated.swift -o /tmp/intentlane-generated.o
node apps/example-macos/verify.mjs
```

The contract is defined in [SPEC.md](../../SPEC.md); [intentlane.yaml](../../intentlane.yaml) is the executable reference fixture. Compiler rules for agents live in [AGENT-GUIDE.md](../../AGENT-GUIDE.md).

## Continuous integration

[.github/workflows/ci.yml](../../.github/workflows/ci.yml) runs on every push to `main`, on every pull request, and on demand. It has four jobs.

- `checks`, on `ubuntu-latest`: installs from the lockfile, typechecks, builds the CLI bundle, runs the test suite, validates the reference contract, regenerates the artifacts, fails when they are stale, and generates a second copy in `/tmp` to prove the output is byte-for-byte deterministic.
- `swift`, a matrix over `macos-15` and `macos-26`: compiles the generated Swift for both the reference fixture and the example app with `swiftc` against the iOS simulator SDK. This is the minimal Xcode matrix, and each run prints the Xcode and SDK versions it used.
- `macos`, on `xcode-27` (the only hosted image that ships Xcode 27, and therefore the macOS 27 SDK): runs `node apps/example-macos/verify.mjs`, which generates the macOS contract, compiles it for the runner's macOS SDK, extracts the App Intents metadata with `appintentsmetadataprocessor`, and asserts the actions, the flags, the authentication policy, the entity, the query, the enum and the shortcuts. The script reads the SDK version and the Xcode build from the machine, so it adapts to whatever toolchain the runner ships, and it fails with an actionable message when that toolchain predates Xcode 27. It then audits both generated fixtures and asserts the reported states: the shelf fixture stays `implemented` for App Intents with its Siri discovery `unknown`, and the studio fixture reaches `tested` for its schema capabilities while live Siri stays at most `detected`. The audit runs read the installed SDK through `--sdk-path` and the extracted metadata through `--build-metadata`, so a regression in detection, in the SDK reading or in the metadata promotion fails the job.
- `simulator`, on `macos-26`: builds the CLI bundle with `pnpm bundle` (the plugin runs `node <cli>/dist/index.cjs`, not the TypeScript source), prebuilds `apps/example-expo`, builds the Release app for the simulator with `xcodebuild`, then reads `Metadata.appintents/extract.actionsdata` and the compiled `fr.lproj/IntentLane.strings` from the product. It asserts the four actions exist, that every action carries `outputFlags: 7` (dialog, snippet view and opened URL), that `DeleteIdea` is the only one with an explicit authentication policy, that the entity and its query are indexed, that the shortcuts are registered, and that the French table holds the translated confirmation prompt and parameter title.

The generated Swift is compiled and built on macOS runners only; the fast checks run everywhere.
