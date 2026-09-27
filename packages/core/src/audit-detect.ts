import type { AuditEvidenceKind } from "./audit.js";

export type AuditSourceFile = Readonly<{ path: string; contents: string }>;

export type AuditDetection = Readonly<{
  capability: string;
  path: string;
  line: number;
  kind: AuditEvidenceKind;
}>;

type Signature = Readonly<{ capability: string; pattern: RegExp; kind: AuditEvidenceKind }>;

/**
 * A conformance, anywhere in a conformance list. A Swift type can conform to a
 * second protocol after a comma, so `struct Card: IntentResult, ShowsSnippetView`
 * declares the same conformance as `struct Card: ShowsSnippetView`. The pattern
 * stops at `{` and `=`, which keeps a use inside a body or an annotation from
 * reading as a declaration.
 */
function conforms(symbol: string): RegExp {
  return new RegExp(`:[^{=\\n]*\\b${symbol}\\b`);
}

const SIGNATURES: readonly Signature[] = [
  { capability: "foundation.app-intent", pattern: /:\s*AppIntent\b/, kind: "swift" },
  { capability: "foundation.shortcuts-provider", pattern: /:\s*AppShortcutsProvider\b/, kind: "swift" },
  { capability: "proof.shortcuts-surface", pattern: /:\s*AppShortcutsProvider\b/, kind: "swift" },
  { capability: "semantics.schema-intent", pattern: /@AppIntent\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "semantics.schema-entity", pattern: /@AppEntity\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "semantics.schema-enum", pattern: /@AppEnum\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "semantics.app-schema", pattern: /@App(?:Intent|Entity|Enum)\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "discovery.entity-query", pattern: /:\s*EntityQuery\b/, kind: "swift" },
  { capability: "entity.transient", pattern: conforms("TransientAppEntity"), kind: "swift" },
  { capability: "entity.file", pattern: conforms("FileEntity"), kind: "swift" },
  { capability: "entity.unique", pattern: conforms("UniqueAppEntity"), kind: "swift" },
  { capability: "entity.url-representation", pattern: conforms("URLRepresentableEntity"), kind: "swift" },
  { capability: "entity.ownership", pattern: conforms("OwnershipProvidingEntity"), kind: "swift" },
  { capability: "entity.collection", pattern: conforms("EntityCollection"), kind: "swift" },
  { capability: "models.system-language-model", pattern: /\bSystemLanguageModel\b/, kind: "swift" },
  { capability: "models.language-model", pattern: conforms("LanguageModel"), kind: "swift" },
  { capability: "models.dynamic-profile", pattern: conforms("DynamicProfile"), kind: "swift" },
  { capability: "models.private-cloud", pattern: /\bPrivateCloudComputeLanguageModel\b/, kind: "swift" },
  { capability: "models.image-input", pattern: conforms("ImageAttachmentContent"), kind: "swift" },
  { capability: "models.generation-options", pattern: /\bGenerationOptions\b/, kind: "swift" },
  { capability: "models.tool", pattern: conforms("Tool"), kind: "swift" },
  { capability: "models.ocr-tool", pattern: conforms("OCRTool"), kind: "swift" },
  { capability: "models.spotlight-tool", pattern: conforms("SpotlightSearchTool"), kind: "swift" },
  { capability: "discovery.entity-property-query", pattern: conforms("EntityPropertyQuery"), kind: "swift" },
  { capability: "discovery.indexed-entity-query", pattern: conforms("IndexedEntityQuery"), kind: "swift" },
  { capability: "discovery.indexed-entity", pattern: /\bIndexedEntity\b/, kind: "swift" },
  { capability: "cross-app.transferable", pattern: /:\s*Transferable\b/, kind: "swift" },
  { capability: "parameters.rich-value", pattern: conforms("IntentValueRepresentation"), kind: "swift" },
  { capability: "parameters.union", pattern: conforms("AppUnionValue"), kind: "swift" },
  { capability: "execution.targets", pattern: conforms("IntentExecutionTargets"), kind: "swift" },
  { capability: "execution.snippet", pattern: conforms("SnippetIntent"), kind: "swift" },
  { capability: "execution.snippet-view", pattern: conforms("ShowsSnippetView"), kind: "swift" },
  { capability: "proof.app-intents-testing", pattern: /\bAppIntentsTesting\b/, kind: "test" }
];

export function detectSources(sources: readonly AuditSourceFile[]): readonly AuditDetection[] {
  const detections: AuditDetection[] = [];
  for (const source of sources) {
    const lines = source.contents.split("\n");
    for (const [index, line] of lines.entries()) {
      for (const signature of SIGNATURES) {
        if (signature.pattern.test(line)) {
          detections.push({
            capability: signature.capability,
            path: source.path,
            line: index + 1,
            kind: signature.kind
          });
        }
      }
    }
  }
  return detections;
}

export type AuditSchemaDomain = Readonly<{
  domain: string;
  intents: number;
  entities: number;
  path: string;
}>;

