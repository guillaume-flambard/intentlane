import { describe, expect, it } from "vitest";
import { AUDIT_QUALITY_SIGNALS, detectActionQuality } from "./audit-quality.js";

const source = (path: string, lines: readonly string[]) => ({ path, contents: lines.join("\n") });

const complete = source("Sources/App/Notes.swift", [
  "import AppIntents",
  "struct CreateNote: AppIntent {",
  "  func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView & OpensIntent {",
  '    return .result(opensIntent: OpenURLIntent(url), dialog: IntentDialog("Done"), view: IntentLaneSnippetView(title: title, fields: []))',
  "  }",
  "}",
  "struct Shortcuts: AppShortcutsProvider {",
  "  static var appShortcuts: [AppShortcut] {",
  '    AppShortcut(intent: CreateNote(), phrases: ["Create a note in ${applicationName}"], shortTitle: "Create a note", systemImageName: "note")',
  "  }",
  "}"
]);

const phraseWithoutApplicationName = source("Sources/App/Shortcuts.swift", [
  "import AppIntents",
  "struct Shortcuts: AppShortcutsProvider {",
  "  static var appShortcuts: [AppShortcut] {",
  '    AppShortcut(intent: CreateNote(), phrases: ["Create a note"], shortTitle: "Create a note", systemImageName: "note")',
  "  }",
  "}"
]);

const destructive = source("Sources/App/Delete.swift", [
  "import AppIntents",
  "struct DeleteNote: AppIntent {",
  "  func perform() async throws -> some IntentResult & ProvidesDialog {",
  '    try await requestConfirmation(actionName: .continue, dialog: IntentDialog("Delete?"))',
  '    return .result(dialog: IntentDialog("Deleted"))',
  "  }",
  "}"
]);

describe("action quality", () => {
  it("publishes the signal contract", () => {
    expect([...AUDIT_QUALITY_SIGNALS]).toEqual([
      "result",
      "view",
      "phrases",
      "applicationName",
      "confirmation"
    ]);
  });

  it("reads every signal of a complete action", () => {
    const report = detectActionQuality([complete]);
    expect(report.signals).toEqual(["result", "view", "phrases", "applicationName"]);
    expect(report.issues).toEqual([]);
    expect(report.nextAction).toBe("Keep the action signals with the evidence ledger.");
  });

  it("reports a phrase that misses the applicationName placeholder", () => {
    const report = detectActionQuality([phraseWithoutApplicationName]);
    expect(report.signals).toEqual(["phrases"]);
    expect(report.issues).toEqual([
      "A shortcut phrase does not carry the applicationName placeholder, so the system does not register it."
    ]);
    expect(report.nextAction).toBe("Fix the phrase template before claiming the shortcut works.");
  });

  it("reads a confirmation on a destructive action", () => {
    const report = detectActionQuality([destructive]);
    expect(report.signals).toEqual(["result", "confirmation"]);
    expect(report.issues).toEqual([]);
  });

  it("reports nothing when no action signal is present", () => {
    const report = detectActionQuality([source("Sources/App/Model.swift", ["struct Note {}", "}"])]);
    expect(report.signals).toEqual([]);
    expect(report.evidence).toEqual([]);
    expect(report.nextAction).toBe(
      "No App Intent result, view, phrase or confirmation was found, so the action quality is unknown."
    );
  });

  it("cites the file and the line of every signal", () => {
    const report = detectActionQuality([complete]);
    expect(report.evidence).toContainEqual({ kind: "swift", path: "Sources/App/Notes.swift", line: 4 });
    expect(report.evidence).toContainEqual({ kind: "swift", path: "Sources/App/Notes.swift", line: 9 });
  });
});
