## Why

Le dépôt sait lire du code et sait piloter une transformation. Il ne sait pas
dire ce qu'un système vivant vient de faire, et c'est la moitié qui manque.

Pendant le pilote IINA, la preuve décisive n'a jamais été lisible dans le source.
Le journal disait `indexed 1 item(s), deleted 0, left 0` au premier document, puis
`indexed 0, deleted 0, left 1` au second, et `rewrote 0` au lancement. Aucun audit
statique ne pouvait produire ces nombres. Le bug `published.isEmpty` n'a existé que
parce que cette réconciliation a été observée en direct, et il a fallu compter pour
le voir.

`intentlane pilot run` sait faire cela, mais seulement comme étape d'une
transformation, et son résultat est un verdict par étape. `intentlane audit` ne lit
que du code. Il n'existe donc aucun moyen de *constater* sans *transformer* et sans
*juger*.

## What Changes

- Ajouter un manifeste de sondes qui déclare, pour chaque sonde, l'id, la question
  qu'elle répond, la commande qui répond et le format de sa sortie.
- Ajouter `intentlane observe`, qui exécute les sondes déclarées et enregistre ce
  qu'elles ont vu, sans rendre de verdict.
- Enregistrer une sonde qui ne peut pas tourner comme `unavailable` avec une
  confiance de 0, jamais l'omettre, et la distinguer d'une sonde qui a tourné et a
  rapporté un négatif, qui est `absent`.
- Enregistrer comme texte ce qu'une sonde imprime, y compris `PASS`, sans jamais
  promouvoir une observation en revendication.
- Réutiliser la forme de confiance des revendications, un nombre en 0 à 1 plus sa
  distribution, pour qu'une seule règle gouverne la contestabilité.

## Capabilities

### New Capabilities
- `live-observation`: des sondes déclarées sont exécutées contre un système vivant et
  leurs constats sont enregistrés avec la commande, le statut de sortie et la
  confiance, sans verdict et sans absence silencieuse.

### Modified Capabilities
- Aucun.

## Impact

`packages/schema` pour le manifeste, `packages/core/src/observe.ts` pour le
lecteur, `packages/cli` pour la commande, et
`pilots/iina/observations.yaml` comme premier manifeste. La change n'introduit
aucune dépendance et aucun appel réseau, et ne touche aucun code amont.
