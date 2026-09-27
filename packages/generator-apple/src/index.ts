

  const conformance = targeted ? "AppEntity, IndexedEntity" : "AppEntity";
  const typeDisplay = conformed
    ? ""
    : `  static var typeDisplayRepresentation: TypeDisplayRepresentation {\n    TypeDisplayRepresentation(name: ${localizedResource(localized(entity.title, locale))})\n  }\n\n`;
  const subtitleExpression =
    subtitleProperty === undefined
      ? ""
      : `,\n      subtitle: ${subtitleProperty === titleProperty || subtitleProperty === "id" ? `LocalizedStringResource(stringLiteral: ${subtitleProperty})` : `${subtitleProperty}.map { LocalizedStringResource(stringLiteral: $0) }`}`;
  const initializerProperties = targeted && !conformed
    ? [...properties.filter((property) => property.name !== titleProperty), ...properties.filter((property) => property.name === titleProperty)]
    : properties;
  const initializer = conformed || (targeted && !conformed)
    ? `\n  init(${properties.map((property) => `${property.name}: String${property.optional ? "?" : ""}`).join(", ")}) {\n${initializerProperties.map((property) => `    self.${property.name} = ${property.name}`).join("\n")}\n  }`
    : "";
  const queryConformance = targeted
    ? reindexable ? "EntityQuery, EntityStringQuery, IndexedEntityQuery" : "EntityQuery, EntityStringQuery"
    : "EntityQuery";
  const reindexing = reindexable
    ? `\n\n  func reindexEntities(for identifiers: [String], indexDescription: CSSearchableIndexDescription) async throws {\n    guard let resolver = await IntentLaneEntityResolvers.${entity.id} else { return }\n    let entities = try await resolver.${camelName}Entities(for: identifiers)\n    try await CSSearchableIndex(name: ${swiftString(spotlightIndexName)}).indexAppEntities(entities)\n  }\n\n  func reindexAllEntities(indexDescription: CSSearchableIndexDescription) async throws {\n    guard let resolver = await IntentLaneEntityResolvers.${entity.id} else { return }\n    let entities = try await resolver.suggested${entity.swiftName}Entities()\n    try await CSSearchableIndex(name: ${swiftString(spotlightIndexName)}).indexAppEntities(entities)\n  }`
    : "";
  const stringResolution = targeted
    ? `\n\n  func entities(matching string: String) async throws -> [${typeName}] {\n    guard let resolver = await IntentLaneEntityResolvers.${entity.id} else { return [] }\n    return try await resolver.${camelName}Entities(matching: string)\n  }`
    : "";
  const stringResolverRequirement = targeted
    ? `\n  func ${camelName}Entities(matching string: String) async throws -> [${typeName}]`
    : "";
  return `${availability}${annotation}struct ${typeName}: ${conformance} {\n${typeDisplay}  static let defaultQuery = ${queryName}()\n\n${declarations}${initializer}${searchableTitle}\n\n  var displayRepresentation: DisplayRepresentation {\n    DisplayRepresentation(\n      title: LocalizedStringResource(stringLiteral: ${titleProperty})${subtitleExpression}\n    )\n  }${exposureConditionBlock}\n}\n\n${availability}protocol ${resolverName}: Sendable {\n  func ${camelName}Entities(for identifiers: [String]) async throws -> [${typeName}]${stringResolverRequirement}\n  func suggested${entity.swiftName}Entities() async throws -> [${typeName}]\n}\n\n${availability}struct ${queryName}: ${queryConformance} {\n  func entities(for identifiers: [String]) async throws -> [${typeName}] {\n    guard let resolver = await IntentLaneEntityResolvers.${entity.id} else { return [] }\n    return try await resolver.${camelName}Entities(for: identifiers)\n  }${stringResolution}\n\n  func suggestedEntities() async throws -> [${typeName}] {\n    guard let resolver = await IntentLaneEntityResolvers.${entity.id} else { return [] }\n    return try await resolver.suggested${entity.swiftName}Entities()\n  }${reindexing}\n}`;
}

