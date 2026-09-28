# Why

Le domaine `notes` est connu de Xcode 27, il est publie par Apple pour les
applications tierces de prise de notes, et ses trois schemas (`notes.createNote`,
`notes.appendText`, `notes.updateNote`) sont valides par le
`appintentsmetadataprocessor`. Aucun n'est generable aujourd'hui : ils sont
presents dans la table des references connues et absents de la table des schemas
satisfiables, donc un contrat qui les declare est refuse par IL1401.

L'echec de P0-B a produit un second besoin, plus general. Sur une machine dont le
Siri ameliore n'est pas servi, aucune experience de routage vocal n'est interpretable,
et rien dans la compilation ne le revele. `SystemLanguageModel.isAvailable` vaut
`true` sur cette machine alors qu'aucun intent n'est jamais appele. Sans une
verification prealable, n'importe qui peut perdre une journee a deboguer un intent
qui ne peut pas etre route.

## What Changes

- Les cinq entrees `notes` deviennent generables: `notes.note`, `notes.folder`,
  `notes.createNote`, `notes.appendText`, `notes.updateNote`, avec les parametres
  exacts lus dans le catalogue `AppIntentSchemas.sqlite` du toolchain installe.
- Deux nouveaux types de parametre de schema, `attributedString` et `file`.
- Une nouvelle forme de schema: une action qui cree, donc sans entite cible, qui
  declare ses propres parametres et qui retourne une entite.
- Les proprietes d'une entite conforme au schema viennent du schema et plus du
  contrat, avec leur type, parce que le processeur de metadonnees les impose.
- Un garde-fou macCatalyst: le domaine `notes` n'existe pas sur Mac Catalyst, et le
  chemin Expo d'IntentLane est Catalyst.
- Une verification prealable `intentlane doctor` sur l'etat du Siri ameliore, qui
  refuse d'interpreter un echec de routage quand l'environnement ne permet pas
  l'experience.

## Capabilities

### New Capabilities
- `notes-domain`: le domaine notes est genere, valide et refuse quand sa forme ne
  correspond pas au contrat Apple.
- `apple-intelligence-precondition`: l'etat du Siri ameliore est verifie avant
  qu'un resultat de routage soit interprete.

### Modified Capabilities
- Aucun.

## Impact

Table des schemas, types de parametre, emetteur Swift, fixtures negatives,
catalogue d'audit, surface CLI et matrice de plateformes. Le domaine notes passe
de `R` a `G` dans la reference des schemas, et la preuve vocale reste separee et
bloquee.
