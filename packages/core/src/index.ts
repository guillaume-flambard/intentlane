import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { ZodError } from "zod";
import { intentLaneConfigSchema, type IntentLaneConfig, type ParameterType } from "../../schema/src/index.js";
import { APP_SCHEMA_DOMAINS, findAppSchema, isKnownSchemaReference, type AppSchemaKind } from "./app-schemas.js";

export * from "./audit.js";
export * from "./audit-project.js";
export * from "./audit-architecture.js";
export * from "./audit-conditions.js";
export * from "./audit-data.js";
export * from "./audit-quality.js";
export * from "./audit-route.js";
export * from "./audit-catalogue.js";
export * from "./audit-detect.js";
export * from "./audit-diff.js";
export * from "./audit-format.js";
export * from "./audit-run.js";
export * from "./audit-sdk.js";
export * from "./audit-score.js";
export * from "./audit-targets.js";
export * from "./pilot-ledger.js";
export * from "./app-schemas.js";

export type Severity = "error" | "warning";
export const DIAGNOSTIC_CODES = [
  "IL1001",
  "IL1101",
  "IL1201",
  "IL1301",
  "IL1401",
  "IL1501",
  "IL1601",
  "IL1701"
] as const;
export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];
export type Diagnostic = { code: DiagnosticCode; severity: Severity; message: string; path: string };
export type LocalizedText = Readonly<Record<string, string>>;
export type ParameterIR = Readonly<{
  id: string;
  type: ParameterType;
  required: boolean;
  title?: LocalizedText;
  prompt?: LocalizedText;
  values?: Readonly<Record<string, LocalizedText>>;
  entity?: string;
}>;
export type RiskIR = Readonly<{
  level: "read" | "write" | "sensitive" | "destructive";
  confirmation: "never" | "optional" | "always";
  authentication: "none" | "inherited" | "required";
  confirmationPrompt?: LocalizedText;
}>;
export type IntentIR = Readonly<{
  id: string;
  swiftName: string;
  schema?: string;
  target?: string;
  title: LocalizedText;
  description?: LocalizedText;
  parameters: readonly ParameterIR[];
  mode: "open_app" | "native";
  route: string;
  mapping: Readonly<Record<string, string>>;
  handler?: string;
  returns?: string;
  risk?: RiskIR;
  dialog?: LocalizedText;
  phrases: Readonly<Record<string, readonly string[]>>;
}>;
export type EntityIR = Readonly<{
  id: string;
  swiftName: string;
  schema?: string;
  title: LocalizedText;
  identifier: string;
  displayTitle: string;
  displaySubtitle?: string;
}>;
export type ConfigIR = Readonly<{
  schemaVersion: "0.1";
  app: Readonly<{ id: string; name: string; urlScheme: string; minIos: string; locales: readonly string[] }>;
  intents: readonly IntentIR[];
  entities: readonly EntityIR[];
}>;
export type ParseResult = Readonly<{ ir?: ConfigIR; diagnostics: readonly Diagnostic[] }>;

const error = (code: DiagnosticCode, message: string, path: string): Diagnostic => ({ code, severity: "error", message, path });
const warning = (code: DiagnosticCode, message: string, path: string): Diagnostic => ({ code, severity: "warning", message, path });

