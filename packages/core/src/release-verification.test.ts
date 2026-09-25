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

describe("contested claims", () => {
  const measured = { confidence: 0.26, distribution: { block_entirely: 0.5, warn_and_mask: 0.5 } };

  it("refuses to certify a claim whose command passed but whose confidence is below the threshold", () => {
    const result = verify({ confidence: { contract: measured } });
    expect(result.status).toBe("blocked");
    expect(result.failures).toEqual(["contract"]);
    expect(result.claims.find((outcome) => outcome.id === "contract")?.status).toBe("contested");
  });

  it("carries the distribution into the outcome so a reader can see the doubt", () => {
    const outcome = verify({ confidence: { contract: measured } }).claims.find((entry) => entry.id === "contract");
    expect(outcome?.confidence).toEqual(measured);
    expect(outcome?.reason).toContain("0.26");
  });

  it("names the contested claims in the next action rather than calling them failures", () => {
    const result = verify({ confidence: { contract: measured, metadata: measured } });
    expect(result.nextAction).toMatch(/contested/i);
    expect(result.nextAction).toContain("contract");
    expect(result.nextAction).toContain("metadata");
  });

  it("does not let a contest hide a hard failure, and names both kinds apart", () => {
    const result = verify({ gates: { ...passingGates, metadata: "fail" }, confidence: { contract: measured } });
    expect(result.status).toBe("blocked");
    expect(result.claims.find((outcome) => outcome.id === "contract")?.status).toBe("contested");
    expect(result.claims.find((outcome) => outcome.id === "metadata")?.status).toBe("failed");
    expect(result.nextAction).toMatch(/contested/i);
  });

  it("certifies the same claim once its confidence clears the threshold", () => {
    const result = verify({ confidence: { contract: { confidence: 0.97, distribution: { verified: 0.97, contested: 0.03 } } } });
    expect(result.status).toBe("certified");
    expect(result.failures).toEqual([]);
  });

  it("treats a source that supplied no value as a contest rather than as a pass", () => {
    const result = verify({ confidence: { contract: undefined } });
    expect(result.status).toBe("blocked");
    expect(result.claims.find((outcome) => outcome.id === "contract")?.status).toBe("contested");
    expect(result.claims.find((outcome) => outcome.id === "contract")?.confidence).toBeUndefined();
  });

  it("leaves an observed claim to a person, with no confidence attached", () => {
    const result = verify({ claims: [...defaultClaimSet(), "siri-conversation"], observed: { "siri-conversation": "verified" } });
    const outcome = result.claims.find((entry) => entry.id === "siri-conversation");
    expect(outcome?.status).toBe("verified");
    expect(outcome?.confidence).toBeUndefined();
  });

  it("stays certified by default without any confidence declared, which is what keeps the gate offline", () => {
    const result = verify();
    expect(result.status).toBe("certified");
    expect(result.claims.every((outcome) => outcome.confidence !== undefined)).toBe(true);
  });
});
