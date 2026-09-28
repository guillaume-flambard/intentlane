# IntentLane client quickstart

This guide uses only the CLI that is available from npm today. It audits one
existing app, creates a contract, generates Swift, and prepares a repeatable
verification command.

The path is designed for a developer who knows the application. It has not yet
been timed with an external user, so the durations below are planning estimates,
not a measured promise.

## Prerequisites

- macOS and the Xcode toolchain used by the target application.
- Node.js 22 or newer.
- An existing native Xcode target.
- Permission to inspect and change the application repository.

The Expo config plugin in the IntentLane repository is not published. External
applications should use the native generated-file path until that package has a
release.

## 1. Install the published CLI

```sh
npm install --save-dev @memolabs-apps/intentlane@0.1.0
npx intentlane --version
```

Commit `package.json` and the lockfile so local development and CI use the same
tool version.

## 2. Audit the existing target

```sh
npx intentlane audit . --platform macos
```

Use `--platform ios` for an iOS target. Keep a JSON baseline when the result will
be reviewed or compared later:

```sh
npx intentlane audit . \
  --platform macos \
  --format json \
  --output intentlane-audit.json
```

The audit is read-only. Review the route, target, data, architecture, conditions,
quality, and capability findings before choosing a journey.

## 3. Create and edit the contract

```sh
npx intentlane init
npx intentlane validate
```

`init` writes `intentlane.yaml` only when it does not already exist. Choose one
or two journeys for the first pass. Keep application lookup, permissions,
navigation, and side effects out of the generated contract.

## 4. Generate Swift and the adapter boundary

```sh
npx intentlane generate \
  --config intentlane.yaml \
  --output Mac/IntentLaneGenerated \
  --adapter-output Mac/IntentLaneAdapter.swift
```

The generated directory contains Swift, localized strings when declared, and a
manifest. The adapter is created once and then belongs to the application. A
later generation refuses to overwrite it unless `--overwrite-adapter` is
explicit.

Implement the application-owned pieces:

1. Resolve stable identifiers to authorized records.
2. Return no record when the user may not access it.
3. Route through the application's existing navigation.
4. Test positive, negative, permission, and lifecycle behavior.

Add the generated Swift and the application-owned adapter to the target using
the project's normal Xcode setup. Do not edit generated output.

## 5. Verify the integration

```sh
npx intentlane generate \
  --config intentlane.yaml \
  --output Mac/IntentLaneGenerated \
  --check

npx intentlane verify \
  --config intentlane.yaml \
  --output Mac/IntentLaneGenerated \
  --app-test "xcodebuild -project Client.xcodeproj -scheme Client -destination 'platform=macOS' test" \
  --metadata build/Client.app/Metadata.appintents
```

The metadata path depends on the application's build settings. `verify` reports
each claimed layer separately. It does not turn build or metadata evidence into
a Siri claim.

## 6. Add CI

Copy [the maintained workflow example](../examples/intentlane-ci.yml) into the
client repository as `.github/workflows/intentlane.yml`, then replace the sample
test command and metadata path.

The example assumes the CLI and its exact version are already recorded in the
client's `package.json` and lockfile.

## Human evidence remains separate

Automation can prove the contract, generated output, application tests, build,
metadata, and a named Core Spotlight index test. It cannot prove that Siri chose
and completed a spoken journey.

Record a system-surface observation only when a person ran the named journey
under recorded OS, SDK, locale, language, account, permission, and test-data
conditions. A second person must reproduce it before a public case study calls
the journey verified.

## Handling confidential applications

Do not paste a private contract, generated source, repository path, or audit
report into a public GitHub issue. Reduce a problem to a non-confidential fixture
or contact the maintainer privately through the link in the root README.
