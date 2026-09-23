## Purpose

Définir une sortie IntentLane vérifiable qui sépare ce que le code prouve, ce
que le système Apple observe et ce qu'une personne peut publiquement affirmer.

## ADDED Requirements

### Requirement: Explicit v1 launch boundary

The system SHALL publier une frontière v1 qui distingue les capacités incluses
des packages App Intents 27 demand-gated.

#### Scenario: Advanced capability without pilot demand

- **WHEN** un pilote ne demande pas une capacité de découverte, transfert,
  pertinence ou exécution avancée
- **THEN** son absence ne bloque pas le lancement v1 et ne peut pas être
  présentée comme une capacité livrée

### Requirement: Evidence before public Siri claim

The system SHALL exiger un ledger `verified` avant une revendication publique
sur un parcours Siri, avec couches requises et reproduction indépendante.

#### Scenario: Metadata without manual Siri observation

- **WHEN** le binaire contient les métadonnées mais que la couche Siri n'est
  pas `pass`
- **THEN** le parcours reste `unverified` et les documents publics ne le
  présentent pas comme fonctionnel dans Siri

### Requirement: Final Apple 27 compatibility check

The system SHALL revalider le catalogue et les limitations contre le SDK et les
notes de version Apple utilisés pour la release candidate.

#### Scenario: Changed SDK capability

- **WHEN** le SDK de release diffère de celui dont le catalogue est dérivé
- **THEN** la capacité est revalidée ou classée `unknown`; elle ne garde pas
  silencieusement son ancienne disponibilité

### Requirement: Reproducible distribution

The system SHALL vérifier les paquets publiés et le quickstart à partir de
nouveaux dossiers avant de déclarer la distribution prête.

#### Scenario: Registry install differs from tarball test

- **WHEN** l'installation depuis npm ne reproduit pas `init`, `validate`,
  `generate`, le prebuild Expo et `doctor`
- **THEN** la release est bloquée et l'écart est consigné comme issue

### Requirement: Single release control

The system SHALL conserver une liste de contrôle qui lie chaque condition de
lancement à son artefact et à son état, sans cocher de gate humain par proxy.

#### Scenario: Open owner decision

- **WHEN** une politique, une permission ou une publication nécessite le
  propriétaire
- **THEN** la ligne est `owner-decision` et ne peut pas devenir `closed` par
  un test automatisé

