# capability-catalogue Specification

## Purpose
Décrire la surface de capacités qu'IntentLane sait nommer, prouver contre le SDK
installé, et générique ou non. Une primitive non décrite vaut `unknown`, jamais
`supported`.

Cette spécification ne redéfinit pas le gradient `auditor` / `build` /
`surfaces` / `siri-journey` / `domain-package`, qui reste l'unique échelle de
support d'IntentLane. Elle ajoute la couverture manquante, la preuve par
symbole, et la séparation entre le fait Apple et la consommation.

## Requirements

### Requirement: Entity primitive coverage
Le catalogue SHALL décrire chaque primitive dérivée d'`AppEntity` que le SDK
déclare, et SHALL la classer selon l'échelle de support existante plutôt que de
l'omettre.

#### Scenario: Entité spécialisée présente dans le SDK
- **WHEN** le SDK déclare `FileEntity`, `TransientAppEntity`, `UniqueAppEntity`,
  `URLRepresentableEntity`, `OwnershipProvidingEntity` ou `EntityCollection`
- **THEN** le catalogue contient un record par primitive, avec son framework et
  son symbole, et aucun n'est absent au motif que rien ne l'a encore généré

#### Scenario: Entité déclarée par une application
- **WHEN** une application déclare une entité conforme à une de ces primitives
- **THEN** le rapport nomme la primitive, son framework et ce qu'elle exige en
  plus d'`AppEntity`, au lieu de la classer `AppEntity` générique

### Requirement: Rich values and union parameters
Le catalogue SHALL distinguer un paramètre scalaire, énuméré ou entité d'une
valeur riche et d'une union, et SHALL porter `IntentValueRepresentation` et
`AppUnionValue` comme surfaces distinctes.

#### Scenario: Représentation de valeur transférable
- **WHEN** une application expose une `IntentValueRepresentation` pour
  transférer une représentation sémantique comprise d'une autre app
- **THEN** le rapport la distingue d'un simple `Transferable` et nomme ce que le
  système reçoit de l'autre app

#### Scenario: Paramètre d'union
- **WHEN** une application déclare un paramètre d'union
- **THEN** le rapport indique que le paramètre accepte plusieurs cas et ne le
  compte pas comme un simple paramètre optionnel

### Requirement: Execution target qualification
Le catalogue SHALL porter `IntentExecutionTargets` et SHALL nommer les cibles
d'exécution qu'un intent peut cibler, afin qu'un rapport puisse dire si un intent
est joignable depuis l'app, une extension App Intents ou une extension widget.

#### Scenario: Intent déclaré sans cible
- **WHEN** un intent est déclaré sans cible d'exécution
- **THEN** le rapport nomme la cible par défaut et indique les cibles alternatives
  que le SDK déclare, sans trancher à la place du projet

#### Scenario: Cible restreinte à une extension
- **WHEN** un intent est restreint à une extension App Intents
- **THEN** le rapport signale qu'il n'est pas atteignable depuis le processus
  principal, et nomme la cible qui l'est

### Requirement: Query family coverage
Le catalogue SHALL distinguer `EntityQuery`, `EntityStringQuery`,
`EntityPropertyQuery`, `IndexedEntityQuery` et `IntentValueQuery`, et SHALL
refuser de regrouper une requête de propriétés dans une requête d'entité.

#### Scenario: Requête de propriétés
- **WHEN** une application déclare une `EntityPropertyQuery`
- **THEN** le rapport la nomme comme telle et n'indique pas un simple
  `EntityQuery`, parce que la granularité de résolution est différente

#### Scenario: Requête d'entité indexée
- **WHEN** une application déclare une `IndexedEntityQuery`
- **THEN** le rapport relie la requête à l'indexation de l'entité et exige la
  preuve d'indexation correspondante

### Requirement: Apple Intelligence model surface
Le catalogue SHALL porter un groupe dédié à la pile Foundation Models, avec un
record pour le modèle système, l'abstraction `LanguageModel`, les profils
dynamiques, l'escalade cloud, l'entrée image, les options de génération et le
protocole d'outil. L'absence d'une pile entière SHALL être traitée comme un trou
du catalogue et non comme un choix de périmètre.

