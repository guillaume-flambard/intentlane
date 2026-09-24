import { describe, expect, it } from "vitest";
import { defaultClaimSet } from "./claims.js";
import { evaluateReleaseVerification, type ReleaseVerificationInput } from "./release-verification.js";

const passingGates = {
  contract: "pass",
  generated: "pass",
  applicationTests: "pass",
  integrationTests: "pass",
  metadata: "pass",
  indexSync: "pass"
} as const;

function verify(overrides: Partial<ReleaseVerificationInput> = {}) {
  return evaluateReleaseVerification({
    claims: defaultClaimSet(),
    gates: passingGates,
    observed: {},
    ...overrides
  });
}

describe("release verification", () => {
  it("certifies a fully passing deterministic claim set and names every claim", () => {
    const result = verify();
    expect(result.status).toBe("certified");
    expect(result.failures).toEqual([]);
    expect(result.pending).toEqual([]);
    expect(result.claims.map((outcome) => outcome.id).sort()).toEqual([...defaultClaimSet()].sort());
    expect(result.claims.every((outcome) => outcome.status === "verified")).toBe(true);
  });

  it("never returns certified without the list of claims it covers", () => {
    const result = verify();
    expect(result.claims.length).toBeGreaterThan(0);
    expect(result.claims.every((outcome) => outcome.evidence === "deterministic")).toBe(true);
  });

  it("blocks and names the claim when a deterministic gate fails", () => {
    const result = verify({ gates: { ...passingGates, integrationTests: "fail" } });
    expect(result.status).toBe("blocked");
    expect(result.failures).toEqual(["integrationTests"]);
    expect(result.claims.find((outcome) => outcome.id === "integrationTests")?.status).toBe("failed");
    expect(result.nextAction).toContain("integrationTests");
  });

  it("blocks when a claimed gate supplied no result at all", () => {
    const result = verify({ gates: { ...passingGates, indexSync: undefined } as never });
    expect(result.status).toBe("blocked");
    expect(result.failures).toContain("indexSync");
    expect(result.claims.find((outcome) => outcome.id === "indexSync")?.status).toBe("missing");
  });

  it("blocks on an unknown claim instead of silently certifying less", () => {
    const result = verify({ claims: ["contract", "siri-conversations"] as never });
    expect(result.status).toBe("blocked");
    expect(result.nextAction).toMatch(/unknown claim/i);
  });

  it("blocks an empty claim set rather than certifying nothing", () => {
    const result = verify({ claims: [] });
    expect(result.status).toBe("blocked");
    expect(result.nextAction).toMatch(/empty/i);
  });

  it("keeps passing automatic claims verified while an observed claim is pending", () => {
    const result = verify({ claims: [...defaultClaimSet(), "siri-conversation"] });
    expect(result.status).toBe("pending-evidence");
    expect(result.pending).toEqual(["siri-conversation"]);
    expect(result.failures).toEqual([]);
    expect(result.claims.find((outcome) => outcome.id === "siri-conversation")?.evidence).toBe("observed");
    expect(result.claims.find((outcome) => outcome.id === "contract")?.status).toBe("verified");
    expect(result.nextAction).toContain("siri-conversation");
  });

  it("certifies the observed claim once it is verified", () => {
    const result = verify({
      claims: [...defaultClaimSet(), "siri-conversation"],
      observed: { "siri-conversation": "verified" }
    });
    expect(result.status).toBe("certified");
    expect(result.pending).toEqual([]);
  });

  it("treats an unverified observation as pending rather than as a failure", () => {
    const result = verify({
      claims: [...defaultClaimSet(), "siri-conversation"],
      observed: { "siri-conversation": "unverified" }
    });
    expect(result.status).toBe("pending-evidence");
    expect(result.failures).toEqual([]);
  });

  it("blocks on a deterministic failure even when every observation is verified", () => {
    const result = verify({
      claims: [...defaultClaimSet(), "siri-conversation"],
      gates: { ...passingGates, metadata: "fail" },
      observed: { "siri-conversation": "verified" }
    });
    expect(result.status).toBe("blocked");
    expect(result.failures).toEqual(["metadata"]);
  });
});
