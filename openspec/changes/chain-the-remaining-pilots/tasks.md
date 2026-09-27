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
- [x] 0.8 Réécrire dans les deux fiches ce qui est réellement câblé, et retirer
      toute formulation qui décrit la réindexation à la demande comme si elle était
      le seul branchement, puisque la suppression l'est désormais aussi. Vérifié
      par relecture contre le test de 0.5.
      **Fait.** FSNotes dit où le test s'arrête et ce que l'isolation protège, et
      HandBrake dit pourquoi la couture diffe au lieu d'appeler, et pourquoi
      l'observateur est un objet retenu plutôt qu'un jeton de bloc.
- [x] 0.9 Re-certifier les deux pilotes après 0.4 à 0.8, et vérifier que les six
      revendications sont inchangées. Vérifié par `verify --strict` qui sort à
      zéro pour les deux.
      **Fait.** Sixnaire pour les deux, 368 tests du dépôt verts, les huit suites
      de pilote vertes, `BUILD SUCCEEDED` des deux applications, typecheck propre,
      `openspec validate --strict` valide. Les six revendications n'ont pas bougé,
      et c'est le résultat attendu : on a rendu `indexSync` honnête, on n'a pas
      ajouté de revendication.
## 1. La sonde de lancement

- [x] 1.1 Décrire ce que la sonde doit lire, sur le modèle de la sonde IINA, et ce
      qu'elle ne doit pas conclure. Vérifié par une section dans la recette.
      **Fait.** Une section « The launch probe, and what it is not allowed to
      conclude », écrite avant les deux sondes pour qu'aucune ne modèle l'autre. Elle
      fixe quatre choses : ce que l'application rend lisible, ce que la sonde lit,
      les trois affirmations que la sortie doit porter pour ne pas inviter à lire trop,
      et le refus de déclarer `registration` sans session graphique. Le refus est la
      partie qui compte, parce qu'`App Intents` a besoin d'un window server, qu'un
      lancement sans session peut planter ou ne rien enregistrer, et qu'une sonde
      obliged de deviner verrait un vert qui ne veut rien dire.
- [x] 1.2 Écrire la sonde pour HandBrake, qui lance l'application construite et
      rapporte l'enregistrement par nom. Vérifié par un test rouge du message
      attendu, puis vert contre l'application lancée.
      **Fait pour ce qui peut l'être, et le reste est dit.** Le rouge est là :
      l'application n'écrivait rien, donc la ligne n'existait pas dans le binaire.
      L'adaptateur l'écrit maintenant via `HBUtilities`, et la ligne est lisible dans
      le binaire construit. **Le vert contre l'application lancée n'a pas eu lieu**,
      car le processus agent ne peut pas spawner dans la session Aqua sur cette
      machine, et la sonde le dit et saute au lieu de mettre un rouge sur un
      adaptateur qu'elle n'a pas vu tourner. Ce qui remplace le run : un test qui lit
      le littéral d'enregistrement dans le binaire construit et le tient contre
      l'expression régulière de la sonde, donc les deux moitiés ne peuvent pas
      dériver en silence. Ce test a été vu échouer contre le binaire d'avant, et
      passer après. Douze vérifications.
- [x] 1.3 La même sonde pour FSNotes. Vérifié de la même façon.
      **Fait, même forme, trois différences notées dans la fiche.** FSNotes logs avec
      `print` sur la sortie standard, pas avec une installation nommée, donc la sonde
      lit l'autre flux. L'enregistrement est derrière `applicationDidFinishLaunching`
      avec un `if #available`, donc la sonde attend la ligne et pas une fenêtre. Le
      domaine de préférences est lu dans l'`Info.plist` de l'app construite
      (`co.fluder.FSNotes`), parce que le fichier projet contient aussi deux
      identifiants iOS qui auraient envoyé la sonde lire le mauvais. Douze
      vérifications, dont une qui vérifie que les deux sondes portent les mêmes trois
      désaveux, et c'est ce test qui fait que c'est une sonde réutilisée et non deux.
- [x] 1.4 Enregistrer la réutilisation de la sonde IINA comme déviation, et écrire
      ce que chaque pilote a dû changer pour lire son propre enregistrement.
      Vérifié par la ligne de deviation.
      **Fait.** La ligne est dans `deviations.md`, et les trois changements par
      pilote sont dans les deux fiches avec la raison de chacun, y compris pourquoi
      `writeToActivityLogWithNoHeader:` et pas l'autre : la première est une variadique
      C que Swift ne peut pas importer du tout.
