# IntentLane contract reference

The `intentlane.yaml` contract, field by field, and the Swift each field emits.
What IntentLane is and how to run it is in [README.md](../../README.md).

## Parameter types

A parameter declares an `id`, a `type` and `required`. The generator maps each type to its Swift counterpart and, for `open_app` execution, converts the value into the URL query:

| Contract type | Swift type | Query value |
| --- | --- | --- |
| `string` | `String` | the value itself |
| `integer` | `Int` | `String(value)` |
| `number` | `Double` | `String(value)` |
| `boolean` | `Bool` | `"true"` or `"false"` |
| `date` | `DateComponents` | `YYYY-MM-DD` |
| `datetime` | `Date` | ISO 8601 |
| `enum` | generated `AppEnum` | the case `rawValue` |
| `entity` | generated `AppEntity` | `value.id` |
| `entity_list` | generated `AppEntity` array | comma-joined `value.id` |

An `enum` parameter declares its cases under `values`, one localized label per case:

```yaml
parameters:
  - id: priority
    type: enum
    required: true
    values:
      low: { en: Low, fr: Basse }
      high: { en: High, fr: Haute }
```

The generator emits `enum IntentLane<Intent><Parameter>: String, AppEnum` with one `case` per value, and every label goes into the `IntentLane` strings table. Case names therefore stay stable identifiers while Siri and the Shortcuts app show the translated label. An enum without values is rejected (IL1301), and `values` on a parameter that is not an enum is rejected too (IL1301).

A parameter may also declare a `title` and a `prompt`, both localized maps:

```yaml
parameters:
  - id: title
    type: string
    required: true
    title: { en: Idea title, fr: Titre de l'idée }
    prompt: { en: What is the idea?, fr: Quelle est l'idée ? }
```

The `title` becomes the label the system shows and the display name of a generated `AppEnum`, and the `prompt` becomes the dialog Siri asks for the value (`requestValueDialog`). Both go into the `IntentLane` strings table. Without a `title`, the generator falls back to the raw parameter id; without a `prompt`, no value dialog is emitted. A `title` missing its default locale is rejected with IL1201.

## Entities

An entity describes a value the system can hand back to an intent, such as an idea selected from the app's own data:

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

The generator emits `struct IntentLane<Entity>Entity: AppEntity`, its `EntityQuery`, and a resolver protocol the app implements:

```swift
protocol IntentLaneIdeaResolver {
  func ideaEntities(for identifiers: [String]) async throws -> [IntentLaneIdeaEntity]
  func suggestedIdeaEntities() async throws -> [IntentLaneIdeaEntity]
}
```

IntentLane never writes business logic. The app supplies the data and registers its resolver in the generated holder, which the query reads at runtime:

```swift
IntentLaneEntityResolvers.idea = MyIdeaResolver()
```

