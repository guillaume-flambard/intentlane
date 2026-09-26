## Why

La tâche 6.2 du change `complete-apple-27-capability-catalogue` existe pour prouver
qu'un change « ne doit rien changer à ce qu'un projet obtient ». Elle a trouvé
l'inverse, et le score est le chiffre que l'audit vend.

Même application, même code, avant et après l'ajout du groupe `models` :

| | avant | après |
|---|---|---|
| findings | 29 | 38 |
| applicable | 28 | 37 |
| maximum | 84 | 111 |
| points | 6 | 6 |
| **score** | **7** | **5** |
| band | `early` | `early` |

Le projet n'a pas bougé. Le score a baissé de deux points.

La cause est lisible dans `audit-score.ts` : `unknown` vaut 0 point et compte
néanmoins comme applicable, donc `maximum = applicable * 3`. Chaque record qu'un
projet n'a pas obtenu lui coûte trois points de dénominateur.

Ce n'est pas un défaut du change en cours, c'est la conséquence du modèle de
score, et il ne reste pas local. L'inventaire de gaps mesuré sur le SDK 27
installé tient **2160 candidats**. À trois points chacun, traiter cet inventaire
ajouterait environ 6480 au dénominateur de tous les projets et ferait tendencies
vers zéro. Autrement dit : plus le catalogue devient exact, plus chaque client a
l'air d'une mauvaise app. C'est le mauvais sens, et il se corrige maintenant ou
il ne se corrige plus.

## Le fait que rien ne l'a attrapé plus tôt

`openspec/specs/` ne contient qu'un `.gitkeep`. Le score a une version
(`AUDIT_SCORE_VERSION`), des bandes, des tests et un format de sortie, et il n'a
jamais été écrit comme exigence. Une sémantique qui n'est spécifiée nulle part ne
peut pas être revue, seulement subie. Ce change l'écrit.

## What Changes

- Écrire la sémantique du score comme exigence, ce qu'elle n'a jamais été : ce
  que vaut chaque état, ce qu'est le dénominateur, et ce qu'un score est
  comparable à.
- Dire explicitement qu'un score se lit « contre le catalogue X », et que le
  catalogue est le dénominateur, donc qu'un score seul n'est pas interprétable
  d'une version de l'outil à l'autre.
- Exiger qu'un rapport donne la lecture par groupe, pour distinguer un projet qui
  a régressé d'un catalogue qui s'est complété.
- Trancher ce que vaut `unknown` pour le score, qui est aujourd'hui la seule
  question que le change laisse ouverte.
- Déclarer `complete-apple-27-capability-catalogue` dépendant de ce change pour
  ses tâches 2.x et 3.x, qui ajoutent des records et donc aggravent le problème.

## Capabilities

### New Capabilities
- `audit-score`: ce que le score mesure, ce qu'il ne mesure pas, et contre quoi
  il se lit. Une exigence, parce qu'il n'en existe aucune.

### Modified Capabilities
- aucune. Le change ne touche pas `capability-catalogue` ni `capability-audit`,
  il écrit ce qui manquait à côté d'eux.

## Impact

`packages/core/src/audit-score.ts` si la sémantique de `unknown` change, et rien
d'autre. `catalogueVersion` et `byGroup` sont déjà dans le score, ajoutés par
`3dfdba8` sans changer aucun nombre. Les rapports déjà en circulation ne sont pas
modifiés par ce change tant que la décision n'est pas prise.

## Limite explicite

Ce change ne dit pas encore si `unknown` doit coûter. Il rend la question
explicite, la mesure, et donne les trois options avec leur coût. La décision
appartient à celui qui vend le chiffre.
