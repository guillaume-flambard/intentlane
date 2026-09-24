## Purpose

Écrire la porte de l'offre avant de la franchir, pour que le prix soit une
conséquence des mesures et non une décision antérieure à elles.

La campagne a deux pilotes certifiés dans deux domaines, et un enchaînement de
trois candidats à traiter. La porte demande trois validations indépendantes dans
des domaines métier différents, chacune certifiée, avec sa ligne de deviation et
sa ligne d'effort. Aucune de ces conditions n'est remplie aujourd'hui. Les écrire à
l'avance évite deux dérives : atteindre la porte avec trois validations qui
partagent un seul domaine, et fermer la porte avec un chiffre inventé quand le
temps manque.

## ADDED Requirements

### Requirement: Trois domaines distincts, pas trois applications
The offer SHALL be priced only from three certified validations in different
business domains, and three applications in one domain do not count as three.

#### Scenario: Les trois validations partagent un domaine
- **WHEN** three pilots land in the same business domain
- **THEN** the gate is not met, the shortfall is named, and the campaign continues
      until the spread is real

#### Scenario: La porte est remplie
- **WHEN** three distinct domains are certified with a deviation row and an
      effort row each
- **THEN** the results document is filled with the pricing range, the deviation
      count and the domain spread, and nothing else

### Requirement: Le prix vient de la feuille d'effort
The price SHALL be derived from recorded effort per stage per pilot, and the stage
that dominates SHALL be named.

#### Scenario: Une étape domine
- **WHEN** one stage accounts for most of the recorded effort across pilots
- **THEN** the price names it, because that is the stage a buyer should hear
      about and the one to price against

#### Scenario: Une étape n'a pas été instrumentée
- **WHEN** a stage says `not instrumented`
- **THEN** it is excluded from the arithmetic and the exclusion is stated, because a
      remembered number would corrupt the only input the price has

#### Scenario: Les prérequis d'une stack pèsent lourd
- **WHEN** a stack's stage 0 cost dominates its sheet
- **THEN** the price separates the cost of getting the application to build from the
      cost of the integration, because they are different services

### Requirement: Le wording est revu contre le registre de revendications
Before the offer is written, every line of it SHALL be checked against the claims
registry, and no line SHALL name a system surface that no pilot claimed and no
command proved.

#### Scenario: Une ligne promet Siri
- **WHEN** the wording says Siri works
- **THEN** the line is refused, because at most one pilot has observed a
      conversation and no command proves it

#### Scenario: Une ligne promet l'adaptabilité
- **WHEN** the wording says any application can be adapted
- **THEN** the line names the stack families actually certified, and says that
      Cyberduck is the case where the method may not apply

### Requirement: Les brouillons de contact partent après, jamais avant
Maintainer-specific pull request and outreach drafts MAY be prepared once a pilot
is certified. They SHALL NOT be sent, and a recorded contribution rule that
forbids the change SHALL keep the pilot local.

#### Scenario: Un pilote est certifié
- **WHEN** a pilot certifies
- **THEN** a draft may exist, addressed to that maintainer, describing that
      maintainer's application

#### Scenario: La règle de contribution l'interdit
- **WHEN** the recorded contribution rule forbids the change
- **THEN** the pilot stays local, the rule is published with the results, and no
      draft is sent
