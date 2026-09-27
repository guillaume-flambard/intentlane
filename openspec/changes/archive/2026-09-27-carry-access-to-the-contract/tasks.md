## 1. The schema (contract first, invalid shapes rejected)

- [x] 1.1 Red: a test in `packages/schema` rejecting an entity that declares no `exposure`.
- [x] 1.2 Red: a test rejecting an `exposure` whose rule is not one this version knows.
- [x] 1.3 Red: a test rejecting the same rule declared twice.
- [x] 1.4 Red: a test accepting each known rule alone, and preserving it verbatim in the parsed
      document.
- [x] 1.5 Green: add the exposure field to the entity schema, so those tests pass and no existing
      schema test changes meaning.
- [x] 1.6 The failure diagnostic names the field and says why the condition is required, so a
      reader can act on it without reading the schema.

## 2. The report

- [x] 2.1 Red: `parseConfig` reports a missing or unreadable exposure condition as a diagnostic
      naming the entity.
- [x] 2.2 Green: the check lives in the schema as the single place, and the report reuses it
      rather than repeating the rule.
- [x] 2.3 No new diagnostic code was needed. `IL1301` already covers a configuration error and
      this is one. A new code would have added a row to a closed union and to the guide for
      nothing, so 2.3, 2.4 and 2.5 of the first draft are withdrawn as unnecessary.

## 3. The contracts that exist

- [x] 3.1 Red: a test that validates every shipped pilot contract and fails while any of them has
      no exposure condition, so the migration cannot be done one file at a time and forgotten. It
      failed on all three before any of them was touched.
- [x] 3.2 Add the condition to `pilots/iina/contract.yaml`: `source_disabled` and `item_missing`,
      the two rules the implementation really enforces.
- [x] 3.3 Add `item_not_usable` to the FSNotes and HandBrake contracts, using the rule each one
      really enforces.
- [x] 3.4 Green: the contract test passes.

## 4. The truth test

- [x] 4.1 Red: a test asserting the generated Swift contains no access rule, because App Intents has
      nowhere to put one and a generated claim about it could not be checked.
- [x] 4.2 Green: confirmed, and kept as the thing that stops someone adding a fake generated
      property later.

## 5. Verification

- [x] 5.1 `pnpm vitest run` green, 504 tests.
- [x] 5.2 `pnpm typecheck` clean, and the emitted `.js` files beside the sources deleted, because a
      stale emitted file shadows the source and makes a passing run lie.
- [x] 5.3 The three IINA Swift suites still pass, 91 checks, because this change must not alter the
      rule they already test.
- [x] 5.4 The IINA fork still builds, because the contract is read by the same run that generates
      the adapter.

## 6. Recording

- [x] 6.1 Note in `deviations.md` that the rule lived in the adapter while the contract did not
      mention it, and that the contract is the document a client reads, so the silence was the
      defect rather than the absence of the feature.
- [x] 6.2 Note in `effort.md` what this cost, as a new stage if none of the existing ones fits. It
      is stage `R`.

## 7. Withdrawn as unnecessary

The first draft asked for a new diagnostic code, a row in the closed union and a row in
`AUDIT-GUIDE.md`. None of the three was needed: `IL1301` already reports a configuration
error, and the schema produces the message. Adding a code would have cost a row in a
closed union and a row in the guide for no new information, which is the cost the
closed union exists to prevent.
