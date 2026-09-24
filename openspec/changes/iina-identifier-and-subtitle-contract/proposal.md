## Why

The pilot deviates from its own spec on two entity-contract points, and both need a decision
before the live evidence is collected, because changing either invalidates recorded results.

1. **Identifier stability.** The pilot uses IINA's `PlaybackHistory.mpvMd5` as the entity
   identifier. For a local file, `Utility.mpvWatchLaterMd5` returns `url.path.md5`. The identifier
   is therefore a hash of the filesystem path and changes when the file is renamed or moved, which
   the universal client contract explicitly requires not to happen. The privacy property holds
   (it is a hash, never a path), but the stability property does not.

2. **Subtitle.** `PILOT-IINA-DISCOVERY.md` says the subtitle carries the media kind **and the
   last-played date**. The contract declares `display.subtitle: kind`, and the resolver never
   supplies a date, so the last-played value is computed and then discarded. This is a deliberate
   simplification with a real trade-off, not an oversight, and it is currently undocumented.

## What Changes

- Record the explicit decision for identifier stability, with the universal contract as the
  criterion. Decided on 2026-09-24: keep IINA's `mpvMd5`, state its exact envelope, and amend the
  pilot spec and contract instead of claiming stability across a move.
- Record the explicit decision for the subtitle. Decided on 2026-09-24: media kind only, with the
  pilot spec amended and the freshness rationale recorded.
- Add regression tests that lock both decisions, including the safe consequence of a move: the old
  identifier opens nothing and no substitute is opened.
- Make the subtitle decision live in one tested place, and make entity construction single-path.

## Capabilities

### New Capabilities
- `iina-entity-contract`: the identifier stability and subtitle rules are decided, documented and tested.

### Modified Capabilities
- Aucun.

## Impact

Pilot contract `/tmp/il-pilot/iina-pilot/intentlane-playedmedia.yaml`, pilot adapter and core,
`PILOT-IINA-DISCOVERY.md`, and the privacy section of the entity dossier. No upstream change, no
contact, no PR.
