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

- [ ] 2.1 Ajouter le groupe `entity` et les records `FileEntity`,
      `TransientAppEntity`, `UniqueAppEntity`, `URLRepresentableEntity`,
      `OwnershipProvidingEntity`, `EntityCollection`.
- [ ] 2.2 Ajouter les records `IntentValueRepresentation` et `AppUnionValue`, avec
      un scénario de test qui distingue une valeur riche d'un paramètre scalaire
      et une union d'un paramètre optionnel.
- [ ] 2.3 Mettre à jour l'assertion de tableau exact dans
      `audit-catalogue.test.ts` pour les nouveaux groupes, et vérifier qu'elle
      échoue si un groupe est retiré.
- [ ] 2.4 Ajouter les records `EntityPropertyQuery` et `IndexedEntityQuery`, et
      vérifier qu'une `EntityPropertyQuery` n'est jamais rendue comme une
      `EntityQuery`.

## 3. Exécution et découverte

- [ ] 3.1 Ajouter le record `IntentExecutionTargets` avec les cibles que le SDK
      déclare, et vérifier qu'un intent restreint à une extension est signalé
      comme injoignable depuis le processus principal.
- [ ] 3.2 Ajouter les records `SnippetIntent` et `ShowsSnippetView`.

## 4. Pile Apple Intelligence

- [ ] 4.1 Ajouter le groupe `models` et les records `SystemLanguageModel`, le
      protocole `LanguageModel`, `DynamicProfile`,
      `PrivateCloudComputeLanguageModel`, l'entrée image, `GenerationOptions` et
      le protocole `Tool`.
- [ ] 4.2 Porter le framework-pont sur `OCRTool` et `SpotlightSearchTool`, et
      vérifier que l'auditeur les résout depuis leur framework-pont et ne conclut
      pas qu'ils sont absents du module public.
- [ ] 4.3 Vérifier qu'une application s'abstrait derrière `LanguageModel` est
      distinguée d'une application liée à `SystemLanguageModel`, et qu'une
      escalade cloud est distinguée d'un appel local.

## 5. Overlay de consommation

- [ ] 5.1 Définir l'overlay et son loader, avec jointure sur les ids de
      capacités et rejet d'un id inconnu au catalogue.
- [ ] 5.2 Vérifier que le rapport reste valide et complet quand l'overlay est
      absent.
- [ ] 5.3 Vérifier par lecture de code qu'aucun nom de repository n'apparaît
      dans le catalogue ni dans l'overlay.

## 6. Vérification

- [ ] 6.1 `pnpm test`, `pnpm build` (qui inclut `tsc --noEmit`) et
      `pnpm validate`.
- [ ] 6.2 Rejouer `intentlane audit` sur la fixture macOS existante et vérifier
      que les scores et les bandes sont inchangés : ce change décrit ce que
      l'auditeur sait voir, il ne doit rien changer à ce qu'un projet obtient.
- [ ] 6.3 Vérifier que la sortie JSON et les snapshots sont inchangés pour les
      rapports existants, et que le nouveau groupe apparaît sans casser le
      schéma déclaré.

## Limite explicite de ce change

Ce change ne génère aucune primitive nouvelle. Il décrit ce que l'auditeur sait
voir. Générer une `EntityCollection`, un `DynamicProfile` ou une
`IntentValueRepresentation` est le change suivant, et il dépend de celui-ci pour
ne pas inventer un symbol absent du catalogue. Aucun item ici ne prétend
prouver un parcours Siri : les métadonnées et les tests ne prouvent jamais Siri.
