import { describe, expect, it } from "vitest";
import { PILOT_MANIFEST_VERSION, parsePilotManifest } from "./pilot-manifest.js";

const valid = {
  version: PILOT_MANIFEST_VERSION,
  contract: "./contract.yaml",
  claims: ["contract", "generated", "applicationTests", "integrationTests", "metadata", "indexSync"],
  gates: {
    applicationTests: "bash tests/run-all-tests.sh",
    integrationTests: "bash tests/run-integration-tests.sh",
    indexSync: "bash tests/run-index-tests.sh"
  },
  generated: "./out",
  metadata: "./out/metadata/Metadata.appintents"
};

function parse(value: unknown) {
  return parsePilotManifest(value);
}

describe("pilot manifest", () => {
  it("accepts a manifest whose claimed deterministic claims all carry a command", () => {
    const result = parse(valid);
    expect(result.manifest?.claims).toEqual(valid.claims);
    expect(result.diagnostics).toEqual([]);
    expect(result.manifest?.gates["integrationTests"]).toBe("bash tests/run-integration-tests.sh");
  });

  it("rejects an unknown claim identifier instead of certifying less than declared", () => {
    const result = parse({ ...valid, claims: [...valid.claims, "siri-conversations"] });
    expect(result.manifest).toBeUndefined();
    expect(result.diagnostics.map((diagnostic) => diagnostic.code)).toContain("ILA177");
    expect(result.diagnostics[0]?.message).toMatch(/unknown claim/i);
  });

  it("rejects a deterministic claim that has no command to settle it", () => {
    const result = parse({
      ...valid,
      claims: [...valid.claims, "registration"],
      gates: { ...valid.gates, integrationTests: "" }
    });
    const codes = result.diagnostics.map((diagnostic) => diagnostic.code);
    expect(result.manifest).toBeUndefined();
    expect(codes).toContain("ILA178");
    expect(result.diagnostics.some((diagnostic) => /registration/.test(diagnostic.message))).toBe(true);
  });

  it("rejects a manifest that tries to declare its own evidence kind", () => {
    const result = parse({ ...valid, evidence: "deterministic" });
    expect(result.manifest).toBeUndefined();
    expect(result.diagnostics.some((diagnostic) => /evidence/.test(diagnostic.message))).toBe(true);
  });

  it("rejects a wrong version, a missing contract and a non-object", () => {
    expect(parse({ ...valid, version: "intentlane-pilot/9.9" }).diagnostics[0]?.code).toBe("ILA176");
    const noContract = parse({ ...valid, contract: undefined });
    expect(noContract.diagnostics[0]?.code).toBe("ILA176");
    expect(parse("not a manifest").diagnostics[0]?.code).toBe("ILA176");
  });

  it("keeps the ledger optional, because an unclaimed observation needs no ledger", () => {
    expect(parse(valid).manifest?.ledger).toBeUndefined();
    const withLedger = parse({ ...valid, ledger: "./evidence-ledger.yaml" });
    expect(withLedger.manifest?.ledger).toBe("./evidence-ledger.yaml");
  });

  it("accepts an observed claim and does not ask for a gate command for it", () => {
    const result = parse({ ...valid, claims: [...valid.claims, "siri-conversation"], ledger: "./ledger.yaml" });
    expect(result.manifest?.claims).toContain("siri-conversation");
    expect(result.diagnostics).toEqual([]);
  });
});
