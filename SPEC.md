# IntentLane Specification 0.1

## Fichier

Nom canonique : `intentlane.yaml` à la racine du projet.

## Exemple minimal

```yaml
schema: "0.1"
app:
  id: com.memolabs.kollio
  name: Kollio
  url_scheme: kollio
  min_ios: "18.0"
  locales: [en, fr]

intents:
  - id: create_idea
    title:
      en: Create an idea
      fr: Créer une idée
    description:
      en: Add a new idea to Kollio
      fr: Ajouter une nouvelle idée à Kollio
    parameters:
      - id: title
        type: string
        required: true
        prompt:
          en: What is the idea?
          fr: Quelle est l'idée ?
    execution:
      mode: open_app
      route: /ideas/new
      mapping:
        title: title
    result:
      dialog:
        en: Idea ready in Kollio
        fr: Idée prête dans Kollio
    shortcuts:
      phrases:
        en: ["Create an idea in ${appName}"]
        fr: ["Créer une idée dans ${appName}"]
```

## Types MVP

Types de paramètre : `string`, `integer`, `number`, `boolean`, `date`, `datetime`, `enum`, `entity`, `entity_list`.

Correspondance Swift : `string` vers `String`, `integer` vers `Int`, `number` vers `Double`, `boolean` vers `Bool`, `date` vers `DateComponents`, `datetime` vers `Date`, `enum` vers un `AppEnum` généré, `entity` vers l'`AppEntity` généré de l'entité référencée, `entity_list` vers un tableau de cet `AppEntity`.

Chaque paramètre peut déclarer un `title` et un `prompt`, tous deux des maps locales. Le `title` devient le libellé affiché par le système et le nom du type d'un `enum` ; à défaut, l'identifiant brut sert de libellé. Le `prompt` devient le dialogue que Siri pose pour obtenir la valeur.

```yaml
parameters:
  - id: title
    type: string
    required: true
    title: { en: Idea title, fr: Titre de l'idée }
    prompt: { en: What is the idea?, fr: Quelle est l'idée ? }
```

Un paramètre `enum` déclare ses valeurs sous `values`, une map identifiant vers map locale. Les identifiants de valeurs suivent la règle des autres identifiants et deviennent les noms de cas Swift.

```yaml
parameters:
  - id: priority
    type: enum
    required: true
    values:
      low: { en: Low, fr: Basse }
      high: { en: High, fr: Haute }
```

Un `enum` sans aucune valeur est refusé (IL1301), et un paramètre qui déclare `values` sans être de type `enum` l'est aussi (IL1301).

Un paramètre `entity` référence une entité déclarée et se convertit en `<valeur>.id` dans la query. Un paramètre `entity_list` porte la même référence `entity` et génère un tableau de l'`AppEntity` correspondante.

```yaml
parameters:
  - id: related
    type: entity
    entity: idea
    required: false
```

Une référence absente, une référence inconnue, ou une référence portée par un paramètre qui n'est ni de type `entity` ni de type `entity_list` sont refusées (IL1301).

Les unions, fichiers et médias sont réservés à une version ultérieure.

## Intention

Champs obligatoires : `id`, `title`, `execution`. Description et raccourcis sont recommandés. Chaque paramètre possède un identifiant, un type et une politique `required` ; `title` et `prompt` sont optionnels. Une intention peut déclarer `schema`, la référence `domaine.membre` du schéma d'application auquel elle se conforme, et `target`, l'identifiant de l'entité cible quand le schéma suit un protocole système (`open` ou `delete`).

## Entité

```yaml
entities:
  - id: idea
    title: { en: Idea, fr: Idée }
    identifier: id
    display:
      title: title
      subtitle: status
    query:
      mode: static
```

L'entité génère une `AppEntity`, une `EntityQuery` et un protocole de résolution Swift que l'application implémente. IntentLane n'émet jamais la logique métier : l'application fournit les données et enregistre son implémentation dans le registre généré.

```swift
IntentLaneEntityResolvers.idea = MyIdeaResolver()
```