function swiftName(id: string): string {
  return id.split("_").map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`).join("");
}

function localizedDiagnostics(value: LocalizedText | undefined, locales: readonly string[], path: string): Diagnostic[] {
  if (!value) return [];
  const fallback = locales[0];
  if (!fallback) return [];
  const diagnostics: Diagnostic[] = [];
  if (!value[fallback]) diagnostics.push(error("IL1201", `Missing translation for default locale '${fallback}'.`, path));
  for (const locale of locales) {
    if (!value[locale]) diagnostics.push(warning("IL1201", `Missing translation for locale '${locale}'.`, path));
  }
  return diagnostics;
}

function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

const SCHEMA_REFERENCE_PATTERN = /^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/;

function unavailableSchemaMessage(kind: AppSchemaKind, reference: string): string {
  if (findAppSchema(kind === "intent" ? "entity" : "intent", reference)) {
    return `Schema '${reference}' is an App Schema of the other kind, so it cannot be used here.`;
  }
  if (isKnownSchemaReference(reference)) {
    const shape =
      kind === "intent"
        ? "IntentLane only conforms an intent whose schema declares no parameter, no return value and no system protocol"
        : "IntentLane only conforms an entity whose schema requires at most two string properties";
    return `Schema '${reference}' is known to Xcode 27, but IntentLane cannot conform to it: ${shape}.`;
  }
  return `Schema '${reference}' is not an App Schema known to Xcode 27. Domains: ${APP_SCHEMA_DOMAINS.join(", ")}.`;
}

function schemaDiagnostics(config: IntentLaneConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const entityIds = new Set(config.entities.map((entity) => entity.id));
  for (const [index, entity] of config.entities.entries()) {
    const reference = entity.schema;
    if (!reference) continue;
    const path = `entities[${index}].schema`;
    if (!SCHEMA_REFERENCE_PATTERN.test(reference)) {
      diagnostics.push(error("IL1401", `Schema '${reference}' is not a 'domain.member' reference.`, path));
      continue;
    }
    const entry = findAppSchema("entity", reference);
    if (!entry) {
      diagnostics.push(error("IL1401", unavailableSchemaMessage("entity", reference), path));
      continue;
    }
    const declared = [entity.display.title, entity.display.subtitle].filter((name): name is string => Boolean(name));
    if (!entry.properties.every((name, position) => declared[position] === name)) {
      const expected = entry.properties.map((name) => `'${name}'`).join(", ");
      diagnostics.push(error("IL1401", `Schema '${reference}' requires the properties ${expected}, declared in that order as display.title then display.subtitle.`, path));
    }
    if (compareVersions(config.app.min_ios, `${entry.minIos}.0`) < 0) {
      diagnostics.push(error("IL1401", `Schema '${reference}' requires iOS ${entry.minIos} or newer, and the app declares min_ios: ${config.app.min_ios}.`, path));
    }
  }
  for (const [index, intent] of config.intents.entries()) {
    const reference = intent.schema;
    if (!reference) continue;
    const path = `intents[${index}].schema`;
    if (!SCHEMA_REFERENCE_PATTERN.test(reference)) {
      diagnostics.push(error("IL1401", `Schema '${reference}' is not a 'domain.member' reference.`, path));
      continue;
    }
    const entry = findAppSchema("intent", reference);
    if (!entry) {
      diagnostics.push(error("IL1401", unavailableSchemaMessage("intent", reference), path));
      continue;
    }
    const intentPath = path.slice(0, -".schema".length);
    if (entry.protocol) {
      if (!intent.target) {
        diagnostics.push(error("IL1401", `Schema '${reference}' declares a '${entry.protocol}' action, so intent '${intent.id}' must name the entity it acts on with 'target'.`, `${intentPath}.target`));
      } else if (!entityIds.has(intent.target)) {
        diagnostics.push(error("IL1401", `Schema '${reference}' target references unknown entity '${intent.target}'.`, `${intentPath}.target`));
      }
      if (intent.execution.mode !== "native") {
        diagnostics.push(error("IL1401", `Schema '${reference}' declares an action, so intent '${intent.id}' must use native execution.`, `${intentPath}.execution.mode`));
      }
      if (intent.parameters.length > 0) {
        diagnostics.push(error("IL1401", `Schema '${reference}' supplies its own parameters, so intent '${intent.id}' must declare none.`, `${intentPath}.parameters`));
      }
      if (intent.result !== undefined) {
        diagnostics.push(error("IL1401", `Schema '${reference}' supplies its own result, so intent '${intent.id}' must not declare one.`, `${intentPath}.result`));
      }
    } else if (entry.parameters.length > 0) {
      if (!intent.target) {
        diagnostics.push(error("IL1401", `Schema '${reference}' takes parameters, so intent '${intent.id}' must name the entity it acts on with 'target'.`, `${intentPath}.target`));
      } else if (!entityIds.has(intent.target)) {
        diagnostics.push(error("IL1401", `Schema '${reference}' target references unknown entity '${intent.target}'.`, `${intentPath}.target`));
      }
      if (intent.execution.mode !== "native") {
        diagnostics.push(error("IL1401", `Schema '${reference}' takes parameters, so intent '${intent.id}' must use native execution with a handler.`, `${intentPath}.execution.mode`));
      }
      if (intent.result !== undefined) {
        diagnostics.push(error("IL1401", `Schema '${reference}' supplies its own result, so intent '${intent.id}' must not declare one.`, `${intentPath}.result`));
      }
    } else {
      if (intent.target !== undefined) {
        diagnostics.push(error("IL1401", `Schema '${reference}' declares no action, so intent '${intent.id}' must not name a target.`, `${intentPath}.target`));
      }
      if (intent.parameters.length > 0) {
        diagnostics.push(error("IL1401", `Schema '${reference}' supplies its own parameters, so intent '${intent.id}' must declare none.`, `${intentPath}.parameters`));
      }
      if (intent.result?.returns !== undefined) {
        diagnostics.push(error("IL1401", `Schema '${reference}' declares no return value, so intent '${intent.id}' must not declare result.returns.`, `${intentPath}.result.returns`));
      }
    }
    if (compareVersions(config.app.min_ios, `${entry.minIos}.0`) < 0) {
      diagnostics.push(error("IL1401", `Schema '${reference}' requires iOS ${entry.minIos} or newer, and the app declares min_ios: ${config.app.min_ios}.`, path));
    }
  }
  return diagnostics;
}

function semanticDiagnostics(config: IntentLaneConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const entityIds = new Set<string>();
  const entityNames = new Set<string>();
  for (const [index, entity] of config.entities.entries()) {
    const path = `entities[${index}]`;
    diagnostics.push(...localizedDiagnostics(entity.title, config.app.locales, `${path}.title`));
    if (entityIds.has(entity.id)) diagnostics.push(error("IL1601", `Entity id '${entity.id}' is declared twice.`, `${path}.id`));
    entityIds.add(entity.id);
    const entityName = swiftName(entity.id);
    if (entityNames.has(entityName)) diagnostics.push(error("IL1601", `Swift type name '${entityName}' collides with another entity.`, `${path}.id`));
    entityNames.add(entityName);
    if (entity.query.mode === "endpoint") diagnostics.push(error("IL1401", `Entity '${entity.id}' declares an endpoint query, which is not generated yet. Use a static query and provide the data through the resolver protocol.`, `${path}.query.mode`));
  }
  const swiftNames = new Set<string>();
  const handlerNames = new Set<string>();
  for (const [index, intent] of config.intents.entries()) {
    const path = `intents[${index}]`;
    diagnostics.push(...localizedDiagnostics(intent.title, config.app.locales, `${path}.title`));
    diagnostics.push(...localizedDiagnostics(intent.description, config.app.locales, `${path}.description`));
    diagnostics.push(...localizedDiagnostics(intent.result?.dialog, config.app.locales, `${path}.result.dialog`));
    for (const [parameterIndex, parameter] of intent.parameters.entries()) {
      const parameterPath = `${path}.parameters[${parameterIndex}]`;
      diagnostics.push(...localizedDiagnostics(parameter.title, config.app.locales, `${parameterPath}.title`));
      diagnostics.push(...localizedDiagnostics(parameter.prompt, config.app.locales, `${parameterPath}.prompt`));
      for (const [value, labels] of Object.entries(parameter.values ?? {})) {
        diagnostics.push(...localizedDiagnostics(labels, config.app.locales, `${parameterPath}.values.${value}`));
      }
      const isEntityType = parameter.type === "entity" || parameter.type === "entity_list";
      if (isEntityType && !parameter.entity) diagnostics.push(error("IL1301", `Entity parameter '${parameter.id}' must reference an entity with 'entity'.`, `${parameterPath}.entity`));
      if (isEntityType && parameter.entity && !entityIds.has(parameter.entity)) diagnostics.push(error("IL1301", `Entity parameter '${parameter.id}' references unknown entity '${parameter.entity}'.`, `${parameterPath}.entity`));
      if (!isEntityType && parameter.entity) diagnostics.push(error("IL1301", `Parameter '${parameter.id}' declares an entity reference but its type is '${parameter.type}'.`, `${parameterPath}.entity`));
      if (parameter.type === "enum" && Object.keys(parameter.values ?? {}).length === 0) diagnostics.push(error("IL1301", `Enum parameter '${parameter.id}' must declare at least one value.`, `${parameterPath}.values`));
      if (parameter.type !== "enum" && parameter.values) diagnostics.push(error("IL1301", `Parameter '${parameter.id}' declares values but its type is '${parameter.type}'.`, `${parameterPath}.values`));
    }
    const name = swiftName(intent.id);
    if (swiftNames.has(name)) diagnostics.push(error("IL1601", `Swift type name '${name}' collides with another intent.`, `${path}.id`));
    swiftNames.add(name);
    if (intent.execution.mode === "open_app") {
      if (!intent.execution.route?.startsWith("/")) diagnostics.push(error("IL1301", "open_app execution requires a route beginning with '/'.", `${path}.execution.route`));
      for (const [target, source] of Object.entries(intent.execution.mapping ?? {})) {
        if (!intent.parameters.some((parameter) => parameter.id === source)) diagnostics.push(error("IL1301", `Mapping '${target}' references unknown parameter '${source}'.`, `${path}.execution.mapping.${target}`));
      }
      if (intent.execution.handler !== undefined) diagnostics.push(error("IL1301", "handler requires native execution.", `${path}.execution.handler`));
    }
    if (intent.execution.mode === "native") {
      const handler = intent.execution.handler;
      const protocol = intent.schema ? findAppSchema("intent", intent.schema)?.protocol : undefined;
      if (!handler && protocol !== "open") {
        diagnostics.push(error("IL1301", "native execution requires a handler naming the Swift type the app implements.", `${path}.execution.handler`));
      } else if (handler) {
        if (!/^[A-Z][A-Za-z0-9]*$/.test(handler)) diagnostics.push(error("IL1301", `Handler '${handler}' must be a Swift type name.`, `${path}.execution.handler`));
        if (handlerNames.has(handler)) diagnostics.push(error("IL1601", `Handler '${handler}' is declared by more than one intent.`, `${path}.execution.handler`));
        handlerNames.add(handler);
      }
      if (intent.execution.route !== undefined) diagnostics.push(error("IL1301", "native execution must not declare a route.", `${path}.execution.route`));
      if (intent.execution.mapping !== undefined) diagnostics.push(error("IL1301", "native execution must not declare a mapping.", `${path}.execution.mapping`));
    }
    if (intent.execution.mode === "http") diagnostics.push(error("IL1401", "http execution is not generated yet.", `${path}.execution.mode`));
    if (intent.result?.returns !== undefined) {
      if (intent.execution.mode !== "native") diagnostics.push(error("IL1301", "result.returns requires native execution.", `${path}.result.returns`));
      else if (!entityIds.has(intent.result.returns)) diagnostics.push(error("IL1301", `result.returns references unknown entity '${intent.result.returns}'.`, `${path}.result.returns`));
    }
    if (intent.risk?.level === "destructive" && intent.risk.confirmation !== "always") diagnostics.push(error("IL1501", "Destructive intents require confirmation: always.", `${path}.risk.confirmation`));
    diagnostics.push(...localizedDiagnostics(intent.risk?.confirmation_prompt, config.app.locales, `${path}.risk.confirmation_prompt`));
  }
  diagnostics.push(...schemaDiagnostics(config));
  return diagnostics;
}

function zodDiagnostics(zodError: ZodError): Diagnostic[] {
  return zodError.issues.map((issue) => {
    const path = issue.path.join(".") || "root";
    const code: DiagnosticCode = path === "schema" ? "IL1001" : issue.code === "invalid_string" ? "IL1101" : "IL1301";
    return error(code, issue.message, path);
  });
}

export function parseConfig(value: unknown): ParseResult {
  const parsed = intentLaneConfigSchema.safeParse(value);
  if (!parsed.success) return { diagnostics: zodDiagnostics(parsed.error) };
  const diagnostics = semanticDiagnostics(parsed.data);
  if (diagnostics.some((item) => item.severity === "error")) return { diagnostics };
  const ir: ConfigIR = {
    schemaVersion: parsed.data.schema,
    app: { id: parsed.data.app.id, name: parsed.data.app.name, urlScheme: parsed.data.app.url_scheme, minIos: parsed.data.app.min_ios, locales: [...parsed.data.app.locales] },
    entities: [...parsed.data.entities].sort((left, right) => left.id.localeCompare(right.id)).map((entity) => ({
      id: entity.id,
      swiftName: swiftName(entity.id),
      ...(entity.schema ? { schema: entity.schema } : {}),
      title: entity.title,
      identifier: entity.identifier,
      displayTitle: entity.display.title,
      ...(entity.display.subtitle ? { displaySubtitle: entity.display.subtitle } : {})
    })),
    intents: parsed.data.intents.map((intent) => ({
      id: intent.id,
      swiftName: swiftName(intent.id),
      ...(intent.schema ? { schema: intent.schema } : {}),
      ...(intent.target ? { target: intent.target } : {}),
      title: intent.title,
      ...(intent.description ? { description: intent.description } : {}),
      parameters: intent.parameters.map((parameter) => ({
        id: parameter.id,
        type: parameter.type,
        required: parameter.required,
        ...(parameter.title ? { title: parameter.title } : {}),
        ...(parameter.prompt ? { prompt: parameter.prompt } : {}),
        ...(parameter.values ? { values: parameter.values } : {}),
        ...(parameter.entity ? { entity: parameter.entity } : {})
      })),
      mode: intent.execution.mode === "native" ? ("native" as const) : ("open_app" as const),
      route: intent.execution.route ?? "",
      mapping: intent.execution.mapping ?? {},
      ...(intent.execution.handler ? { handler: intent.execution.handler } : {}),
      ...(intent.result?.returns ? { returns: intent.result.returns } : {}),
      ...(intent.risk
        ? {
            risk: {
              level: intent.risk.level,
              confirmation: intent.risk.confirmation,
              authentication: intent.risk.authentication,
              ...(intent.risk.confirmation_prompt ? { confirmationPrompt: intent.risk.confirmation_prompt } : {})
            }
          }
        : {}),
      ...(intent.result?.dialog ? { dialog: intent.result.dialog } : {}),
      phrases: intent.shortcuts?.phrases ?? {}
    })).sort((left, right) => left.id.localeCompare(right.id))
  };
  return { ir, diagnostics };
}

export async function parseConfigFile(file: string): Promise<ParseResult> {
  const source = await readFile(file, "utf8");
  return parseConfig(parse(source) as unknown);
}

export type ScaffoldInput = Readonly<{ appId: string; appName: string; urlScheme: string }>;

function yamlDoubleQuoted(value: string): string {
  return JSON.stringify(value);
}

export function scaffoldConfig(input: ScaffoldInput): string {
  return [
    'schema: "0.1"',
    "app:",
    `  id: ${yamlDoubleQuoted(input.appId)}`,
    `  name: ${yamlDoubleQuoted(input.appName)}`,
    `  url_scheme: ${yamlDoubleQuoted(input.urlScheme)}`,
    '  min_ios: "18.0"',
    "  locales: [en]",
    "",
    "intents:",
    "  - id: open_home",
    "    title:",
    "      en: Open home",
    "    description:",
    "      en: Open the home screen",
    "    parameters: []",
    "    execution:",
    "      mode: open_app",
    "      route: /",
    "",
    "  - id: create_note",
    "    title:",
    "      en: Create a note",
    "    description:",
    "      en: Add a new note",
    "    parameters:",
    "      - id: title",
    "        type: string",
    "        required: true",
    "        prompt:",
    "          en: What is the note?",
    "    execution:",
    "      mode: open_app",
    "      route: /notes/new",
    "      mapping:",
    "        title: title",
    "    risk:",
    "      level: write",
    "      confirmation: optional",
    "      authentication: inherited",
    "    shortcuts:",
    "      phrases:",
    "        en:",
    "          - Create a note in ${appName}",
    ""
  ].join("\n");
}

function slug(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return normalized.length > 0 ? normalized : "app";
}

export function deriveScaffoldDefaults(input: { directoryName: string; packageName?: string }): ScaffoldInput {
  const base = input.packageName ?? input.directoryName;
  const identifier = slug(input.directoryName);
  const words = base.split(/[^A-Za-z0-9]+/).filter((word) => word.length > 0);
  const appName = words.length > 0 ? words.map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`).join(" ") : "My App";
  return { appId: `com.example.${identifier}`, appName, urlScheme: identifier };
}