function entityDeclarations(ir: ConfigIR, locale: string): string {
  if (ir.entities.length === 0) return "";
  const targeted = new Set(ir.intents.filter((intent) => protocolOf(intent) !== undefined).map((intent) => intent.target ?? ""));
  const reindexable = new Set(ir.intents.filter((intent) => intent.schema === "system.open").map((intent) => intent.target ?? ""));
  const entities = [...ir.entities].sort((left, right) => left.id.localeCompare(right.id));
  const registry = entities.map((entity) => `  static var ${entity.id}: (any IntentLane${entity.swiftName}Resolver)?`).join("\n");
  const availability = macOS27Availability(ir);
  return `${entities.map((entity) => emitEntity(entity, locale, targeted.has(entity.id), reindexable.has(entity.id), `${ir.app.id}.${entity.id}`, availability)).join("\n\n")}\n\n${availability}@MainActor\nenum IntentLaneEntityResolvers {\n${registry}\n}\n\n`;
}

function emitEnum(intent: IntentIR, parameter: ParameterIR, locale: string): string {
  const name = enumTypeName(intent, parameter);
  const values = Object.keys(parameter.values ?? {}).sort((left, right) => left.localeCompare(right));
  const cases = values.map((value) => `  case ${value}`).join("\n");
  const representations = values.map((value) => `    .${value}: DisplayRepresentation(title: ${localizedResource(localized(labelsFor(parameter, value), locale))})`).join(",\n");
  return `enum ${name}: String, AppEnum {\n${cases}\n\n  static var typeDisplayRepresentation: TypeDisplayRepresentation {\n    TypeDisplayRepresentation(name: ${localizedResource(parameterTitle(parameter, locale))})\n  }\n\n  static var caseDisplayRepresentations: [${name}: DisplayRepresentation] {\n    [\n${representations}\n    ]\n  }\n}`;
}

function enumDeclarations(ir: ConfigIR, locale: string): string {
  const declarations = ir.intents.flatMap((intent) => intent.parameters.filter((parameter) => parameter.type === "enum").map((parameter) => emitEnum(intent, parameter, locale)));
  return declarations.length === 0 ? "" : `${declarations.join("\n\n")}\n\n`;
}

function queryValue(intent: IntentIR, source: string): string {
  const type = intent.parameters.find((parameter) => parameter.id === source)?.type ?? "string";
  if (type === "integer" || type === "number") return `String(${source})`;
  if (type === "boolean") return `${source} ? "true" : "false"`;
  if (type === "datetime") return `${source}.ISO8601Format()`;
  if (type === "date") return `String(format: "%04d-%02d-%02d", ${source}.year ?? 0, ${source}.month ?? 0, ${source}.day ?? 0)`;
  if (type === "enum") return `${source}.rawValue`;
  if (type === "entity") return `${source}.id`;
  if (type === "entity_list") return `${source}.map { $0.id }.joined(separator: ",")`;
  return source;
}

function routeExpression(intent: IntentIR, scheme: string): string {
  const entries = Object.entries(intent.mapping).sort(([left], [right]) => left.localeCompare(right));
  if (entries.length === 0) return `IntentLaneRoute.make(scheme: ${swiftString(scheme)}, path: ${swiftString(intent.route)}, query: [:])`;
  const items = entries.map(([target, source]) => `${swiftString(target)}: ${queryValue(intent, source)}`).join(", ");
  return `IntentLaneRoute.make(scheme: ${swiftString(scheme)}, path: ${swiftString(intent.route)}, query: [${items}])`;
}

function authenticationLine(intent: IntentIR): string {
  const policy = intent.risk ? AUTHENTICATION_POLICIES[intent.risk.authentication] : undefined;
  return policy ? `\n  static let authenticationPolicy: IntentAuthenticationPolicy = ${policy}` : "";
}

function confirmationStatement(intent: IntentIR, locale: string): string {
  if (intent.risk?.confirmation !== "always") return "";
  const prompt = localized(intent.risk.confirmationPrompt ?? intent.title, locale);
  return `    try await requestConfirmation(actionName: .continue, dialog: IntentDialog(${localizedResource(prompt)}))\n`;
}

function nativeHandlerName(intent: IntentIR): string {
  if (!intent.handler) throw new Error(`IL1301: native intent '${intent.id}' has no handler.`);
  return intent.handler;
}

function openHandlerName(intent: IntentIR): string {
  return intent.handler ?? `${intent.swiftName}Handler`;
}

