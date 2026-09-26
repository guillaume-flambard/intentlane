## Why

Le ledger décrit ce qu'un journey tient, la dérivation décide ce qu'une revendication
vaut, et rien ne réunit les deux. Un lecteur doit recomposer à la main ce qu'un journey
a démontré, ce qui lui manque, et pourquoi il n'est pas certifié. C'est le travail que
la vue doit faire, et c'est la question à laquelle un score global ne répond pas.

Le compte `5/6` peut être montré comme état de preuve. Il ne doit jamais servir de
seuil, parce qu'un seuil qui décide d'un pourcentage est exactement l'argmax arbitraire
que `claim-confidence` interdit ailleurs.

## What Changes

- Exposer le ledger parsé sur le résultat de la validation, aujourd'hui jeté, pour que
  la vue puisse le consommer.
- Ajouter une projection pure qui joint les journeys d'un ledger aux `ClaimOutcome`
  d'une dérivation, et rend pour chaque journey ses revendications, les couches que
  ces revendications exigent, et les raisons qui l'empêchent d'être vérifié.
- Afficher l'état de preuve comme une information, jamais comme un verdict.

## Capabilities

### New Capabilities
- `journey-view`: un journey se lit comme une liste de revendications dérivées et de
  couches requises, sans qu'aucune vue ne tranche.

### Modified Capabilities
- `pilot-evidence-ledger`: la validation expose le ledger parsé.

## Impact

`packages/core/src/pilot-ledger.ts` pour la surface exposée, un module neuf
`journey-view.ts` pour la projection. Aucun changement amont, aucun appel réseau, aucun
contact, aucune PR.
