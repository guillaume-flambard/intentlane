## 1. Recette verifiee

- [x] Lire l'interface publique livree avec Xcode 27 et relever la surface reelle.
- [x] Relever les options reelles du processeur de metadata, qui different des exemples
      circendants.
- [x] Etablir que la metadata depend des `swiftconstvals`, donc d'un reglage de build de
      la cible.

## 2. Etat du blocage, apres experience

- [x] Identifier l'option de lecture du processeur, qui est `-scl`, et le prouver en
      lui donnant un chemin absent et en lisant l'avertissement.
- [x] Identifier l'option d'ecriture du compilateur, qui est `-emit-const-values-path`.
- [x] Etablir que le frontend n'a aucun interrupteur d'activation, donc l'emission est
      active par defaut et le maillon ouvert est unique.
- [ ] Etablir, par un build de cible Xcode reel, quelle ligne de commande Xcode ajoute et
      ou il pose les `.swiftconstvalues`. C'est la fixture native, donc l'enquete et la
      fixture sont le meme pas.
- [ ] Observer le format du `typeIdentifier` dans une sortie reelle du processeur, qui
      devient possible des que la ligne ci-dessus est etablie.
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