function nativeReturnType(ir: ConfigIR, intent: IntentIR): string | undefined {
  if (!intent.returns) return undefined;
  const entity = ir.entities.find((candidate) => candidate.id === intent.returns);
  if (!entity) throw new Error(`IL1301: Intent '${intent.id}' returns unknown entity '${intent.returns}'.`);
  return `IntentLane${entity.swiftName}Entity`;
}

function nativeHandlerDeclarations(ir: ConfigIR): string {
  const natives = ir.intents.filter((intent) => intent.mode === "native" && (intent.handler !== undefined || protocolOf(intent) === "open"));
  if (natives.length === 0) return "";
  const availability = macOS27Availability(ir);
  const protocols = natives.map((intent) => {
    const parameters = schemaParameterDeclarations(ir, intent).map((parameter) => `${parameter.name}: ${parameter.swiftType}`).join(", ");
    const returns = nativeReturnType(ir, intent);
    const handler = protocolOf(intent) === "open" ? openHandlerName(intent) : nativeHandlerName(intent);
    return `${availability}protocol ${handler}: Sendable {\n  func perform(${parameters}) async throws${returns ? ` -> ${returns}` : ""}\n}`;
  });
  const registry = natives.map((intent) => `  static var ${intent.id}: (any ${protocolOf(intent) === "open" ? openHandlerName(intent) : nativeHandlerName(intent)})?`).join("\n");
  return `${protocols.join("\n\n")}\n\n${availability}enum IntentLaneHandlerError: Error {\n  case missingHandler(String)\n}\n\n${availability}@MainActor\nenum IntentLaneIntentHandlers {\n${registry}\n}\n\n`;
}

function emitNativeIntent(ir: ConfigIR, intent: IntentIR, locale: string): string {
  const title = localized(intent.title, locale);
  const description = intent.description ? `\n  static let description = IntentDescription(${localizedResource(localized(intent.description, locale))})` : "";
  const authentication = authenticationLine(intent);
  const confirmation = confirmationStatement(intent, locale);
  const annotation = `${macOS27Availability(ir)}${intent.schema ? `@AppIntent(schema: .${intent.schema})\n` : ""}`;
  const parameters = intent.parameters.map((parameter) => parameterDeclaration(intent, parameter, ir.entities, locale)).join("\n\n");
  const dialog = intent.dialog ? localized(intent.dialog, locale) : title;
  const returns = nativeReturnType(ir, intent);
  const argumentsList = schemaParameterDeclarations(ir, intent).map((parameter) => `${parameter.name}: ${parameter.name}`).join(", ");
  const signature = `some IntentResult & ProvidesDialog${returns ? ` & ReturnsValue<${returns}>` : ""}`;
  const call = returns
    ? `    let value = try await handler.perform(${argumentsList})\n    return .result(value: value, dialog: IntentDialog(${localizedResource(dialog)}))`
    : `    try await handler.perform(${argumentsList})\n    return .result(dialog: IntentDialog(${localizedResource(dialog)}))`;
  return `${annotation}struct ${intent.swiftName}: AppIntent {\n  static let title: LocalizedStringResource = ${localizedResource(title)}${description}${authentication}\n\n${parameters}\n\n  func perform() async throws -> ${signature} {\n${confirmation}    guard let handler = await IntentLaneIntentHandlers.${intent.id} else {\n      throw IntentLaneHandlerError.missingHandler(${swiftString(intent.id)})\n    }\n${call}\n  }\n}`;
}

function emitProtocolIntent(ir: ConfigIR, intent: IntentIR, locale: string): string {
  const title = localized(intent.title, locale);
  const description = intent.description ? `\n  static let description = IntentDescription(${localizedResource(localized(intent.description, locale))})` : "";
  const authentication = authenticationLine(intent);
  const annotation = `${macOS27Availability(ir)}${intent.schema ? `@AppIntent(schema: .${intent.schema})\n` : ""}`;
  const typeName = `IntentLane${targetEntity(ir, intent).swiftName}Entity`;
  if (protocolOf(intent) === "open") {
    const handler = openHandlerName(intent);
    return `${annotation}struct ${intent.swiftName}: OpenIntent {\n  static let title: LocalizedStringResource = ${localizedResource(title)}${description}${authentication}\n\n  @Parameter(title: ${localizedResource(localized(targetEntity(ir, intent).title, locale))})\n  var target: ${typeName}\n\n  @MainActor\n  func perform() async throws -> some IntentResult {\n    guard let handler = IntentLaneIntentHandlers.${intent.id} else {\n      throw IntentLaneHandlerError.missingHandler(${swiftString(intent.id)})\n    }\n    try await handler.perform(target: target)\n    return .result()\n  }\n}`;
  }
  const dialog = intent.dialog ? localized(intent.dialog, locale) : title;
  return `${annotation}struct ${intent.swiftName}: AppIntent {\n  static let title: LocalizedStringResource = ${localizedResource(title)}${description}${authentication}\n\n  static var parameterSummary: some ParameterSummary {\n    Summary("Delete \\(\\.$entities)")\n  }\n\n  var entities: [${typeName}]\n\n  func perform() async throws -> some IntentResult & ProvidesDialog {\n    guard let handler = await IntentLaneIntentHandlers.${intent.id} else {\n      throw IntentLaneHandlerError.missingHandler(${swiftString(intent.id)})\n    }\n    try await handler.perform(entities: entities)\n    return .result(dialog: IntentDialog(${localizedResource(dialog)}))\n  }\n}`;
}

