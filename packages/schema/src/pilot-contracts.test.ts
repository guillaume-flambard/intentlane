import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { intentLaneConfigSchema } from "./index.js";
import { parse } from "yaml";

const pilotsDirectory = resolve(import.meta.dirname, "..", "..", "..", "pilots");

async function contractPaths(): Promise<readonly string[]> {
  const entries = await readdir(pilotsDirectory, { withFileTypes: true });
  // A pilot directory exists before its contract does: the recipe requires the
  // record and the three entry conditions to be written before the first line of
  // the integration. Reading a contract by naming it rather than by finding it
  // would make the suite red for the whole time a pilot is being qualified, so
  // this lists the contracts that are actually there.
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(pilotsDirectory, entry.name, "contract.yaml"))
    .filter((path) => existsSync(path));
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
