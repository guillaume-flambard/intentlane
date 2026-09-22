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
