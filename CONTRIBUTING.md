# Contributing to IntentLane

IntentLane compiles a versioned YAML contract into Apple App Intents for Expo apps. There is no model in the build path: the same contract always produces the same Swift. The most useful contributions come from people who tried it on a real Expo app and can say exactly where the contract got in the way.

## What helps most

- **Pilot reports.** Run the quickstart on an app you already ship and report what broke, what the contract could not express, and what you had to write by hand. The Phase 3 gate needs five pilots, two of them existing apps.
- **Contract gaps.** If an intent, a parameter type or an execution mode cannot be declared in `0.1`, open an issue with the YAML you wish worked.
- **Diagnostics.** A confusing message, a missing code, or a case that should be rejected and is not.
- **Docs.** Anything in [README.md](README.md), [SPEC.md](SPEC.md) or [ARCHITECTURE.md](ARCHITECTURE.md) that does not match what the code does.
- **Adapters.** Not yet. Android, Flutter and Capacitor are deliberate non-goals until the Apple path has pilots.

## Before you open an issue

Include the contract excerpt, the IntentLane version, your Expo, React Native and Xcode versions, the output of `npx intentlane doctor`, and the diagnostics you got. If the generated Swift failed to compile, paste the compiler error and the generated file. A report without the contract is hard to act on.

## Development

```sh
pnpm install
pnpm test
pnpm build
pnpm validate
pnpm exec tsx packages/cli/src/index.ts generate --output .intentlane/generated --check
```

`apps/example-expo` is the end-to-end fixture. It needs an iOS toolchain:

```sh
cd apps/example-expo
npx expo prebuild --platform ios
npx expo run:ios
```

The repository layout and the role of each package are in [ARCHITECTURE.md](ARCHITECTURE.md).

## Rules the code follows

These are not style preferences, they are the properties the project sells. A change that breaks one of them will be asked to change.

1. **Contract first.** A new capability starts in `packages/schema`, with tests that reject the invalid shapes, then in the IR in `packages/core`, and only then in the generator. Never the other way around.
2. **No model in the build path.** Generation is deterministic and offline. An LLM may help you write the code, never the output.
3. **Deterministic output.** The same contract produces byte-identical files. The CI generates twice and compares.
4. **Own your files only.** The generator writes inside its output directory and nowhere else. The plugin edits the Xcode project through the injected `XcodeUtils` layer, never by rewriting `project.pbxproj` directly, and it must be idempotent: a second run changes nothing.
5. **No secrets in the contract.** Tokens and keys belong in the Keychain at runtime.
6. **Every Swift emission has a golden snapshot.** A snapshot change in a pull request needs an explanation in the description.
7. **Errors are actionable.** A diagnostic says what is wrong, where, and what to do.
8. **No scope creep.** Do not add an abstraction for a platform that is not exercised yet.
9. **No comments in the code.** The code and the docs carry the explanation.
10. **Stable diagnostics.** The codes `IL1001` to `IL1701` are part of the public surface. Adding one means updating [SPEC.md](SPEC.md).

## Commits and pull requests

- One concern per pull request.
- A pull request is done when the tests are green, the typecheck is green, every public option is documented, and no snapshot moved without an explanation.
- Write commit messages that say what changed and why. Do not add AI attribution, co-author trailers or "generated with" lines.

## Working with an agent

This repository is largely written with coding agents, and [AGENT-GUIDE.md](AGENT-GUIDE.md) is the instruction file they read. Using one is welcome. The rules above still apply to the result, and you are responsible for what you submit.