- [x] 1.5 Dire dans la sortie de la sonde qu'elle ne prouve ni la conversation Siri
      ni l'affichage Spotlight, et le vérifier en lisant la sortie d'un run qui
      passe. Vérifié par la présence de la phrase dans la sortie.
      **Fait, et vérifié en lisant une sortie qui passe.** Les trois phrases sont
      dans la sortie des deux sondes, y compris sur les runs qui sautent, parce qu'un
      saut qui ne dit pas ce qu'il ne prouve pas laisse juste un trou. Un test les
      vérifie aussi dans le code, pour qu'une sortie qui les perdrait soit rouge.
- [x] 1.6 Ne pas déclarer la revendication `registration` quand aucune session
      graphique n'est disponible. Vérifié en lançant la porte sans session et en
      constatant qu'elle n'est pas dans le jeu par défaut.
      **Fait, et un cas de plus que prévu.** La sonde ne se contente pas de demander
      à `launchctl` : elle tente `launchctl asuser`, qui entre dans la session Aqua
      du même utilisateur sans mot de passe, parce que conclure trop tôt ferait
      sauter une revendication qu'elle pouvait prouver. Ici la session Aqua existe et
      dit `Permission denied` au spawn, donc la sonde distingue trois cas : pas de
      session, session qui refuse le spawn, et application qui démarre sans écrire.
      Les deux premiers sautent, le troisième échoue. Les deux sondes sortent zéro
      avec un `SKIP` qui nomme la raison, et `registration` n'est pas déclaré.

## 2. Transmission, troisième pilote

- [x] 2.1 Appliquer les conditions d'entrée : compiler depuis un clone propre,
      FSNotes certifié, aucun défaut connu non corrigé. Vérifié par la liste des
      conditions cochée dans la fiche du pilote. **Fait et mesuré.** Stage 0
      complet : `gtkmm3` 3.24.11 était la seule formule manquante, clone
      récursif des 17 sous-modules, `cmake -B build -G Ninja` à 0 puis
      `cmake --build build -t transmission-mac` à `502/502` sans une erreur, et
      l'app produite est un vrai Mach-O arm64 qui s'ouvre. Trois liens `ld:
      warning` notés, Homebrew construisant `gettext` et `libevent` pour macOS
      26.0 alors que le bundle déclare 11.0. La fiche note aussi que
      l'installation a fait passer `glib` de 2.88.3 à 2.90.0 sur la machine.
      La condition 2 est remplie au dossier et **rejouable** : les copies de
      travail de FSNotes et de HandBrake avaient été lues comme disparues, alors
      qu'elles avaient seulement été déplacées. Elles sont à
      `~/projects/experiments/intentlane-fsnotes` et
      `~/projects/experiments/intentlane-handbrake`, sur leurs branches de pilote,
      avec leurs sources `IntentLane`. La correction est écrite dans la fiche
      Transmission plutôt que faite en silence.
- [x] 2.2 Lire le modèle avant d'écrire, choisir l'objet, et écrire le contrat avec
      la raison de l'exclusion de ce que l'application ne sait pas faire. Vérifié
      par `validate` qui sort à zéro et par la relecture de la raison. **Fait.**
      Lu dans `Torrent.h` et `Torrent.mm` avant d'écrire, pas deviné. L'objet est
      **un torrent**, exposé par son `name`, sous-titré par son `stateString`, et
      **identifié par son infohash**. La liste est le `fTorrents` du contrôleur,
      donc la requête est `static` et lit la liste que l'application tient déjà.
      L'infohash et non le nom, parce que `renameTorrent:completionHandler:`
      permet à la personne de réécrire le nom et que `setSearchText:` fait que le
      nom est aussi ce que la recherche.matches : un champ écrit par la personne
      n'est pas un identifiant, et il peut porter le nom d'un projet client.

      Trois objets écartés, pour des raisons dans le code et non par goût : le
      **tracker** est un `NSArray<NSString*>` à l'intérieur d'un torrent, donc un
      champ et pas une ligne ; le **pair** est reconstruit à chaque announce et
      rien ne le persiste ; un **téléchargement terminé** est `isComplete` sur un
      torrent, un filtre et pas un second objet.

      La règle d'exposition est `item_not_usable`, et `Torrent.mm:400` dit
      pourquoi : `isMagnet` vaut `!tr_torrentHasMetadata`, donc un aimant sans
      métadonnées n'a ni nom ni liste de fichiers. `item_missing` est
      **absent, délibérément** : Transmission répond deux fois à la question du
      cycle de vie, avec `closeRemoveTorrent:trashFiles:` et `renameTorrent:`,
      mais l'exposition de l'entité est une autre question que le cycle de vie de
      l'index, et écrire les deux comme une seule règle revendiquerait une
      garantie que l'application ne fait pas sur ses fichiers.

      `system.searchInApp` est ici **parce que Transmission a une vraie recherche
      dans l'app**, l'inverse de HandBrake où la même surface a dû être omise :
      `FilterBarController` déclare `setSearchText:`, garde les termes dans
      `searchStrings` et les applique à la liste par nom ou par tracker.

      `validate` a sorti non-zéro deux fois avant de sortir à zéro, et les deux
      erreurs étaient des règles enfreintes par un contrat qui se Cromait
      raisonnable : `IL1301` exige un `handler` sur un intent natif sans cible,
      `IL1401` interdit à un `system.searchInApp` de nommer une entité cible.
