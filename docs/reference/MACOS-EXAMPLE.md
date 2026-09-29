# The macOS example

`apps/example-macos`, the proof that the generated Swift compiles for macOS and
carries the App Intents metadata the toolchain extracts, with no Xcode project
involved. What IntentLane is and how to run it is in
[README.md](../../README.md).

## macOS

The generated Swift is not iOS-specific. The same file, with no edit, compiles for macOS and the Xcode toolchain extracts the same App Intents metadata from it. That matters on macOS 27, where Siri and Apple Intelligence only see an app's actions and content when the app declares them with App Intents.

`apps/example-macos` is the proof, and it needs no Xcode project. It holds a contract (`intentlane.yaml`), the protocol list the compiler expects (`protocols.json`), and `verify.mjs`, which runs the whole chain:

```sh
node apps/example-macos/verify.mjs
```

The script generates the Swift, compiles it for the local macOS SDK, then runs `appintentsmetadataprocessor` from the Xcode toolchain and asserts the extracted metadata. The compile step needs both flags together, `-emit-const-values` and `-const-gather-protocols-list <protocols.json>`, or the compiler writes no `.swiftconstvalues` file and the processor refuses to run. Both flags exist in Xcode 27 and not before, so the script checks for the second one and stops with a clear message on an older toolchain.

What the script proves: five actions, `outputFlags: 7` on the four `open_app` actions and `4` on the native `PinLink`, `DeleteLink` as the only action with an explicit authentication policy, the `IntentLaneLinkEntity` entity, its `IntentLaneLinkQuery`, the `IntentLaneSaveLinkTag` enum, the `IntentLaneLinkEntity` value returned by `PinLink`, and four registered shortcuts. The protocol list the compiler requires is checked in at `apps/example-macos/protocols.json`: it is an input to the compile step, not an output of it, it is not derivable from the contract, and without both flags the compiler writes no `.swiftconstvalues` and the processor refuses to run.

What is still missing is the assistant schema layer. `systemProtocols`, `assistantDefinedSchemas` and `assistantDefinedSchemaTraits` come out empty on every action, so Siri treats these intents as custom actions instead of attaching them to the domains it already understands. Conforming an intent to an app schema (`@AppIntent(schema:)`, `@AppEntity(schema:)`, `@AppEnum(schema:)`) is the next step, and it is the same kind of deterministic boilerplate the compiler exists to produce.

The contract declares one or both platform floors: `min_ios`, `min_macos`, or both, and a config with neither is refused. The macOS example declares `min_macos` only. The `@available(macOS 27.0, *)` annotation the generator emits follows the system schema the contract uses rather than the declared floor, so an app that deploys to macOS 10.14 still gets the guard App Intents needs. A declared floor is never judged against a catalogue entry for the other platform: the catalogue states iOS floors only, and pretending otherwise would reject valid macOS contracts.
