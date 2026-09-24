## Purpose

Faire que la revendication `indexSync` décrive ce que l'application fait, et non
seulement ce que la commande de test prouve.

Les deux pilotes certifiés font indexer leurs objets et testent le cycle de vie
contre un vrai index Core Spotlight nommé, y compris la suppression idempotente.
Mais aucun des deux ne câble la suppression sur les événements réels de
l'application : un dossier ou un preset supprimé reste indexé, et rien ne le
prouve parce que le test n'exerce que l'API d'index, pas le branchement.

C'est l'écart connu entre une porte qui passe et une capacité qui existe. Il est
écrit dans les specs de la campagne comme non fait, et il doit être fait avant
d'enchaîner, sinon les trois prochains pilotes le reproduisent.

## ADDED Requirements

### Requirement: La suppression d'index est câblée sur les événements de l'application
A pilot that claims `indexSync` SHALL wire index removal to the application's own
delete, move and rename events, through the application's own API, and SHALL NOT
depend on the application launching to reconcile the index.

#### Scenario: Un objet disparaît
- **WHEN** the user deletes, moves or renames an object the pilot indexes
- **THEN** the index entry for its previous stable identifier is removed, through
      the application's own event, and the removal uses the exact identifier

#### Scenario: L'application n'expose pas d'événement
- **WHEN** the application exposes no delete, move or rename event
- **THEN** the pilot says so in its record, and `indexSync` is described as
      on-demand reindexing rather than as a mutation hook, because the system
      reindexes when it asks and that is not the same claim

#### Scenario: L'application réconcilie au lancement
- **WHEN** the application only reconciles its index at launch
- **THEN** the pilot records that the index can be stale until the next launch,
      and does not claim a hook it did not implement

### Requirement: Un test prouve qu'un objet supprimé disparaît de l'index
The index suite SHALL exercise the application's own deletion path, not only the
index API, so that the wiring is covered rather than assumed.

#### Scenario: Le chemin de suppression de l'application est appelé
- **WHEN** the test removes an object through the application
- **THEN** the object's identifier is passed to the index removal, and the test
      fails if the application never calls it

#### Scenario: Le test ne peut pas appeler l'application
- **WHEN** the test target cannot reach the application's deletion path
- **THEN** the pilot records that the wiring is verified by review and by the
      launch probe rather than by a test, instead of implying a coverage it does
      not have

### Requirement: La réindexation incrémentale reste un choix, pas une obligation
A pilot MAY wire create, update and delete events. It SHALL NOT be required to, and
a pilot that does not SHALL NOT be described as incomplete.

#### Scenario: Un premier pilote n'ajoute pas de crochets
- **WHEN** a first pilot does not wire mutation events
- **THEN** it says the system reindexes on demand, and the claim set stays the same
      six, because the on-demand path is real and the claim never covered mutation
      hooks

#### Scenario: Un pilote les ajoute
- **WHEN** a pilot wires the events
- **THEN** the cost is recorded as an extra effort row, and the deviation log says
      the recipe asked for it rather than requiring it
