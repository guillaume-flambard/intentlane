# Human gates: what is prepared, and what still needs a person

Gates 4 to 7 of `openspec/LAUNCH-CONTROL.md` each end in a human step. This file
says what the repository now does for each one by machine, and the exact thing a
person must still do. It never claims that a machine step replaces the
observation.

## Gate 4: NetNewsWire macOS proof

Machine, prepared and verified:

- the pilot rebuilds from versioned sources: `sh pilots/netnewswire/reproduce.sh`
- the fixture is versioned and servable: `sh docs/pilots/fixtures/serve.sh`
- the pilot state is checkable: `python3 pilots/netnewswire/check-pilot-state.py`
- the metadata surface is asserted: `sh pilots/netnewswire/tests/run-all-tests.sh`

Human, remaining: steps 1 to 6 of `MANUAL-SIRI-ACCEPTANCE.md`, on macOS 27.0.1
(build 26A434). Record the OS build, the system locale and the Siri language
beside each observation.

## Gate 5: independent reproduction

A second person reproduces the acceptance on a separate session. The package is
ready: this file, `MANUAL-SIRI-ACCEPTANCE.md`, the fixture, and the state check.

What the reviewer needs:

```sh
sh pilots/netnewswire/reproduce.sh            # or use the installed pilot app
sh docs/pilots/fixtures/serve.sh              # in another terminal
sh pilots/netnewswire/init-pilot.sh           # subscribe + verify the initial state
```

Then run steps 1 to 6 of `MANUAL-SIRI-ACCEPTANCE.md` and record the result. The
pass criterion is the same table: each step either matches its expected result or
it does not. An unknown is recorded as unknown, never as a pass.

The reviewer must not be handed Guillaume's database: a clean checkout and the
commands above are enough. `init-pilot.sh` subscribes the feed through the app's
own OPML import, so no local state is assumed.

## Gate 6: iOS pilot

Machine, possible without a device:

- the same contract generates iOS-compatible Swift; `apps/example-expo` builds it
  for the simulator in CI, so the generated surface is known to compile off-device
- the metadata processor runs for a simulator build, so the intent and entity
  surface is checkable without hardware

Human, remaining: a signed device build, the three journeys, the negative case,
and a macOS-versus-iOS comparison. Signing identity and the physical device are
the hard requirements; nothing here can substitute for them.

## Gate 7: third-party quickstart

Machine, verified in this pass:

- `npx intentlane` did not resolve on a clean machine: the registry has no
  unscoped `intentlane` package. The published name is
  `@memolabs-apps/intentlane`, and the public quickstart and its companions now
  use it.
- the CI snippet in `CLIENT-QUICKSTART.md` was not valid YAML; it is fixed.
- the published package runs `init`, `validate`, `generate` and `doctor` in a
  clean directory.

Human, remaining: a genuine third party follows `CLIENT-QUICKSTART.md` from a
clean checkout and reports where comprehension or reproduction fails.

The third party tests comprehension and reproducibility, not a broken command:
the two mechanical defects above are fixed before the handoff.