`display.title` et `display.subtitle` nomment les propriétés de l'entité affichées par le système, et `identifier` nomme la propriété qui porte l'identifiant. Une entité dont le titre manque dans la locale par défaut est refusée (IL1201), un identifiant déclaré deux fois ou un nom de type Swift en collision aussi (IL1601).

La version 0.1 ne génère que la requête `static`. Un `query.mode` valant `endpoint` est refusé (IL1401) : les données passent par le protocole de résolution. Les valeurs privées ne doivent pas être indexées dans Spotlight sans opt-in.

## Schémas d'application

Une intention et une entité acceptent un champ optionnel `schema`, de la forme `domaine.membre` :

```yaml
entities:
  - id: sound
    schema: audio.ambientSound
    # ...

intents:
  - id: stop_capture
    schema: camera.stopCapture
    # ...
```

Le générateur écrit la conformance devant la déclaration : `@AppIntent(schema: .camera.stopCapture)` et `@AppEntity(schema: .audio.ambientSound)`. Une entité conforme émet des propriétés `var` au lieu de `let` et n'émet pas `typeDisplayRepresentation`, parce que la macro applique un property wrapper et prend le nom d'affichage du schéma.

La table des schémas est dérivée de la surface publique des App Schemas d'Xcode 27 (27A266a) et croisée avec la table du processeur de métadonnées. Elle retient 35 intentions atteignables et 20 entités : 16 intentions suivent le protocole `open`, 15 suivent le protocole `delete`, et 4 n'ont aucun protocole mais fournissent leurs propres paramètres (par exemple `reader.rotatePages` avec `pages` et `isClockwise`). Pour un schéma à protocole, le générateur dérive la forme du schéma au lieu de la demander au contrat : une intention `open` émet `var target` typé de l'entité cible et aucun `perform()`, une intention `delete` émet un tableau d'entités et un `perform()` qui délègue au handler nommé. Pour un schéma sans protocole qui fournit ses paramètres, le générateur émet un `@Parameter` par paramètre du schéma. Une entité conforme n'est retenue que si le schéma n'exige pas plus de deux propriétés de type `string`, déclarées dans l'ordre en `display.title` puis `display.subtitle`. Une entité conforme émet des propriétés `var` au lieu de `let` et n'émet pas `typeDisplayRepresentation`, parce que la macro applique un property wrapper et prend le nom d'affichage du schéma. Les conformances d'enum ne sont pas générées en 0.1.

Un schéma inconnu, mal formé, d'un autre genre, ou connu mais que la forme générée ne peut pas satisfaire, est refusé en IL1401 avec un message qui nomme ce qui manque. Un schéma dont la disponibilité iOS est supérieure au `min_ios` de l'application est refusé de la même façon. La disponibilité macOS n'est pas validable : le contrat n'a pas de plancher macOS.

## Exécution

### `open_app`

Construit une URL interne sûre. `route` doit commencer par `/`. `mapping` associe query/path/state aux paramètres déclarés. Chaque valeur est convertie en chaîne dans la query : la valeur brute pour `string`, `String(valeur)` pour `integer` et `number`, `"true"` ou `"false"` pour `boolean`, ISO 8601 pour `datetime`, `YYYY-MM-DD` pour `date`, `rawValue` pour `enum`.

Le résultat généré combine l'URL ouverte, le dialogue et un snippet : `perform()` retourne `some IntentResult & ProvidesDialog & ShowsSnippetView & OpensIntent`. Le snippet est une vue SwiftUI déclarée une seule fois dans le fichier, qui affiche le titre de l'intention et une ligne par paramètre, avec la même conversion de valeur que la query. Un paramètre `entity` y contribue son identifiant.

### `native`

L'application exécute l'action elle-même. `handler` nomme le type Swift que l'application implémente, par exemple `PinLinkHandler`. IntentLane émet le protocole attendu, jamais la logique métier :

