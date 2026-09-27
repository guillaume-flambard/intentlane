import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { IntentLaneConfig } from "../../schema/src/index.js";
import { analyseContract } from "./contract-analysis.js";
import { indexRepository, type RepositoryIndex } from "./discovery.js";

async function supportRepository(files: Readonly<Record<string, string>>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-contract-"));
  for (const [path, contents] of Object.entries(files)) {
    const target = join(root, path);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, contents, "utf8");
  }
  return root;
}

async function index(files: Readonly<Record<string, string>>): Promise<RepositoryIndex> {
  return indexRepository(await supportRepository(files));
}

const contract: IntentLaneConfig = {
  schema: "0.1",
  app: { id: "dev.example.pilot", name: "Example", url_scheme: "example", min_macos: "14.0", locales: ["en"] },
  entities: [
    {
      id: "notebook",
      title: { en: "Notebook" },
      identifier: "id",
      display: { title: "title", subtitle: "context" },
      query: { mode: "static" },
      exposure: { rules: ["item_not_usable"] }
    }
  ],
  intents: [
    {
      id: "open_notebook",
      title: { en: "Open notebook" },
      parameters: [],
      execution: { mode: "native" },
      schema: "system.open",
      target: "notebook"
    }
  ]
} as const;

const record = [
  "struct NotebookRecord {",
  "  let id: String",
  "  let title: String",
  "  let context: String?",
  "}"
].join("\n");

const opener = [
  "final class NotebookOpener {",
  "  func open(_ id: String) async {",
  "    sidebar.selectRowIndexes([row])",
  "  }",
  "}"
].join("\n");

const callSite = ["func deliver(_ record: NotebookRecord) async {", "  await opener.open(record.id)", "}"].join("\n");

describe("analysing a pilot against its contract", () => {
  it("passes when the contract's identifier, title and opening path are all present and reached", async () => {
    const found = await index({
      "Adapter/NotebookRecord.swift": record,
      "Adapter/NotebookIntegration.swift": opener,
      "Adapter/NotebookHandlers.swift": callSite
    });

    const result = analyseContract(contract, found);

    expect(result.status).toBe("pass");
    expect(result.objects).toBe(1);
    expect(result.actionable).toBe(1);
    expect(result.reason).toContain("notebook");
  });

  it("blocks when the contract names an identifier the repository does not declare, and names the field", async () => {
    const found = await index({
      "Adapter/NotebookRecord.swift": record.replace("let id: String", "let key: String"),
      "Adapter/NotebookIntegration.swift": opener,
      "Adapter/NotebookHandlers.swift": callSite
    });

    const result = analyseContract(contract, found);

    expect(result.status).toBe("blocked");
    expect(result.reason).toContain("id");
    expect(result.reason).toContain("notebook");
    expect(result.reason).not.toContain("object class");
  });

  it("blocks when an opener exists but is never reached with the contract's identifier", async () => {
    const found = await index({
      "Adapter/NotebookRecord.swift": record,
      "Adapter/NotebookIntegration.swift": opener,
      "Adapter/NotebookHandlers.swift": callSite.replace("open(record.id)", "open(record.title)")
    });

    const result = analyseContract(contract, found);

    expect(result.status).toBe("blocked");
    expect(result.reason).toContain("id");
  });

  it("blocks when the identifier is only a commented declaration, because a comment is not a seam", async () => {
    const found = await index({
      "Adapter/NotebookRecord.swift": record.replace("let id: String", "// let id: String"),
      "Adapter/NotebookIntegration.swift": opener,
      "Adapter/NotebookHandlers.swift": callSite
    });

    const result = analyseContract(contract, found);

    expect(result.status).toBe("blocked");
  });

  it("blocks when the display title the contract names is missing", async () => {
    const found = await index({
      "Adapter/NotebookRecord.swift": record.replace("let title: String", "let name: String"),
      "Adapter/NotebookIntegration.swift": opener,
      "Adapter/NotebookHandlers.swift": callSite
    });

    const result = analyseContract(contract, found);

    expect(result.status).toBe("blocked");
    expect(result.reason).toContain("title");
  });
});
