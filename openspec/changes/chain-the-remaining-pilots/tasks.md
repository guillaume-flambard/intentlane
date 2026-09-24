## 0. Fermer l'écart de certification avant d'enchainer

Ces tâches précèdent tout nouveau pilote. Un défaut connu laissé en place sera
redécouvert sur les trois suivants, plus cher à diagnostiquer à chaque fois.

- [x] 0.1 Écrire les conditions d'entrée d'un pilote dans la recette, et les
      écrire avant le premier pilote restant. Vérifié par la présence des trois
      conditions dans `../validate-five-public-pilots/recipe.md` et par le fait
      que la recette les cite dans sa section stage 0.
- [x] 0.2 Décider, pour FSNotes, si l'application expose un événement de
      suppression, déplacement ou renommage de dossier. Vérifié en lisant le code
      de `Storage` et `Project` dans le fork, et par une phrase dans la fiche du
      pilote qui dit ce qui a été trouvé. **Oui** : `removeRows(projects:)` est le
      seul entonnoir, appelé par cinq chemins, dont la suppression demandée par
      l'utilisateur et la disparition sur disque. Le renommage est un retrait plus
      une insertion, pas une mise à jour d'URL sur place. Écrit dans la fiche.
- [x] 0.3 Idem pour HandBrake, sur la suppression et le renommage d'un preset
      utilisateur, en lisant `HBPresetsManager` et le delegate de l'arbre. Vérifié
      de la même façon. **Oui** : `HBPresetsManager` est déjà le delegate de l'arbre
      entier et poste `HBPresetsChangedNotification` à chaque insertion, suppression
      et remplacement, donc un seul observateur voit tout sans toucher au chemin
      d'alerte. La notification ne porte pas le nœud, donc le bon mouvement est un
      diff de l'ensemble éligible avant et après. Écrit dans la fiche.
- [x] 0.4 Prouver d'abord que rien n'est câblé, avant d'écrire le test qui l'exige.
      Fait avec deux sondes qui sortent un fait et non un verdict. Les deux
      constatent que l'index accepte l'entité, que l'application émet bien son
      événement, et que l'identifiant reste écrit après la suppression, avec zéro
      appel de retrait dans le chemin de l'application. **Trouvé et nommé** dans les
      deux pilotes, alors que `indexSync` est certifié pour les deux.
      **Sondes retirées en 0.7.** Elles printaient `FINDING: ... still written`, ce
      qui est devenu faux, et une commande verte qui affirme le contraire du code
      est pire que pas de commande du tout. Les suites de 0.5 les remplacent et
      disent plus : elles lancent l'application. La mesure de 0.4 reste dans ce
      journal et dans les deux commits.
- [x] 0.5 Écrire le test rouge qui exige le retrait, pour les deux pilotes, avec
      le nom exact de l'identifiant qui doit disparaître. Vérifié par un run qui
      échoue sur l'assertion et non sur une erreur de compilation.
      **Fait, et le rouge est un runtime.** Les deux suites compilent avant que la
      couture existe et échouent ensuite sur une assertion nommée, parce qu'un test
      qui ne compile pas prouverait moins. FSNotes : 13 vérifications, une seule
      échoue, « removeRows made the sync drop the removed identifier ». HandBrake :
      13 vérifications, quatre échouent, la première nommée
      « the observer dropped the deleted preset's identifier from the index ». Les
      deux rouges ont été obtenus en retirant la couture, puis vérifiés.
- [x] 0.6 Écrire le harness qui relie l'application à l'index nommé, sans
      modifier la couture. Pour FSNotes, il appelle le vrai `removeRows` et fournit
      l'énumération nommée. Pour HandBrake, il observe la notification réelle et
      compare l'ensemble éligible avant et après, puisque la notification ne porte
      pas le nœud. Le code testé est la couture de l'application, pas une
      imitation. Vérifié par le test de 0.5 passant une fois la couture câblée.
      **Fait, et le test lance vraiment l'application.** FSNotes compile les 233
      fichiers que Xcode compile, lus dans le projet et non devinés, lie les objets
      SwiftPM déjà construits, et tourne sous un `HOME` isolé parce que `Storage`
      crée un dossier Trash dans le `Documents` du développeur au premier usage.
      L'entonnoir est le vrai `SidebarOutlineView.removeRows` sur un vrai
      `Storage.shared()`, et il passe parce que `removeRows` lit
      `ViewController.shared()` et sort tôt quand il est nil, ce qui arrive après le
      retrait du stockage. HandBrake compile les vrais `HBPresetsManager`,
      `HBTreeNode`, `HBPreset` et `HBMutablePreset`, appelle `hb_global_init` comme
      l'application au démarrage, et supprime un preset intégré réel généré par
      libhandbrake. Deux fichiers ont dû sortir de `PresetIntegration.swift` vers
      `PresetRecords.swift` et `PresetObservation.swift`, parce que celui qui lit
      `NSApplication.shared.delegate` ne se compile pas sans l'application, alors
      que le mapping d'identifiant et l'observateur sont justement ce qu'un test doit
      atteindre.