function emitSchemaIntent(ir: ConfigIR, intent: IntentIR, locale: string): string {
  const title = localized(intent.title, locale);
  const description = intent.description ? `\n  static let description = IntentDescription(${localizedResource(localized(intent.description, locale))})` : "";
  const authentication = authenticationLine(intent);
  const annotation = `${macOS27Availability(ir)}${intent.schema ? `@AppIntent(schema: .${intent.schema})\n` : ""}`;
  const parameters = schemaParameterDeclarations(ir, intent);
  const criteriaTypealias = intent.schema === "system.searchInApp" ? "\n  typealias Criteria = StringSearchCriteria" : "";
  const declarations = parameters.map((parameter) => `  @Parameter(title: ${localizedResource(parameter.name)})\n  var ${parameter.name}: ${parameter.swiftType}`).join("\n\n");
  const argumentsList = parameters.map((parameter) => `${parameter.name}: ${parameter.name}`).join(", ");
  const dialog = intent.dialog ? localized(intent.dialog, locale) : title;
  return `${annotation}struct ${intent.swiftName}: AppIntent {\n  static let title: LocalizedStringResource = ${localizedResource(title)}${description}${authentication}${criteriaTypealias}\n\n${declarations}\n\n  func perform() async throws -> some IntentResult & ProvidesDialog {\n    guard let handler = await IntentLaneIntentHandlers.${intent.id} else {\n      throw IntentLaneHandlerError.missingHandler(${swiftString(intent.id)})\n    }\n    try await handler.perform(${argumentsList})\n    return .result(dialog: IntentDialog(${localizedResource(dialog)}))\n  }\n}`;
}

function schemaDeclaresParameters(intent: IntentIR): boolean {
  if (!intent.schema) return false;
  const entry = findAppSchema("intent", intent.schema);
  return (entry?.parameters.length ?? 0) > 0;
}

function emitIntent(ir: ConfigIR, intent: IntentIR, locale: string, scheme: string): string {
  if (protocolOf(intent)) return emitProtocolIntent(ir, intent, locale);
  if (schemaDeclaresParameters(intent)) return emitSchemaIntent(ir, intent, locale);
  if (intent.mode === "native") return emitNativeIntent(ir, intent, locale);
  const title = localized(intent.title, locale);
  const description = intent.description ? `\n  static let description = IntentDescription(${localizedResource(localized(intent.description, locale))})` : "";
  const authentication = authenticationLine(intent);
  const confirmation = confirmationStatement(intent, locale);
  const annotation = `${macOS27Availability(ir)}${intent.schema ? `@AppIntent(schema: .${intent.schema})\n` : ""}`;
  const parameters = intent.parameters.map((parameter) => parameterDeclaration(intent, parameter, ir.entities, locale)).join("\n\n");
  const dialog = intent.dialog ? localized(intent.dialog, locale) : title;
  const fields = intent.parameters.map((parameter) => `(${localizedResource(parameterTitle(parameter, locale))}, ${queryValue(intent, parameter.id)})`).join(", ");
  return `${annotation}struct ${intent.swiftName}: AppIntent {\n  static let title: LocalizedStringResource = ${localizedResource(title)}${description}${authentication}\n\n${parameters}\n\n  func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView & OpensIntent {\n${confirmation}    let intentLaneURL = ${routeExpression(intent, scheme)}\n    return .result(\n      opensIntent: OpenURLIntent(intentLaneURL),\n      dialog: IntentDialog(${localizedResource(dialog)}),\n      view: IntentLaneSnippetView(title: ${localizedResource(title)}, fields: [${fields}])\n    )\n  }\n}`;
}

