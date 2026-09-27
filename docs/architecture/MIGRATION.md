# Migration guide

Every IntentLane contract starts with a version line:

```yaml
schema: "0.1"
```

This guide says what that version means, what happens when a new one ships, and what to do today.

## Version policy

The `schema` field follows a simplified SemVer. A minor evolution stays readable by tools of the same major version, so `0.2` is a contract a `0.x` tool can still read. A major change is breaking by definition, and it ships with a migration path.

IntentLane refuses a version it does not support rather than guessing. `intentlane validate` reports `IL1001` and `intentlane doctor` fails its `schema` check.

## What 0.1 is

`0.1` is the only schema version, so there is nothing to migrate from. Every command accepts it.

## When a new version ships

A minor bump stays readable. The contract keeps working, and the tool may warn about a newer version without refusing it.

A major bump is breaking. It ships with `intentlane migrate`, which rewrites the contract in place with the same temporary file and rename the generator uses, so a failed run cannot leave a half-written `intentlane.yaml`. The command prints a diff of what it changed and refuses to run when the contract already declares the target version.

## Today

`intentlane migrate` is planned and not implemented. Until it ships, a contract that declares an unsupported version is rejected with `IL1001`, and the fix is to edit the `schema` line by hand and revalidate:

```sh
intentlane validate
intentlane generate --check
```

The `schema` check of `intentlane doctor` reports the version it found, which is the quickest way to see what a project declares.
