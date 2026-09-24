## Purpose

Fixer ce qu'un pilote doit prouver avant de commencer, et dans quel ordre les
trois candidats restants sont traités, pour que l'enchaînement soit une décision
prise une fois plutôt que trois décisions prises sous pression.

Les deux pilotes certifiés ont établi que la méthode s'applique à une cible Swift
et à une cible Objective-C. Les trois candidats restants sont Transmission et LuLu,
toutes deux Objective-C, et Cyberduck, un shell natif au-dessus d'une application
Java. L'ordre n'est pas un goût : il va de la stack la plus proche de ce qui est
déjà prouvé vers celle qui peut casser la méthode.

Les critères ci-dessous sont les conditions d'entrée, pas une liste de
souhaits. Un pilote qui ne les remplit pas est bloqué et nommé, pas forcé.

## ADDED Requirements

### Requirement: Un pilote a une condition d'entrée écrite avant de commencer
Before a pilot starts, its entry criteria SHALL be written: the application builds
from a clean checkout, the previous pilot is certified, and no known defect from
an earlier pilot is unfixed in the code being reused.

#### Scenario: L'application ne compile pas
- **WHEN** the application cannot be built from a clean checkout
- **THEN** the pilot is blocked, the missing prerequisite is named, and no code is
      written for it

#### Scenario: Le précédent n'est pas certifié
- **WHEN** the preceding pilot is not certified
- **THEN** the next pilot does not start, because a defect would then be ambiguous
      between two pilots

#### Scenario: Un défaut connu est non corrigé
- **WHEN** a defect found on an earlier pilot is still unfixed
- **THEN** the pilot waits, because the same defect on a new stack costs more to
      find and more to attribute

### Requirement: Transmission vient en troisième
Transmission SHALL be the third pilot, and the reason SHALL be recorded.

#### Scenario: Le troisième pilote démarre
- **WHEN** Transmission starts
- **THEN** it is a third Objective-C target, and it tests whether the cost of
      step 4.1 measured on HandBrake was specific to that application or general
      to the stack

### Requirement: LuLu vient en quatrième
LuLu SHALL be the fourth pilot, and its data sensitivity SHALL be classified
before any code is written.

#### Scenario: Le quatrième pilote démarre
- **WHEN** LuLu starts
- **THEN** its sensitivity classification is recorded first, because it is a
      security application and its objects may not be user-authored

#### Scenario: Un objet porte un nom écrit par la personne
- **WHEN** the candidate's object names can carry a client or a machine identity
- **THEN** the contract excludes them, the way a user-created preset and an
      encrypted notebook were excluded, and the exclusion is a test

### Requirement: Cyberduck vient en dernier, et son résultat est publié dans les deux sens
Cyberduck SHALL be the fifth pilot, because a thin native shell over a Java
application is the stack where the method may not apply.

#### Scenario: La méthode ne s'applique pas
- **WHEN** the Java shell cannot carry App Intents through the same recipe
- **THEN** the campaign says so, names what failed, and does not narrow the claim
      set to hide it

#### Scenario: La méthode s'applique
- **WHEN** it does
- **THEN** the pilot certifies its declared claims like any other, and the
      campaign has covered three stack families

### Requirement: Un défaut trouvé sur une stack est vérifié sur les autres
A defect found on one stack SHALL be checked against the pilots already certified
before the next pilot starts, because a defect that appears on two stacks is a
method defect and not an application quirk.

#### Scenario: Le même défaut apparaît deux fois
- **WHEN** a review finds a defect in one pilot
- **THEN** the other certified pilot is checked for it, and if it is present the
      recipe is amended once for both

#### Scenario: Le défaut est propre à une application
- **WHEN** the check finds the defect only in one pilot
- **THEN** the fix is local, and the recipe notes why the other stack is unaffected