- [x] 0.7 Câbler la suppression dans les deux pilotes, à travers l'entonnoir que
      l'application expose déjà, jamais en écrivant l'état de l'interface ni en
      interceptant le chemin d'alerte. Pour HandBrake, ne pas s'accrocher à
      `deletePreset:` et ne pas deviner le nœud retiré. Vérifié par le test de 0.5, une ligne de
      deviation et une ligne d'effort par pilote, et `BUILD SUCCEEDED`.
      **Fait.** FSNotes : un appel dans `removeRows`, qui est le seul endroit où un
      projet quitte `Storage`, et il prend les enfants que l'entonnoir a lui-même
      collectés plutôt que la liste de l'appelant. HandBrake : un observateur de
      `HBPresetsChangedNotification` retenu dans un statique, parce qu'un token de
      bloc libéré avec sa portée cesserait de réconcilier en silence. `BUILD
      SUCCEEDED` des deux côtés, huit suites vertes.
- [ ] 0.8 Réécrire dans les deux fiches ce qui est réellement câblé, et retirer
      toute formulation qui décrit la réindexation à la demande comme si elle était
      le seul branchement, puisque la suppression l'est désormais aussi. Vérifié
      par relecture contre le test de 0.5.
- [ ] 0.9 Re-certifier les deux pilotes après 0.4 à 0.8, et vérifier que les six
      revendications sont inchangées. Vérifié par `verify --strict` qui sort à
      zéro pour les deux.
## 1. La sonde de lancement

- [ ] 1.1 Décrire ce que la sonde doit lire, sur le modèle de la sonde IINA, et ce
      qu'elle ne doit pas conclure. Vérifié par une section dans la recette.
- [ ] 1.2 Écrire la sonde pour HandBrake, qui lance l'application construite et
      rapporte l'enregistrement par nom. Vérifié par un test rouge du message
      attendu, puis vert contre l'application lancée.
- [ ] 1.3 La même sonde pour FSNotes. Vérifié de la même façon.
- [ ] 1.4 Enregistrer la réutilisation de la sonde IINA comme déviation, et écrire
      ce que chaque pilote a dû changer pour lire son propre enregistrement.
      Vérifié par la ligne de deviation.
- [ ] 1.5 Dire dans la sortie de la sonde qu'elle ne prouve ni la conversation Siri
      ni l'affichage Spotlight, et le vérifier en lisant la sortie d'un run qui
      passe. Vérifié par la présence de la phrase dans la sortie.
- [ ] 1.6 Ne pas déclarer la revendication `registration` quand aucune session
      graphique n'est disponible. Vérifié en lançant la porte sans session et en
      constatant qu'elle n'est pas dans le jeu par défaut.

## 2. Transmission, troisième pilote

- [ ] 2.1 Appliquer les conditions d'entrée : compiler depuis un clone propre,
      FSNotes certifié, aucun défaut connu non corrigé. Vérifié par la liste des
      conditions cochée dans la fiche du pilote.
- [ ] 2.2 Lire le modèle avant d'écrire, choisir l'objet, et écrire le contrat avec
      la raison de l'exclusion de ce que l'application ne sait pas faire. Vérifié
      par `validate` qui sort à zéro et par la relecture de la raison.
- [ ] 2.3 Générer, ajouter les sources à la cible avec le script du projet, et
      construire. Vérifié par `generate --check` et par `BUILD SUCCEEDED`.
- [ ] 2.4 Écrire les trois suites, test-first, dont le négatif exact. Vérifié par
      le premier run rouge puis le run vert.
- [ ] 2.5 Extraire les métadonnées et certifier les six revendications. Vérifié
      par `verify --strict` qui sort à zéro.
- [ ] 2.6 Noter l'effort par étape et chaque déviation, et écrire dans la fiche ce
      que le coût de HandBrake avait prévu et ce qu'il avait manqué. Vérifié par
      les lignes du journal et de la feuille.

## 3. LuLu, quatrième pilote

- [ ] 3.1 Classer la sensibilité avant le contrat, et écrire ce que les noms
      d'objets peuvent porter. Vérifié par la section de classification dans la
      fiche.
- [ ] 3.2 Appliquer les conditions d'entrée, avec Transmission certifié. Vérifié
      par la liste cochée.
