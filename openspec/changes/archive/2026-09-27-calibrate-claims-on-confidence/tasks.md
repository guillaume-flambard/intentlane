# Tâches

## 1. Domaine : la preuve porte une confiance

- [x] Ajouter au schéma de `packages/schema` une preuve qui porte une confiance entre 0 et 1 et la
      distribution qui l'a produite, distincte du verdict.
- [x] Rejeter une confiance hors bornes, ou absente quand une preuve en réclame une, avec un
      diagnostic qui nomme la preuve.
- [x] Garder le verdict dans l'union fermée existante, sans nouveau diagnostic inutile.
- [x] Tester qu'une preuve de confiance invalide est refusée et que le refus nomme le champ.

## 2. Domaine : le verdict est dérivé, jamais déclaré par le modèle

- [x] Définir le portage de `pass` comme l'accord entre la commande déterministe et le seuil, et
      refuser une forme qui tente de fournir un `pass` sans cet accord.
- [x] Interdire l'argmax seul : une décision dont la confiance est sous le seuil produit `blocked`
      quelle que soit l'option la plus probable.
- [x] Porter dans le verdict `blocked` la distribution et la confiance qui l'ont produit, pour que le
      lecteur voie pourquoi la preuve n'a pas été revendiquée.
- [x] Tester le cas mesuré : distribution 0,5 / 0,5 sous le seuil produit `blocked` et non le
      verdict de l'option majoritaire.
- [x] Tester qu'une confiance au-dessus du seuil avec commande d'accord produit `pass`, et qu'une
      confiance au-dessus du seuil avec commande en désaccord produit `blocked`.

## 3. Runner : la porte déterministe par défaut

- [x] Faire produire par défaut une confiance locale connue et sans réseau, pour que le portage
      reste reproductible hors ligne.
- [x] Ne jamais router une preuve vers une autre source de modèle sans que le verdict le dise.
- [x] Produire `blocked` et le dire quand la couche de confiance n'a pas pu être consultée, plutôt
      qu'un verdict dégradé silencieux.
- [x] Tester que l'absence de la couche distante ne change pas le caractère déterministe du
      portage et produit `blocked` sur une décision de confiance.

## 4. Adaptateur de confiance, hors domaine

- [x] Définir l'interface d'adaptateur dans `packages/core`, avec les types de question du
      fournisseur confinés à l'implémentation.
- [x] Garder les types du fournisseur hors de `packages/schema` et du domaine.
- [x] Écrire le test qui échoue si un type de fournisseur apparaît dans le schéma.
- [x] Interdire tout appel réseau dans l'implémentation par défaut, et le tester.

## 5. Documentation

- [x] Nommer dans la documentation de vérification que le verdict porte une confiance et qu'un
      `blocked` peut venir d'une confiance faible autant que d'une preuve manquante.
- [x] Consigner les mesures de `design.md` comme mesures, avec la réserve explicite sur la
      validation en attente sur des notes réelles.
- [x] Ne pas citer les chiffres du fournisseur comme établis tant que la grille tarifaire n'a pas
      été vérifiée.
