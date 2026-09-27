import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import { createAuditReport } from "./audit.js";
import { CAPABILITY_CATALOGUE } from "./audit-catalogue.js";
import { CAPABILITY_OVERLAY_VERSION, describeOverlay, validateCapabilityOverlay } from "./audit-overlay.js";

const overlay = {
  version: CAPABILITY_OVERLAY_VERSION,
  entries: [
    { capability: "foundation.app-intent", consumption: "used", priority: "now" },
    { capability: "models.system-language-model", consumption: "planned", priority: "next" }
  ]
};

describe("capability overlay", () => {
  it("joins its entries on catalogue capability ids", () => {
    const result = validateCapabilityOverlay(overlay);
    expect(result.diagnostics).toEqual([]);
    expect(result.overlay?.entries.map((entry) => entry.capability)).toEqual([
      "foundation.app-intent",
      "models.system-language-model"
    ]);
  });

  it("refuses an id the catalogue does not describe, rather than ignoring it", () => {
    const result = validateCapabilityOverlay({
      version: CAPABILITY_OVERLAY_VERSION,
      entries: [{ capability: "models.not-a-capability", consumption: "used", priority: "now" }]
    });
    expect(result.overlay).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(["ILA191"]);
    expect(result.diagnostics[0]?.path).toBe("entries[0].capability");
    expect(result.diagnostics[0]?.message).toContain("models.not-a-capability");
  });

  it("refuses an entry that does not say what it consumes or when", () => {
    const result = validateCapabilityOverlay({
      version: CAPABILITY_OVERLAY_VERSION,
      entries: [{ capability: "foundation.app-intent", consumption: "maybe", priority: "now" }]
    });
    expect(result.overlay).toBeUndefined();
    expect(result.diagnostics[0]?.path).toBe("entries[0].consumption");
  });

  it("names no repository, in the overlay or in the catalogue", async () => {
    // The overlay is a list of capability ids on purpose: it is what lets
    // IntentLane describe a project without knowing it by name. A repository
    // name in either file would make the two the same document, and a client
    // report would start carrying the name of the app it audits. IntentLane's
    // own name is not on the list: the tool may name itself, a client's project
    // may not be named here.
    const source = await readFile(new URL("./audit-overlay.ts", import.meta.url), "utf8");
    const catalogue = await readFile(new URL("./audit-catalogue.ts", import.meta.url), "utf8");
    for (const [name, text] of [
      ["overlay", source],
      ["catalogue", catalogue]
    ] as const) {
      expect({
        name,
        hits: text.match(/\b(kollio|netnewswire|iina|fsnotes|handbrake|notes)\b/gi) ?? []
      }).toEqual({ name, hits: [] });
    }
  });
});

describe("describeOverlay", () => {
  it("keeps the report complete and marks nothing as consumed when no overlay is supplied", () => {
    const described = describeOverlay();
    expect(described.consumption).toEqual([]);
    expect(described.unknown).toEqual([]);
    expect(described.nextAction).toContain("No overlay");

    // The report carries the overlay section only when one was supplied, so an
    // audit without an overlay serialises exactly as it did before overlays.
    const report = createAuditReport({ name: "App", platform: "macos" }, []);
    expect(report.overlay).toBeUndefined();
    expect(JSON.parse(JSON.stringify(report))).not.toHaveProperty("overlay");
  });

  it("counts what the overlay leaves undescribed against the catalogue", () => {
    const result = validateCapabilityOverlay(overlay);
    if (result.overlay === undefined) throw new Error("Expected the overlay to validate.");
    const described = describeOverlay(result.overlay);
    expect(described.consumption).toHaveLength(2);
    expect(described.nextAction).toContain(String(CAPABILITY_CATALOGUE.length - 2));
  });

  it("reads an absent overlay as an empty one rather than as an error", () => {
    const result = validateCapabilityOverlay({ version: CAPABILITY_OVERLAY_VERSION });
    expect(result.diagnostics).toEqual([]);
    expect(result.overlay?.entries).toEqual([]);
    expect(describeOverlay(result.overlay).nextAction).toContain("empty");
  });
});
