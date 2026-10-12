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

  it("does not read FileManager or UserDefaults as a data architecture", () => {
    const utility = source("Sources/App/Prefs.swift", [
      "import Foundation",
      "let defaults = UserDefaults.standard",
      "let cache = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)"
    ]);
    const report = detectDataArchitecture(["Sources/App/Prefs.swift"], [utility]);
    expect(report.architecture).toBe("unknown");
    expect(report.confidence).toBe("medium");
    expect(report.nextAction).toContain("Qualify where the entities come from");
  });

  it("reads a client of a remote server as remote even when it uses FileManager and UserDefaults", () => {
    const client = source("Sources/App/Sync.swift", [
      "let defaults = UserDefaults.standard",
      "let manager = FileManager.default",
      "let task = URLSession.shared.dataTask(with: request)"
    ]);
    const report = detectDataArchitecture(["Sources/App/Sync.swift"], [client]);
    expect(report.architecture).toBe("remote");
    expect(report.nextAction).toContain("IntentValueQuery");
  });

  it("does not read a URL in a comment as a network client", () => {
    const header = source("Sources/App/Licence.swift", [
      "// SPDX-License-Identifier: GPL-3.0-or-later",
      "// See https://www.gnu.org/licenses/ for the licence text.",
      "/* https://example.com/docs */",
      " * https://example.com/more",
      "let defaults = UserDefaults.standard"
    ]);
    expect(detectDataArchitecture(["Sources/App/Licence.swift"], [header]).architecture).toBe("unknown");
  });

  it("still reads a real data store when weak signals sit next to it", () => {
    const withStore = source("Sources/App/Model.swift", [
      "import SwiftData",
      "let defaults = UserDefaults.standard",
      "@Model final class Note {}"
    ]);
    expect(detectDataArchitecture(["Sources/App/Model.swift"], [withStore]).architecture).toBe("local");
  });

  it("does not read a link literal as a network client", () => {
    const about = source("Sources/App/AboutView.swift", [
      'let site = URL(string: "https://example.com")!',
      'let donate = URL(string: "https://example.com/donate")!',
      "let defaults = UserDefaults.standard"
    ]);
    expect(detectDataArchitecture(["Sources/App/AboutView.swift"], [about]).architecture).toBe("unknown");
  });

  it("reads a client built on a networking library", () => {
    const alamofire = source("Sources/App/Api.swift", ["import Alamofire", "AF.request(endpoint)"]);
    expect(detectDataArchitecture(["Sources/App/Api.swift"], [alamofire]).architecture).toBe("remote");
  });

  it("ignores tests, samples and vendored code", () => {
    const tests = source("Tests/Sources/Models/URLDetectorTests.swift", ['let url = URLSession.shared', "let x = URLRequest(url: u)"]);
    const sample = source("Packages/Syntax/Tests/Samples/test.swift", ["URLSession.shared.dataTask(with: r)"]);
    const pods = source("Pods/Alamofire/Session.swift", ["let s = URLSession.shared"]);
    expect(detectDataArchitecture([tests.path, sample.path, pods.path], [tests, sample, pods]).architecture).toBe("unknown");
    const product = source("Sources/App/Model.swift", ["import SwiftData", "@Model final class Note {}"]);
    expect(detectDataArchitecture([tests.path, product.path], [tests, product]).architecture).toBe("local");
  });

  it("does not read an unused import CloudKit as a synced store", () => {
    const share = source("Sources/App/Share.swift", [
      "import UIKit",
      "import CloudKit",
      "let task = URLSession.shared.dataTask(with: request)"
    ]);
    expect(detectDataArchitecture(["Sources/App/Share.swift"], [share]).architecture).toBe("remote");
  });

  it("still reads real CloudKit use as synced", () => {
    const use = source("Sources/App/Cloud.swift", ["import CloudKit", "let database = CKContainer.default().privateCloudDatabase"]);
    expect(detectDataArchitecture(["Sources/App/Cloud.swift"], [use]).architecture).toBe("synced");
  });

  it("does not read a mention of SQLite in a doc comment as a local store", () => {
    const doc = source("Sources/App/Doc.swift", [
      "/// Owns the shared SQLite database used for local state.",
      "let task = URLSession.shared.dataTask(with: request)"
    ]);
    expect(detectDataArchitecture(["Sources/App/Doc.swift"], [doc]).architecture).toBe("remote");
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
