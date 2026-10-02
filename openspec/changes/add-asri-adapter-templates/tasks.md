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

- [x] 4.1 Replace the Reader pilot contract with system search/open.
  `pilots/netnewswire/contract.yaml` declares `.system.open` and
  `.system.searchInApp` with one article entity and no Reader schema. Evidence:
  `pnpm exec tsx packages/cli/src/index.ts validate -c pilots/netnewswire/contract.yaml`.
- [x] 4.2 Complete the NetNewsWire article adapter and lifecycle hooks.
  `pilots/netnewswire/integration/IntentLanePilot.swift` implements the resolver,
  open, search and mark-read handlers against NetNewsWire's own APIs, and
  `integration/apply-hooks.py` registers them at launch and exposes the two entry
  points. Evidence: `sh pilots/netnewswire/reproduce.sh` builds the pinned app.
- [x] 4.3a Machine proof: build, extract metadata, run the machine gates.
  The pinned app builds and the extracted metadata carries the three actions and
  the entity. Evidence: `sh pilots/netnewswire/tests/run-all-tests.sh`.
- [ ] 4.3b Human proof: verify Spotlight, the Siri AI journeys and the negative
  journey on macOS 27. Requires a person. Target build is macOS 27.0.1 (26A434);
  the 26A428 result is historical. Protocol:
  `docs/pilots/MANUAL-SIRI-ACCEPTANCE.md`.
- [ ] 4.4 Obtain an independent reproduction before any customer-facing claim.
  Requires a second person. `reviewer-b` is a pending placeholder, not a
  reproduction.

## 5. Documentation

- [ ] 5.1 Rewrite the quickstart around ASRi as the default path.
- [x] 5.2 Keep Raccourcis documentation in a clearly marked optional
  automation section.
- [x] 5.3 Publish the Apple-source-backed adapter examples and privacy notes.
