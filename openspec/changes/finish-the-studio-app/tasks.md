# Finish the Studio app

## 1. Rouge: les promesses de l'app, d'abord

- [ ] 1.1 Le plancher déclaré dans `Package.swift` et celui du bundle
      `Info.plist` sont égaux, et valent le système livré. Vérifié par un test
      qui lit les deux fichiers et les compare, et qui échoue aujourd'hui.
- [ ] 1.2 Aucune localisation déclarée n'est orpheline: chaque langue de
      `CFBundleLocalizations` a des chaînes réellement utilisées par les vues, et
      aucune chaîne de traduction ne décrit un écran qui n'existe pas. Vérifié
      par un test qui lit les resources et les sources et signale toute chaîne
      absente du code.
- [ ] 1.3 Chaque étape du parcours porte un libellé, et la fenêtre nomme
      l'étape courante. Vérifié par un test qui parcourt `StudioStage.allCases`
      et exige un libellé pour chacune.
- [ ] 1.4 La scène About s'ouvre et nomme l'application, sa version et la source.
      Vérifié par un test sur la scène.
- [ ] 1.5 L'action qui continue le parcours existe dans le menu de l'app avec un
      raccourci clavier. Vérifié par un test qui inspecte les commandes.
- [ ] 1.6 La liste des projets récents se remplit après une inspection, et
      relire la liste choisit un projet sans dialogue de fichier. Vérifié par un
      test qui inspecte un dépôt, relit la liste, et choisit l'entrée.
- [ ] 1.7 Une liste de projets récents vide le déclare, et n'offre aucun
      contrôle désactivé qui ressemble à quelque chose d'utilisable. Vérifié par
      un test.
- [ ] 1.8 Une entrée de la liste dont le dépôt a disparu est retirée plutôt
      qu'affichée. Vérifié par un test.
- [ ] 1.9 Le verre n'apparaît que sur la navigation, le rail et les contrôles, et
      jamais derrière une surface de contenu lu. Vérifié par le harnais de rendu
      en deux apparences, et par une relecture des surfaces.

## 2. Vert, dans cet ordre

- [ ] 2.1 Passer le plancher à macOS 27 dans `Package.swift` et
      `Info.plist`, et écrire la décision arm64 dans `AGENTS.md`. Vérifié par
      1.1 et par un build.
- [ ] 2.2 Retirer la promesse de localisation: supprimer `fr.lproj` et l'entrée
      `fr`, et noter dans `AGENTS.md` que le shell est en anglais par choix.
      Vérifié par 1.2.
- [ ] 2.3 Ajouter Settings, About et Help, et un menu de commandes qui porte les
      actions du parcours avec leurs raccourcis. Vérifié par 1.4 et 1.5.
- [ ] 2.4 Ajouter l'historique des projets dans `StudioCore`, stocké dans
      Application Support, avec l'entrée morte retirée à la lecture et les dix
      entrées les plus récentes conservées. Vérifié par 1.6, 1.7 et 1.8.
- [ ] 2.5 Remplacer le bouton `Open recent` désactivé par la liste réelle, et
      faire rouvrir le dernier projet au lancement lorsqu'il existe. Vérifié par
      1.6 et par un rendu.
- [ ] 2.6 Ajouter le rail du parcours, qui lit ses étapes dans l'enum des
      étapes et nomme l'étape courante. Vérifié par 1.3 et par un rendu.
- [ ] 2.7 Appliquer le verre à la navigation, au rail et aux contrôles, en
      laissant opaques les surfaces de contenu. Vérifié par 1.9.

## 3. Run réel

- [ ] 3.1 Le bundle assemblé par `Scripts/build-app.sh` démarre sur cette
      machine et parcourt le parcours complet sur un dépôt réel, de l'inspection
      à l'écran de résultat. Vérifié par l'app lancée, pas par un test.
- [ ] 3.2 Chaque écran est rendu à chaque taille et dans les deux apparences, et
      aucun n'est vide. Vérifié par le harnais de rendu, comme pour M2.
- [ ] 3.3 `swift test` dans `apps/studio` vert avec le nombre de tests consigné,
      `pnpm test`, `pnpm build` et `pnpm validate` verts, et
      `openspec validate --changes --strict` propre. Vérifié par les sorties des
      commandes.