- [ ] 2.3 Générer,       ajouter les sources à la cible avec le script du projet, et
      construire. Vérifié par `generate --check` et par `BUILD SUCCEEDED`.
      **Généré et vérifié, et l'ajout à la cible est bloqué, mesuré.** La
      génération passe et `generate --check` sort à 0 : le fichier produit bien
      une `IntentLaneTorrentEntity` `AppEntity` et `IndexedEntity`, une requête
      qui réindexe, et les deux intents aux bons schémas.

      Mais **`project(transmission)` ne déclare que C et CXX**, donc un `.swift`
      ajouté à `target_sources` n'est pas une erreur : configure sort à 0,
      build sort à 0, et **aucun objet Swift n'est produit**. Reproduit dans un
      projet de six lignes hors Transmission. C'est précisément le défaut que les
      tâches 0.4 et 0.5 de cette campagne existent pour empêcher : lu tel quel,
      `BUILD SUCCEEDED` aurait certifié un build qui n'a jamais compilé une
      ligne d'App Intents. Activer Swift dans ce build échoue aussi, le CMake de
      Homebrew ne connaissant pas l'extension `.swift` : c'est un défaut
      d'environnement, pas de Transmission, et il tient quelle que soit la
      modification du projet.

      Le projet Xcode embarqué n'est pas un repli : il déclare
      `MACOSX_DEPLOYMENT_TARGET = 11.0` en trois endroits et Xcode 27 n'accepte
      que 12.0 à 27.0. Passé à 12.0, l'erreur part, puis la cible `dht`
      échoue au Libtool avec zéro entrée après un `PrelinkedObjectLink` vide,
      alors que ses bibliothèques sœurs se construisent. Quatre tentatives
      `xcodebuild`, puis arrêt de la réparation. L'une des quatre était mon
      erreur et elle est notée : CMake et Xcode écrivaient tous deux dans
      `build/`.

      **Ce que ça dit de la méthode** : la table des déviations prédisait ce
      pilote par « amend: same as HandBrake », parce que le défaut est bien celui
      de HandBrake, une cible Objective-C sans Swift. La prédiction est fausse,
      et c'est la règle de la recette qui l'attrape : le même défaut sur deux
      piles est un défaut de la méthode. HandBrake est construit par
      `xcodebuild`, Transmission par CMake, et là la même instruction donne un
      build vert sans Swift. L'amendement n'est pas « s'attendre à une cible
      sans Swift » mais « **vérifier que le build du projet sait compiler du
      Swift avant de prévoir d'en ajouter** ».

      **La route du remplacement de l'outil de build est morte, et ça élargit le
      constat.** L'idée était que le cmake.app officiel de la même version 4.4.3
      embarque le module que celui de Homebrew n'a pas. Testé : il l'embarque
      bien et **échoue quand même**, avec `Unknown extension ".swift"` levée
      depuis `CMakeTestSWIFTCompiler` alors que `SWIFT` est listé parmi les
      langages activés ; passer `CMAKE_SWIFT_COMPILER` explicitement ne change
      rien. 4.4.3 est la dernière version publiée, donc **aucun cmake publié ne
      compile du Swift contre le `swiftc` d'Xcode 27**. Ce n'est donc pas un
      problème propre à Transmission : c'est vrai de toute application dont le
      build actuel est cmake, et ce sera vrai du prochain aussi. Le cask a été
      désinstallé et la machine est revenue à son état.

      **Décision : 2.3 est enregistrée comme bloquée, avec la cause nommée, et le
      pilote ne certifie pas sa revendication de build.** C'est ce que le stage 0
      de la recette dit déjà de faire quand un prérequis manque, et le prérequis
      qui manque est un cmake publié qui n'existe pas. L'autre option aurait été
      de revendiquer un build qui n'a jamais compilé une ligne d'App Intents, ce
      qui est précisément l'échec que les tâches 0.4 et 0.5 ont été écrites pour
      empêcher. Ce qui débloquerait, par coût croissant : un cmake compilé avec
      le support Swift, ou un pilote dont l'application se construit avec Xcode.
- [ ] 2.4 Écrire les trois suites, test-first, dont le négatif exact. Vérifié par
      le premier run rouge puis le run vert.
- [ ] 2.5 Extraire les métadonnées et certifier les six revendications. Vérifié
      par `verify --strict` qui sort à zéro.
- [ ] 2.6 Noter l'effort par étape et chaque déviation, et écrire dans la fiche ce
      que le coût de HandBrake avait prévu et ce qu'il avait manqué. Vérifié par
      les lignes du journal et de la feuille.