- [ ] 3.3 Contrat, génération, construction, trois suites, métadonnées,
      certification. Vérifié par les mêmes commandes que pour Transmission.
- [ ] 3.4 Écrire si l'ajustement du contrat était prévu par la classification, ce
      qui est le but de la classification. Vérifié par une ligne qui relie les
      deux.

## 4. Cyberduck, cinquième pilote

- [ ] 4.1 Établir d'abord si le shell natif porte App Intents par le même chemin
      que les autres cibles, sans écrire de mapping. Vérifié par une réponse
      documentée, dans les deux sens.
- [ ] 4.2 Si la réponse est non, publier le résultat comme limite de la méthode,
      nommer ce qui a échoué, et ne pas rétrécir le jeu de revendications pour la
      masquer. Vérifié par la relecture du document de résultats.
- [ ] 4.3 Si la réponse est oui, exécuter le pilote comme les autres, en répétant
      les étapes 2.2 à 2.6. Vérifié par `verify --strict` qui sort à zéro.
- [ ] 4.4 Dans les deux cas, écrire ce que ce pilote a appris sur la portabilité
      vers une application qui n'est pas dans la langue de sa couche native.
      Vérifié par une section dans le document de résultats.

## 5. La revendication observée, au plus une fois

- [ ] 5.1 Choisir le pilote dont l'observation a une valeur commerciale, et écrire
      pourquoi celui-là. Vérifié par la section dans la fiche du pilote.
- [ ] 5.2 Ajouter la revendication au manifeste, lancer le runbook, et enregistrer
      l'observation dans le ledger. Vérifié par la ligne du ledger et par
      `verify --claim siri-conversation --strict` qui ne sort plus non nul.
- [ ] 5.3 Vérifier que les quatre autres pilotes ne déclarent aucune revendication
      observée, et que la porte de l'offre n'en dépend pas. Vérifié par la sortie
      de `verify` des quatre autres.

## 6. La porte de l'offre

- [ ] 6.1 Confirmer que les trois domaines sont réellement distincts, et le dire
      ainsi. Vérifié par la section domain spread du document de résultats.
- [ ] 6.2 Dériver la fourchette de prix de la feuille d'effort, en excluant les
      lignes `not instrumented` et en le disant. Vérifié par le calcul et par la
      ligne qui nomme l'étape dominante.
- [ ] 6.3 Séparer dans le prix le coût de compilation de l'application du coût de
      l'intégration, puisque ce sont deux services. Vérifié par les deux lignes du
      document de résultats.
- [ ] 6.4 Relire chaque ligne de l'offre contre le registre de revendications, et
      retirer toute ligne qui promet une surface non observée. Vérifié par la
      relecture et par la liste des lignes retirées.
- [ ] 6.5 Préparer les brouillons de PR et de contact par mainteneur, sans les
      envoyer, et publier la règle de contribution qui l'interdit le cas échéant.
      Vérifié par la présence des brouillons et leur absence d'envoi.

## 7. La clôture

- [ ] 7.1 Amender la recette en version 2 avec chaque correction de pilote, en
      nommant le pilote qui l'a prouvée. Vérifié par la comparaison des deux
      versions.
- [ ] 7.2 Écrire le nombre d'étapes qui n'ont jamais eu besoin d'amendement, parce
      que c'est la mesure de la méthode. Vérifié par le chiffre dans le document
      de résultats.
- [ ] 7.3 Publier les domaines validés, la fourchette, le compte de deviations, et
      les surfaces jamais observées, avec la raison qui les aplatit. Vérifié par
      relecture contre les specs de clôture.
- [ ] 7.4 Écrire dans le document que le push et npm sont des décisions de la
      personne, restées en attente, et ne pas les présenter comme faits. Vérifié
      par relecture.
- [ ] 7.5 Ne retirer aucune limitation enregistrée par un pilote, même si elle
      affaiblit le résultat. Vérifié par relecture croisée avec les fiches.

## Notes

- L'ordre 0 avant 1 avant 2 est délibéré. Un défaut de certification reproduit sur
  trois pilotes coûte plus cher que corrigé une fois, et une sonde qui prouve un
  enregistrement inexistant sur deux pilotes vaut mieux que trois sondes.
- Le groupe 4 a une sortie qui n'est pas un succès, et il est écrit ainsi à
  l'avance pour que personne ne soit tenté de le forcer.
- Le groupe 7 ne s'écrit pas avant le groupe 6, parce que la version 2 doit porter
  ce que les cinq ont appris, y compris ce que la porte de l'offre a permis de
  mesurer.
- Rien dans ces tâches ne pousse de branche ni ne publie sur npm. Ces deux points
  restent des décisions de la personne et sont nommés comme tels dans le change
  précédent.
