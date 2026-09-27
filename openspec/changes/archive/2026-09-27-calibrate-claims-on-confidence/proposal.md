## Why

La règle produit d'IntentLane est que le modèle propose et ne déclare jamais un succès : l'humain
valide, la commande décide. Aujourd'hui cette règle est respectée par construction, parce que le
verdict `pass` est écrit à la main dans la liste `blocked`. C'est correct mais opaque : le lecteur
voit qu'une preuve manque, pas à quel point le doute était fort.

Deux mesures faites cette nuit contre le même corpus et les mêmes questions donnent la base pour
rendre cette opacité calculable. Un modèle génératif ne peut pas être la porte : Apple Foundation
Models, sur l'appareil, refuse 5 fois sur 5 une demande d'entreprise inoffensive, et restitue mot
pour mot un mot de passe de production et une identité complète quand on le lui demande. À
l'inverse, un classifieur contraint renvoie une probabilité : Jev, de TypeSafe, détecte 6 cas sur 6
sans faux positif, y compris un mot de passe écrit en lettres séparées par des tirets, et renvoie
une confiance qui s'effondre à 0,26 avec une distribution 0,5 / 0,5 sur un jugement de valeur, là
où il renvoie 0,97 à 1,0 sur une question qui a une réponse défendable.

Ce 0,26 est le cœur du sujet. C'est exactement la situation dans laquelle IntentLane doit répondre
`blocked` et non `pass`, et le signal existe, il est mesuré, et il est disponible. Prendre le seul
argmax donnerait `block_entirely` sur la note personnelle d'un utilisateur pour son propre mot de
passe bancaire, ce qui est le mauvais produit.

## What Changes

- Une preuve devient une décision typée portant une confiance, et non un booléen.
- `pass` exige que la commande déterministe ET la confiance soient d'accord. Le modèle ne produit
  jamais `pass`, quelle que soit sa confiance.
- Une confiance sous le seuil produit `blocked`, et le verdict porte la distribution qui l'a
  produit, pour que le lecteur voie pourquoi la preuve n'a pas été revendiquée.
- L'argmax seul est explicitement interdit, avec le cas mesuré qui le justifie.
- Le portage reste déterministe et sans réseau par défaut. Le cloud est une couche de confiance
  optionnelle qui améliore le verdict, jamais une dépendance, et son absence produit `blocked`,
  jamais un routage silencieux.
- Les types du SDK Apple et les types de question Jev n'entrent pas dans le domaine.

## Capabilities

### New Capabilities
- `claim-confidence`: une preuve porte une confiance et un verdict dérivé de l'accord entre la
  commande et le seuil, et l'absence de la couche distante produit `blocked` plutôt qu'un verdict.

### Modified Capabilities
- Aucun.

## Impact

Le schéma de `packages/schema`, le runner de `packages/core/src/pilot-runner.ts` qui produit les
verdicts, et la documentation de vérification qui nomme ce que chaque porte couvre. Aucun
changement amont, aucun contact, aucune PR. Le changement n'active aucun appel réseau : il décrit
le contrat et la porte locale, l'adaptateur distant reste optionnel.
