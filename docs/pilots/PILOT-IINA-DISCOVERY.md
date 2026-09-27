# IINA pilot discovery

## Decision

IINA is the second IntentLane pilot. It is a native macOS application with a local, user-controlled playback history and an existing navigation path to reopen an item. This makes it complementary to NetNewsWire: the data is a played-media history rather than a feed.

The first scope is deliberately narrow:

1. Search played media in IINA.
2. Open one exact played-media item in IINA.

It uses generic `system.searchInApp` and `system.open` schemas. It does not claim an audio-specific schema: IINA is primarily a video player and the current product does not generate that specialised family.

## Read-only evidence

Source inspected: IINA GitHub `c071ff3`, cloned on 2026-09-23.

| Existing IINA capability | Source evidence | IntentLane mapping |
| --- | --- | --- |
| Native macOS project | `iina.xcodeproj` | Native adapter and generated Swift source |
| Playback history | `iina/HistoryController.swift` | `PlayedMedia` entity source |
| History search UI | `iina/HistoryWindowController.swift` | Search handler opens this UI with the supplied term |
| Reopen selected media | `PlayerCore.activeOrNew.openURL(selected.url)` in `HistoryWindowController.swift` | Exact entity open handler |
| User can disable history | `recordPlaybackHistory` preference | No indexing or donation without this opt-in source |

The repository currently has no App Intents, Siri, Spotlight or Core Spotlight implementation. IntentLane audit reports a native macOS route, local architecture, and no discovery surface.

Sources: [IINA repository](https://github.com/iina/iina), [IINA contribution guide](https://github.com/iina/iina/blob/develop/CONTRIBUTING.md).

## Entity and privacy contract

`PlayedMedia` maps an existing `PlaybackHistory` record.

- Persistent identifier: IINA's own `mpvMd5` hash of the canonical media URL, which for a local
  file is a hash of its path. It is opaque, stable across launches and across a title change, and
  never exposes a filesystem path. It is **not** stable across a move or a rename: the identifier
  changes, the previous identifier resolves to nothing, and the app refuses rather than opening
  another item. The next index refresh republishes the item under its new identifier. Decided on
  2026-09-24, see `openspec/changes/iina-identifier-and-subtitle-contract`.
- Display title: IINA's stored title, otherwise the file basename.
- Subtitle: media kind only. The last-played date is deliberately excluded: it changes every time
  the same media is played again, which would make the Spotlight record mutable on the most frequent
  history event, and recency is already carried by the order of the records. Do not place full local
  paths in Spotlight or Siri text. Amended on 2026-09-24.
- Resolution: case- and diacritic-insensitive match over the user-visible title; an absent item resolves to zero entities.
- Open: verify the local file still exists, then call the existing `PlayerCore.activeOrNew.openURL(url)` path on the main actor.
- Lifecycle: index only history while history recording is enabled; remove an entry when history is cleared, the item disappears, or recording is disabled.

## Fixture and acceptance plan

Use three local, freely usable short media fixtures: `Aurora`, `Borealis`, and `Cygnus`. Open them once to populate history.

Automatic gates:

1. Map history records to entities without exposing paths.
2. Resolve exact title, ambiguous title, missing title, and a deleted-file record.
3. Test the open adapter calls IINA's established playback path only for a valid resolved record.
4. Test index creation and removal for history preference, deletion, and clear-history events.
5. Generate source, build IINA, extract App Intents metadata, and run `intentlane verify`.

Live gates:

1. Spotlight search for `Aurora` presents an IINA result and opens that exact media.
2. Siri asks which item when needed; selecting `Aurora` opens that exact media.
3. A made-up title opens neither `Cygnus` nor another history entry.
4. A second person reproduces the accepted flows.

The automatic gates prove the adapter and generated contract. The live gates remain manually observed evidence, not a claim based solely on a build.

## Next implementation sequence

1. Create an isolated IINA pilot worktree and build upstream unchanged.
2. Add an app-owned `PlayedMedia` adapter and tests against IINA's real history and player seams.
3. Add the generated schema layer and named Spotlight index lifecycle.
4. Run the automated release gate.
5. Run one manual acceptance campaign on a clean installed build.
6. Before an upstream pull request, prepare the design proposal requested by IINA's contribution guide and disclose AI assistance if used.

## État au 2026-09-23

- Étape 1 — copie de travail isolée : **fait** (branche `intentlane/pilot-playedmedia`
  dans `/tmp/il-pilot/iina`), IINA amont construit (dylibs récupérées).
- Étape 2 — adaptateur app-owned + tests : **fait**. `PlayedMediaCore` (noyau pur),
  `PlayedMediaAdapter` (résolveur historique, ouverture via
  `PlayerCore.activeOrNew.openURL`, handler `system.searchInApp`, index Spotlight
  nommé), `HistoryWindowController.applySearch`. Tests métier **17/17 verts**.
- Étape 3 — couche générée + cycle d'index : **fait** (`played_media`,
  `system.searchInApp` + `system.open`, index nommé, stale removal).
- Étape 4 — certification automatique : **fait**. `intentlane verify --pilot`
  certifie six revendications déterministes, `contract`, `generated`,
  `applicationTests`, `integrationTests`, `metadata` et `indexSync`, sans aucune
  intervention humaine. Métadonnées réelles : `IINA.OpenPlayedMedia` porte
  `OpenIntent` + `OpenEntity` + `AssistantIntent`, cible
  `IINA.IntentLanePlayedMediaEntity`.
- Étape 5 — preuve système observée (Spotlight `Aurora`, Siri avec homonyme,
  titre inventé) : **non faite, et plus revendiquée par défaut**. C'est une
  revendication *observée*, disponible sur demande avec
  `--claim siri-conversation`, qui exige alors le ledger. Voir
  `pilots/iina/RUNBOOK.md`.
- Étape 6 — design proposal + divulgation IA avant toute PR : **non faite**.

Aucun contact, aucune PR. La certification porte sur les revendications
nommées, et rien d'autre n'est certifié.

