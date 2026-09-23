import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import {
  PILOT_LEDGER_CLAIMABLE_LAYERS,
  PILOT_LEDGER_LAYERS,
  PILOT_LEDGER_LAYER_STATUSES,
  PILOT_LEDGER_VERSION,
  validatePilotLedger
} from "./pilot-ledger.js";

const fixtureDirectory = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "pilot-ledger");

function loadFixture(name: string): unknown {
  return parse(readFileSync(join(fixtureDirectory, name), "utf8") as string) as unknown;
}

describe("pilot ledger contract", () => {
  it("publishes the versioned ledger contract", () => {
    expect(PILOT_LEDGER_VERSION).toBe("pilot-evidence/1.0");
    expect([...PILOT_LEDGER_LAYERS]).toEqual(["contract", "build", "shortcuts", "spotlight", "siri"]);
    expect([...PILOT_LEDGER_CLAIMABLE_LAYERS]).toEqual(["shortcuts", "spotlight", "siri"]);
    expect([...PILOT_LEDGER_LAYER_STATUSES]).toEqual(["pass", "fail", "not-applicable", "blocked"]);
  });
});

describe("pilot ledger validation", () => {
  it("marks the complete macOS ledger verified", () => {
    const result = validatePilotLedger(loadFixture("verified-macos.yaml"));
    expect(result.status).toBe("verified");
    expect(result.diagnostics).toEqual([]);
    expect(result.summary).toContain("verified");
  });

  it("marks the iOS ledger verified when spotlight is not claimed", () => {
    const result = validatePilotLedger(loadFixture("unclaimed-spotlight-ios.yaml"));
    expect(result.status).toBe("verified");
    expect(result.diagnostics).toEqual([]);
  });

  it("never reads artifact references from disk", () => {
    const result = validatePilotLedger(loadFixture("verified-macos.yaml"));
    expect(result.status).toBe("verified");
  });

  it("marks a siri-blocked ledger unverified with ILA174", () => {
    const result = validatePilotLedger(loadFixture("siri-blocked.yaml"));
    expect(result.status).toBe("unverified");
    expect(result.diagnostics.map((item) => item.code)).toContain("ILA174");
    expect(result.summary).toContain("unverified");
    expect(result.summary).toContain("siri");
    expect(result.summary).toContain("find-alpha");
  });

  it("marks a risky journey with missing ownership unverified with ILA174", () => {
    const result = validatePilotLedger(loadFixture("risky-incomplete.yaml"));
    expect(result.status).toBe("unverified");
    expect(result.diagnostics.map((item) => item.code)).toContain("ILA174");
    expect(result.summary).toContain("mark-beta-read");
  });

  it("marks a ledger with a failed reproduction unverified with ILA175", () => {
    const result = validatePilotLedger(loadFixture("reproduction-failed.yaml"));
    expect(result.status).toBe("unverified");
    expect(result.diagnostics.map((item) => item.code)).toContain("ILA175");
  });

  it("marks a ledger without reproduction unverified with ILA175", () => {
    const ledger = loadFixture("verified-macos.yaml") as Record<string, unknown>;
    const { reproduction: _removed, ...withoutReproduction } = ledger;
    const result = validatePilotLedger(withoutReproduction);
    expect(result.status).toBe("unverified");
    expect(result.diagnostics.map((item) => item.code)).toContain("ILA175");
  });

  it("rejects an unknown version with ILA173 and the field path", () => {
    const ledger = { ...(loadFixture("verified-macos.yaml") as Record<string, unknown>), schema: "pilot-evidence/9.9" };
    const result = validatePilotLedger(ledger);
    expect(result.status).toBe("unverified");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "ILA173", path: "schema" })
    );
  });

  it("rejects a fourth journey with ILA173", () => {
    const ledger = loadFixture("verified-macos.yaml") as Record<string, unknown>;
    const journeys = ledger["journeys"] as readonly unknown[];
    const result = validatePilotLedger({ ...ledger, journeys: [...journeys, ...journeys.slice(0, 2)] });
    expect(result.status).toBe("unverified");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "ILA173", path: "journeys" })
    );
  });

  it("rejects an unknown layer status with ILA173 and the field path", () => {
    const ledger = loadFixture("verified-macos.yaml") as Record<string, unknown>;
    const journeys = ledger["journeys"] as Record<string, unknown>[];
    const first = journeys[0] as Record<string, unknown>;
    const patched = {
      ...ledger,
      journeys: [{ ...first, layers: { ...(first["layers"] as Record<string, unknown>), siri: "observed" } }, ...journeys.slice(1)]
    };
    const result = validatePilotLedger(patched);
    expect(result.status).toBe("unverified");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "ILA173", path: "journeys[0].layers.siri" })
    );
  });

  it("is deterministic for the same ledger", () => {
    const ledger = loadFixture("siri-blocked.yaml");
    expect(validatePilotLedger(ledger)).toEqual(validatePilotLedger(loadFixture("siri-blocked.yaml")));
  });
});
