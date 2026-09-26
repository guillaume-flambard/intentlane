# ADR de conception: ce que `observe` ne fait pas

## Le trou que cette change bouche

`intentlane audit` lit un répertoire et produit des écarts. C'est une lecture
statique de code. `intentlane pilot run` observe une application vivante, mais
uniquement comme étape d'une transformation, et son résultat est un verdict
`pass` / `fail` / `blocked` par étape, pas un constat system-facing.

Il y a donc une moitié manquante. Ce qu'aucune des deux ne peut produire, c'est ce
qui a effectivement compté pendant l'IINA. Le journal disait `indexed 1 item(s),
deleted 0, left 0` au premier document, puis `indexed 0, deleted 0, left 1` au
second. Aucun audit statique ne pouvait dire ça, et le bug `published.isEmpty`
n'existait que parce que ce compte a été observé en direct, pas déduit du source.

`observe` est cette moitié : exécuter des sondes déclarées contre un système
vivant, et enregistrer ce qu'elles ont vu, sans le juger.

## Trois séparations, et elles ne sont pas négociables

**Observer ne juge pas.** Aucune observation ne porte `pass` ni `fail`. Le jugement
reste dans `verify`, qui le dérive. C'est ce qui permet d'enregistrer une
observation sans effet sur la certification, donc d'élargir la couverture sans
risque de régression sur ce qui est déjà certifié.

**Une sonde absente n'est pas une observation négative.** Si une sonde ne peut pas
tourner, elle produit une observation `unavailable` avec une confiance de 0, elle
n'est jamais supprimée du rapport, et elle ne devient jamais « le système ne le
fait pas ». C'est la même leçon que le `blocked` d'IntentLane : l'absence de
preuve n'est pas une preuve du contraire. Une sonde qui sort en non-zéro donne
`absent`, ce qui est différent.

**Une sonde ne déclare pas son propre verdict.** Si une sonde imprime `PASS`,
l'observation enregistre le texte `PASS`, elle n'enregistre pas un `pass`. La
dérivation lit des preuves, jamais un verdict, et une sonde qui s'auto-attribue
un verdict est exactement le raccourci que cette règle ferme. La confiance d'une
sonde textuelle est donc dérivée du code de sortie et rien d'autre.

## Réutilisation plutôt que règle parallèle

La forme de confiance est celle de `claimConfidenceSchema`, un nombre en 0 à 1
plus la distribution qui l'a produit. Deux mécanismes qui mesurent la
contestabilité d'une affirmation parlent la même langue, et il n'y a qu'une règle
de distribution dans le dépôt. `AuditConfidence` reste `low` / `medium` / `high`,
qui est une étiquette ordinale et non une mesure ; l'aligner est hors de portée
ici et est écrit comme travail à faire.

## Ce que `observe` n'est pas

Ce n'est pas un second `audit`. Un audit lit du code, une observation lit un
système qui tourne. Ce n'est pas un second `verify`, qui dérive un verdict. Ce
n'est pas un second `pilot`, qui transforme. Si une implémentation d'`observe`
commence à trancher, c'est qu'elle a fait un `verify`.

## Limite assumée

Les sondes vivent dans le dépôt pilote sous forme de scripts shell qui impriment
des lignes en clair. `observe` les exécute et enregistre leur sortie sans prétendre
les comprendre. La compréhension des sondes reste un travail par application, et
`observe` rend ce travail possible sans l'exiger. C'est pourquoi le format `text`
est le premier citizen et `json` est l'amélioration vide, pas l'inverse.