function emitShortcuts(ir: ConfigIR, locale: string): string {
  const registered = ir.intents
    .map((intent) => ({ intent, phrases: intent.phrases[locale] ?? [] }))
    .filter(({ phrases }) => phrases.length > 0);
  if (registered.length === 0) return "";
  const providers = registered.map(({ intent, phrases }) => `      AppShortcut(intent: ${intent.swiftName}(), phrases: [\n${phrases.map((phrase) => `        ${shortcutPhrase(phrase)}`).join(",\n")}\n      ], shortTitle: ${localizedResource(localized(intent.title, locale))}, systemImageName: "sparkles")`);
  return `struct IntentLaneShortcuts: AppShortcutsProvider {\n  static var appShortcuts: [AppShortcut] {\n${providers.join("\n")}\n  }\n}`;
}

export function generateSwift(ir: ConfigIR): string {
  const locale = defaultLocale(ir);
  const enums = enumDeclarations(ir, locale);
  const entities = entityDeclarations(ir, locale);
  const handlers = nativeHandlerDeclarations(ir);
  const intents = ir.intents.map((intent) => emitIntent(ir, intent, locale, ir.app.urlScheme)).join("\n\n");
  const shortcuts = emitShortcuts(ir, locale);
  const spotlight = ir.intents.some((intent) => protocolOf(intent) !== undefined) ? "import CoreSpotlight\n" : "";
  const shortcutsSection = shortcuts ? `\n\n${shortcuts}` : "";
  return `// Generated by IntentLane. Do not edit.\n// Source schema: ${ir.schemaVersion}\n\nimport AppIntents\nimport Foundation\n${spotlight}import SwiftUI\n\nenum IntentLaneRoute {\n  static func make(scheme: String, path: String, query: [String: String]) -> URL {\n    var components = URLComponents()\n    components.scheme = scheme\n    components.path = path\n    if !query.isEmpty {\n      components.queryItems = query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }\n    }\n    return components.url ?? URL(string: "about:blank")!\n  }\n}\n\n${SNIPPET_VIEW}\n\n${enums}${entities}${handlers}${intents}${shortcutsSection}\n`;
}

