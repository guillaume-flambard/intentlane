# ADR de conception: ce que le harnais peut affirmation, et ce qu'il ne peut pas

## Ce que le SDK offre reellement

`AppIntentsTesting` n'existe pas dans le SDK, il est livre avec Xcode 27, sous
`Xcode.app/Contents/Developer/Platforms/MacOSX.platform/Developer/Library/Frameworks`.
Son interface publique lue directement donne une surface qui vaut exactement la couche
manquante :

- `IntentDefinitions(bundleIdentifier:)` puis `intents`, `entities`, `enums` et
  `valueQueries`, chacun indexe par `typeIdentifier`.
- `AppEntityDefinition.entities(matching:)`, `entities(identifiers:)`,
  `allEntities()` et `suggestedEntities()`, qui appellent la query reellement generee.
- `AnyAppEntity` avec un `subscript(dynamicMember:)` dont le `get` **throw**, donc un
  test peut affirmer qu'une propriete d'affichage declaree est reellement atteignable,
  et l'echec est une erreur du framework et non une assertion manuelle.
- `AppIntentDefinition.makeIntent`, appelable par arguments nommes, pour invoquer un
  intent par son identifiant de type.

Tout est `@available(macOS 27.0, iOS 27.0, ...)`, donc le harnais doit porter la meme
annotation de disponibilite que le code genere.

## Pourquoi ce n'est pas un petit slice

`IntentDefinitions` resout par `bundleIdentifier` et `typeIdentifier`, donc le harnais
ne peut pas s'executer dans les scripts `swiftc` actuels, qui compilent le code genere
hors d'un bundle d'application. Il lui faut une cible de test reelle dans un hote, et
donc la signature, qui est exactement le piege deja rencontre sur la branche de l'agent
Xcode, ou un bundle de tests imbrique non signe casse la build.

## Le blocage verifie, non suppose

Le processeur de metadata ne se pilote pas avec les options indiquees par la plupart des
exemples. Les options reelles relevees par `--help` sont `-o -c -m -r -xcv -pf -dt -t
-sl`, et il attend une liste de sources, pas une bibliotheque.

Plus important : avec une source `AppEntity`/`AppIntent` valide, il ecrit
`No swiftconstvalues found; if SWIFT_ENABLE_EMIT_CONST_VALUES = NO, AppIntents metadata
cannot be extracted`, puis `Extracted no relevant App Intents symbols`. La metadata
n'existe donc que si la compilation emet des `swiftconstvals`, ce qui est un reglage de
build de la cible, pas une option du compilateur en ligne de commande. Les noms de
driver testes dans cette session, tous rejetes : `-enable-const-values`,
`-experimental-emit-const-values`, et `-Xfrontend -enable-const-values`.

Consequence honnete : le format du `typeIdentifier` produit par le processeur n'a pas pu
etre observe, parce que rien n'a ete emis. Le generateur ne doit donc pas ecrire ce
format tant qu'il n'a pas ete observe, sinon le harnais compilera et echouera a
l'execution, ce qui est le pire resultat possible pour un harnais de preuve.

## Ce que la change fait donc

Elle ne genere pas encore de harnais. Elle etablit la recette verifiee, la surface
reelle, et le blocage, pour que le prochain slice parte d'un fait et non d'une
supposition. Ecrire du Swift maintenant reviendrait a exactement ce que la roadmap
rejette, generer deux fichiers et appeler cela une recette.
