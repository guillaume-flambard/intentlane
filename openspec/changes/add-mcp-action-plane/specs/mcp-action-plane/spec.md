## Purpose

Permettre à une application d'exposer des capacités métier sûres aux clients
MCP tout en gardant une parité vérifiable avec ses intégrations Apple.

## ADDED Requirements

### Requirement: Canonical curated action contract

The system SHALL définir chaque capacité partageable dans un contrat canonique
typé, avec ses paramètres, sortie, effet, disponibilité et politique de sûreté.

#### Scenario: Internal API is not a tool

- **WHEN** une méthode interne ne possède pas de déclaration d'action activée
- **THEN** elle ne figure ni dans les App Intents ni dans les tools MCP générés

### Requirement: Platform-specific generated surfaces

The system SHALL générer les surfaces Apple et MCP depuis les mêmes actions
sans traiter leurs transports comme identiques.

#### Scenario: iOS-only local app

- **WHEN** une action n'a ni backend ni pont macOS autorisé
- **THEN** elle peut être disponible à Apple mais n'est pas exposée par MCP

### Requirement: Safe write actions

The system SHALL refuser de générer une action MCP d'écriture sans
autorisation, confirmation, ownership, idempotence et erreur publique.

#### Scenario: Missing confirmation

- **WHEN** une action `write`, `sensitive` ou `destructive` omet confirmation
- **THEN** la validation échoue et aucun tool MCP n'est produit

### Requirement: Least-privilege tool results

The system SHALL limiter les champs et erreurs MCP aux valeurs déclarées
publiques par le contrat.

#### Scenario: Sensitive field in adapter result

- **WHEN** un adaptateur renvoie un champ non déclaré ou sensible
- **THEN** la réponse publique le retire et consigne un échec de validation

### Requirement: Multi-surface evidence

The system SHALL distinguer la preuve Apple de la preuve MCP et ne pourra pas
déclarer une action multi-surface vérifiée sans les deux jeux de preuves.

#### Scenario: Apple-only successful action

- **WHEN** une action passe les tests Apple mais son outil MCP échoue
- **THEN** elle reste vérifiée pour Apple seulement et ne peut pas être vendue
  comme accessible à un LLM

### Requirement: UI projection from the canonical contract

The system SHALL traiter la représentation UI comme une projection du contrat
canonique, au même titre que les surfaces Apple et MCP, et SHALL produire toute
ressource `ui://` à partir du contrat plutôt qu'à partir d'un App Intent.

#### Scenario: UI derived from the Apple surface

- **WHEN** une ressource `ui://` est générée pour une action
- **THEN** elle dérive des entrées, sorties, effet et confirmation déclarés par
  le contrat canonique, et une modification du nom ou du type d'un App Intent
  ne change pas le contenu de la ressource

#### Scenario: Contract without presentation

- **WHEN** un contrat ne déclare aucun bloc `presentation`
- **THEN** la génération réussit et l'action est exposée sous forme texte seule

### Requirement: Presentation hints carry no execution semantics

The system SHALL traiter tout bloc `presentation` comme un hint de projection
optionnel, dont la valeur par défaut est le rendu texte, et SHALL conserver le
nommage existant `intents`, `parameters` et `risk.confirmation` sans migration
de contrat 0.1.

#### Scenario: Presentation removed entirely

- **WHEN** le bloc `presentation` et les hints par paramètre sont retirés d'un
  contrat
- **THEN** l'effet de l'intention, ses paramètres et ses exigences restent
  identiques, et l'action reste exécutable par un client text-only

#### Scenario: Control hint ignored by a client

- **WHEN** un client n'expose pas de contrôle `textarea` et ignore
  `presentation.control`
- **THEN** il exécute la même capacité avec le même effet, la valeur du hint
  n'étant jamais une contrainte

### Requirement: Graceful degradation without UI support

The system SHALL produire un résultat texte significatif pour tout client qui
n'a pas négocié l'extension `io.modelcontextprotocol/ui`, et aucun résultat
d'action ne SHALL dépendre de la seule présence d'une ressource `ui://`. Le
comportement textuel est implicite et ne SHALL être déclaré par aucun champ du
contrat.

#### Scenario: Client without MCP Apps support

- **WHEN** un client appelle un tool porteur d'une ressource `ui://` sans avoir
  négocié `io.modelcontextprotocol/ui`
- **THEN** il reçoit le même résultat métier, sans perte de champ ni valeur
  vide introduite par l'absence d'interface

#### Scenario: Mutation confirmed by the iframe

- **WHEN** une action `write` propose une confirmation dans la ressource `ui://`
- **THEN** la confirmation reste portée par le tool et par l'hôte, et l'iframe
  ne peut pas valider seule une mutation