export function generateAdapterTemplate(ir: ConfigIR): string {
  const targets = ir.entities
    .filter((entity) => ir.intents.some((intent) => intent.target === entity.id && protocolOf(intent) !== undefined))
    .sort((left, right) => left.id.localeCompare(right.id));
  const searches = ir.intents.filter((intent) => intent.schema === "system.searchInApp" && intent.handler !== undefined);
  const opens = ir.intents.filter((intent) => protocolOf(intent) === "open");
  if (targets.length === 0 && searches.length === 0) {
    throw new Error("IL1501: An adapter template needs a system schema intent with a target entity or a search handler.");
  }
  const blocks = targets.map((entity) => {
    const typeName = `IntentLane${entity.swiftName}Entity`;
    const resolverName = `IntentLane${entity.swiftName}Resolver`;
    const implementationName = `IntentLane${entity.swiftName}ResolverImplementation`;
    const camelName = `${entity.swiftName.slice(0, 1).toLowerCase()}${entity.swiftName.slice(1)}`;
    return `actor ${implementationName}: ${resolverName} {
  func ${camelName}Entities(for identifiers: [String]) async throws -> [${typeName}] {
    // TODO: Map stable application identifiers to ${typeName} values.
    // Return only exact matches. Unknown identifiers must return no entity.
    return []
  }

  func ${camelName}Entities(matching string: String) async throws -> [${typeName}] {
    // TODO: Resolve a spoken or typed name against user-approved records.
    // Match display names case-insensitively; an unknown name must return no entity.
    return []
  }

  func suggested${entity.swiftName}Entities() async throws -> [${typeName}] {
    // TODO: Return only user-approved, searchable application records.
    return []
  }
}

@MainActor
enum IntentLane${entity.swiftName}Integration {
  static func register() {
    IntentLaneEntityResolvers.${entity.id} = ${implementationName}()
  }

  static func index(_ entities: [${typeName}]) async throws {
    // Call after a committed create or update, not merely when the app launches.
    try await CSSearchableIndex(name: ${swiftString(`${ir.app.id}.${entity.id}`)}).indexAppEntities(entities)
  }

  static func remove(identifiers: [String]) async throws {
    // Call with the exact stable identifiers when records become unavailable.
    try await CSSearchableIndex(name: ${swiftString(`${ir.app.id}.${entity.id}`)}).deleteAppEntities(identifiedBy: identifiers, ofType: ${typeName}.self)
  }
}`;
  });
  const searchBlocks = searches.map((intent) => {
    const handler = nativeHandlerName(intent);
    return `actor IntentLane${intent.swiftName}Implementation: ${handler} {
  func perform(criteria: StringSearchCriteria) async throws {
    // TODO: Route the existing in-app search UI with criteria.term.
    // Do not open a record here: a query with no exact match must open nothing.
  }
}

@MainActor
enum IntentLane${intent.swiftName}Integration {
  static func register() {
    IntentLaneIntentHandlers.${intent.id} = IntentLane${intent.swiftName}Implementation()
  }
}`;
  });
  const openBlocks = opens.map((intent) => {
    const entity = targetEntity(ir, intent);
    const typeName = `IntentLane${entity.swiftName}Entity`;
    const handler = openHandlerName(intent);
    return `actor IntentLane${intent.swiftName}Implementation: ${handler} {
  func perform(target: ${typeName}) async throws {
    // TODO: Navigate to the exact application record represented by target.id.
    // Run UI work on the main actor. If target.id is unknown or unavailable, throw;
    // never substitute a similarly named record or silently open a generic screen.
  }
}

@MainActor
enum IntentLane${intent.swiftName}Integration {
  static func register() {
    IntentLaneIntentHandlers.${intent.id} = IntentLane${intent.swiftName}Implementation()
  }
}`;
  });
  return `// IntentLane adapter template. This file belongs to the application; fill the TODOs and keep it out of generated output.\n// It deliberately contains no App Shortcuts registration.\n\nimport AppIntents\nimport CoreSpotlight\nimport Foundation\n\n${[...blocks, ...openBlocks, ...searchBlocks].join("\n\n")}\n`;
}

export function generatedFileHash(contents: string): string {
  return createHash("sha256").update(contents).digest("hex");
}

function stringsQuoted(value: string): string {
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
  return `"${escaped}"`;
}

function stringsEntries(ir: ConfigIR, locale: string): readonly (readonly [string, string])[] {
  const fallback = defaultLocale(ir);
  const entries = new Map<string, string>();
  const consider = (values: LocalizedText | undefined): void => {
    if (!values) return;
    const key = localized(values, fallback);
    const translation = localized(values, locale);
    if (key.length === 0 || translation === key || entries.has(key)) return;
    entries.set(key, translation);
  };
  for (const entity of ir.entities) consider(entity.title);
  for (const intent of ir.intents) {
    consider(intent.title);
    consider(intent.description);
    consider(intent.risk?.confirmationPrompt);
    consider(intent.dialog);
    for (const parameter of intent.parameters) {
      consider(parameter.title);
      consider(parameter.prompt);
      for (const labels of Object.values(parameter.values ?? {})) consider(labels);
    }
  }
  return [...entries.entries()];
}

export function generateStrings(ir: ConfigIR, locale: string): string {
  const lines = stringsEntries(ir, locale).map(([key, value]) => `${stringsQuoted(key)} = ${stringsQuoted(value)};`);
  return lines.length === 0 ? `${STRINGS_BANNER}\n` : `${STRINGS_BANNER}\n${lines.join("\n")}\n`;
}

export type GeneratedArtifact = Readonly<{ path: string; contents: string }>;

const comparePaths = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0);

export function generateArtifacts(ir: ConfigIR): readonly GeneratedArtifact[] {
  const fallback = defaultLocale(ir);
  const artifacts: GeneratedArtifact[] = [{ path: GENERATED_SWIFT_FILE, contents: generateSwift(ir) }];
  for (const locale of ir.app.locales) {
    if (locale === fallback) continue;
    artifacts.push({ path: `${locale}.lproj/${STRING_TABLE}.strings`, contents: generateStrings(ir, locale) });
  }
  return artifacts.sort((left, right) => comparePaths(left.path, right.path));
}
