## 1. Preuve et dérive

- [x] 1.1 Ajouter `sdk: readonly { framework, symbol }[]` à `CapabilityRecord` et le
      peupler pour les 29 records existants, sans changer leur `claim`. Les 15
      records qui nomment un symbole en portent un ; les 14 records de
      comportement portent le symbole qui les établit, vérifié dans le SDK
      installé.
- [x] 1.2 Écrire le test de dérive : lire les `.swiftinterface` du SDK installé,
      lister les symboles publics App Intents et Foundation Models, et vérifier
      que chaque symbole du catalogue est résolvable dans le framework qu'il
      déclare. Vérifier qu'un symbole dupliqué dans deux frameworks échoue.
- [x] 1.3 Vérifier que la dérive est un manque de catalogue : ajouter un symbole
      hors catalogue dans une fixture et vérifier qu'il est rapporté comme tel,
      et non comme une capacité manquante du projet audité.
- [x] 1.4 Vérifier qu'un chemin de SDK absent laisse l'état `unknown` et ne fait
      pas échouer l'audit, et porter la garde qui manquait : une lecture qui
      n'établit rien doit échouer explicitement en mode strict. Les cinq issues
      sont distinguées, SDK non disponible par l'état `unknown` existant,
      framework introuvable, fichier illisible, extraction partielle, et
      inspection réussie sans correspondance par le finding
      `unresolved-evidence`. `driftIsComplete` est la garde, et `--strict`
      l'appelle.
- [x] 1.5 Porter sur la référence SDK interne un champ `member` optionnel, pour
      nommer le membre de son type propriétaire : `AppIntent.perform` plutôt
      qu'un `perform` nu. Vérifié sur le SDK installé, où `perform` est déclaré
      douze fois et une seule fois sans modificateur d'accès, dans
      `public protocol AppIntent`. Le champ reste interne au catalogue et ne
      change pas le JSON client.

## 2. Entités et paramètres

- [x] 2.1 Ajouter le groupe `entity` et les records `FileEntity`,
      `TransientAppEntity`, `UniqueAppEntity`, `URLRepresentableEntity`,
      `OwnershipProvidingEntity`, `EntityCollection`. Les six sont déclarés
      par `AppIntents` dans le SDK 27.0 installé, avec les disponibilités que
      le SDK déclare et non une disponibilité supposée : `TransientAppEntity`
      en 13.0/16.0, `FileEntity`, `UniqueAppEntity` et
      `URLRepresentableEntity` en 15.0/18.0, `OwnershipProvidingEntity` et
      `EntityCollection` en `anyAppleOS 27.0`. Le test de dérive résout les six
      dans leur framework, ce qui est la preuve qu'ils ne sont pas des
      symboles inventés.
- [x] 2.2 Ajouter les records `IntentValueRepresentation` et `AppUnionValue`, avec
      un scénario de test qui distingue une valeur riche d'un paramètre scalaire
      et une union d'un paramètre optionnel. Le groupe `parameters` leur donne
      une maison qui n'est ni une entité ni une requête. `IntentValueRepresentation`
      est un `TransferRepresentation` : le record dit ce qui quitte l'appareil,
      là où le classer à côté d'un `Transferable` le cacherait. Le test rouge
      s'appuie sur trois fixtures et non sur une description.
- [x] 2.3 Mettre à jour l'assertion de tableau exact dans
      `audit-catalogue.test.ts` pour les nouveaux groupes, et vérifier qu'elle
      échoue si un groupe est retiré. Vérifié pour de vrai : `parameters` retiré
      de `CAPABILITY_GROUPS`, le test échoue sur l'assertion de tableau, puis
      passe après restauration. L'assertion n'est donc pas vacique.
- [x] 2.4 Ajouter les records `EntityPropertyQuery` et `IndexedEntityQuery`, et
      vérifier qu'une `EntityPropertyQuery` n'est jamais rendue comme une
      `EntityQuery`. `EntityPropertyQuery` raffine `EntityQuery` dans le SDK, donc
      une       signature qui matchait le nom du supertype la classerait à tort. Le
      test l'affirme dans les deux sens : la requête de propriétés est détectée
      et la capacité `discovery.entity-query` est absente de la même fixture.

## 3. Exécution et découverte

- [x] 3.1 Ajouter le record `IntentExecutionTargets` avec les cibles que le SDK
      déclare, et vérifier qu'un intent restreint à une extension est signalé
      comme injoignable depuis le processus principal. Les quatre cibles sont
      celles que le SDK 27.0 déclare sur l'option set, ni une de plus :
      `default`, `main`, `appIntentsExtension`, `widgetKitExtension`. Le record
      porte deux preuves, le type qui déclare l'option set et le membre
      `AppIntent.allowedExecutionTargets` que l'application écrit. Le test
      affixed à une extension donne `reachesMainProcess: false`.
      Un intent qui ne nomme aucune cible n'est **pas** jugé atteignable : le
      rapport nomme `default` et les alternatives que le SDK déclare, et laisse
      le projet trancher. Un corps calculé qui ne nomme aucune cible du SDK ne
      donne aucun verdict non plus, plutôt qu'un `true` inventé.
