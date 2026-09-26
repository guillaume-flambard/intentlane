## Why

Un ledger de preuves ne pouvait nommer que `contract`, `build`, `shortcuts`,
`spotlight` et `siri`, et rien ne disait ce qui prouve une revendication. Les deux
manques se combinent mal : une revendication qui exige une preuve non nommable ne peut
être ni satisfaite ni signalée, et ce qui la satisfait reste implicite donc invérifiable.

## What Changes

- Étendre le vocabulaire des couches avec `metadata`, `runtime`, `query` et
  `annotations`, sans changer la version du format, parce que les couches sont
  optionnelles depuis le début.
- Rendre ces quatre couches revendiquables par un journey, faute de quoi aucune
  revendication ne pourrait les exiger.
- Déclarer sur chaque revendication les couches qui la prouvent, et refuser une
  revendication qui n'en déclare aucune.

## Capabilities

### New Capabilities
- `evidence-layers-and-claim-requirements`: le ledger nomme les couches de preuve
  Apple 27, et chaque revendication déclare ce qui la prouve.

### Modified Capabilities
- `pilot-evidence-ledger`: le vocabulaire des couches s'étend, la forme ne change pas.

## Impact

`packages/core/src/pilot-ledger.ts` pour le vocabulaire, `packages/core/src/claims.ts`
pour les exigences. Les ledgers existants restent valides et produisent les mêmes
diagnostics. Aucun changement amont, aucun contact, aucune PR.