## 3. LuLu, quatrième pilote

- [x] 3.1 Classer la sensibilité avant le contrat, et écrire ce que les noms
      d'objets peuvent porter. Vérifié par la section de classification dans la
      fiche. **Fait, et c'est la classification qui a eu besoin d'être amendée.**
      Le point qui n'existait dans aucun pilote précédent : l'identifiant
      canonique de l'application est un chemin. `generateKey` dans `Rule.m`
      préfère une identité de signature de code, et sinon fait exactement
      `key = self.path`. Un chemin sur la machine d'un développeur porte son nom
      d'utilisateur, son dossier de build et le nom de son projet ; une identité
      `DevID` nomme une **organisation**, donc une entité morale. L'identifiant
      est donc `uuid` et jamais `key`, et ce n'est pas un goût : `key` est le champ
      que l'application considère canonique, l'exposer exporterait sa notion
      d'identité avec un chemin attaché. Le champ titre reste `name`, qui est écrit
      par la personne, donc un titre et jamais un identifiant.
- [x] 3.2 Appliquer les conditions d'entrée, avec Transmission certifié. Vérifié
      par la liste cochée.
- [x] 3.3 Contrat, génération, construction, trois suites, métadonnées,
      certification. Vérifié par les mêmes commandes que pour Transmission.
      **Fait, et c'est le premier pilote à aller au bout.** `BUILD SUCCEEDED`
      avec les cinq objets Swift présents dans les deux architectures et un
      `LuLu.swiftmodule` produit, `113` vérifications en trois suites (45, 46, 22),
      chacune écrite avant le fichier qu'elle teste et vue rouge d'abord sur le
      fichier manquant, métadonnées extraites avec `toolsVersion 27A266a` et
      `verify --strict` qui sort certifié sur les six revendications.

      **Le pont ObjC est le coût réel de cette application, et il n'était pas dans
      la recette.** LuLu est Objective-C, donc le Swift qui appelle l'application a
      besoin de ses classes : `IntentLane-Bridging-Header.h` importe cinq en-têtes
      LuLu, redéclare le global `xpcDaemonClient` que chaque fichier LuLu déclare
      `extern` séparément, et déclare les trois méthodes privées du tableau des
      règles, parce que le filtre de l'application est privé et que l'appeler est
      précisément le but. `scripts/add-intentlane-sources.rb` a grandi d'un emploi :
      il règle maintenant `SWIFT_OBJC_BRIDGING_HEADER` quand un `.h` est nommé, et
      garde l'en-tête hors de la phase de compilation. Deux refus en sont sortis,
      tous deux moins chers à refuser qu'à réparer plus tard : un second en-tête de
      pont dans un même passage, et un en-tête déjà réglé sur un autre chemin.

      **Deux API de log Swift n'existent pas**, et le premier build a échoué sur
      chacune à tour de rôle : `os_log_info` et `os_log_with_type` sont des macros
      de `os/log.h`, donc aucun symbole à importer. `Logger` est la forme Swift
      native, et chaque valeur est interpolée `privacy: .public` parce qu'une
      interpolation os_log est privée sauf mention contraire, et un nom d'index
      expurgé laisserait la sonde incapable de rapporter le nom que le système
      tient. Le préfixe est un littéral statique, vérifié avec `strings` sur le
      binaire construit.

      **Le chemin d'ouverture a dû être réécrit contre l'outline.** La ligne 1646 de
      `RulesWindowController.m`, `-findRowForItem:`, parcourt les lignes réelles de
      l'outline et compare par `path`. La couture fait pareil et compare par
      `uuid`. Le numéro de ligne n'a de sens qu'après reconstruction du tableau,
      donc le tableau est reconstruit puis la bonne ligne sélectionnée. Chaque ligne
      est un tableau de règles, une règle d'arbre de processus étant un parent avec
      des enfants, donc un `uuid` présent quelque part dans une ligne sélectionne
      cette ligne et une règle dans un arbre reste atteignable.

      **`CFBundleURLTypes` est maintenant dans l'`Info.plist`.** Le contrat déclare
      `lulu` et un contrat ne doit pas déclarer un schéma que l'application ne gère
      pas ; les deux intents sont natifs et rien ne passe par une URL, donc le
      schéma est une déclaration et non un mécanisme, et la ligne est dans la
      demande de tirage.
