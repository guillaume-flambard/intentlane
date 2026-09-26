import type { AuditEvidenceKind } from "./audit.js";

export type AuditSourceFile = Readonly<{ path: string; contents: string }>;

export type AuditDetection = Readonly<{
  capability: string;
  path: string;
  line: number;
  kind: AuditEvidenceKind;
}>;

type Signature = Readonly<{ capability: string; pattern: RegExp; kind: AuditEvidenceKind }>;

const SIGNATURES: readonly Signature[] = [
  { capability: "foundation.app-intent", pattern: /:\s*AppIntent\b/, kind: "swift" },
  { capability: "foundation.shortcuts-provider", pattern: /:\s*AppShortcutsProvider\b/, kind: "swift" },
  { capability: "proof.shortcuts-surface", pattern: /:\s*AppShortcutsProvider\b/, kind: "swift" },
  { capability: "semantics.schema-intent", pattern: /@AppIntent\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "semantics.schema-entity", pattern: /@AppEntity\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "semantics.schema-enum", pattern: /@AppEnum\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "semantics.app-schema", pattern: /@App(?:Intent|Entity|Enum)\s*\(\s*schema\s*:/, kind: "swift" },
  { capability: "discovery.entity-query", pattern: /:\s*EntityQuery\b/, kind: "swift" },
  { capability: "discovery.indexed-entity", pattern: /\bIndexedEntity\b/, kind: "swift" },
  { capability: "cross-app.transferable", pattern: /:\s*Transferable\b/, kind: "swift" },
  { capability: "proof.app-intents-testing", pattern: /\bAppIntentsTesting\b/, kind: "test" },
  // `\b` is load-bearing on all three. `SystemLanguageModel` ends with
  // `LanguageModel`, and a pattern without a leading boundary would read the
  // concrete Apple class as a mention of the protocol, which is the difference
  // between "bound to Apple's model" and "abstracted behind the protocol".
  { capability: "models.system-language-model", pattern: /\bSystemLanguageModel\b/, kind: "swift" },
  { capability: "models.private-cloud-compute", pattern: /\bPrivateCloudComputeLanguageModel\b/, kind: "swift" },
  { capability: "models.language-model", pattern: /\bLanguageModel\b/, kind: "swift" },
  { capability: "models.image-input", pattern: /\bImageAttachmentContent\b/, kind: "swift" },
  { capability: "models.generation-options", pattern: /\bGenerationOptions\b/, kind: "swift" },
  { capability: "models.dynamic-profile", pattern: /\bDynamicProfile\b/, kind: "swift" },
  { capability: "models.ocr-tool", pattern: /\bOCRTool\b/, kind: "swift" },
  { capability: "models.spotlight-search-tool", pattern: /\bSpotlightSearchTool\b/, kind: "swift" }
];

/**
 * How an application reaches a model. This is a shape, not a score: it says which
 * door the code goes through, and it is derived only from which symbols the
 * source names.
 */
export const MODEL_BINDING_SHAPES = [
  "absent",
  "bound-apple-local",
  "bound-apple-cloud",
  "abstracted-third-party",
  "abstracted-over-apple"
] as const;
export type ModelBindingShape = (typeof MODEL_BINDING_SHAPES)[number];

export type ModelBinding = Readonly<{
  shape: ModelBindingShape;
  /** The app names `LanguageModel` as a type, so it can hold any conformer. */
  protocol: boolean;
  appleLocal: boolean;
  appleCloud: boolean;
}>;

/**
 * Distinguishes an app that abstracts behind the `LanguageModel` protocol from
 * one bound to a concrete Apple model, and a cloud escalation from a local call.
 *
 * The two are separate axes on purpose. An app can abstract behind the protocol
 * *and* name `SystemLanguageModel` as its default, which is local-first with a
 * seam for another provider, and calling that "mixed" would throw away the most
 * interesting thing about it. So the axes are reported as they are, and the
 * shape is derived from them: abstracted over a non-Apple model is the only shape
 * that says the app is not locked to Apple's, and it is the one an audit client
 * pays to be told.
 */
export function describeModelBinding(sources: readonly AuditSourceFile[]): ModelBinding {
  const text = sources.map((source) => source.contents).join("\n");
  const appleLocal = /\bSystemLanguageModel\b/.test(text);
  const appleCloud = /\bPrivateCloudComputeLanguageModel\b/.test(text);
  const protocol = /\bLanguageModel\b/.test(text);
  const shape: ModelBindingShape = !protocol && !appleLocal && !appleCloud
    ? "absent"
    : protocol && !appleLocal && !appleCloud
      ? "abstracted-third-party"
      : protocol
        ? "abstracted-over-apple"
        : appleCloud
          ? "bound-apple-cloud"
          : "bound-apple-local";
  return { shape, protocol, appleLocal, appleCloud };
}

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
