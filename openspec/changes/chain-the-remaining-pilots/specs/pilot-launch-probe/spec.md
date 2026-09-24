## Purpose

Faire que la certification dise ce qu'elle sait sur l'enregistrement au
lancement, et rien de plus.

Les deux pilotes compilent le code App Intents dans l'application et câblent
l'appel d'enregistrement, donc le code est présent et la branche qui l'appelle
est écrite. Ce que ni la compilation ni les tests ne mesurent, c'est que le
processe lancé enregistre effectivement. Le pilote IINA a une sonde pour cela et
les deux autres pas, ce qui veut dire que la revendication la plus visible pour un
acheteur, celle que l'app a bien enregistré ses actions, n'est prouvée nulle part
pour FSNotes et HandBrake.

Une sonde est un petit programme qui lance l'application, attend son signal
d'enregistrement et le rapporte. C'est une commande, donc c'est vérifiable, et
c'est la seule façon de fermer l'écart sans une personne.

## ADDED Requirements

### Requirement: Une sonde de lancement prouve que le processus s'enregistre
A pilot MAY claim `registration`, and that claim SHALL be settled by a command
that launches the built application and reports what it found.

#### Scenario: L'application lance et s'enregistre
- **WHEN** the probe launches the built application in a graphical session
- **THEN** it reports the registration, the resolvers it installed and the handlers
      it installed, by name

#### Scenario: L'application lance sans s'enregistrer
- **WHEN** the probe finds no registration
- **THEN** the claim fails and the probe says what it expected, because an
      application that compiles the code and never calls it is a real and
      previously invisible failure

#### Scenario: Aucune session graphique
- **WHEN** no graphical session is available
- **THEN** the claim is not made, and the pilot says why rather than skipping the
      step silently

### Requirement: Le résultat de la sonde est une preuve, pas une observation
The probe SHALL be a command whose exit status settles the claim, and SHALL NOT
require a person to read its output.

#### Scenario: La sonde réussit
- **WHEN** the probe exits zero
- **THEN** the `registration` claim is `pass`, and the run names it like any other
      deterministic claim

#### Scenario: La sortie demande un humain
- **WHEN** the probe's outcome depends on someone interpreting it
- **THEN** it is not a probe, and the claim stays out of the deterministic set

### Requirement: Ce que la sonde ne prouve pas
A registration probe SHALL NOT be read as evidence that Siri resolves a spoken name
or that Spotlight shows a result. Those remain observed claims.

#### Scenario: La sonde passe et quelqu'un en déduit que Siri marche
- **WHEN** the registration claim is `pass`
- **THEN** the run still lists no observed claim, and says that the conversation
      and the Spotlight result were not observed

### Requirement: Réutiliser une sonde existante est une déviation
Reusing the IINA probe for another pilot SHALL be recorded as a deviation, because
the two applications register differently and the difference is the information.

#### Scenario: La sonde IINA est réutilisée
- **WHEN** a pilot reuses the IINA probe
- **THEN** the deviation log records it, and the pilot states what it had to change
      to read that application's registration
