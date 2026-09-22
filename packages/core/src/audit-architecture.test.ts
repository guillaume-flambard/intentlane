import { describe, expect, it } from "vitest";
import { AUDIT_DATA_ARCHITECTURES, detectDataArchitecture } from "./audit-architecture.js";
import type { AuditSourceFile } from "./audit-detect.js";

const source = (path: string, lines: readonly string[]): AuditSourceFile => ({
  path,
  contents: lines.join("\n")
});

const synced = source("Sources/App/Store.swift", [
  "import CoreData",
  "import CloudKit",
  'let container = NSPersistentCloudKitContainer(name: "App")'
]);

const local = source("Sources/App/Model.swift", ["import SwiftData", "@Model final class Note {", "  let title: String", "}"]);

const remote = source("Sources/App/Client.swift", [
  "import Foundation",
  "func load() async throws -> Data {",
  "  let (data, _) = try await URLSession.shared.data(from: url)",
  "  return data",
  "}"
]);

const mixed = source("Sources/App/Store.swift", [
  "import Foundation",
  'let url = URL(string: "https://example.com")!',
  "let store = NSPersistentContainer(name: \"App\")"
]);

describe("detectDataArchitecture", () => {
  it("publishes the architecture contract", () => {
    expect([...AUDIT_DATA_ARCHITECTURES]).toEqual(["local", "synced", "remote", "unknown"]);
  });

  it("prefers a synced store over the local store it builds on", () => {
    const report = detectDataArchitecture(["Sources/App/Store.swift"], [synced]);
    expect(report.architecture).toBe("synced");
    expect(report.confidence).toBe("high");
    expect(report.nextAction).toContain("sync lifecycle");
  });

  it("reads a local store", () => {
    const report = detectDataArchitecture(["Sources/App/Model.swift"], [local]);
    expect(report.architecture).toBe("local");
    expect(report.confidence).toBe("high");
    expect(report.nextAction).toContain("demonstrated end to end");
  });

  it("reads a remote client", () => {
    const report = detectDataArchitecture(["Sources/App/Client.swift"], [remote]);
    expect(report.architecture).toBe("remote");
    expect(report.confidence).toBe("high");
    expect(report.nextAction).toContain("IntentValueQuery");
  });

  it("keeps a local store ahead of a network client", () => {
    const report = detectDataArchitecture(["Sources/App/Store.swift"], [mixed]);
    expect(report.architecture).toBe("local");
    expect(report.confidence).toBe("high");
  });

  it("reports unknown with the confidence the evidence allows", () => {
    expect(detectDataArchitecture(["README.md"], []).architecture).toBe("unknown");
    expect(detectDataArchitecture(["README.md"], []).confidence).toBe("medium");
    expect(detectDataArchitecture([], []).confidence).toBe("low");
  });

  it("cites the file and the line of every signal", () => {
    const report = detectDataArchitecture(["Sources/App/Model.swift"], [local]);
    expect(report.evidence).toContainEqual({ kind: "swift", path: "Sources/App/Model.swift", line: 1 });
  });
});