- [x] 3.2 Ajouter les records `SnippetIntent` et `ShowsSnippetView`.
      `SnippetIntent` est un `anyAppleOS 26.0` qui raffine `AppIntent` et exige
      un `PerformResult` conforme à `ShowsSnippetView`, lui-même `13.0`/`16.0`.
      Les deux sont donc des surfaces distinctes avec des disponibilités
      distinctes, et chacune est portée comme telle.

## 4. Pile Apple Intelligence

- [x] 4.1 Ajouter le groupe `models` et les records `SystemLanguageModel`, le
      protocole `LanguageModel`, `DynamicProfile`,
      `PrivateCloudComputeLanguageModel`, l'entrée image, `GenerationOptions` et le
      protocole `Tool`. Tous sont vérifiés dans `FoundationModels` du SDK 27
      installé, avec les disponibilités que le SDK déclare et non une
      disponibilité supposée : `SystemLanguageModel`, `GenerationOptions` et
      `Tool` en 26.0, les autres en 27.0. L'entrée image est
      `ImageAttachmentContent`, le seul type public du module que le SDK
      construit depuis un `CGImage`, un `CIImage`, un `CVPixelBuffer` ou une
      URL, donc l'entrée et non une pièce jointe déjà produite. Les neuf
      records portent `claim: "auditor"` et non `domain-package` : ce change
      décrit ce que l'auditeur voit et n'en génère aucun, donc un échelon
      supérieur serait une promesse que le catalogue ne tient pas.
- [x] 4.2 Porter le framework-pont sur `OCRTool` et `SpotlightSearchTool`, et
      vérifier que l'auditeur les résout depuis leur framework-pont et ne conclut
      pas qu'ils sont absents du module public. `OCRTool` est dans
      `_Vision_FoundationModels`, `SpotlightSearchTool` dans
      `_CoreSpotlight_FoundationModels`, vérifié sur les quatre interfaces du
      SDK. Le test lit le SDK installé et affirme les deux côtés : le symbole est
      dans son framework-pont et n'est pas dans `FoundationModels`.
      **Un fait du SDK a fait boomeranger le premier jet** :
      `SpotlightSearchTool` n'est déclaré que sur les deux interfaces arm64e,
      les deux slices x86_64 de `_CoreSpotlight_FoundationModels` ne le
      déclarent pas. Comparer le catalogue à une interface x86_64 le disait donc
      non résolu, à raison mais pour une cause qui n'est pas une faute du
      catalogue. `OCRTool` est lui déclaré sur les quatre. La preuve porte donc
      un champ `architectures`, et la comparaison ignore l'attribution sur une
      interface où le SDK n'expédie pas le symbole, tout en continuant d'exiger
      la déclaration sur celles où il l'expédie. Le test de dérive des quatre
      variants reste strict et passe.
- [x] 4.3 Vérifier qu'une application s'abstrait derrière `LanguageModel` est
      distinguée d'une application liée à `SystemLanguageModel`, et qu'une
      escalade cloud est distinguée d'un appel local. Deux tests, quatre fixtures.
      Le premier exige l'absence autant que la présence : une app conforme au
      protocole ne doit pas être signalée comme liée au modèle système, parce
      que l'escalade vers une autre implémentation change ce que l'app doit
      prouver. Le second exige que `PrivateCloudComputeLanguageModel` ne soit
      jamais compté comme un appel local.

## 5. Overlay de consommation

- [x] 5.1 Définir l'overlay et son loader, avec jointure sur les ids de
      capacités et rejet d'un id inconnu au catalogue. `audit-overlay.ts` porte
      un document versionné `capability-overlay/1.0`, deux vocabulaires
      fermés (`used`/`planned`/`declined` et `now`/`next`/`later`) et une
      validation qui refuse un id que le catalogue ne décrit pas, avec un code
      propre, `ILA191`, distinct de `ILA190` qui est la faute de forme. Un id
      inconnu est refusé et non ignoré : l'overlay annote un catalogue, il n'en
      crée pas, et le laisser passer ferait un rapport complet qui n'affirme rien.
