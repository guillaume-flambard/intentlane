import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { intentLaneConfigSchema } from "./index.js";
import { parse } from "yaml";

const pilotsDirectory = resolve(import.meta.dirname, "..", "..", "..", "pilots");

async function contractPaths(): Promise<readonly string[]> {
  const entries = await readdir(pilotsDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pilotsDirectory, entry.name, "contract.yaml"))
    .filter((path) => path.endsWith("contract.yaml"));
}

describe("every shipped pilot contract", () => {
  it("exists in more than one pilot, because a test that finds nothing proves nothing", async () => {
    expect((await contractPaths()).length).toBeGreaterThan(1);
  });

  it("declares an exposure condition on every entity", async () => {
    const unreadable: string[] = [];
    for (const path of await contractPaths()) {
      const document = intentLaneConfigSchema.safeParse(parse(await readFile(path, "utf8")) as unknown);
      if (!document.success) unreadable.push(path);
    }
    expect(unreadable).toEqual([]);
  });

  it("keeps its rule in the parsed document, because the contract is read by a client and not only by the tool", async () => {
    for (const path of await contractPaths()) {
      const document = intentLaneConfigSchema.safeParse(parse(await readFile(path, "utf8")) as unknown);
      if (!document.success) continue;
      for (const entity of document.data.entities) {
        expect((entity.exposure?.rules ?? []).length).toBeGreaterThan(0);
      }
    }
  });
});
