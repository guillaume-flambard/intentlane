import { describe, expect, it } from "vitest";
import {
  CAPABILITY_CATALOGUE,
  CAPABILITY_CATALOGUE_VERSION,
  CAPABILITY_CLAIMS,
  CAPABILITY_GROUPS,
  SCHEMA_CLASSIFICATIONS,
  availableOn,
  capabilitiesInGroup,
  findCapability
} from "./audit-catalogue.js";

describe("capability catalogue", () => {
  it("publishes the versioned catalogue contract", () => {
    expect(CAPABILITY_CATALOGUE_VERSION).toBe("27.0");
    expect([...CAPABILITY_GROUPS]).toEqual([
      "foundation",
      "semantics",
      "discovery",
      "cross-app",
      "relevance",
      "execution",
      "proof"
    ]);
    expect([...CAPABILITY_CLAIMS]).toEqual(["auditor", "build", "surfaces", "siri-journey", "domain-package"]);
    expect([...SCHEMA_CLASSIFICATIONS]).toEqual(["siri-eligible", "shortcuts-only", "unknown"]);
  });

  it("uses unique identifiers and resolvable companions", () => {
    const ids = CAPABILITY_CATALOGUE.map((record) => record.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const record of CAPABILITY_CATALOGUE) {
      for (const companion of record.companions) {
        expect(ids).toContain(companion);
      }
    }
  });

  it("keeps every record inside a declared group", () => {
    for (const group of CAPABILITY_GROUPS) {
      const records = capabilitiesInGroup(group);
      expect(records.length).toBeGreaterThan(0);
      for (const record of records) {
        expect(record.group).toBe(group);
      }
    }
  });

  it("reports availability per platform", () => {
    const liveActivity = findCapability("execution.live-activity");
    if (!liveActivity) throw new Error("Expected the live activity capability.");
    expect(availableOn(liveActivity, "ios")).toBe("16.1");
    expect(availableOn(liveActivity, "macos")).toBeUndefined();

    const appIntent = findCapability("foundation.app-intent");
    if (!appIntent) throw new Error("Expected the app intent capability.");
    expect(availableOn(appIntent, "macos")).toBe("13.0");
    expect(availableOn(appIntent, "ios")).toBe("16.0");
  });

  it("classifies schema records as eligible or shortcuts only", () => {
    const eligible = CAPABILITY_CATALOGUE.filter((record) => record.classification === "siri-eligible");
    const shortcutsOnly = CAPABILITY_CATALOGUE.filter((record) => record.classification === "shortcuts-only");
    expect(eligible.map((record) => record.id)).toContain("semantics.app-schema");
    expect(shortcutsOnly.map((record) => record.id)).toEqual(["semantics.shortcuts-only-schema"]);
  });

  it("resolves a capability by identifier", () => {
    expect(findCapability("proof.siri-surface")?.claim).toBe("siri-journey");
    expect(findCapability("missing.capability")).toBeUndefined();
  });
});
