## Why

IntentLane a déjà démontré le compilateur, le plugin Expo, l'audit local et
des métadonnées App Intents sur macOS et iOS. Ce qui manque à la sortie n'est
pas une nouvelle liste indistincte de fonctionnalités Apple : ce sont les
preuves qui autorisent une promesse, les contrôles qui empêchent une régression
et la mise à disposition vérifiée des paquets.

Les sorties Apple 27 étendent fortement le champ des intégrations possibles.
Elles ne rendent pas toutes ces surfaces nécessaires à la promesse v1. Sans
frontière écrite, l'équipe risque soit de publier sans preuve Siri, soit de ne
jamais publier en attendant chaque API de la plate-forme.

## What Changes

- Ajoute une définition de lancement v1, ses conditions de blocage et son
  ordre de fermeture.
- Fait de `audit-diff`, du ledger de preuve et de la réconciliation des
  statuts les prérequis techniques de toute revendication de pilote.
- Ajoute une revalidation finale de l'inventaire Apple 27 contre le SDK final,
  les notes de version et les régressions connues avant la publication.
- Sépare les tâches automatisables, les gates humains et les décisions du
  propriétaire afin qu'aucun agent ne coche une preuve qu'il n'a pas observée.
- Lie la publication npm, le quickstart externe, les pilotes macOS/iOS, les
  claims et la landing à un même contrôle de sortie.

## Non-goals

- Ne transforme pas la v1 en générateur universel de chaque App Schema ou de
  toutes les API App Intents 27.
- Ne remplace pas les changes `compare-audit-baselines`,
  `validate-pilot-evidence-ledger`, les pilotes ou l'open core. Il les ordonne.
- Ne prétend pas qu'une compilation, une métadonnée ou un test unitaire prouve
  une interaction Siri réelle.

## Impact

Les artefacts de clôture, le catalogue et la documentation publique, la CI,
les changements OpenSpec ouverts, les pilotes et la publication npm.

