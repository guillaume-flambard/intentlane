import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { ZodError } from "zod";
import { intentLaneConfigSchema, type IntentLaneConfig, type ParameterType } from "../../schema/src/index.js";

export type Severity = "error" | "warning";
export type DiagnosticCode = "IL1001" | "IL1101" | "IL1201" | "IL1301" | "IL1401" | "IL1501" | "IL1601";
export type Diagnostic = { code: DiagnosticCode; severity: Severity; message: string; path: string };
export type LocalizedText = Readonly<Record<string, string>>;
export type ParameterIR = Readonly<{ id: string; type: ParameterType; required: boolean; prompt?: LocalizedText }>;
export type IntentIR = Readonly<{
  id: string;
  swiftName: string;
  title: LocalizedText;
  description?: LocalizedText;
  parameters: readonly ParameterIR[];
  route: string;
  mapping: Readonly<Record<string, string>>;
  dialog?: LocalizedText;
  phrases: Readonly<Record<string, readonly string[]>>;
}>;
export type ConfigIR = Readonly<{
  schemaVersion: "0.1";
  app: Readonly<{ id: string; name: string; urlScheme: string; minIos: string; locales: readonly string[] }>;
  intents: readonly IntentIR[];
  entities: IntentLaneConfig["entities"];
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

function semanticDiagnostics(config: IntentLaneConfig): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const swiftNames = new Set<string>();
  for (const [index, intent] of config.intents.entries()) {
    const path = `intents[${index}]`;
    diagnostics.push(...localizedDiagnostics(intent.title, config.app.locales, `${path}.title`));
    diagnostics.push(...localizedDiagnostics(intent.description, config.app.locales, `${path}.description`));
    diagnostics.push(...localizedDiagnostics(intent.result?.dialog, config.app.locales, `${path}.result.dialog`));
    for (const [parameterIndex, parameter] of intent.parameters.entries()) {
      diagnostics.push(...localizedDiagnostics(parameter.prompt, config.app.locales, `${path}.parameters[${parameterIndex}].prompt`));
    }
    const name = swiftName(intent.id);
    if (swiftNames.has(name)) diagnostics.push(error("IL1601", `Swift type name '${name}' collides with another intent.`, `${path}.id`));
    swiftNames.add(name);
    if (intent.execution.mode === "open_app") {
      if (!intent.execution.route?.startsWith("/")) diagnostics.push(error("IL1301", "open_app execution requires a route beginning with '/'.", `${path}.execution.route`));
      for (const [target, source] of Object.entries(intent.execution.mapping ?? {})) {
        if (!intent.parameters.some((parameter) => parameter.id === source)) diagnostics.push(error("IL1301", `Mapping '${target}' references unknown parameter '${source}'.`, `${path}.execution.mapping.${target}`));
      }
    }
    if (intent.risk?.level === "destructive" && intent.risk.confirmation !== "always") diagnostics.push(error("IL1501", "Destructive intents require confirmation: always.", `${path}.risk.confirmation`));
  }
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
    entities: parsed.data.entities,
    intents: parsed.data.intents.map((intent) => ({
      id: intent.id,
      swiftName: swiftName(intent.id),
      title: intent.title,
      ...(intent.description ? { description: intent.description } : {}),
      parameters: intent.parameters.map((parameter) => ({
        id: parameter.id,
        type: parameter.type,
        required: parameter.required,
        ...(parameter.prompt ? { prompt: parameter.prompt } : {})
      })),
      route: intent.execution.route ?? "",
      mapping: intent.execution.mapping ?? {},
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
        : { id: "schema", status: "error", message: `Schema version "${facts.schemaVersion ?? "unknown"}" is not supported.`, hint: "Run 'intentlane migrate'." }
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
