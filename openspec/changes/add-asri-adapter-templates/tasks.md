## 1. Product contract

- [x] 1.1 Add an explicit ASRi integration mode for `.system.searchInApp` and
  `.system.open`.
- [ ] 1.2 Make all Shortcuts output opt-in and reject a Shortcuts-only schema
  when a contract claims Siri AI.
- [ ] 1.3 Add positive, negative, and mixed-domain validation fixtures.

## 2. Generated integration seam

- [x] 2.1 Generate a customer-owned adapter template for each entity resolver.
- [x] 2.2 Generate registration and indexing lifecycle hooks with no business
  logic or private-store enumeration.
- [x] 2.3 Add a CLI adapter-output option that never overwrites an existing
  customer adapter without an explicit overwrite flag.

## 3. System search/open package

- [x] 3.1 Generate `.system.searchInApp` and `.system.open` declarations from a
  validated ASRi contract.
- [ ] 3.2 Add `IndexedEntity` lifecycle support for upsert, refresh, and
  deletion.
- [ ] 3.3 Add AppIntentsTesting fixtures for exact, missing, and ambiguous
  titles.

## 4. NetNewsWire proof

- [ ] 4.1 Replace the Reader pilot contract with system search/open.
- [ ] 4.2 Complete the NetNewsWire article adapter and lifecycle hooks.
- [ ] 4.3 Build, inspect metadata, verify Spotlight, and run the Siri AI and
  negative journeys on macOS 27.
- [ ] 4.4 Obtain an independent reproduction before any customer-facing claim.

## 5. Documentation

- [ ] 5.1 Rewrite the quickstart around ASRi as the default path.
- [x] 5.2 Keep Raccourcis documentation in a clearly marked optional
  automation section.
- [x] 5.3 Publish the Apple-source-backed adapter examples and privacy notes.
