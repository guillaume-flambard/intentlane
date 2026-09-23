## Purpose

Conserver et valider les assertions de preuve d'un pilote sans faire passer
des résultats automatisés pour une preuve Siri humaine.

## ADDED Requirements

### Requirement: Versioned local ledger

The system SHALL valider un ledger YAML versionné contenant la plateforme, la
révision, les conditions observées, les parcours et les références d'artefacts.

#### Scenario: Invalid ledger

- **WHEN** un champ requis, une version reconnue ou un statut autorisé manque
- **THEN** la validation échoue avec `ILA173` et désigne le chemin du champ

### Requirement: Required evidence layers

The system SHALL exiger `contract` et `build` pour chaque parcours, et une
couche `pass` pour chaque surface revendiquée.

#### Scenario: Siri claimed but blocked

- **WHEN** un parcours revendique Siri et que sa couche Siri est `blocked`
- **THEN** le ledger est `unverified`, émet `ILA174`, et ne peut pas soutenir
  une revendication de parcours Siri

#### Scenario: Unclaimed Spotlight

- **WHEN** un parcours ne revendique pas Spotlight
- **THEN** l'absence de couche Spotlight ne bloque pas sa validation

### Requirement: Risk evidence

The system SHALL exiger confirmation, authentification et ownership pour un
parcours marqué à risque.

#### Scenario: Risk evidence missing

- **WHEN** un parcours à risque omet une de ces trois preuves
- **THEN** le ledger est `unverified` avec `ILA174`

### Requirement: Independent reproduction

The system SHALL exiger une reproduction `pass` réalisée par une seconde
personne avant de rendre un ledger `verified`.

#### Scenario: Missing reproduction

- **WHEN** toutes les couches de parcours passent mais la reproduction est
  absente ou n'est pas `pass`
- **THEN** le ledger est `unverified` avec `ILA175`

### Requirement: Strict publication gate

The system SHALL faire échouer `intentlane evidence validate --strict` quand le
résultat calculé est `unverified`.

#### Scenario: Complete reproducible pilot

- **WHEN** toutes les couches requises et la reproduction indépendante passent
- **THEN** la sortie indique `verified` et la commande stricte termine avec le
  code zéro
