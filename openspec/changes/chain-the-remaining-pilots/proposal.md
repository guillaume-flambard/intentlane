## Why

La campagne a deux pilotes certifiés sur deux stacks, FSNotes en Swift et HandBrake en Objective-C, et trois candidats qualifiés qui n'ont pas tourné. La porte de l'offre demande trois validations dans trois domaines, donc la campagne est à un pilote de pouvoir se chiffrer elle-même, et elle n'a aujourd'hui aucun ordre, aucun critère d'entrée et aucune liste de défauts à corriger entre les pilotes. Une revue de branche a par ailleurs trouvé des défauts qu'il faut traiter avant d'enchaîner, parce que les reproduire sur les trois prochains pilotes amplifierait le coût au lieu de le réduire, et rendrait leur attribution plus difficile. Les corriger une fois, sur deux stacks, est moins cher que les découvrir trois fois.

## What Changes

- Les trois pilotes restants sont ordonnés et chacun a un critère d'entrée écrit avant de commencer : que son application compile depuis un clone propre, et que le précédent pilote soit certifié.
- Les défauts trouvés par la revue sont corrigés dans les deux pilotes existants avant tout nouveau pilote, parce que les reproduire sur trois stacks les rendrait plus chers et plus difficiles à attribuer.
- La suppression d'index câblée sur les événements de création, déplacement et suppression, ce qui est le seul écart connu entre ce que le `indexSync` certifie et ce que l'application fait.
- Une sonde de lancement, parce que les deux pilotes compilent et câblent l'enregistrement mais ne mesurent pas que le processus s'enregistre.
- La revendication observée, au plus une fois, sur le pilote choisi et avec son ledger.
- La porte de l'offre : trois domaines distincts, les deviations comptées, le prix dérivé de la feuille d'effort, et des brouillons de PR et de contact qui ne sont pas envoyés.
- La clôture : recette version 2 et publication de ce que la campagne a validé et de ce qu'elle n'a jamais observé.
- Deux décisions qui appartiennent à la personne restent nommées et bloquées : le push sur un remote public dont la plage contient du material commercial, et l'authentification npm.

**BREAKING** Aucun changement cassant pour les applications existantes. Les deux pilotes certifiés changent de code interne mais conservent le même jeu de six revendications, donc aucune revendication déjà certifiée n'est retirée.

## Capabilities

### New Capabilities
- `pilot-entry-criteria`: ce qu'un pilote doit prouver avant de commencer, et ce qui doit être vrai pour qu'un précédent soit réutilisable, y compris l'ordre des trois candidats restants et les raisons de cet ordre.
- `pilot-index-lifecycle`: la suppression d'index doit être câblée sur les événements réels de l'application, et un test doit prouver qu'un objet supprimé disparaît de l'index nommé.
- `pilot-launch-probe`: une commande doit prouver que l'enregistrement s'exécute dans le processus lancé, ce que la compilation ne prouve pas.
- `campaign-offer-gate`: les conditions de prix de l'offre, la revision du wording contre le registre de revendications, et la preparation de contact qui ne part pas.
- `campaign-closing`: la recette version 2 et la publication des résultats, y compris les surfaces jamais observées.

### Modified Capabilities
- `pilot-stack-adaptation`: la règle du main actor sur la couture qui lit l'application, qui est une exigence nouvelle issue de la revue, et l'exigence qu'un défaut trouvé sur une stack soit vérifié sur les autres avant d'enchaîner.

## Impact

- Dépôt produit : les deux pilotes et leurs suites de tests, la feuille d'effort, le journal de déviations, les specs de la campagne.
- Dépôts pilotes : `intentlane-fsnotes` et `intentlane-handbrake`, dont les fichiers de couture et les scripts de projet.
- Outils : aucun changement d'API publique prévu, la comparaison des métadonnées et le floor macOS sont déjà en place.
- Prérequis externes non modifiés : les six paquets Homebrew et la Metal Toolchain que HandBrake a demandés restent un prérequis de sa machine, pas une dépendance du produit.
- Non modifiable dans ce changement : le push et la publication npm, qui restent des décisions de la personne et non des étapes.
