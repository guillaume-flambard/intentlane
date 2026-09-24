## 1. Identifier decision

- [x] 1.1 State the decision for `PlayedMedia` identifier stability, citing the clause it satisfies
      and the limitation it introduces.
- [x] 1.2 Confirm the identifier never encodes a filesystem path in reversible form.
- [x] 1.3 Confirm the homonym case still resolves to distinct choices through the display title.
- [x] 1.4 Align the implementation with the decision, and amend the pilot spec and the pilot
      contract with the reason recorded.

## 2. Subtitle decision

- [x] 2.1 State the decision for the subtitle: media kind only.
- [x] 2.2 Amend the pilot spec with the freshness rationale, and record the date in
      `PlayedMediaRecord` as data that is not displayed.
- [x] 2.3 Put the decision in one tested place, `PlayedMediaCore.subtitle(for:)`, and route entity
      construction through `IntentLanePlayedMediaEntity.from(_:)`.

## 3. Lock the decision

- [x] 3.1 Regression test: the identifier is IINA's hash for the canonical URL, survives a title
      change, changes after a move, and never contains a path separator.
- [x] 3.2 Regression test: the pre-move identifier opens nothing after a move, nothing is
      substituted, and the new identifier opens the moved file exactly once.
- [x] 3.3 Regression test: the subtitle is the media kind, does not change with the last-played
      date, and carries no path.
- [x] 3.4 Re-run the core suite, the index suite, the IINA build and `intentlane verify`.
- [x] 3.5 Frozen before the live evidence campaign: the contract in force is the one recorded here.

## Notes

- The core suite is now 37 checks and the index suite 7.
- Nothing in the generator or the contract changed: the decision was to keep what IINA provides and
  to state the envelope honestly, not to add a new identifier store.
- The live evidence campaign is still `not-requested`; these tests do not observe Siri or Spotlight.