```swift
protocol PinLinkHandler {
  func perform(link: IntentLaneLinkEntity) async throws -> IntentLaneLinkEntity
}

@MainActor
enum IntentLaneIntentHandlers {
  static var pin_link: (any PinLinkHandler)?
}
```

`perform()` lit ce registre et jette `IntentLaneHandlerError.missingHandler("<id>")` quand l'application ne l'a pas enregistré au lancement. Une intention `native` n'accepte ni `route` ni `mapping`.

Le résultat peut exiger une valeur avec `result.returns`, qui nomme une entité du contrat. Le générateur ajoute alors `ReturnsValue<IntentLane<Entité>Entity>` au type de retour de `perform()` et passe la valeur à `.result(value:dialog:)`. Sans `returns`, `perform()` retourne `some IntentResult & ProvidesDialog` et les métadonnées ne portent aucune valeur de sortie.

Diagnostics : un `handler` absent, mal formé ou déclaré par deux intentions, un `route` ou un `mapping` sur une intention `native`, et un `result.returns` sur une intention qui n'est pas `native` ou qui référence une entité inconnue sont des erreurs (IL1301, IL1601). `http` reste refusé (IL1401).

### `http`

Option expérimentale. Méthodes `GET` et `POST`, hôte déclaré au niveau app, timeout borné, pas de secret statique.

## Politique de risque

```yaml
risk:
  level: destructive
  confirmation: always
  authentication: required
  confirmation_prompt: { en: Delete this idea?, fr: Supprimer cette idée ? }
```

Niveaux : `read`, `write`, `sensitive`, `destructive`. Les trois champs `level`, `confirmation` et `authentication` sont obligatoires dès que `risk` est présent. La validation refuse `destructive` sans `confirmation: always` (IL1501).

Le générateur applique la politique déclarée. `confirmation: always` produit un `requestConfirmation` avant l'action, `authentication: required` produit `authenticationPolicy = .requiresAuthentication`, et `authentication: none` produit `.alwaysAllowed`. `authentication: inherited` n'émet rien, le système applique sa propre politique. `confirmation: optional` et `never` n'émettent rien non plus.

`confirmation_prompt` est le texte du dialogue de confirmation, localisé comme les autres clés visibles ; une locale par défaut absente est refusée (IL1201). Sans ce champ, le dialogue affiche le titre de l'intention. Le libellé du bouton d'acceptation vient du système, la plateforme n'exposant aucun initialiseur public pour le personnaliser.

## Localisation

Toutes les clés visibles acceptent une map locale. La locale par défaut est la première de `app.locales`. Une traduction absente produit un warning ; une valeur absente dans la locale par défaut produit une erreur.

## Génération

- Tri canonique par identifiant.
- Noms Swift dérivés et collisionnés avant écriture.
- Bannière `Generated by IntentLane. Do not edit.`
- Écriture temporaire puis remplacement atomique.
- `intentlane.manifest.json` contient version, input hash et fichiers/hash.

## Diagnostics initiaux

| Code | Signification |
|---|---|
| IL1001 | schéma non supporté |
| IL1101 | identifiant invalide |
| IL1201 | traduction par défaut absente |
| IL1301 | type de paramètre incompatible |
| IL1401 | capability ou schéma d'application indisponible pour la cible |
| IL1501 | opération destructive sans confirmation |
| IL1601 | collision de nom Swift |
| IL1701 | fichier généré modifié manuellement |

La liste des codes est une surface publique. Elle vit dans `DIAGNOSTIC_CODES`, exporté par `@intentlane/core`, et un test la verrouille : ajouter un code impose de mettre à jour cette table. `intentlane generate --check` émet `IL1701` quand un fichier généré a été modifié après sa génération, et un message distinct quand le contrat a simplement changé.

## Versioning

Le champ `schema` suit SemVer simplifié. Une évolution mineure reste lisible par les outils de la même version majeure. Les migrations seront explicites via `intentlane migrate`, qui n'est pas encore livré : voir [MIGRATION.md](MIGRATION.md).
