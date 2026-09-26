## Purpose

Décrire ce que le score d'audit mesure, ce qu'il ne mesure pas, et contre quoi il
se lit. Cette spécification n'existait pas : le score avait une version, des
bandes, des tests et un format de sortie, et nulle part une exigence qui dise ce
qu'il vaut. Une sémantique non écrite ne peut pas être revue, seulement subie.

Le score est le chiffre que l'audit vend. Cette spécification existe pour qu'il ne
puisse pas changer de sens sans que personne ne s'en aperçoive.

## ADDED Requirements

### Requirement: Le score se lit contre un catalogue
Le score SHALL être interprété comme un rapport entre les points obtenus et
le nombre de records applicables du catalogue, et SHALL porter la version du
catalogue contre lequel il a été calculé. Un score seul SHALL être considéré comme
non interprétable d'une version de l'outil à l'autre.

#### Scenario: Le catalogue grandit entre deux audits
- **WHEN** le catalogue gagne des records entre deux audits de la même
  application, sans que le code de l'application change
- **THEN** le score peut baisser, et le rapport nomme la version du catalogue
  qui explique ce dénominateur, au lieu de laisser croire à une régression

#### Scenario: Le catalogue est lu comme un dénominateur
- **WHEN** un lecteur lit un score
- **THEN** il peut dire combien de records étaient applicables et sur quelle
  version du catalogue, parce que le score est une propriété du couple projet et
  catalogue, pas du projet seul

### Requirement: La valeur d'un état est écrite
Chaque état d'audit SHALL avoir une valeur en points écrite dans cette
spécification, et le dénominateur SHALL être le nombre de records applicables
multiplié par le nombre de points maximal. Aucun état ne SHALL être vide de sens
parce qu'il n'a jamais été spécifié.

#### Scenario: Un état ne vaut rien mais reste applicable
- **WHEN** un état vaut zéro point et que le projet n'a pas fourni la capability
- **THEN** le dénominateur compte malgré tout ce record, et le rapport le rend
  visible au lieu de laisser un total seul

#### Scenario: Un état ne sera pas applicable
- **WHEN** une capability n'est pas applicable à la plateforme auditée
- **THEN** elle sort du dénominateur et n'affecte pas le score

### Requirement: La lecture par groupe est un affichage
Le rapport SHALL donner le score global et SHALL le décomposer par groupe du
catalogue, de sorte qu'une variation du total puisse être attribuée soit à un
projet, soit à un catalogue complété. La décomposition SHALL être lue dans le
record du catalogue et SHALL NOT être déduite d'un découpage de l'identifiant.

#### Scenario: Un projet a régressé
- **WHEN** le total baisse et qu'un groupe baisse dans la même proportion
- **THEN** le rapport indique le groupe, donc la variation est attribuable au
  projet

#### Scenario: Un catalogue s'est complété
- **WHEN** le total baisse et qu'un groupe nouveau vaut zéro parce que le projet
  n'a pas la capability
- **THEN** le rapport indique ce groupe et son dénominateur, donc la variation
  est attribuable au catalogue et non au projet

#### Scenario: Un identifiant qu'aucun record ne possède
- **WHEN** un finding porte un identifiant de capacité absent du catalogue
- **THEN** il est laissé hors de la décomposition, et ne reçoit aucun groupe
  inventé

### Requirement: La sémantique de l'inconnu est décidée, pas héritée
Le traitement de l'état `unknown` dans le score SHALL être écrit dans cette
spécification avant que d'autres changes n'ajoutent des records au catalogue.
Tant que la décision n'est pas prise, aucun change ouvert ne SHALL ajouter de
records, parce que chaque record ajoute du dénominateur.

#### Scenario: Un change ajoute des records avant la décision
- **WHEN** un change ajoute des records au catalogue alors que le traitement de
  `unknown` n'est pas décidé
- **THEN** il est traité comme un change dépendant, et son effet sur le score des
  projets existants est déclaré à l'avance

#### Scenario: L'audit est moins sévère quand l'outil sait moins
- **WHEN** une option fait que l'absence de preuve n'affecte pas le score
- **THEN** cette option est présentée comme un choix commercial, parce qu'elle
  récompense l'ignorance de l'outil, et non comme un simple correctif