- [x] 3.4 Écrire si l'ajustement du contrat était prévu par la classification, ce
      qui est le but de la classification. Vérifié par une ligne qui relie les
      deux. **Fait, et l'ajustement a été le `item_missing`, donc c'est la
      classification qui a été amendée, comme la méthode l'exige.** La première
      version du contrat déclarait deux conditions et expliquait que
      `item_missing` n'était **pas** déclaré parce que « rien n'a été observé
      retirer une règle du magasin ». Puis le pilote a lu
      `LuLu/Extension/Rules.m` et la raison était fausse : l'extension retire trois
      genres de règles sur un minuteur, un chemin disparu (`:1692`), une règle
      temporaire dont le processus est mort (`:1706`), une règle expirée (`:1720`),
      puis appelle `[self delete:rule.key rule:rule.uuid]` (`:1748`). La suppression
      est réelle et elle est indexée par le même `uuid` que le contrat.

      Ce n'était pas de la prudence, c'était de la non-lecture : la première
      version affirmait une absence d'observation comme si l'absence de lecture
      était la même chose. C'est l'échec que cette campagne existe pour supprimer,
      et **c'est la même phrase qui avait été copiée de Transmission** deux
      pilotes plus tôt, sans que le code soit lu. Le pilote précédent l'a écrite
      pour son `item_missing` et ce pilote l'a recopiée en la confirmant, ce qui
      veut dire que la règle de la recette « une affirmation sans observation est
      une affirmation qui peut être fausse » s'applique aussi à une observation
      copiée.

      Les deux conditions sont vraies, des mêmes règles, à des moments différents.
      Le nettoyage tourne sur un minuteur, donc entre le moment où l'expiration est
      dépassée et le moment de la suppression, la règle est dans la liste et ne peut
      plus agir : c'est `item_not_usable`, et c'est réel. Après, c'est
      `item_missing`. Déclarer seulement la seconde promettrait une garantie tenue
      entre deux lancements ; déclarer seulement la première promettrait un magasin
      qui ne perd rien.

      **La troisième condition, relue contre les exemples de la spec.**
      `source_disabled` est « la personne a éteint la source », et l'exemple de la
      spec est l'enregistrement d'historique de IINA, une coupure de source
      entière. Une règle de pare-feu désactivée est une coupure par élément, et
      c'est autre chose : l'application affiche la ligne dans la couleur désactivée
      au lieu de la retirer, donc la règle reste listée, adressable et ouvrable. Le
      pilote la garde comme entité, et deux tests tiennent cette ligne : une règle
      désactivée se résout par son nom et par son `uuid`. L'avoir traitée en
      `item_not_usable` aurait caché à Spotlight quelque chose que la personne voit
      dans sa propre fenêtre.
- [ ] 3.5 Ce qui reste ouvert sur ce pilote, et c'est une limite et non une
      étape. Vérifié par une section dans la fiche. **Il n'y a pas de suite de
      suppression, et la raison est structurelle.** Une règle quittant le magasin
      est retirée dans l'extension système privilégiée, et l'application atteint
      les mêmes règles en XPC : aucun test côté app ne peut faire supprimer une
      règle par l'extension. Les deux pilotes certifiés avant ont chacun une suite
      de suppression, et leurs fiches disent pourquoi la seule suite d'index ne
      suffisait pas : `indexSync` a été certifié une fois pendant qu'un objet
      supprimé restait trouvable.

      Ce que ce pilote prouve à la place est le diff qui suit la suppression. La
      suite d'index provoque une disparition sur la source et vérifie que l'ensemble
      suivi perd le `uuid`, qu'un **renommage** ne le perd pas, et qu'une règle
      désactivée non plus, ce qui est ce qui distingue les trois. C'est un
      affaiblissement réel de la revendication `indexSync` par rapport aux deux
      pilotes d'avant, et il est écrit comme tel plutôt que masqué : le câblage est
      vérifié par relecture de `Rules.m` et par le diff, et la suppression réelle de
      l'application n'est pas rejouée. `siri-conversation` et `spotlight-ui-result`
      restent non revendiquées, comme dans tous les pilotes.

      **Un `verify` rouge a aussi attrapé une dérive entre deux copies.** La
      première exécution a échoué sur `generated`, et la cause n'était pas
      l'amendement du contrat : générer depuis le contrat d'avant et depuis le
      contrat amendé donne du Swift **identique octet pour octet**, parce que les
      conditions d'exposition modifient le contrat et pas l'entité générée. La
      vraie cause est que les deux copies du fichier produit avaient
      divergé, celle dans `pilots/lulu/out/` et celle dans le clone LuLu, et
      `verify` ne compare que la première. C'est le contrôle qui est le résultat, pas
      le fichier : `generate --check` n'avait jamais tourné contre
      `pilots/lulu/out/`, et une porte écrite dans `pilot.yaml` mais jamais exécutée
      avant la certification est une porte qui n'a pas été testée. C'est la
      deuxième fois dans cette campagne qu'un contrôle supposé exécuté ne l'avait
      pas été.

## 4. Cyberduck, cinquième pilote

