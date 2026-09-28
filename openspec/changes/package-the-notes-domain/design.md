# Context

L'ordre est: preconditions, puis contrat compile, puis emetteur, puis fixtures
negatives, puis verification. Une entree de table n'est ajoutee qu'apres que
l'emetteur sait la satisfaire, parce que la regle du depot est qu'un schema connu
mais non satisfait doit etre refuse par IL1401, jamais genere en casse.

Le contrat a ete releve a trois sources concordantes: le catalogue
`AppIntentSchemas.sqlite` du toolchain, l'interface Swift du SDK, et les exemples
publies par Apple. Les trois coincident exactement.

Faits etablis par compilation sur SDK 27A266a, target macOS 27:

- `@AppEntity(schema:)` n'ajoute que la conformance. Chaque propriete du schema
  devient un `@Property`, c'est a dire un `EntityProperty`, dont `init()` est
  `unavailable` et qui n'a pas d'`init(wrappedValue:)`. L'initialiseur
  synthesise est donc inutilisable sur toute entite conforme, pas seulement sur
  celles qui portent des types nommes.
- Une entite de schema utilisee comme parametre d'intention doit etre resolvable.
- Une entite de schema doit fournir une `EntityStringQuery` nommee de facon unique.
- Une intention conforme au schema ne declare pas de `parameterSummary`, et un
  parametre `file` doit nommer un sous-type concret de `public.item`.
- L'indexation d'une `NoteEntity` conforme est title only par defaut. Le metadata
  de build declare pourtant `content -> textContent`. Les couches de declaration,
  de metadata et d'execution runtime ne sont pas d'accord, et l'ecart est un
  resultat en soi.

## Goals / Non-Goals

**Goals:**
- Generer le domaine notes complet, avec ses parametres exacts.
- Refuser les formes qu'Apple refuse, avec des fixtures negatives.
- Ne pas confondre la preuve de generation et la preuve vocale.
- Rendre la precondition Siri verifiable et officielle.

**Non-Goals:**
- Aucune preuve vocale du domaine notes. Elle est bloquee et le reste.
- Aucun autre domaine en plus de notes.
- Aucune entite exposee au choix du systeme au-dela de ce que le schema impose.
- Aucune normalisation du divergence `relatedAppEntityIdentifier`, notee comme
  anomalie et non traitee.

## Decisions

- Les proprietes d'une entite conforme viennent du schema, avec leur type, et le
  contrat ne declare plus que l'identite et la requete. Le processeur de
  metadonnees verifie ces proprietes, donc le generateur doit les produire, pas les
  deviner depuis `display.title` et `display.subtitle`.
- Une action de creation est une forme distincte, pas un `requiresTarget: false`
  deguise. Le message de refus actuel parle de recherche dans l'app, ce qui serait
  faux pour une creation.
- Le garde Catalyst vit dans la table des schemas, avec la meme Mecanique que
  `minIos`, parce que la disponibilite est une propriete du schema et pas du
  contrat.
- La precondition Siri est une verification, pas un garde-fou bloquant. Elle dit ce
  qui est impossible, elle n'empeche pas de compiler.
- `SystemLanguageModel.isAvailable` n'est pas une precondition suffisante. Le
  controle compare donc l'etat de service du Siri ameliore a l'etat du modele et
  signale le piege quand ils divergent.

## Risks / Trade-offs

- Les proprietes d'entite passant par le schema, les 20 entrees existantes doivent
  etre migrees. Une migration mecanique, mais elle touche tout le domain.
- Une entite `notes.note` a sept proprietes et quatre types distincts. La surface
  generee grossit, et le contrat doit pouvoir l'exprimer.
- Le divergence entre metadata de build et execution runtime sur `textContent`
  invite a un claim trop fort. La formulation autorisee est une observation datee
  et versionnee, pas une garantie Apple.
- Le statut du Siri ameliore est une propriete du compte et de l'appareil. La
  verification rend le resultat reproductible, pas la machine.
