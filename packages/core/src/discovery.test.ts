import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { discover, indexRepository, type RepositoryIndex } from "./discovery.js";

async function supportRepository(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-discovery-"));
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, contents, "utf8");
  }
  return root;
}

const listViewApp = {
  "Sources/HistoryWindowController.swift": [
    "import AppKit",
    "",
    "final class HistoryWindowController: NSWindowController, NSOutlineViewDataSource, NSOutlineViewDelegate {",
    "  var records: [PlaybackRecord] = []",
    "  func openRecord(_ record: PlaybackRecord) {",
    "    PlayerCore.activeOrNew.openURL(record.url)",
    "  }",
    "}"
  ].join("\n"),
  "Sources/PlaybackRecord.swift": [
    "import Foundation",
    "",
    "struct PlaybackRecord {",
    "  let mpvMd5: String",
    "  let title: String",
    "}"
  ].join("\n")
} as const;

async function index(files: Readonly<Record<string, string>>): Promise<RepositoryIndex> {
  return indexRepository(await supportRepository(files));
}

describe("indexing a repository", () => {
  it("reads the Swift files, because that is where a macOS application keeps its object classes", async () => {
    const read = await index(listViewApp);
    expect(read.files.map((entry) => entry.path)).toEqual([
      "Sources/HistoryWindowController.swift",
      "Sources/PlaybackRecord.swift"
    ]);
  });

  it("numbers the lines, because a proof without a line is a guess", async () => {
    const read = await index(listViewApp);
    expect(read.files[0]?.lines[2]).toContain("HistoryWindowController");
  });

  it("leaves out a build directory, because a generated copy of a source file is not a second source file", async () => {
    const read = await index({ ...listViewApp, "build/Derived/HistoryWindowController.swift": "generated" });
    expect(read.files.map((entry) => entry.path)).not.toContain("build/Derived/HistoryWindowController.swift");
  });
});

describe("finding the object class", () => {
  it("finds the type that is the data source of a list, because that is the object a user browses", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects.map((entry) => entry.name)).toEqual(["HistoryWindowController"]);
  });

  it("backs it with the file and the line where the conformance is written", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects[0]?.proof).toEqual({
      path: "Sources/HistoryWindowController.swift",
      line: 3,
      excerpt: "final class HistoryWindowController: NSWindowController, NSOutlineViewDataSource, NSOutlineViewDelegate {"
    });
  });

  it("does not find a type that is not a list, because a motif that guesses is worse than one that finds nothing", async () => {
    const found = await discover(await index({ "Sources/Settings.swift": "final class SettingsController: NSWindowController {}" }));
    expect(found.objects).toEqual([]);
  });

  it("says there is no candidate rather than inventing one when nothing matches", async () => {
    const found = await discover(await index({ "Sources/Settings.swift": "struct Empty {}" }));
    expect(found.objects).toEqual([]);
  });

  it("names the record type the object holds, because that is where its identifier lives", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects[0]?.recordTypes).toEqual(["PlaybackRecord"]);
  });

  it("is not confused by a comment that talks about a class, because prose is not a declaration", async () => {
    const found = await discover(
      await index({
        ...listViewApp,
        "Sources/PlaybackRecord.swift": [
          "class PlaybackRecord {",
          "  /// Indicate this class supports secure coding.",
          "  static var supportsSecureCoding: Bool { true }",
          "  let key: String",
          "}"
        ].join("\n")
      })
    );
    expect(found.objects[0]?.identifiers.map((entry) => entry.property)).toEqual(["key"]);
  });
});

describe("finding the identifier", () => {
  it("finds the string property the object carries as a key", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects[0]?.identifiers.map((entry) => entry.property)).toEqual(["mpvMd5"]);
  });

  it("backs it with the file and the line of the property", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects[0]?.identifiers[0]?.proof.line).toBe(4);
  });

  it("does not offer a display title as an identifier, because a title changes and an identifier that changes is not one", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects[0]?.identifiers.map((entry) => entry.property)).not.toContain("title");
  });

  it("ignores a string property on a type the object does not hold, because that is not the object's key", async () => {
    const found = await discover(
      await index({ ...listViewApp, "Sources/Unrelated.swift": "struct Unrelated {\n  let token: String\n}" })
    );
    expect(found.objects[0]?.identifiers.map((entry) => entry.property)).toEqual(["mpvMd5"]);
  });

  it("emits no identifier when the object holds nothing it can name a type for", async () => {
    const found = await discover(
      await index({ ...listViewApp, "Sources/HistoryWindowController.swift": "final class HistoryWindowController: NSOutlineViewDataSource {}" })
    );
    expect(found.objects[0]?.identifiers).toEqual([]);
  });

  it("ignores a local binding that carries the same name, because a local inside a function is not the record's key", async () => {
    const found = await discover(
      await index({
        ...listViewApp,
        "Sources/PlaybackRecord.swift": [
          "struct PlaybackRecord {",
          "  let key: String",
          "  init(decoder: Decoder) {",
          "    let key = Utility.watchLaterMd5(url)",
          "    self.key = key",
          "  }",
          "}"
        ].join("\n")
      })
    );
    expect(found.objects[0]?.identifiers.map((entry) => entry.property)).toEqual(["key"]);
  });

  it("finds a key the application builds by hashing, even without a written type, because that is how identifiers are made", async () => {
    const found = await discover(
      await index({
        ...listViewApp,
        "Sources/PlaybackRecord.swift": "struct PlaybackRecord {\n  let key = Utility.watchLaterMd5(url)\n  let title: String\n}"
      })
    );
    expect(found.objects[0]?.identifiers.map((entry) => entry.property)).toEqual(["key"]);
  });

  it("does not treat a type of the standard library as the record type, because the application did not declare it", async () => {
    const found = await discover(
      await index({
        ...listViewApp,
        "Sources/Constants.swift": "struct Constants {\n  struct String {\n    static let degree = \"°\"\n  }\n}",
        "Sources/HistoryWindowController.swift": "final class HistoryWindowController: NSOutlineViewDataSource {\n  var label: String\n}"
      })
    );
    expect(found.objects[0]?.recordTypes).toEqual([]);
  });
});

