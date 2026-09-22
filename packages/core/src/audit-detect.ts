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