- [x] 5.2 Vérifier que le rapport reste valide et complet quand l'overlay est
      absent. Le test le prouve par la sérialisation plutôt que par une absence
      de clé : sans overlay, `createAuditReport` ne produit pas la section, donc
      le JSON ne porte pas le champ et les rapports existants sont inchangés. Un
      overlay présent mais vide est distingué d'un overlay absent, il dit
      simplement que le projet ne consomme rien.
- [x] 5.3 Vérifier par lecture de code qu'aucun nom de repository n'apparaît
      dans le catalogue ni dans l'overlay. Un test lit les deux fichiers et
      cherche les noms de projets clients. Le nom d'IntentLane lui-même n'est pas
      interdit : l'outil a le droit de se nommer, un projet client non. Premier
      jet : le test échouait parce que j'avais mis `intentlane` dans la liste,
      ce qui était une règle trop large et non un défaut du code.

## 6. Vérification

- [x] 6.1 `pnpm test`, `pnpm build` (qui inclut `tsc --noEmit`) et
      `pnpm validate`. `pnpm test` : 739 verts, 1 rouge préexistant et sans
      rapport avec ce change, `packages/schema/src/pilot-contracts.test.ts`
      « declares an exposure condition on every entity », vérifié rouge sur
      `HEAD` avant toute modification. `pnpm build` : `tsc --noEmit` propre et
      bundle produit, avec l'avertissement `import.meta` en cjs qui existait
      avant. `pnpm validate` : `Valid IntentLane 0.1: 1 intent(s) ready.`
- [x] 6.2 Rejouer `intentlane audit` sur la fixture macOS existante et vérifier
      que les scores et les bandes sont inchangés : ce change décrit ce que
      l'auditeur sait voir, il ne doit rien changer à ce qu'un projet obtient.
      **Mesuré, et l'attente est fausse. Décision prise : on ne touche pas à la
      formule, on épingle l'invariant.** Fixture macOS de schéma, même audit
      avant et après : score 15 → 9, bande `early` inchangée, points 13
      inchangés, `implemented` 6 inchangé, `detected` 1 inchangé, découverte
      `schema-backed` inchangée, `unsupported` 1 inchangé. Ce qui change est le
      dénominateur : 28 capacités applicables → 50. Le score est un ratio sur
      toutes les capacités applicables, donc décrire 22 primitives absentes
      d'un projet le fait baisser mécaniquement. Aucun fait observé n'a bougé.

      Trois raisons de ne pas réécrire le dénominateur. Un, la sortie publie
      déjà `applicable` et `maximum` à côté du score, donc un lecteur voit ce
      qui a bougé. Deux, décider quelles capacités sont « applicables » à un
      projet est un jugement que l'auditeur n'a aucune preuve pour rendre, et
      ce change existe précisément pour ne pas inventer. Trois, rétrécir le
      dénominateur après coup rendrait les scores de deux ans non comparables
      en silence, ce qui est pire que la baisse elle-même.

      **La vraie découverte, en écrivant le test** : la bande n'est pas
      invariante. J'avais écrit un test qui l'affirmait, il a échoué, et il avait
      raison de m'arrêter. Sur un projet proche d'un seuil, ajouter des
      capacités inconnues fait passer la bande de `partial` à `early` alors que
      le projet n'a pas bougé d'un point. C'est un risque commercial réel et
      mesurable, pas une abstraction. Les deux tests le disent maintenant : l'un
      épingle ce qui ne doit pas bouger (points, découverte, comptages observés),
      l'autre nomme la chute de bande et exige que le dénominateur soit publié
      pour qu'un lecteur distingue un projet qui recule d'un catalogue qui
      grandit.

      Reste ouvert, et c'est volontaire : rien n'empêche aujourd'hui un rapport
      de présenter une bande sans son dénominateur à côté. Le corriger est un
      changement de format de sortie, donc un change à part.
- [x] 6.3 Vérifier que la sortie JSON et les snapshots sont inchangés pour les
      rapports existants, et que le nouveau groupe apparaît sans casser le
      schéma déclaré. Les snapshots passent sans mise à jour, donc aucun rapport
      existant n'a bougé. Le format est inchangé. Deux valeurs, en revanche,
      changent par construction et il ne faut pas les cacher : `catalogue
      .capabilities` passe de 29 à 51, et la liste des findings s'allonge de 22
      entrées `unknown`, une par primitive nouvellement décrite. `pnpm validate`
      et le contrat de rapport publié sont verts.

## Limite explicite de ce change

Ce change ne génère aucune primitive nouvelle. Il décrit ce que l'auditeur sait
voir. Générer une `EntityCollection`, un `DynamicProfile` ou une
`IntentValueRepresentation` est le change suivant, et il dépend de celui-ci pour
ne pas inventer un symbol absent du catalogue. Aucun item ici ne prétend
prouver un parcours Siri : les métadonnées et les tests ne prouvent jamais Siri.