`IntentLaneEntityResolvers` is main-actor isolated, so the registration happens on the main actor. Until the app registers a resolver, the query returns an empty list rather than failing. The example app does register one; see [Example app](EXAMPLE-APP.md#example-app).

`display.title` and `display.subtitle` name the properties the system shows, `identifier` names the property that carries the stable identifier, and an entity parameter references an entity by id:

```yaml
parameters:
  - id: related
    type: entity
    entity: idea
    required: false
```

The version 0.1 only generates the `static` query. `query.mode: endpoint` is rejected with IL1401, an unknown or missing entity reference with IL1301, a duplicated entity id or Swift type name collision with IL1601, and an entity title missing its default locale with IL1201.

## App schemas

An intent or an entity may declare the App Schema it conforms to. That is how Siri and Apple Intelligence attach an action to a domain they already understand, instead of treating it as a custom action:

```yaml
entities:
  - id: sound
    title: { en: Ambient sound, fr: Son d'ambiance }
    identifier: id
    display:
      title: title
    query:
      mode: static
    schema: audio.ambientSound

intents:
  - id: stop_capture
    title: { en: Stop capture, fr: Arrêter la capture }
    parameters: []
    execution:
      mode: open_app
      route: /stop
    schema: camera.stopCapture
```

The generator puts the conformance in front of the declaration:

```swift
@AppEntity(schema: .audio.ambientSound)
struct IntentLaneSoundEntity: AppEntity {

@AppIntent(schema: .camera.stopCapture)
struct StopCapture: AppIntent {
```

A conformed entity emits `var` properties instead of `let`, drops its `typeDisplayRepresentation`, and declares an explicit initializer, because `@AppEntity(schema:)` applies a property wrapper and takes the display name from the schema. `@Property` inside an `AppEntity` is not a struct property wrapper: the SDK declares `typealias Property = EntityProperty`, and `EntityProperty` is a final class with no `init(wrappedValue:)`, so the synthesized memberwise initializer would ask for an `EntityProperty<String>` that cannot be built. In the extracted metadata, a conformed intent fills `assistantDefinedSchemas` and adds the `AssistantIntent` system protocol, which is exactly the gap the macOS target made visible. A protocol-backed intent adds its own system protocol too (`OpenEntity` or `DeleteEntity`) and, for `open`, turns `openAppWhenRun` on so the system performs the opening.

The schema set is deliberately small. It is derived from the public App Schema surface of Xcode 27 (27A266a), cross-checked against the metadata extractor's own table, and it only holds schemas the generated shape can satisfy. Two shapes are supported. A schema without a system protocol declares no parameter and no return value, and its entity requires at most two string properties, declared in order as `display.title` then `display.subtitle`. A schema with the `open` or `delete` system protocol dictates its own shape instead: an `open` schema declares one `target` entity parameter and no `perform()`, because the `OpenIntent` extension provides it, while a `delete` schema declares an `entities` array, a `parameterSummary` and a `perform()` that delegates to the app handler. Either way the target entity has to be resolvable by the system, so an entity that a protocol-backed intent targets also conforms to `IndexedEntity` and the file imports `CoreSpotlight`. A protocol-backed intent names its entity in the contract and declares neither parameters nor a result:

```yaml
intents:
  - id: open_article
    title: { en: Open the article, fr: Ouvrir l'article }
    target: article
    execution:
      mode: native
    schema: reader.openPage
```

A schema without a protocol can still take parameters. `reader.rotatePages` supplies `pages` and `isClockwise`, so the intent declares no parameter and no result: it names the entity it acts on with `target`, runs natively with a handler, and the generator declares each `@Parameter` from the schema, mapping the schema types to `String`, `Bool`, `Int`, `Double`, the target entity, or an array of it.

Today the table holds 36 intents (five without a protocol, sixteen `open` and fifteen `delete`) and twenty entities. Enum conformances are not generated yet.

A schema that exists but that IntentLane cannot satisfy is refused with IL1401, and the message says what is missing. The same code covers a reference that is not `domain.member`, a reference Xcode does not know, a schema of the other kind, a conformed intent that declares a parameter or a return value, a conformed entity whose display properties do not follow the schema order, and a schema that needs a newer iOS than the app declares in `min_ios`, which is only judged when the contract declares one. For a protocol-backed schema it also refuses a missing or unknown `target`, a `target` on a schema that has no protocol, an execution mode that is not `native`, and a declared parameter or result, because the schema provides all of them. A schema that supplies its own parameters refuses the same way: a missing or unknown `target`, a mode that is not `native`, and a declared result.

## Risk policy

An intent declares how dangerous it is:

```yaml
risk:
  level: destructive
  confirmation: always
  authentication: required
  confirmation_prompt: { en: Delete this idea?, fr: Supprimer cette idée ? }
```

The generator turns the confirmation and authentication fields into App Intents behaviour:

| Contract | Generated Swift |
| --- | --- |
| `confirmation: always` | `try await requestConfirmation(actionName: .continue, dialog: ...)` before the action runs |
| `confirmation: optional` or `never` | nothing, the app decides at runtime |
| `authentication: required` | `static let authenticationPolicy: IntentAuthenticationPolicy = .requiresAuthentication` |
| `authentication: none` | `static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed` |
| `authentication: inherited` | nothing, the system policy applies |

`confirmation_prompt` is the dialog text, localized through the `IntentLane` strings table. Without it, the confirmation shows the intent title. The accept button label comes from the system (`ConfirmationActionName.continue`); the platform exposes no public initializer for that type, so the contract cannot name the accept and decline actions.

The `level` participates in validation rather than generation: a `destructive` intent without `confirmation: always` is rejected with IL1501, and a confirmation prompt missing its default locale with IL1201.

## Results and snippets

Every generated intent returns a result that combines three things: the opened URL, the spoken dialog, and a SwiftUI snippet shown by the Shortcuts app and Siri:

```swift
func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView & OpensIntent {
  let url = IntentLaneRoute.make(scheme: "example", path: "/ideas/new", query: ["title": title])
  return .result(
    opensIntent: OpenURLIntent(url),
    dialog: IntentDialog(LocalizedStringResource("Your idea is ready", table: "IntentLane")),
    view: IntentLaneSnippetView(title: LocalizedStringResource("Create an idea", table: "IntentLane"), fields: [(LocalizedStringResource("Idea title", table: "IntentLane"), title)])
  )
}
```

The snippet view is declared once for the whole file. It shows the intent title and one row per parameter, using the same string conversions as the URL query, so an `enum` contributes its `rawValue`, an `entity` its identifier, and a `date` its `YYYY-MM-DD` form. An intent without parameters shows the title alone. Field labels are `LocalizedStringResource` values, so they read the `IntentLane` table like every other visible string.

## Native execution

`open_app` opens a URL and lets the app react. `native` is the other way around: the app does the work, and IntentLane only declares the shape.

```yaml
- id: pin_link
  title: { en: Pin a link, fr: Épingler un lien }
  parameters:
    - { id: link, type: entity, entity: link, required: true }
  execution:
    mode: native
    handler: PinLinkHandler
  result:
    dialog: { en: The link is pinned, fr: "Le lien est épinglé" }
    returns: link
```

The generator emits the handler protocol, the main-actor registry and the `perform()` that reads it:

```swift
protocol PinLinkHandler {
  func perform(link: IntentLaneLinkEntity) async throws -> IntentLaneLinkEntity
}

@MainActor
enum IntentLaneIntentHandlers {
  static var pin_link: (any PinLinkHandler)?
}
```

The app registers its implementation at launch with `IntentLaneIntentHandlers.pin_link = PinLink()`. Until it does, `perform()` throws `IntentLaneHandlerError.missingHandler("pin_link")` instead of failing silently. `result.returns` names an entity of the contract, which adds `ReturnsValue<IntentLaneLinkEntity>` to the return type and makes the system carry the created or updated value. Without `returns`, `perform()` returns a dialog alone and the metadata records no output value. A `native` intent declares neither `route` nor `mapping`; `http` is refused with IL1401.

## Generated files

IntentLane owns the output directory. The generator writes the Swift source, one strings table per non-default locale, and a manifest:

- `IntentLaneGenerated.swift`, carrying the `Generated by IntentLane. Do not edit.` banner.
- `<locale>.lproj/IntentLane.strings`, one per locale declared in `app.locales` other than the default locale.
- `intentlane.manifest.json`, containing the schema version, the source input hash, and the hash of each generated file.

Every user-visible string in the generated Swift reads the dedicated `IntentLane` strings table, and the entry key is the default-locale text itself. A missing or unreadable table therefore degrades to the English literal instead of a broken token. `intentlane generate --check` verifies every generated file, not just the Swift. When a generated file no longer matches the hash recorded in the manifest, `--check` reports `IL1701` for that file, which means it was edited by hand after generation, and it reports stale output separately when the contract itself changed.

Writes go to a temporary file and are renamed into place, so a failed run cannot leave a half-written source file.