const DOMAIN_PATTERNS: readonly Readonly<{ kind: "intent" | "entity"; pattern: RegExp }>[] = [
  { kind: "intent", pattern: /@AppIntent\s*\(\s*schema\s*:\s*\.([a-zA-Z][a-zA-Z0-9]*)\s*\./ },
  { kind: "entity", pattern: /@AppEntity\s*\(\s*schema\s*:\s*\.([a-zA-Z][a-zA-Z0-9]*)\s*\./ }
];

export const SHORTCUTS_ONLY_SCHEMA_DOMAINS = [
  "books",
  "browser",
  "journal",
  "presentation",
  "reader",
  "spreadsheet",
  "whiteboard",
  "wordProcessor"
] as const;

export function isShortcutsOnlySchemaDomain(domain: string): boolean {
  return (SHORTCUTS_ONLY_SCHEMA_DOMAINS as readonly string[]).includes(domain);
}

export function detectSchemaDomains(sources: readonly AuditSourceFile[]): readonly AuditSchemaDomain[] {
  const counts = new Map<string, { intents: number; entities: number; path: string }>();
  for (const source of sources) {
    for (const line of source.contents.split("\n")) {
      for (const { kind, pattern } of DOMAIN_PATTERNS) {
        const match = pattern.exec(line);
        const domain = match?.[1];
        if (!domain) continue;
        const entry = counts.get(domain) ?? { intents: 0, entities: 0, path: source.path };
        if (kind === "intent") entry.intents += 1;
        else entry.entities += 1;
        counts.set(domain, entry);
      }
    }
  }
  return [...counts.entries()]
    .map(([domain, entry]) => ({ domain, intents: entry.intents, entities: entry.entities, path: entry.path }))
    .sort((left, right) => (left.domain < right.domain ? -1 : left.domain > right.domain ? 1 : 0));
}

export function completeSchemaDomains(domains: readonly AuditSchemaDomain[]): readonly AuditSchemaDomain[] {
  return domains.filter((domain) => domain.intents > 0 && domain.entities > 0);
}

export function partialSchemaDomains(domains: readonly AuditSchemaDomain[]): readonly AuditSchemaDomain[] {
  return domains.filter((domain) => domain.intents === 0 || domain.entities === 0);
}

/**
 * The execution targets the installed SDK declares on `IntentExecutionTargets`:
 * `default`, `main`, `appIntentsExtension` and `widgetKitExtension`. A name
 * outside this list is not a target the SDK declares, so a report must not
 * present it as one.
 */
export const INTENT_EXECUTION_TARGETS = ["default", "main", "appIntentsExtension", "widgetKitExtension"] as const;
export type IntentExecutionTarget = (typeof INTENT_EXECUTION_TARGETS)[number];

export function isIntentExecutionTarget(name: string): name is IntentExecutionTarget {
  return (INTENT_EXECUTION_TARGETS as readonly string[]).includes(name);
}

export type IntentExecutionScope = Readonly<{
  path: string;
  line: number;
  /** The SDK-declared targets the intent names, or `["default"]` when it names none. */
  targets: readonly IntentExecutionTarget[];
  /** Whether the intent restricts itself by naming at least one SDK-declared target. */
  restrictsTargets: boolean;
  /**
   * Whether the intent is reachable from the main process. `undefined` means no
   * verdict is possible: an intent that names no target inherits the SDK
   * default, and an intent whose body names no SDK target says nothing a reader
   * can judge. Returning a guess here would be a claim the SDK never made.
   */
  reachesMainProcess: boolean | undefined;
}>;

const EXECUTION_TARGET_DECLARATION = /allowedExecutionTargets\s*:\s*IntentExecutionTargets[^{]*\{([^}]*)\}/;
const LEADING_MEMBER_NAME = /\.([A-Za-z_][A-Za-z0-9_]*)/g;

export function detectExecutionTargets(sources: readonly AuditSourceFile[]): readonly IntentExecutionScope[] {
  const scopes: IntentExecutionScope[] = [];
  for (const source of sources) {
    const lines = source.contents.split("\n");
    for (const [index, line] of lines.entries()) {
      const body = EXECUTION_TARGET_DECLARATION.exec(line)?.[1];
      if (body === undefined) continue;
      const named = [...body.matchAll(LEADING_MEMBER_NAME)]
        .map((match) => match[1])
        .filter((name): name is IntentExecutionTarget => name !== undefined && isIntentExecutionTarget(name));
      const restrictsTargets = named.length > 0;
      scopes.push({
        path: source.path,
        line: index + 1,
        targets: restrictsTargets ? named : ["default"],
        restrictsTargets,
        reachesMainProcess: restrictsTargets ? named.some((target) => target === "main" || target === "default") : undefined
      });
    }
  }
  return scopes;
}

export function detectedCapabilities(detections: readonly AuditDetection[]): ReadonlySet<string> {
  return new Set(detections.map((detection) => detection.capability));
}

export function hasSchemaEvidence(detections: readonly AuditDetection[]): boolean {
  return detections.some((detection) => detection.capability.startsWith("semantics."));
}

export function evidenceFor(
  detections: readonly AuditDetection[],
  capability: string
): readonly AuditDetection[] {
  return detections.filter((detection) => detection.capability === capability);
}