export type DoctorStatus = "ok" | "warning" | "error";
export type DoctorCheck = Readonly<{ id: string; status: DoctorStatus; message: string; hint?: string }>;
export type DoctorFacts = Readonly<{
  nodeVersion: string;
  configFile: string;
  configExists: boolean;
  diagnostics: readonly Diagnostic[];
  schemaVersion?: string;
  intentCount?: number;
  generatedStatus: "fresh" | "stale" | "missing";
  platform: string;
  xcrunAvailable: boolean;
  swiftcAvailable: boolean;
  pluginDeclared: boolean;
}>;

const MINIMUM_NODE_MAJOR = 22;

export function collectDoctorChecks(facts: DoctorFacts): readonly DoctorCheck[] {
  const checks: DoctorCheck[] = [];

  const nodeMajor = Number.parseInt(facts.nodeVersion.replace(/^v/, "").split(".")[0] ?? "", 10);
  checks.push(
    Number.isFinite(nodeMajor) && nodeMajor >= MINIMUM_NODE_MAJOR
      ? { id: "node", status: "ok", message: `Node ${facts.nodeVersion} (>= ${MINIMUM_NODE_MAJOR} required).` }
      : { id: "node", status: "error", message: `Node ${facts.nodeVersion} is too old.`, hint: `Install Node ${MINIMUM_NODE_MAJOR} or newer.` }
  );

  const errors = facts.diagnostics.filter((item) => item.severity === "error");
  if (!facts.configExists) {
    checks.push({ id: "config", status: "error", message: `No IntentLane configuration at ${facts.configFile}.`, hint: "Run 'intentlane init'." });
  } else if (errors.length > 0) {
    checks.push({ id: "config", status: "error", message: `${facts.configFile} has ${errors.length} error(s).`, hint: "Run 'intentlane validate' for details." });
  } else {
    checks.push({ id: "config", status: "ok", message: `${facts.configFile} is valid (${facts.intentCount ?? 0} intent(s)).` });
  }

  if (facts.configExists && errors.length === 0) {
    checks.push(
      facts.schemaVersion === "0.1"
        ? { id: "schema", status: "ok", message: 'Schema version "0.1" is supported.' }
        : { id: "schema", status: "error", message: `Schema version "${facts.schemaVersion ?? "unknown"}" is not supported.`, hint: "See MIGRATION.md. 'intentlane migrate' is not implemented yet." }
    );
  }

  checks.push(
    facts.generatedStatus === "fresh"
      ? { id: "generated", status: "ok", message: "Generated Swift is up to date." }
      : {
          id: "generated",
          status: "warning",
          message: facts.generatedStatus === "missing" ? "No generated Swift found." : "Generated Swift is stale.",
          hint: "Run 'intentlane generate'."
        }
  );

  if (facts.platform !== "darwin") {
    checks.push({ id: "xcode", status: "warning", message: `Skipped on ${facts.platform}: iOS toolchain requires macOS.` });
  } else if (facts.xcrunAvailable && facts.swiftcAvailable) {
    checks.push({ id: "xcode", status: "ok", message: "Swift toolchain found via xcrun." });
  } else {
    const missing = [!facts.xcrunAvailable ? "xcrun" : undefined, !facts.swiftcAvailable ? "swiftc" : undefined].filter((value): value is string => Boolean(value));
    checks.push({ id: "xcode", status: "error", message: `Missing iOS toolchain command(s): ${missing.join(", ")}.`, hint: "Install Xcode and run 'xcode-select --install'." });
  }

  checks.push(
    facts.pluginDeclared
      ? { id: "plugin", status: "ok", message: "Expo config plugin is declared." }
      : { id: "plugin", status: "warning", message: "Expo config plugin is not declared in package.json.", hint: "Add '@intentlane/expo' to your app config plugins." }
  );

  return checks;
}
