# ADR de conception: une vue qui ne calcule aucun verdict

## Le principe

`journeyView` ne décide rien. Elle prend deux décisions déjà prises, le statut du
ledger et les `ClaimOutcome` de la dérivation, et les affiche. Sa seule arithmétique est
l'union des `requires` des revendications nommées, qui est une mise en forme, pas un
jugement.

Un journey est `verified` seulement si le ledger est vérifié, que chaque revendication
nommée l'est, et qu'aucune couche requise n'est ailleurs qu'à `pass`. Ces trois
conditions sont les verdicts des deux briques en amont, pas un troisième moteur. La
preuve que ce n'en est pas un : la vue ne prend jamais une décision qu'elle ne
reçoitrait pas d'ailleurs.

## Pourquoi exposer le ledger parsé

`validatePilotLedger` jetait le ledger après validation, donc aucun consommateur ne
pouvait lire les journeys sans reparcourir le YAML. C'est un manque réel, pas une
question de goût. Exposer le ledger change la forme du résultat mais pas la validity :
une validation en échec renvoie toujours `ledger: undefined`, donc aucune vue ne peut
construire un journey à partir d'un document refusé.

## Pourquoi aucune inférence de couche

Un journey qui ne nomme aucune revendication n'est jamais `verified`, même quand toutes
ses couches sont à `pass`. Déduire « la revendication est vérifiée » depuis un statut de
couche serait réintroduire l'inférence implicite que `carry-access-to-the-contract` a
supprimée, et que la liaison de `BASE-2` vient d'interdire. Le statut est donc
`unverified` avec la raison que le journey ne nomme rien.

## Le `5/6`

Affiché comme `proof state`, jamais utilisé pour décider. Un seuil en pourcentage
introduirait un second seuil, différent de `DEFAULT_CLAIM_CONFIDENCE_THRESHOLD`, et
donc une seconde règle de contestabilité, ce que le dépôt refuse par construction.

## Limite assumée

La vue ne sait pas encore dire *quelle* preuve manque pour un journey, seulement
qu'elle manque. Elle ne propose donc aucune action, ce qui est la bonne frontière :
l'action appartient à `plan`, qui sera son premier consommateur.
