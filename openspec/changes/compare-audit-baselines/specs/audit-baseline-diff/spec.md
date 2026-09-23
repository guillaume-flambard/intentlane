## Purpose

Comparer deux audits JSON sans relancer l'analyse afin de rendre observable et
reproductible l'évolution d'un pilote.

## ADDED Requirements

### Requirement: Validated audit inputs

The system SHALL accept exactement un rapport JSON `1.0` ou une collection
`reports` de rapports `1.0` produite par IntentLane.

#### Scenario: Invalid input

- **WHEN** un fichier n'est pas un document d'audit JSON valide
- **THEN** la commande échoue avec `ILA170` et n'émet aucun delta partiel

#### Scenario: Unsupported report version

- **WHEN** un rapport porte une version différente de la version supportée
- **THEN** la commande échoue avec `ILA171` et demande de migrer ou régénérer
  le rapport

### Requirement: Capability-level deterministic delta

The system SHALL joindre les findings par plateforme et identifiant de
capacité, puis produire les entrées dans cet ordre stable.

#### Scenario: State regression

- **WHEN** une capability présente dans les deux rapports baisse selon l'ordre
  public de `AuditState`
- **THEN** son entrée est une régression et contient les deux états, leurs
  evidences et les gaps du candidat

#### Scenario: New or absent capability

- **WHEN** une capability n'existe que dans un des deux rapports
- **THEN** son entrée est un changement non classé et ne compte ni comme gain
  ni comme régression

### Requirement: Context is not proof

The system SHALL rendre visibles les différences de cible, SDK, catalogue,
conditions, route, architecture, données et qualité séparément des findings.

#### Scenario: Changed SDK

- **WHEN** le SDK enregistré diffère entre baseline et candidat
- **THEN** la sortie l'indique comme contexte modifié sans attribuer le delta
  de capacité à ce changement

### Requirement: CI regression gate

The system SHALL fournir `--fail-on regression`.

#### Scenario: Regression gate

- **WHEN** l'option est présente et qu'au moins une régression existe
- **THEN** la commande termine avec un code non nul après avoir rendu le delta

