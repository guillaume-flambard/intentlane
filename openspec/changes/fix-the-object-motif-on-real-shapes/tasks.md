## 1. A declaration that spans lines

- [x] 1.1 Red: a support fixture whose list conformance is on a continuation line, and a
      test that the type is found.
- [x] 1.2 Red: a test that the proof names the first line of the declaration.
- [x] 1.3 Red: a test that a file ending mid-declaration yields no object, because an
      unterminated declaration is not something to build a claim on.
- [x] 1.4 Green: read a declaration until the line that closes it, keeping the first line
      as the proof.
- [x] 1.5 Check the IINA discovery is unchanged, because the fix must not change a result
      that was already right.

## 2. A discovery that cannot act

- [x] 2.1 Red: `analyse` is blocked, not passed, when no object class is actionable.
- [x] 2.2 Red: the reason names the classes it did find.
- [x] 2.3 Red: the journal marks the step blocked and carries the diagnostic.
- [x] 2.4 Green: implement it, keeping the pass case unchanged.
- [x] 2.5 Check IINA still passes, because it has one actionable class.

## 3. The other two pilots, run for real

- [x] 3.1 Run the discovery on FSNotes and record what it finds now.
- [x] 3.2 Run the discovery on HandBrake and record that it finds nothing, and why.
- [x] 3.3 Write both outcomes into `deviations.md`, including that HandBrake is out of
      reach of `analyse` and that this was not noticed until the motif was run on a second
      repository.

## 4. Verification

- [x] 4.1 `pnpm vitest run` green.
- [x] 4.2 `pnpm typecheck` clean, and the emitted `.js` deleted before the tests, because a
      stale emitted file shadows the source.
- [x] 4.3 The three IINA Swift suites still pass.

## 5. Found while running the command on a pilot it was not written for

The build invocation hardcoded IINA's project and scheme, and the demo identity
hardcoded IINA's bundle identifier. Both leaked into an FSNotes run. They are now
declared per pilot, with tests.