#### Scenario: Modèle système
- **WHEN** le SDK déclare `SystemLanguageModel`
- **THEN** le catalogue contient un record pour cette pile, et le rapport peut
  dire à une application que sa pile de raisonnement n'est pas décrite plutôt
  que de la laisser sans mention

#### Scenario: Abstraction de modèle
- **WHEN** une application s'abstrait derrière le protocole `LanguageModel` au
  lieu de `SystemLanguageModel`
- **THEN** le rapport distingue l'abstraction d'une implémentation, parce que
  l'escalade vers une autre implémentation change ce que l'app doit prouver

#### Scenario: Profil dynamique
- **WHEN** une application déclare un profil dynamique
- **THEN** le rapport le nomme et signale que ses instructions et ses outils
  varient selon la situation, donc qu'une preuve statique ne suffit pas

#### Scenario: Escalade cloud
- **WHEN** une application déclare une escalade vers un modèle cloud
- **THEN** le rapport la nomme comme une montée de niveau explicite et la
  distingue d'un appel au modèle local, parce que la donnée sort de l'appareil

#### Scenario: Outil de système
- **WHEN** une application adopte un outil fourni par le système
- **THEN** le rapport nomme l'outil et son framework, et ne le compte pas comme
  une fonction que l'application a écrite

### Requirement: Bridge framework attribution
Un record dont le symbole est public dans un framework à underscore SHALL porter
le nom de ce framework, parce que le symbole n'est pas résolvable depuis le seul
module public.

#### Scenario: Symbole dans un framework-pont
- **WHEN** le symbole vit dans un framework-pont et non dans le module public
- **THEN** le record cite le framework-pont, et l'auditeur le résout depuis ce
  framework plutôt que de conclure que le symbole est absent

### Requirement: SDK-derived evidence and catalogue drift
Chaque record SHALL porter la preuve qui l'établit, sous forme de framework et de
symbole du SDK, et le catalogue SHALL être comparé aux symboles publics du SDK
installé. Un symbole public absent du catalogue SHALL être signalé comme un
manque de catalogue et non comme une capacité manquante du projet audité.

#### Scenario: Symbole nouveau dans un SDK plus récent
- **WHEN** le SDK installé expose un symbole public que le catalogue ne décrit
  pas
- **THEN** le rapport le signale comme un manque de catalogue, avec le symbole et
  le framework, et ne l'attribue pas au projet audité

#### Scenario: Aucun SDK inspectable
- **WHEN** aucun SDK n'est lisible
- **THEN** la comparaison n'est pas faite, l'état du catalogue reste `unknown`,
  et le rapport dit comment la faire

#### Scenario: Disponibilité prouvée
- **WHEN** la disponibilité déclarée d'un record est confrontée au SDK
- **THEN** une version déclarée que le SDK contredit est signalée, au lieu d'être
  conservée par défaut

### Requirement: Consumer overlay is separate from Apple facts
Le catalogue SHALL ne nommer aucune application. La consommation et la priorité
SHALL vivre dans un overlay séparé, joint au rapport, qui SHALL rester valide et
inerte en son absence.

#### Scenario: Overlay absent
- **WHEN** aucun overlay n'est fourni
- **THEN** le catalogue et le rapport restent complets et valides, et aucune
  capacité n'est marquée comme consommée

#### Scenario: Overlay fourni
- **WHEN** un overlay associe une priorité et un état de consommation à des
  identifiants de capacités
- **THEN** le rapport joint cette information à la capacité correspondante, et
  signale un identifiant d'overlay que le catalogue ne connaît pas au lieu de
  l'ignorer

#### Scenario: Application inconnue du catalogue
- **WHEN** le code est relu et qu'aucun nom de repository n'y figure
- **THEN** ni le catalogue ni l'overlay ne nomment une application, afin
  qu'IntentLane décrive un projet sans le connaître par son nom
