# IntentLane NetNewsWire pilot

This package makes the NetNewsWire pilot reproducible from a clean checkout. It
does not carry a NetNewsWire fork: it carries the IntentLane-owned integration
and a script that applies it to a pinned upstream revision.

## What answers what

| Question | Answer |
| --- | --- |
| Upstream revision | `0184ca38c586078117a21f96f68eef78d39b8f68` (tag `v8.0`), in `reproduce.sh` |
| Contract | [contract.yaml](contract.yaml) |
| Generated code | `IntentLaneGenerated.swift`, produced by `intentlane generate` into `<workspace>/Mac/IntentLanePilot` |
| Adapter code | [integration/IntentLanePilot.swift](integration/IntentLanePilot.swift) |
| Lifecycle changes | [integration/apply-hooks.py](integration/apply-hooks.py): one registration call in `applicationDidFinishLaunching`, two entry points on `AppDelegate`, one search method on `MainWindowController` |
| How applied | `reproduce.sh` copies the adapter and runs `apply-hooks.py`, both idempotent |
| How built | `xcodebuild` for the `NetNewsWire` scheme, `platform=macOS`, signing disabled |
| How metadata is extracted | the `appintentsmetadataprocessor` phase writes `Metadata.appintents/extract.actionsdata` into the app bundle |
| How the fixture is served | `docs/pilots/fixtures/serve.sh` on `127.0.0.1:8765` |
| How pilot state is initialized | `init-pilot.sh`: serve the fixture, subscribe through the app's OPML import, then check the state |
| How machine proof is verified | `tests/run-all-tests.sh`, plus `integration/verify-metadata.py` |

## Reproduce

```sh
sh pilots/netnewswire/reproduce.sh
```

It fetches the pinned revision, generates the App Intents, copies the adapter,
wires the hooks, builds the app and checks the metadata. `NETNEWSWIRE_DIR`
points at an existing checkout; `SKIP_BUILD=1` stops after the integration.

## Machine gates

```sh
sh pilots/netnewswire/tests/run-all-tests.sh
```

`contract` validates the contract, `generated` checks the generated Swift is not
stale, `metadata` asserts the built surface: three actions
(`MarkArticleRead`, `OpenArticle`, `SearchArticles`) and one entity
(`IntentLaneArticleEntity`) with its query.

## Human gates

`docs/pilots/MANUAL-SIRI-ACCEPTANCE.md` is the protocol a person follows. The
Siri conversation and the Spotlight result are never machine claims.

## Known limits

The old disposable fork carried three suites (`applicationTests`,
`integrationTests`, `indexSync`) that were never committed. `pilot.yaml`
therefore does not claim them: no versioned command settles them. They are
reconstructed only if a pilot requires them.
