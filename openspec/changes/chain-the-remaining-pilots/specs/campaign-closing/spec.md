## Purpose

Écrire la clôture de la campagne avant qu'elle n'arrive, pour que le résultat
publié soit le même que le résultat mesuré, et que ce qui n'a jamais été observé
soit dit au lieu d'être omissions.

Une campagne qui se termine sur une page de succès et un chiffre de prix laisse
deux questions sans réponse pour un acheteur : qu'est-ce que vous n'avez pas
prouvé, et qu'est-ce qui a été plus cher que prévu. La recette version 2 et le
document de résultats répondent aux deux, et ils ne s'écrivent correctement que
si leurs conditions sont fixées avant le dernier pilote.

## ADDED Requirements

### Requirement: La recette devient la version 2 avec ce que les pilotes ont appris
When the pilots are done, the recipe SHALL be amended with every stage a pilot
corrected, and the amendment SHALL state what changed and which pilot proved it.

#### Scenario: Une étape a été corrigée par un pilote
- **WHEN** a pilot proved a stage was wrong or incomplete
- **THEN** the recipe carries the correction, and the results say how many stages
      never needed correcting

#### Scenario: La recette a été corrigée plusieurs fois
- **WHEN** two pilots corrected the same stage differently
- **THEN** the version 2 text states the final rule and names both pilots, because
      the history is what makes the rule credible

### Requirement: Le document de résultats publie les domaines validés
The closing document SHALL name each certified pilot by business domain, not by
application name alone, because the claim is that different domains work.

#### Scenario: Trois domaines sont validés
- **WHEN** the gate is met
- **THEN** the document names the three domains and the application in each, and
      says what each one proves

### Requirement: Le document de résultats publie ce qui n'a jamais été observé
The closing document SHALL name every surface that stayed unobserved, as a limit
of the method, and SHALL NOT list them as missing features.

#### Scenario: Une revendication n'a jamais été observée
- **WHEN** a claim such as the Siri conversation or the Spotlight result was never
      observed on any pilot
- **THEN** the document says it was not observed and why, and the reason is the
      absence of a public API rather than a lack of effort

#### Scenario: Un acheteur demande pourquoi
- **WHEN** someone asks why the conversation was not proved
- **THEN** the answer names the two facts that flatten it: no public API sends a
      phrase to Siri, and Core Spotlight offers no read-back of a named index

### Requirement: Les décisions de la personne restent published comme telles
The closing document SHALL state, as part of the result, that the push and the npm
publication were left to the person, with the reason, and SHALL NOT present them as
finished or as forgotten.

#### Scenario: La publication npm reste bloquée
- **WHEN** the campaign closes with npm unpublished
- **THEN** the document says the packages are ready and the authentication is the
      person's step, and does not claim a publication that did not happen

#### Scenario: Le push reste bloqué
- **WHEN** the campaign closes with the branches unpushed
- **THEN** the document says the range contains material that is not meant to be
      public, and that the decision is pending

### Requirement: La clôture ne réécrit pas l'histoire
The closing document SHALL NOT claim a claim that a pilot did not make, and SHALL
NOT remove a limitation that a pilot recorded, even when that limitation makes the
result look weaker.

#### Scenario: Un écart d'implémentation est connu
- **WHEN** a pilot recorded that a feature is not implemented
- **THEN** the closing document carries it, and the weaker result is published
      rather than the tidier one
