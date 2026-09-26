## Why

Le catalogue de `audit-catalogue.ts` décrit 29 capacités et versionne son état
avec `CAPABILITY_CATALOGUE_VERSION = "27.0"`. Vérifié contre le SDK 27.0
installé, il ne couvre que les App Intents. Toute la famille Apple Intelligence
est absente, ainsi que les primitives d'entités spécialisées, les valeurs
enrichies, les cibles d'exécution et les requêtes de propriétés.

Cette surface manquante n'est pas une lacune de confort : `foundation.models`
est le cœur de Kollio, et c'est la partie qu'IntentLane ne sait ni détecter ni
générer aujourd'hui. Un rapport qui ne connaît pas `SystemLanguageModel` ne peut
pas dire honnêtement à une app ce qui lui manque.

`design.md` du change `audit-capability-inventory` a déjà tranché la bonne
règle : *"Use a versioned catalogue derived from installed SDK symbols plus
explicit Apple classification."* Le catalogue doit être dérivé des symboles du
SDK. En l'état les disponibilités sont des chaînes écrites à la main, donc la
règle est violée juste là où elle compte.

## What Changes

- Ajoute un groupe `models` et des records pour la pile Foundation Models :
  `SystemLanguageModel`, le protocole `LanguageModel`, `DynamicProfile`,
  `PrivateCloudComputeLanguageModel`, l'entrée image, `GenerationOptions` et le
  protocole `Tool`.
- Ajoute les primitives d'entités spécialisées absentes : `FileEntity`,
  `TransientAppEntity`, `UniqueAppEntity`, `URLRepresentableEntity`,
  `OwnershipProvidingEntity`, `EntityCollection`.
- Ajoute `IntentValueRepresentation`, `AppUnionValue`,
  `IntentExecutionTargets`, `EntityPropertyQuery`, `IndexedEntityQuery`,
  `SnippetIntent` et `ShowsSnippetView`.
- Donne à chaque record la preuve qui l'établit : le framework et le symbole du
  SDK, y compris quand le symbole vit dans un framework-pont.
- Ajoute un contrôle de dérive qui compare le catalogue aux symboles publics du
  SDK installé et signale un symbole absent comme un manque de catalogue, jamais
  comme un constat de projet.
- Sépare le fait Apple de la consommation : l'overlay qui dit quelle app utilise
  une capacité est un fichier séparé, joint au rapport, jamais une information
  du catalogue.

## Capabilities

### New Capabilities
- `capability-catalogue`: Surface des capacités Apple Intelligence et App Intents
  que le catalogue sait décrire, prouver contre le SDK installé, et générique ou
  non. Une primitive non décrite vaut `unknown`, jamais `supported`.

### Modified Capabilities
- `capability-audit`: le rapport joint l'overlay de consommation et la preuve
  SDK par capacité.

## Impact

`packages/core` (catalogue, overlay, tests), aucun changement de format de
sortie existant, aucun changement de la suite `audit-catalogue` en dehors de
l'ajout du groupe `models`. Le code généré n'est pas affecté : ce change ne
touche que ce que l'auditeur sait voir. Public OSS, donc pas de référence à une
application tierce dans le code.

## Dépendance bloquante sur `score-across-catalogue-growth`

Les tâches 2.x et 3.x de ce change ajoutent des records au catalogue, et chaque
record ajoute trois points au dénominateur du score. La tâche 6.2 a mesuré le
résultat : neuf records ont fait passer une application inchangée de 7 à 5.

Tant que le traitement de `unknown` n'est pas décidé dans
`score-across-catalogue-growth`, écrire les tâches 2.x et 3.x revient à figer le
problème dans deux cents records de plus. Ces tâches sont donc dépendantes, et
leur rédaction attend ce change.
