import { describe, expect, it } from "vitest";
import {
  AUDIT_DATA_CLASSES,
  AUDIT_PRIVACY_STATES,
  PRIVACY_MANIFEST,
  classifyData
} from "./audit-data.js";
import type { AuditSourceFile } from "./audit-detect.js";

const silent: readonly AuditSourceFile[] = [
  { path: "Sources/App/Note.swift", contents: "struct NoteEntity: AppEntity {\n  let id: String\n}" }
];

const fields: readonly AuditSourceFile[] = [
  {
    path: "Sources/App/Note.swift",
    contents: [
      "import AppIntents",
      "",
      "struct NoteEntity: AppEntity {",
      "  let id: String",
      "  let email: String",
      "  let password: String",
      "  let title: String",
      "}"
    ].join("\n")
  }
];

const indexed: readonly AuditSourceFile[] = [
  {
    path: "Sources/App/Index.swift",
    contents: [
      "import AppIntents",
      "import CoreSpotlight",
      "",
      "extension NoteEntity: IndexedEntity {",
      "  static func refresh() async throws {",
      "    try await indexAppEntities([NoteEntity]())",
      "  }",
      "}"
    ].join("\n")
  }
];

describe("audit data classification", () => {
  it("publishes the data and privacy contract", () => {
    expect([...AUDIT_DATA_CLASSES]).toEqual(["sensitive", "personal", "public", "unknown"]);
    expect([...AUDIT_PRIVACY_STATES]).toEqual(["declared", "missing", "unknown"]);
    expect(PRIVACY_MANIFEST).toBe("PrivacyInfo.xcprivacy");
  });

  it("reports unknown when the sources carry no recognizable field", () => {
    const report = classifyData(["Sources/App/Note.swift"], silent);

    expect(report.classes).toEqual(["unknown"]);
    expect(report.indexed).toBe(false);
    expect(report.privacy).toBe("unknown");
    expect(report.evidence).toEqual([]);
  });

  it("orders the classes and cites the line of every signal", () => {
    const report = classifyData(["Sources/App/Note.swift"], fields);

    expect(report.classes).toEqual(["sensitive", "personal", "public"]);
    expect(report.evidence).toContainEqual({
      kind: "swift",
      path: "Sources/App/Note.swift",
      line: 5
    });
    expect(report.evidence).toContainEqual({
      kind: "swift",
      path: "Sources/App/Note.swift",
      line: 6
    });
    expect(report.evidence).toContainEqual({
      kind: "swift",
      path: "Sources/App/Note.swift",
      line: 7
    });
  });

  it("sorts the classes by the published order, not by the source order", () => {
    const report = classifyData(["Sources/App/Note.swift"], [
      {
        path: "Sources/App/Note.swift",
        contents: "struct NoteEntity: AppEntity {\n  let title: String\n  let password: String\n}"
      }
    ]);

    expect(report.classes).toEqual(["sensitive", "public"]);
  });

  it("asks for a privacy manifest when the project indexes entities", () => {
    const report = classifyData(["Sources/App/Index.swift"], indexed);

    expect(report.indexed).toBe(true);
    expect(report.privacy).toBe("missing");
    expect(report.nextAction).toBe(
      "Add a PrivacyInfo.xcprivacy manifest before indexing user content for Spotlight."
    );
  });

  it("reports a declared manifest and cites it", () => {
    const files = ["Sources/App/Index.swift", "Sources/App/PrivacyInfo.xcprivacy"];
    const report = classifyData(files, indexed);

    expect(report.privacy).toBe("declared");
    expect(report.evidence).toContainEqual({
      kind: "config",
      path: "Sources/App/PrivacyInfo.xcprivacy"
    });
    expect(report.nextAction).toBe("Keep the privacy manifest current as the indexed data changes.");
  });
});
