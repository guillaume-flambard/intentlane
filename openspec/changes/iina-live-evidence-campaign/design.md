## Context

The pilot advertises exactly two system surfaces: a `system.searchInApp` journey that lands on
IINA's own History window, and a `system.open` journey that opens one exact played item. The
metadata already carries the corresponding system protocols, and that is necessary but not
sufficient evidence.

IINA records playback history only while `recordPlaybackHistory` is enabled, and its History window
search filters on the file path by default while the Siri resolver matches on the visible title.
A live campaign must therefore be able to distinguish a resolver success from a window-search
success, and must exercise the case where the two disagree.

## Goals / Non-Goals

**Goals:** observed, reproducible evidence for each claimed surface plus its negative, entered in a
ledger that a validator can check.

**Non-Goals:** automating the Siri UI, broad usage claims, production media libraries, real user
data, any upstream conversation.

## Decisions

- Use three local, freely usable short fixtures named `Aurora`, `Borealis` and `Cygnus`, played
  once to seed history, and deliberately give one of them a visible title that differs from its file
  name so the title-versus-path divergence is exercised rather than hidden.
- Record OS build, locale, Siri language, app build and the exact phrase or query for every
  observation, matching the NetNewsWire runbook.
- Record a negative for every positive, including an invented title, and a deleted-file case.
- Require an independent second tester who replays from a clean state without assistance.
- Keep the ledger unverified until the validator agrees; no marketing claim may precede it.

## Risks / Trade-offs

- A spotlight result can be cached from an earlier run; the campaign must start from a cleared
  index or record the exact conditions, otherwise a stale success is indistinguishable from a real one.
- Siri may resolve a media the History window does not list, because their matching differs; a
  disagreement is a finding to record, not a pass.
- The campaign needs a person and a device, so it cannot be scheduled inside an automated pipeline
  and must be tracked as a human gate.
