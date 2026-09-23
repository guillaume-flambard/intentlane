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

