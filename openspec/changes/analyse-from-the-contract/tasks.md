## 1. Red

- [x] 1.1 A fixture whose contract names `id` and `title`, declares both in a record
      type, and passes `record.id` to an `open` implementation: the analysis passes.
- [x] 1.2 The same fixture with the identifier declaration removed: blocked, and the
      reason names the field.
- [x] 1.3 The same fixture with the call site changed so the opener is reached with
      something else: blocked, because the identifier never reaches it.
- [x] 1.4 A fixture where the display title the contract names is absent: blocked, and
      the reason names the field.

## 2. Green

- [x] 2.1 Implement the contract path, keeping the motif path and its result identical
      when no contract is given.
- [x] 2.2 The existing motif tests pass untouched.

## 3. Wiring

- [x] 3.1 `pilot run` resolves `pilots/<id>/contract.yaml` from the working directory and
      accepts an explicit `--contract`, and passes it to the analysis.
- [x] 3.2 `discovery.json` is written whether or not a contract was used.

## 4. The real run

- [ ] 4.1 The FSNotes run passes `analyse` with a reason naming the entity, and the
      diagnostics above are reachable by breaking one link on purpose.
- [x] 4.2 `pnpm test` green, `pnpm verify` exits 0.

## 5. Found while measuring the FSNotes run

Two defects were measured in the motif path and are deliberately not fixed here,
because changing a heuristic changes a result that other work checked.

- [ ] 5.1 `identifiersOf` requires a member to sit at exactly `declarationIndent + 2`.
      Swift indents members at four, so a conventionally written file yields no
      identifier at all. Every fixture in `discovery.test.ts` is written at two, which
      is why the suite is green over a rule the language does not follow. Measured on
      `FSNotesCore/Business/Project.swift`, where the class opens at column 0 and its
      properties sit at column 4.
- [ ] 5.2 The opener motif matches `openURL(` in the object's own file only, and that
      string occurs zero times in the whole FSNotes working copy. Its opening path is a
      selection call, which no motif here would recognise.

Both are recorded rather than patched: 5.1 would change the discovery on every real
Swift repository, and the previous change required IINA's discovery to stay identical.
