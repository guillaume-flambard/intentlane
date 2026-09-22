import type { AuditSourceFile } from "./audit-detect.js";
import type { AuditEvidence } from "./audit.js";

export const AUDIT_DATA_CLASSES = ["sensitive", "personal", "public", "unknown"] as const;

export type AuditDataClass = (typeof AUDIT_DATA_CLASSES)[number];

export const AUDIT_PRIVACY_STATES = ["declared", "missing", "unknown"] as const;

export type AuditPrivacyState = (typeof AUDIT_PRIVACY_STATES)[number];

export const PRIVACY_MANIFEST = "PrivacyInfo.xcprivacy";

export type AuditDataReport = Readonly<{
  classes: readonly AuditDataClass[];
  indexed: boolean;
  privacy: AuditPrivacyState;
  evidence: readonly AuditEvidence[];
  nextAction: string;
}>;

const DATA_SIGNALS: readonly Readonly<{ dataClass: "sensitive" | "personal" | "public"; pattern: RegExp }>[] = [
  {
    dataClass: "sensitive",
    pattern: /password|passcode|secret|token|credential|api_?key|iban|\bcvv\b|\bssn\b|salary|health|medical|diagnos/i
  },
  {
    dataClass: "personal",
    pattern: /email|phone|address|contact|birth|location|avatar|profile|person|recipient/i
  },
  {
    dataClass: "public",
    pattern: /title|name|url|link|tag|label|description|summary|status|count|price|sku|code|note|idea/i
  }
];

const INDEX_SIGNALS: readonly RegExp[] = [
  /\bIndexedEntity\b/,
  /indexAppEntities/,
  /deleteAppEntities/,
  /\bCSSearchableIndex\b/
];

const PROPERTY_DECLARATION = /\b(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)/;

function basename(file: string): string {
  const index = file.lastIndexOf("/");
  return index === -1 ? file : file.slice(index + 1);
}

export function classifyData(files: readonly string[], sources: readonly AuditSourceFile[]): AuditDataReport {
  const classes = new Set<AuditDataClass>();
  const evidence: AuditEvidence[] = [];
  const seen = new Set<string>();
  let indexed = false;

  for (const source of sources) {
    const lines = source.contents.split("\n");
    for (const [index, line] of lines.entries()) {
      if (INDEX_SIGNALS.some((pattern) => pattern.test(line))) indexed = true;
      const property = PROPERTY_DECLARATION.exec(line)?.[1];
      if (!property) continue;
      for (const signal of DATA_SIGNALS) {
        if (!signal.pattern.test(property)) continue;
        classes.add(signal.dataClass);
        const key = `${source.path}\0${signal.dataClass}`;
        if (seen.has(key)) continue;
        seen.add(key);
        evidence.push({ kind: "swift", path: source.path, line: index + 1 });
      }
    }
  }

  const manifest = files.find((file) => basename(file) === PRIVACY_MANIFEST);
  if (manifest) evidence.push({ kind: "config", path: manifest });

  const privacy: AuditPrivacyState = manifest ? "declared" : indexed ? "missing" : "unknown";
  const ordered = AUDIT_DATA_CLASSES.filter((dataClass) => classes.has(dataClass));
  const nextAction =
    privacy === "missing"
      ? "Add a PrivacyInfo.xcprivacy manifest before indexing user content for Spotlight."
      : indexed
        ? "Keep the privacy manifest current as the indexed data changes."
        : "Nothing in the project indexes entities for Spotlight yet.";

  return {
    classes: ordered.length > 0 ? ordered : ["unknown"],
    indexed,
    privacy,
    evidence,
    nextAction
  };
}