- [x] 4.1 Établir d'abord si le shell natif porte App Intents par le même chemin
      que les autres cibles, sans écrire de mapping. Vérifié par une réponse
      documentée, dans les deux sens. **Fait, et la réponse a été oui sur le build,
      oui sur la lecture, non sur l'ouverture. Aucun mapping n'a été écrit.**
      Le natif n'a aucun handle JVM, et c'est aussi grave que ça en a l'air :
      `main.m` ne fait qu'appeler `launch`, et `launcher.m:145-168` résout le runtime
      embarqué puis appelle `JLI_Launch` avec `0, NULL, 0, NULL` pour ses trois
      out-params, donc la main ne revient jamais avec un `JavaVM*`. Le grep de
      `JavaVM`, `GetJavaVM` et `AttachCurrentThread` dans l'arbre natif ne rend
      **rien**, et le seul JNI du dépôt est du Java qui appelle du natif, le mauvais
      sens pour un système qui pose une question à un moment que l'application n'a
      pas choisi.

      **Et pourtant l'application lit déjà ses connexions en natif.**
      `osx/spotlight/GetMetadataForFile.m` est un importateur Spotlight et son corps
      entier est un `[NSDictionary dictionaryWithContentsOfFile:]` qui lit
      `Hostname` et `Nickname`. La revendication que j'allais faire, qu'un adaptateur
      natif devrait inventer un lecteur, était fausse : il en écrirait un qui
      existe déjà, dans une application qui le livre. Et le magasin est taillé pour :
      `AbstractFolderHostCollection.java:45` filtre sur `.*\.duck` et `:72` nomme
      chaque fichier `String.format("%s.duck", bookmark.getUuid())`, donc
      **l'identifiant est la tige du nom de fichier**, il survit à un renommage du
      surnom parce que le surnom n'est pas dans le nom, et une connexion supprimée
      est un fichier absent, ce qui rend `item_missing` observable et non inféré.
      `BookmarkCollection.java:36` les met dans `<support>/Bookmarks`, et `.duck`
      est un type de document enregistré (`ch.sudo.cyberduck.bookmark`).

      Le build est la partie facile : `can-this-build-compile-swift.sh` répond
      `xcode-project` et `compiles-Swift`, la cible `app` est 6 fichiers `.m` sans
      Swift, la forme exacte de LuLu, et le projet n'est même pas hostile à Swift
      puisqu'il a déjà une cible `docktile` qui compile `main.swift`. Une seule
      nuance : `GetMetadataForFile.m` n'est dans **aucune** cible Xcode, les quatre
      étant `app`, `libcore`, `cli` et `docktile`, parce que c'est la construction
      Ant qui l'assemble. Le précédent existe donc dans du code que le pilote peut
      lire et imiter, pas dans une cible qu'il peut étendre.

      **Le build n'est pas fait et c'est un prérequis d'environnement.** `ant` n'est
      pas installé, il n'y a pas de JDK sur cette machine (`java_home -V` ne trouve
      aucun runtime), et le `.app` n'est pas assemblé dans le checkout. Cyberduck
      n'est **pas** sandboxé (`com.apple.security.app-sandbox` est absent de
      `setup/app/Info.plist`), donc une fois construit l'application lit son propre
      dossier de support sans travail d'entitlement. C'est la même catégorie de coût
      que le build HandBrake, que la campagne a déjà évalué à « adaptable », et c'est
      écrit comme un prérequis, pas comme un résultat.

      **L'ouverture est un non, et c'est la partie intéressante.** La liste des
      connexions est en JavaFX, donc il n'y a pas de ligne native à sélectionner. Il
      n'y a pas non plus d'URL qui atteigne un signet : `setup/app/Info.plist`
      déclare un schéma par **protocole de transfert** (`sftp`, `ftps` et les
      autres), parce que c'est ainsi qu'un lien `sftp://` du Courrier s'ouvre, et
      il n'y a ni `cy://` ni schéma appartenant à l'application. Le `system.open` le
      plus honnête est donc « lance Cyberduck », et prétendre qu'une connexion cible
      est sélectionnée serait une revendication sur une table JavaFX que l'adaptateur
      ne peut pas voir. C'est la première fois que l'**action** est plus faible que
      la **lecture**, ce qui inverse la forme des quatre pilotes d'avant.

      **Le dossier à lire est choisi à l'exécution, et c'est un coût mesuré.**
      `Preferences.java:533` fixe
      `factory.supportdirectoryfinder.class = TemporarySupportDirectoryFinder`, une
      préférence d'exécution dont le défaut est le dossier **temporaire**, celui du
      build portable. `Preferences.java:502-509` fait de même pour le sérialiseur et
      pour les lecteurs et écrivains de profils, transferts et hôtes, donc le
      *format* du fichier `.duck` est aussi une préférence d'exécution. Un pilote peut
      lire le chemin ordinaire et noter la limite ; une intégration livrée ne peut
      pas le figer, et le seul code qui le résout correctement est dans la JVM, ce
      qui ramène la frontière d'où le pilote est parti. Donc : **le lecteur natif
      fonctionne, et résoudre quoi lire est la partie qui demande encore
      l'application.**

      La classification de sensibilité est dans la fiche, avec le champ que cette
      application ajoute aux trois autres : `Credentials`. Un `.duck` est une
      connexion enregistrée et les connexions enregistrées portent des identifiants,
      parfois un mot de passe, parfois un chemin de clé privée. Le pilote lit deux
      clés et n'ouvre jamais les champs d'identifiants, et la fiche le dit, parce
      qu'un pilote qui dit « nous n'avons pas lu les mots de passe » fait une
      revendication qu'un client vérifiera.
