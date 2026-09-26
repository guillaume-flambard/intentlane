## 1. Recette verifiee

- [x] Lire l'interface publique livree avec Xcode 27 et relever la surface reelle.
- [x] Relever les options reelles du processeur de metadata, qui different des exemples
      circendants.
- [x] Etablir que la metadata depend des `swiftconstvals`, donc d'un reglage de build de
      la cible.

## 2. Blocage a lever avant d'ecrire du Swift

- [ ] Lire la commande `swiftc` reelle d'une cible qui produit de la metadata, et non
      la deviner, puisque le pilote IINA en produit une.
- [ ] Observer le format du `typeIdentifier` dans une sortie reelle du processeur.
- [ ] Determiner la cible de test et sa signature, sur la route native, sans pretendre que
      l'imbrication d'un bundle de tests non signe fonctionne.

## 3. Emission

- [ ] Generer le harnais depuis le meme contrat que le code applicatif, une assertion
      par entite exposee et par propriete d'affichage declaree.
- [ ] Porter la meme annotation de disponibilite macOS 27 que le code genere.
- [ ] Ne toucher a aucune cible Xcode du client.

## 4. Couche de preuve

- [ ] Declarer la revendication de preuve d'execution seulement apres que le harnais
      s'execute, jamais avant.
