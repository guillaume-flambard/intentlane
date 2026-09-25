import { describe, expect, it } from "vitest";
import { defaultClaimSet } from "./claims.js";
import { evaluateReleaseVerification } from "./release-verification.js";

const passingGates = {
  contract: "pass",
  generated: "pass",
  applicationTests: "pass",
  integrationTests: "pass",
  metadata: "pass",
  indexSync: "pass"
} as const;

const run = (confidence: unknown) =>
  evaluateReleaseVerification({ claims: defaultClaimSet(), gates: passingGates, observed: {}, confidence: { contract: confidence } as never });
const statusOf = (r: ReturnType<typeof run>) => r.claims.find((o) => o.id === "contract")?.status;

describe("malformed confidence can never certify", () => {
  const cases: [string, unknown][] = [
    ["out of range above one", { confidence: 5, distribution: {} }],
    ["out of range below zero", { confidence: -3, distribution: { verified: 1 } }],
    ["no distribution", { confidence: 0.99 }],
    ["empty distribution", { confidence: 0.99, distribution: {} }],
    ["a bare number", 1],
    ["a bare string", "high"],
    ["a boolean", true],
    ["null", null],
    ["a probability above one in the distribution", { confidence: 0.9, distribution: { verified: 4 } }],
    ["NaN", { confidence: Number.NaN, distribution: { verified: 1 } }]
  ];

  it.each(cases)("refuses %s", (_label, value) => {
    const result = run(value);
    expect(result.status).not.toBe("certified");
    expect(statusOf(result)).not.toBe("verified");
  });
});