- [ ] 4.2 Si la réponse est non, publier le résultat comme limite de la méthode,
      nommer ce qui a échoué, et ne pas rétrécir le jeu de revendications pour la
      masquer. Vérifié par la relecture du document de résultats. **Sans objet sur
      le pilote** : la réponse est oui. La limite d'ouverture et la limite de
      résolution du chemin sont quand même publiées dans la fiche, avec leur prix,
      parce qu'elles font partie de ce qu'un client achète et pas d'un échec à
      cacher.
- [x] 4.3 Si la réponse est oui, exécuter le pilote comme les autres, en répétant
      les étapes 2.2 à 2.6. Vérifié par `verify --strict` qui sort à zéro.
      **Fait, et c'est le premier pilote certifié sur une pile Java, avec une
      entité qui vient d'un fichier et non d'un modèle vivant.** `118` vérifications
      en trois suites (63, 35, 20), chacune écrite avant le fichier qu'elle teste,
      métadonnées extraites en `toolsVersion 27A266a`, `verify --strict` certifié
      sur les six revendications.

      **Le build n'était finalement pas le prérequis que 4.1 avait annoncé.** Un JDK
      était déjà sur la machine et `/usr/libexec/java_home` en annonçait quand même
      aucun : les `openjdk` et `openjdk@17` de Homebrew sont keg-only et aucun n'est
      enregistré dans `/Library/Java/JavaVirtualMachines`. L'absence que l'outil
      signalait était une absence d'enregistrement, pas de Java, et une vérification
      qui interroge le mauvais outil aurait rapporté cette machine incapable de
      construire une application Java, pour une raison qui n'était pas celle-là.
      `ant` et `maven` sont les seules installations, 45 Mo et 11 Mo. `-DskipSign`
      ne saute pas la signature : l'exécution `run-ant-sign-target` du pom est
      inconditionnelle et `osx/build.xml:109` garde l'appel codesign avec
      `unless:true="${env.SKIP_SIGN}"`, une **variable d'environnement** et non une
      propriété Maven. Le `AGENTS.md` du dépôt demande un JDK 21, ni 17 ni 26 ne le
      sont, et le build passe quand même, donc le prérequis déclaré était un plancher
      et pas une contrainte.

      **Quatrième occurrence de la cible de déploiement périmée**, à 10.13 cette
      fois, dans `core/dylib/build.xml:27` et `osx/build.xml:32`. Quatre applications
      d'affilée, à 11.0, 10.15, 10.15 et 10.13 : le coût est borné et mécanique à
      chaque fois, et c'est maintenant **la ligne la plus prévisible du prix**. Une
      différence à noter : ici la valeur vit dans une propriété Ant passée en ligne
      de commande, donc on ne peut pas donner une édition de fichier projet à un
      contributeur amont. C'est une ligne de changement de forme différente, pas de
      montant différent.

      **L'ouverture est le résultat de ce pilote, et il est contre-intuitif.**
      L'application offre deux routes et une seule est honnête. La route URL :
      `MainController` parse une URL entrante avec `HostParser.parse(url)` et
      réutilise une fenêtre déjà montée sur le même hôte, donc `sftp://client.acme.example`
      ouvre l'application, et elle a besoin du **nom d'hôte**. La route document :
      `CFBundleDocumentTypes` déclare `duck` comme `ch.sudo.cyberduck.bookmark` avec
      `LSHandlerRank Owner`, et `MainController.application_openFile:577` fait
      `"duck".equals(f.getExtension())` puis
      `newDocument().mount(HostReaderFactory.get().read(f))`, donc remettre le fichier
      `.duck` de la connexion à LaunchServices ouvre **exactement cette connexion
      enregistrée**, identifiants compris, et elle a besoin d'un **chemin de
      fichier** utilisé à la couture et jamais exporté. Le contrat prend la route
      document. La route URL aurait mis les noms de serveurs des propres clients de
      l'acheteur dans une phrase Siri, dans un résultat Spotlight et dans une entrée
      d'index, et le pilote aurait été juste et inutile.

      **C'est la troisième fois que la même forme apparaît**, et c'est la revendication
      centrale de la campagne rendue concrète : LuLu identifie une règle par `key`,
      qui est un chemin ou une identité de signature, et le pilote prend `uuid` ;
      IINA a `mpvMd5`, stable à travers un changement de titre et pas à travers un
      déplacement ; ici le chemin est lu dans l'application pour agir et ne franchit
      jamais l'entité. Trois applications, trois identifiants, une règle : **l'identifiant
      et ce que le système montre ne peuvent pas être le champ que l'application
      utilise pour trouver l'objet à l'intérieur.**

      **Pas de `system.searchInApp`.** La liste des signets est en JavaFX et son filtre
      n'est pas atteignable depuis la couche native, donc un intent de recherche
      annoncerait une surface que l'adaptateur ne peut pas atteindre. Et il n'y a pas
      de suite de suppression, pour la raison inverse de LuLu : ici la suppression est
      un fichier que le pilote peut créer et supprimer, donc il n'y avait rien à
      construire. La suite d'index supprime un vrai fichier et surveille l'ensemble
      suivi. C'est plus faible sur un point précis, qui compte : **aucun code de
      l'application ne s'exécute pour supprimer la connexion.**

      **Un trou dans les règles d'exposition, trouvé et nommé.** Un fichier du dossier
      qui n'est pas une property list lisible n'est ni inutilisable ni absent : il est
      là, et rien n'en fait sens. Aucune des trois conditions ne couvre « illisible »,
      et le pilote saute un tel fichier plutôt que d'en faire semblant. C'est le
      premier trou de cet ensemble que la campagne rencontre, il est dans le contrat,
      et c'est une règle que la campagne devrait ajouter plutôt qu'un contournement
      que le prochain pilote redécouvrirait.

      **Deux fixtures ont échoué et ce sont les fixtures qui ont changé.** L'une
      mettait deux enregistrements avec le même UUID dans un même magasin, ce que le
      store ne produit pas, donc elle testait un ordre de tri et pas un renommage.
      L'autre écrivait des octets non-plist dans le fichier censé être un signet
      lisible au nom divergent, donc il était compté illisible et pas divergent. C'est
      le même échec que la suite noyau de LuLu, et le motif vaut d'être nommé : **une
      fixture qui ne peut pas exister dans le store ne teste rien, et l'assertion qui
      échoue est celle qui vérifiait la fixture et pas le code.**

      Le résultat, et les deux limites qui en font partie : **une entité sans
      sous-titre parce que le seul candidat est un nom d'hôte, et un trou dans les
      règles d'exposition parce que « illisible » est un troisième état qu'aucune des
      trois conditions ne nomme.**
