import { describe, expect, it } from "vitest";
import { claimConfidenceSchema } from "./index.js";

const confidence = (overrides: Record<string, unknown> = {}) => ({
  confidence: 0.97,
  distribution: { verified: 0.98, contested: 0.02 },
  ...overrides
});

describe("claim confidence", () => {
  it("accepts a confidence that carries its distribution", () => {
    expect(claimConfidenceSchema.safeParse(confidence()).success).toBe(true);
  });

  it("accepts a confidence of exactly zero, which is a real answer", () => {
    expect(claimConfidenceSchema.safeParse(confidence({ confidence: 0, distribution: { verified: 0 } })).success).toBe(true);
  });

  it("rejects a confidence above one instead of clamping it", () => {
    const result = claimConfidenceSchema.safeParse(confidence({ confidence: 1.4 }));
    expect(result.success).toBe(false);
  });

  it("rejects a negative confidence", () => {
    expect(claimConfidenceSchema.safeParse(confidence({ confidence: -0.2 })).success).toBe(false);
  });

  it("rejects a confidence that carries no distribution and points at the field", () => {
    const result = claimConfidenceSchema.safeParse({ confidence: 0.9 });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected a rejection");
    expect(result.error.issues[0]?.path).toEqual(["distribution"]);
  });

  it("rejects an empty distribution", () => {
    const result = claimConfidenceSchema.safeParse(confidence({ distribution: {} }));
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected a rejection");
    expect(result.error.issues[0]?.message).toMatch(/distribution/i);
  });

  it("rejects a distribution holding a probability outside the unit interval", () => {
    expect(claimConfidenceSchema.safeParse(confidence({ distribution: { verified: 1.2 } })).success).toBe(false);
  });

  it("rejects an unknown field rather than ignoring it", () => {
    const result = claimConfidenceSchema.safeParse(confidence({ model: "jev-1.13.0" }));
    expect(result.success).toBe(false);
  });
});
