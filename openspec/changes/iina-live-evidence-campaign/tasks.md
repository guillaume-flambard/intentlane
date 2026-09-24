# Validate five public cross-domain pilots

## Status

Every task below is now **optional**. The pilot certifies its six deterministic
claims with no human involved, and its claim set in `pilots/iina/pilot.yaml`
includes no observed claim. These tasks are the content of the observed claims
`siri-conversation` and `spotlight-ui-result`, which a client claims explicitly
with `--claim` and which then require this ledger.

## 1. Fixtures

- [x] 1.1 Provide a reproducible generator for three local, freely usable short
      media fixtures: `Aurora`, `Borealis`, and `Cygnus`.
- [x] 1.2 The fixtures are generated locally with ffmpeg from synthetic test
      patterns. No personal media, no downloaded content.
- [x] 1.3 One fixture is named differently from its embedded title on purpose, so
      the title-versus-path divergence is observed rather than hidden.
- [ ] 1.4 Play each once so the playback history contains them. Only when an
      observed claim is requested.

## 2. Recorded conditions

- [x] 2.1 Record the machine's conditions now: macOS 27.0 build 26A428, Xcode 27.0
      build 27A266a, Mac16,12, locale fr-FR, pilot commit `bab9c834`, index name.
- [ ] 2.2 Confirm the Siri language and the history recording preference at the
      start of the run, and replace the ledger `TODO` entries.

## 3. Spotlight journey

- [ ] 3.1 Search a fixture's visible title in Spotlight and record whether the
      result is attributed to IINA and opens that exact media.
- [ ] 3.2 Record the case where the visible title differs from the file name, which
      is the case that separates a Siri resolution from a History window search.

## 4. Siri journey

- [ ] 4.1 Ask Siri to open a played item and record the result.
- [ ] 4.2 Record the disambiguation prompt when two items share a visible title,
      and that the selected item is the one opened.
- [ ] 4.3 Record a title that does not exist: nothing opens, no neighbouring item
      is selected.

## 5. Edge case

- [ ] 5.1 Delete one fixture's file and record that it is no longer offered and no
      longer opens, with no substitution.

## 6. Reproduction and ledger

- [x] 6.1 The ledger exists at `pilots/iina/evidence-ledger.yaml`, with the claimed
      layers blocked and no reproduction claimed.
- [x] 6.2 The validator is proven to refuse: `intentlane evidence validate --strict`
      exits 1 with one ILA175 and five ILA174 diagnostics, and
      `intentlane verify --pilot ... --claim siri-conversation --strict` exits 1
      with `pending-evidence`.
- [x] 6.3 The observation procedure, the fields to record and the second-tester
      protocol are written in `pilots/iina/RUNBOOK.md`.
- [ ] 6.4 A second person replays the accepted flows from a clean state, unaided.
- [ ] 6.5 Every observation enters the ledger, replacing each `blocked` with the
      observed `pass` or `fail`, and `evidence validate --strict` reports
      `verified`.
- [x] 6.6 Until then the observed claims stay unclaimed, the ledger stays
      `blocked`, and the pilot is certified for its deterministic claims only. No
      OS-surface claim is made.

## Notes

- The validator short-circuits on a missing `reproduction` block, so the ledger
  names the pending state explicitly (`by: "none yet"`, `status: blocked`)
  instead of omitting it. That way it reports every missing layer as well, and the
  entry cannot be mistaken for a real reproduction.
- What the automated gates cannot establish, and the runbook says so: nobody can
  drive the Siri interface programmatically, an observation is only valid for the
  recorded conditions, and an unreproduced success keeps the ledger unverified.