- [x] 4.4 Dans les deux cas, écrire ce que ce pilote a appris sur la portabilité
      vers une application qui n'est pas dans la langue de sa couche native.
      Vérifié par une section dans le document de résultats. **Écrit, et la réponse
      n'est pas celle que 4.1 prévoyait.** La recette se transfère intacte à une
      application Java, et la chose qui la fait se transférer n'est **pas** la
      méthode : c'est que cette application avait déjà écrit un lecteur natif de son
      propre magasin, dans un format lisible par machine, avec l'identifiant dans le
      fichier. Le cas général est deux cas, et un pilote est exactement ce qui les
      distingue : une application dont le modèle est lisible nativement, directement
      ou par son propre magasin, prend les mêmes quatre étapes et la langue de la
      couche native n'a rien à y voir ; une application dont le modèle ne l'est pas
      demande un pont, qui est un autre travail avec son propre prix, et aucune
      recette de pilote ne rend ce prix le même. Cette application est dans le
      premier cas **par chance et non par conception**, et le pilote le dit plutôt que
      de prendre le crédit d'un résultat général qu'il n'a pas.

      Donc la question à poser à un client n'est pas « dans quelle langue votre
      application est-elle écrite » mais **« existe-t-il un fichier ou un appel natif
      qui répond déjà à la question que vous voulez poser à Siri »**. C'est une
      question à laquelle un ingénieur répond en dix minutes en lisant son propre
      magasin, et c'est la seule chose qu'un pilote ne peut pas répondre pour le code
      de quelqu'un d'autre.

      Et la deuxième chose que ce pilote a apprise est celle à citer à un client. Le
      fichier de signets d'un client de transfert contient un nom d'hôte, un nom de
      connexion, un chemin de clé privée, un certificat et quatre chemins locaux, et
      la route naïve pour rendre l'une de ses connexions ouvrable à la voix nomme le
      nom d'hôte. **Avant de chiffrer une intégration App Intents pour un client de
      transfert de fichiers, comptez ce que contient son fichier de sauvegarde.** Ce
      n'est pas une préoccupation générale de vie privée : c'est une question
      précise, vérifiable, de deux minutes, et c'est pour cela que ce pilote valait la
      peine d'être mené.

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
