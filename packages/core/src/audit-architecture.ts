import type { AuditSourceFile } from "./audit-detect.js";
import type { AuditEvidence } from "./audit.js";

export const AUDIT_DATA_ARCHITECTURES = ["local", "synced", "remote", "unknown"] as const;

export type AuditDataArchitecture = (typeof AUDIT_DATA_ARCHITECTURES)[number];

export type AuditArchitectureReport = Readonly<{
  architecture: AuditDataArchitecture;
  confidence: "low" | "medium" | "high";
  evidence: readonly AuditEvidence[];
  nextAction: string;
}>;

const ARCHITECTURE_SIGNALS: readonly Readonly<{
  architecture: "local" | "synced" | "remote";
  pattern: RegExp;
}>[] = [
  {
    architecture: "synced",
    pattern: /\bCloudKit\b|\bCKContainer\b|\bCKRecord\b|\bCKDatabase\b|NSPersistentCloudKitContainer|\bSyncableEntity\b|\bentitySync\b/
  },
  {
    // Data stores only. FileManager and UserDefaults are deliberately absent: almost
    // every app touches them for caches and preferences, so they say nothing about
    // where the entities come from. They used to decide "local (high)" for a client
    // of a remote server, and the next action then promised a Siri journey "end to
    // end" that the app cannot deliver without its server.
    architecture: "local",
    pattern: /\bCoreData\b|\bSwiftData\b|@Model\b|NSPersistentContainer|\bSQLite\b|\bsqlite3\b/
  },
  {
    architecture: "remote",
    // Network client APIs only. A bare https:// literal is not here: every app has
    // links to its site, its donation page or its update feed, and a text editor with
    // an About panel is not a client of a remote server.
    pattern: /\bURLSession\b|\bURLRequest\b|\bfetch\(|\baxios\b|useQuery\(|\bapollo\b|\bgraphql\b|\bGraphQL\b|\bAlamofire\b|\bMoya\b/
  }
];

// Tests, samples and vendored code describe how the app is verified or built, not where
// its entities come from. A text editor's URL-detection tests made it look like a
// network client.
const NON_PRODUCT_PATH = /(^|\/)(Tests?|UITests|Samples?|Fixtures?|Pods|Carthage|Checkouts|\.build)(\/|$)|Tests?\.swift$/;

function isCommentLine(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*");
}

export function detectDataArchitecture(
  files: readonly string[],
  sources: readonly AuditSourceFile[]
): AuditArchitectureReport {
  const found = new Set<AuditDataArchitecture>();
  const evidence: AuditEvidence[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (NON_PRODUCT_PATH.test(source.path)) continue;
    const lines = source.contents.split("\n");
    for (const [index, line] of lines.entries()) {
      // A comment is not evidence. Licence headers carry https:// URLs in every file
      // of a GPL project, which made any such app look like a network client.
      if (isCommentLine(line)) continue;
      for (const signal of ARCHITECTURE_SIGNALS) {
        if (!signal.pattern.test(line)) continue;
        found.add(signal.architecture);
        const key = `${source.path}\0${signal.architecture}`;
        if (seen.has(key)) continue;
        seen.add(key);
        evidence.push({ kind: "swift", path: source.path, line: index + 1 });
      }
    }
  }

  const architecture: AuditDataArchitecture = found.has("synced")
    ? "synced"
    : found.has("local")
      ? "local"
      : found.has("remote")
        ? "remote"
        : "unknown";
  const confidence: AuditArchitectureReport["confidence"] =
    architecture !== "unknown" ? "high" : files.length > 0 ? "medium" : "low";
  const nextAction =
    architecture === "synced"
      ? "Entities resolve locally and sync, so a Siri journey can be demonstrated while the sync lifecycle is documented."
      : architecture === "local"
        ? "Entities resolve locally, so a Siri journey can be demonstrated end to end."
        : architecture === "remote"
          ? "Resolve entities through IntentValueQuery and plan for latency before promising a date or a price."
          : "Qualify where the entities come from before promising a date or a price.";

  return { architecture, confidence, evidence, nextAction };
}
