import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runAudit } from "./audit-run.js";
import type { AuditFinding, AuditReport } from "./audit.js";

const providerOnly = [
  "import AppIntents",
  "",
  "struct CreateNote: AppIntent {",
  "}",
  "",
  "struct Shortcuts: AppShortcutsProvider {",
  "  static var appShortcuts: [AppShortcut] {",
  "    AppShortcut(intent: CreateNote(), phrases: [\"Create a note\"], shortTitle: \"Create a note\", systemImageName: \"note\")",
  "  }",
  "}"
].join("\n");

const schemaBacked = [
  "import AppIntents",
  "import AppIntentsTesting",
  "",
  "@AppEntity(schema: .notes.note)",
  "struct NoteEntity: AppEntity {",
  "  static var defaultQuery = NoteQuery()",
  "}",
  "",
  "struct NoteQuery: EntityQuery {",
  "}",
  "",
  "@AppIntent(schema: .notes.createNote)",
  "struct CreateNote: AppIntent {",
  "}",
  "",
  "extension NoteEntity: Transferable {",
  "}",
  "",
  "struct IndexedNote: IndexedEntity {",
  "}"
].join("\n");

async function fixture(contents: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-run-"));
  await mkdir(join(root, "Sources", "App"), { recursive: true });
  await writeFile(join(root, "Sources", "App", "Notes.swift"), contents, "utf8");
  return root;
}

function finding(report: AuditReport, capability: string): AuditFinding {
  const match = report.findings.find((entry) => entry.capability === capability);
  if (!match) throw new Error(`Missing finding for ${capability}`);
  return match;
}

