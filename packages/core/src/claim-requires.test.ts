import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { PILOT_CLAIMS, PILOT_LEDGER_CLAIMABLE_LAYERS, PILOT_LEDGER_REQUIRED_LAYERS, PILOT_LEDGER_LAYERS } from "./index.js";
import { validatePilotLedger } from "./pilot-ledger.js";

const ledgerPath = resolve(import.meta.dirname, "..", "..", "..", "pilots", "iina", "evidence-ledger.yaml");

function loadIinaLedger(): unknown {
  return parse(readFileSync(ledgerPath, "utf8")) as unknown;
}

describe("the shipped IINA ledger reads exactly as it did before the vocabulary grew", () => {
  it("is unverified for the reasons its own file declares, and not for a new one", () => {
    const result = validatePilotLedger(loadIinaLedger());
    expect(result.status).toBe("unverified");
    const codes = result.diagnostics.map((diagnostic) => diagnostic.code).sort();
    expect(codes).toEqual(["ILA174", "ILA174", "ILA174", "ILA174", "ILA174", "ILA175"]);
  });

  it("raises nothing about a layer the wider vocabulary added", () => {
    const rendered = JSON.stringify(validatePilotLedger(loadIinaLedger()).diagnostics);
    for (const added of ["metadata", "runtime", "query", "annotations"]) {
      expect(rendered, `a new layer leaked into the diagnostics of an old ledger: ${added}`).not.toContain(added);
    }
  });

  it("still reads all three journeys and the layers they already declared", () => {
    const paths = validatePilotLedger(loadIinaLedger()).diagnostics.map((diagnostic) => diagnostic.path);
    for (const id of ["find-played-media", "open-played-media", "refuse-unknown-media"]) {
      expect(paths.some((path) => path.startsWith(`journeys.${id}.`)), `journey ${id} stopped being read`).toBe(true);
    }
    expect(paths.some((path) => path.endsWith(".layers.spotlight"))).toBe(true);
    expect(paths.some((path) => path.endsWith(".layers.siri"))).toBe(true);
  });

  it("still refuses the ledger outright, because reproduction has not happened", () => {
    const rendered = JSON.stringify(validatePilotLedger(loadIinaLedger()).diagnostics);
    expect(rendered).toMatch(/ILA175/);
    expect(rendered).toMatch(/none yet/);
  });
});

describe("what each claim requires", () => {
  it("declares the layers that prove it, and no claim declares nothing", () => {
    for (const claim of PILOT_CLAIMS) {
      expect(claim.requires.length, `claim ${claim.id} requires nothing`).toBeGreaterThan(0);
    }
  });

  it("only names layers the ledger knows", () => {
    for (const claim of PILOT_CLAIMS) {
      for (const layer of claim.requires) {
        expect(PILOT_LEDGER_LAYERS, `claim ${claim.id} requires unknown layer ${layer}`).toContain(layer);
      }
    }
  });

  it("makes an observed claim require a layer a person has to fill in, not only a command", () => {
    for (const claim of PILOT_CLAIMS.filter((entry) => entry.evidence === "observed")) {
      const conditional = claim.requires.filter((layer) => !PILOT_LEDGER_REQUIRED_LAYERS.includes(layer as never));
      expect(conditional.length, `observed claim ${claim.id} is settled by commands alone`).toBeGreaterThan(0);
    }
  });

  it("makes a claim that needs a real index require the layers a real index needs", () => {
    const indexSync = PILOT_CLAIMS.find((claim) => claim.id === "indexSync");
    expect(indexSync?.requires).toEqual(["contract", "build", "metadata", "query", "spotlight"]);
  });

  it("makes a claim proven by a launch require the runtime layer", () => {
    const registration = PILOT_CLAIMS.find((claim) => claim.id === "registration");
    expect(registration?.requires).toContain("runtime");
  });

  it("keeps every layer a claim requires either globally required or claimable by a journey", () => {
    for (const claim of PILOT_CLAIMS) {
      for (const layer of claim.requires) {
        const globallyRequired = (PILOT_LEDGER_REQUIRED_LAYERS as readonly string[]).includes(layer);
        const claimable = (PILOT_LEDGER_CLAIMABLE_LAYERS as readonly string[]).includes(layer);
        expect(
          globallyRequired || claimable,
          `claim ${claim.id} requires ${layer}, which a journey can neither be forced to hold nor claim`
        ).toBe(true);
      }
    }
  });
});

describe("the new layers are claimable, or the requirement rule would fire on every journey", () => {
  it("makes runtime, query, metadata and annotations claimable", () => {
    for (const layer of ["metadata", "runtime", "query", "annotations"] as const) {
      expect(PILOT_LEDGER_CLAIMABLE_LAYERS).toContain(layer);
    }
  });

  it("keeps contract and build out of the claimable set, because a journey always holds them", () => {
    expect(PILOT_LEDGER_CLAIMABLE_LAYERS).not.toContain("contract");
    expect(PILOT_LEDGER_CLAIMABLE_LAYERS).not.toContain("build");
    expect([...PILOT_LEDGER_REQUIRED_LAYERS]).toEqual(["contract", "build"]);
  });
});
