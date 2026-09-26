## 1. Les trois formes

- [x] Resoudre un id de revendication, une capacite du catalogue, et un code
      diagnostic, et refuser tout le reste en nommant les trois formes.
- [x] Rendre la meme structure de sections pour les trois formes.
- [x] Dire que la commande explique et ne juge pas.

## 2. Ne rien inventer

- [x] Ne produire aucun lien Apple et nommer le fichier qu'un humain doit lire.
- [x] Ne pas deviner quelle couche un humain remplit, et retirer l'affirmation que la
      premiere version faisait.
- [x] Ne jamais presenter un statut de couche comme une revendication.

## 3. Ne pas juger

- [x] Refleter l'etat fourni par la derivation, avec sa raison et sa confiance.
- [x] Distinguer trois cas : personne n'a verifie, le pilote lu ne revendique pas cela, et
      le pilote le revendique mais aucune porte n'a tourné. Le dernier ne doit produire ni
      statut dur ni confiance.
- [x] N'imprimer une confiance nue que la ou elle signifie quelque chose, et dire
      explicitement qu'un resultat de commande dur n'a pas de confiance contestable.

## 4. La decouverte de disponibilite

- [x] Corriger `AppIntentsTesting` a macOS 27 et iOS 27, l'interface livree le declarant
      36 fois et zero fois 15.0.
- [x] Fixer la valeur par un test qui verifie qu'elle ne reprend pas celle du record
      voisin.
- [x] Constater que l'ancien valeur rendait l'auditor muet sur un vrai blocage, puisque
      `availableOn` alimente la comparaison `sdkTooOld`.

## 5. Reste a faire, decisions editoriales

- [ ] Decider si le catalogue doit porter une prose et un lien Apple par capacite. Ce
      serait du contenu ajoute, pas une taxonomie, mais cela n'est pas decide.
- [ ] Ne pas deduire d'un code diagnostique un sens que le code ne porte pas.