describe("runAudit", () => {
  it("implements the foundation of a shortcuts-only project", async () => {
    const report = await runAudit({ directory: await fixture(providerOnly), platform: "macos", name: "App" });

    expect(finding(report, "foundation.app-intent")).toMatchObject({ state: "implemented", confidence: "high" });
    expect(finding(report, "foundation.shortcuts-provider")).toMatchObject({ state: "implemented", confidence: "high" });
    expect(finding(report, "proof.shortcuts-surface")).toMatchObject({ state: "implemented", confidence: "high" });
    expect(finding(report, "semantics.app-schema")).toMatchObject({ state: "unknown", confidence: "low" });
    expect(finding(report, "proof.siri-surface")).toMatchObject({ state: "unknown", confidence: "medium" });
    expect(finding(report, "proof.siri-surface").gaps.map((gap) => gap.code)).toEqual(["ILA140"]);
  });

  it("marks a capability that the platform does not ship as unsupported", async () => {
    const report = await runAudit({ directory: await fixture(providerOnly), platform: "macos", name: "App" });

    expect(finding(report, "execution.live-activity")).toMatchObject({ state: "unsupported", confidence: "high" });
    expect(finding(report, "execution.live-activity").gaps.map((gap) => gap.code)).toEqual(["ILA100"]);
  });

  it("keeps an advanced capability advisory until a pilot asks for it", async () => {
    const report = await runAudit({ directory: await fixture(providerOnly), platform: "macos", name: "App" });

    expect(finding(report, "discovery.indexed-entity")).toMatchObject({ state: "unknown", confidence: "low" });
    expect(finding(report, "discovery.indexed-entity").gaps.map((gap) => gap.code)).toEqual(["ILA150"]);
    expect(finding(report, "discovery.indexed-entity").nextAction).toContain("discovery");
    expect(finding(report, "foundation.localization").gaps).toEqual([]);
  });

  it("implements the schema capabilities when the companions are present", async () => {
    const report = await runAudit({ directory: await fixture(schemaBacked), platform: "macos", name: "App" });

    expect(finding(report, "semantics.app-schema")).toMatchObject({ state: "implemented", confidence: "high" });
    expect(finding(report, "semantics.schema-entity")).toMatchObject({ state: "implemented", confidence: "high" });
    expect(finding(report, "proof.siri-surface")).toMatchObject({ state: "detected", confidence: "medium" });
  });

  it("is deterministic and keeps the evidence of every detection", async () => {
    const directory = await fixture(schemaBacked);
    const first = await runAudit({ directory, platform: "macos", name: "App" });
    const second = await runAudit({ directory, platform: "macos", name: "App" });

    expect(first).toEqual(second);
    expect(finding(first, "foundation.app-intent").evidence[0]).toMatchObject({
      kind: "swift",
      path: "Sources/App/Notes.swift",
      line: 13
    });
  });

  it("promotes metadata-backed capabilities to tested while Siri stays unverified", async () => {
    const directory = await fixture(schemaBacked);
    const metadata = join(directory, "metadata", "Metadata.appintents", "extract.actionsdata");
    await mkdir(join(directory, "metadata", "Metadata.appintents"), { recursive: true });
    await writeFile(metadata, JSON.stringify({ actions: { CreateNote: {} } }), "utf8");

    const report = await runAudit({ directory, platform: "macos", name: "App", buildMetadata: metadata });

    expect(finding(report, "foundation.app-intent")).toMatchObject({ state: "tested", confidence: "high" });
    expect(finding(report, "semantics.schema-entity")).toMatchObject({ state: "tested", confidence: "high" });
    expect(finding(report, "semantics.schema-entity").evidence).toContainEqual({
      kind: "metadata",
      path: metadata,
      platform: "macos"
    });
    expect(finding(report, "proof.siri-surface")).toMatchObject({ state: "detected", confidence: "medium" });
  });

  it("marks capabilities that need a newer SDK than the one inspected", async () => {
    const directory = await fixture(schemaBacked);
    const sdk = join(directory, "SDK");
    await mkdir(sdk, { recursive: true });
    await writeFile(
      join(sdk, "SDKSettings.json"),
      JSON.stringify({ Version: "26.5", CanonicalName: "macosx26.5" }),
      "utf8"
    );

    const stale = await runAudit({ directory, platform: "macos", name: "App", sdkPath: sdk });

    expect(stale.sdk).toEqual({ version: "26.5", canonicalName: "macosx26.5" });
    expect(finding(stale, "semantics.app-schema")).toMatchObject({ state: "unsupported", confidence: "high" });
    expect(finding(stale, "semantics.app-schema").gaps).toContainEqual({
      code: "ILA160",
      message: `semantics.app-schema requires macos 27.0, and the SDK at ${sdk} is 26.5.`
    });

    await writeFile(
      join(sdk, "SDKSettings.json"),
      JSON.stringify({ Version: "27.0", CanonicalName: "macosx27.0" }),
      "utf8"
    );

    const current = await runAudit({ directory, platform: "macos", name: "App", sdkPath: sdk });

    expect(finding(current, "semantics.app-schema")).toMatchObject({ state: "implemented", confidence: "high" });
  });
});

describe("schema domain completeness", () => {
  const domainSource = (entitySchema: boolean) => [
    "import AppIntents",
    "",
    entitySchema ? "@AppEntity(schema: .reader.page)" : "@AppEntity",
    "struct PageEntity: AppEntity {",
    "  var id: String",
    "  var label: String",
    "}",
    "",
    "@AppIntent(schema: .reader.openPage)",
    "struct OpenPage: AppIntent {",
    "  var target: PageEntity",
    "}"
  ];

  it("implements schema completeness when one domain has both sides", async () => {
    const directory = await fixture(domainSource(true).join("\n"));
    const report = await runAudit({ directory, platform: "macos", name: "App" });
    expect(finding(report, "semantics.schema-completeness")).toMatchObject({ state: "implemented", confidence: "high" });
  });

  it("detects a one sided domain and asks for the missing side", async () => {
    const directory = await fixture(domainSource(false).join("\n"));
    const report = await runAudit({ directory, platform: "macos", name: "App" });
    const completeness = finding(report, "semantics.schema-completeness");
    expect(completeness).toMatchObject({ state: "detected", confidence: "high" });
    expect(completeness.gaps).toContainEqual(
      expect.objectContaining({ code: "ILA130", message: expect.stringContaining("reader conforms 1 intent(s) and 0 entity(ies)") })
    );
  });
});