describe("finding the opening function", () => {
  it("finds the function that reopens an item", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects[0]?.openers.map((entry) => entry.symbol)).toEqual(["openRecord"]);
  });

  it("backs it with the file and the line of its declaration", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.objects[0]?.openers[0]?.proof).toEqual({
      path: "Sources/HistoryWindowController.swift",
      line: 5,
      excerpt: "func openRecord(_ record: PlaybackRecord) {"
    });
  });

  it("emits no opener when the application has none, because a run must not claim a path it did not find", async () => {
    const found = await discover(await index({ "Sources/Only.swift": "final class Only: NSOutlineViewDataSource {}" }));
    expect(found.objects[0]?.openers).toEqual([]);
  });

  it("ignores an opening function in a file that does not declare the object, because that is somebody else's path", async () => {
    const found = await discover(
      await index({ ...listViewApp, "Sources/AppDelegate.swift": "final class AppDelegate {\n  func openURL(_ url: URL) {}\n}" })
    );
    expect(found.objects[0]?.openers.map((entry) => entry.proof.path)).toEqual(["Sources/HistoryWindowController.swift"]);
  });

  it("finds a function whose name says nothing about opening but whose body opens the item, because that is the real seam", async () => {
    const found = await discover(
      await index({
        ...listViewApp,
        "Sources/HistoryWindowController.swift": "final class HistoryWindowController: NSOutlineViewDataSource {\n  func doubleAction() {\n    PlayerCore.activeOrNew.openURL(url)\n  }\n}"
      })
    );
    expect(found.objects[0]?.openers.map((entry) => entry.symbol)).toEqual(["doubleAction"]);
  });
});

describe("finding the access rule", () => {
  it("reports none, rather than pretending an application has a permission it does not declare", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.access).toEqual([]);
  });

  it("finds an exclusion preference when the application declares one", async () => {
    const found = await discover(
      await index({ ...listViewApp, "Sources/Prefs.swift": "enum Prefs {\n  static let recordPlaybackHistory = true\n}" })
    );
    expect(found.access.map((entry) => entry.symbol)).toContain("recordPlaybackHistory");
  });
});

describe("what the discovery returns", () => {
  it("groups every seam under the object it belongs to, because a flat list does not say which object an identifier is for", async () => {
    const found = await discover(
      await index({
        ...listViewApp,
        "Sources/FontPicker.swift": "final class FontPickerWindowController: NSTableViewDataSource {\n  var fonts: [Font] = []\n}",
        "Sources/Font.swift": "struct Font {\n  let fullName: String\n}"
      })
    );
    expect(found.objects.map((entry) => `${entry.name}:${entry.recordTypes.join(",")}`)).toEqual([
      "FontPickerWindowController:Font",
      "HistoryWindowController:PlaybackRecord"
    ]);
  });

  it("backs every finding with a file and a line, because that is the exit criterion of the step", async () => {
    const found = await discover(await index(listViewApp));
    const findings = found.objects.flatMap((object) => [object.proof, ...object.identifiers.map((e) => e.proof), ...object.openers.map((e) => e.proof)]);
    for (const finding of [...findings, ...found.access.map((entry) => entry.proof)]) {
      expect(finding.path).not.toBe("");
      expect(finding.line).toBeGreaterThan(0);
    }
  });

  it("carries no finding whose line does not exist in the file it names", async () => {
    const read = await index(listViewApp);
    const found = await discover(read);
    const findings = found.objects.flatMap((object) => [object.proof, ...object.identifiers.map((e) => e.proof), ...object.openers.map((e) => e.proof)]);
    for (const finding of [...findings, ...found.access.map((entry) => entry.proof)]) {
      const file = read.files.find((entry) => entry.path === finding.path);
      expect(file?.lines[finding.line - 1]).toContain(finding.excerpt);
    }
  });

  it("names the repository it read, so a result can be traced to an input", async () => {
    const found = await discover(await index(listViewApp));
    expect(found.repository).toContain("intentlane-discovery-");
  });
});
