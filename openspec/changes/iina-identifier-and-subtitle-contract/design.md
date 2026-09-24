## Context

IntentLane's universal contract states that an `AppEntity.id` must be stable, non-guessable, and
must survive a title change, a move, a synchronisation and a reinstall. The universal integration
method makes the same promise. IINA's history offers `mpvMd5` (a path hash for local files) and
`url` (the real location). Neither is both stable and non-guessable on its own.

The subtitle has a second, subtler cost. A last-played date is not constant for a given file: playing
it again changes the date, so a date-bearing subtitle means the Spotlight record must be rewritten
on every play, and a result read in Spotlight shows a value that may already be stale.

## Goals / Non-Goals

**Goals:** one documented answer per point, consistent with the universal contract, locked by a
test, settled before human evidence is recorded.

**Non-Goals:** implementing a new IINA-side identifier store, changing how IINA computes its own
hashes, live surface evidence.

## Decisions

Taken on 2026-09-24, after the review.

- **Identifier: keep IINA's `mpvMd5` and document its exact envelope.** For a local file
  `Utility.mpvWatchLaterMd5` returns `url.path.md5`, so the identifier is a hash of the path: opaque,
  stable across launches and across a title change, and *not* stable across a move or a rename. The
  two alternatives were rejected: a content hash would require reading media bytes, adding state and
  colliding on identical copies, and a pilot-owned UUID store keyed by the path hash would not fix
  the move case at all, because the lookup key is still the path.
- The failure mode is safe and is now tested: after a move the previous identifier resolves to
  nothing, the open throws, and no other item is opened in its place. The next index refresh
  republishes the item under its new identifier. The pilot spec and the pilot contract now state
  this envelope instead of claiming stability across a move.
- **Subtitle: media kind only, and the pilot spec is amended.** A last-played date changes on every
  replay, so a date-bearing subtitle would make the Spotlight record mutable on the most frequent
  history event, and recency is already carried by the order the records keep. Adding the date would
  also mean a contract change, a generator change and a snapshot update for a pilot whose live
  evidence is still missing.
- The decision lives in one tested place: `PlayedMediaCore.subtitle(for:)` is the only thing that
  builds the subtitle the system sees, and `IntentLanePlayedMediaEntity.from(_:)` is the only place
  a record becomes an entity.
- `PlayedMediaRecord.lastPlayed` stays as data and is documented as not displayed, so nobody reads
  it as a subtitle.

## Risks / Trade-offs

- A Spotlight result for a moved file becomes unopenable until the index is refreshed. Acceptable:
  the safe behaviour is a refusal, not a wrong item, and the refresh follows every history change.
- A user who renames files sees their results change identity. The alternative is storing more state
  about their media, which is a worse trade for a pilot.
- Keeping the date out of the subtitle means the system UI shows less. The history order carries the
  recency, and the value can be added later as a contract and generator change if a client asks.
