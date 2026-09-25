import { describe, expect, it } from "vitest";
import {
  DEFAULT_CLAIM_CONFIDENCE_THRESHOLD,
  deriveClaimVerdict,
  localDeterministicConfidence,
  parseClaimConfidence
} from "./claim-confidence.js";
import type { GateStatus } from "./release-verification.js";

const verdict = (overrides: Partial<Parameters<typeof deriveClaimVerdict>[0]> = {}) =>
  deriveClaimVerdict({ claimId: "contract", gate: "pass", confidence: undefined, threshold: DEFAULT_CLAIM_CONFIDENCE_THRESHOLD, ...overrides });

const decisive = (confidence: number) => ({ confidence, distribution: { verified: confidence, contested: 1 - confidence } });

describe("claim confidence threshold", () => {
  it("is the measured midpoint between a decisive answer and a value judgement", () => {
    expect(DEFAULT_CLAIM_CONFIDENCE_THRESHOLD).toBe(0.8);
  });
});

describe("deriving a claim verdict", () => {
  it("verifies only when the deterministic command agrees and the confidence clears the threshold", () => {
    expect(verdict({ confidence: decisive(0.97) }).status).toBe("verified");
  });

  it("verifies a confidence sitting exactly on the threshold", () => {
    expect(verdict({ confidence: decisive(0.8) }).status).toBe("verified");
  });

  it("refuses to verify below the threshold even though the command agrees", () => {
    expect(verdict({ confidence: decisive(0.79) }).status).toBe("contested");
  });

  it("carries the distribution and the confidence into a contested verdict so a reader can see the doubt", () => {
    const result = verdict({ confidence: { confidence: 0.26, distribution: { block_entirely: 0.5, warn_and_mask: 0.5 } } });
    expect(result.status).toBe("contested");
    expect(result.confidence).toEqual({ confidence: 0.26, distribution: { block_entirely: 0.5, warn_and_mask: 0.5 } });
    expect(result.reason).toContain("0.26");
  });

  it("holds the measured even split below the threshold, where the argmax alone would have decided", () => {
    const result = verdict({ confidence: { confidence: 0.26, distribution: { block_entirely: 0.5, warn_and_mask: 0.5 } } });
    expect(result.status).not.toBe("verified");
    expect(result.status).not.toBe("unsupported");
  });

  it("holds a strong plurality below the threshold, because a strong preference is not certainty", () => {
    const result = verdict({ confidence: { confidence: 0.4, distribution: { block_entirely: 0.98, warn_and_mask: 0.01, allow: 0.01 } } });
    expect(result.status).toBe("contested");
  });

  it("never lets a confidence revise a failing command", () => {
    const result = verdict({ gate: "fail", confidence: decisive(1) });
    expect(result.status).toBe("unsupported");
    expect(result.reason).toMatch(/no confidence revises it/i);
  });

  it("never lets a low confidence soften a failing command into a contest", () => {
    expect(verdict({ gate: "fail", confidence: decisive(0.1) }).status).toBe("unsupported");
  });

  it("never lets a confidence revise a command that reported nothing", () => {
    expect(verdict({ gate: "missing", confidence: decisive(1) }).status).toBe("unsupported");
  });

  it("does not turn a missing command into a contest, because a confidence about nothing is meaningless", () => {
    expect(verdict({ gate: "missing", confidence: decisive(0.1) }).status).toBe("unsupported");
  });

  it("does not treat an absent confidence on a passing command as a pass", () => {
    const result = verdict({ confidence: undefined });
    expect(result.status).toBe("unevaluated");
    expect(result.reason).toMatch(/not a pass/i);
  });
});

describe("the local confidence source", () => {
  it("makes no network call, so the gate stays reproducible offline", () => {
    expect(localDeterministicConfidence.network).toBe(false);
  });

  it("is fully confident in a command that passed, because deterministic evidence is not contestable", () => {
    const result = verdict({ confidence: localDeterministicConfidence.confidenceFor("contract", "pass") });
    expect(result.status).toBe("verified");
  });

  it("is certain the claim is unsupported when the command did not pass, because nothing contests a hard result", () => {
    const result = verdict({ gate: "missing", confidence: localDeterministicConfidence.confidenceFor("indexSync", "missing") });
    expect(result.status).toBe("unsupported");
  });

  it("reproduces the same verdict for the same inputs, which is what offline means", () => {
    const once = verdict({ confidence: localDeterministicConfidence.confidenceFor("contract", "pass") });
    const twice = verdict({ confidence: localDeterministicConfidence.confidenceFor("contract", "pass") });
    expect(once).toEqual(twice);
  });
});

describe("claim confidence parsing", () => {
  it("accepts a well-formed confidence from a source", () => {
    expect(parseClaimConfidence({ confidence: 0.9, distribution: { verified: 0.9, contested: 0.1 } })).toEqual({
      confidence: 0.9,
      distribution: { verified: 0.9, contested: 0.1 }
    });
  });

  it("refuses a confidence a source reports without a distribution", () => {
    expect(() => parseClaimConfidence({ confidence: 0.9 })).toThrow();
  });

  it("refuses a confidence above one rather than trusting the source", () => {
    expect(() => parseClaimConfidence({ confidence: 1.2, distribution: { verified: 1.2 } })).toThrow();
  });
});

describe("the full gate matrix", () => {
  const decisive = (confidence: number) => ({ confidence, distribution: { verified: confidence, contested: 1 - confidence } });
  const absent = undefined;
  const outOfRange = { confidence: 5, distribution: {} };
  const unreadable = { confidence: 0.99 };
  const below = { confidence: 0.26, distribution: { block_entirely: 0.5, warn_and_mask: 0.5 } };

  const expected: Readonly<Record<string, string>> = {
    "pass|absent": "unevaluated",
    "pass|outOfRange": "unevaluated",
    "pass|unreadable": "unevaluated",
    "pass|below": "contested",
    "pass|decisive(0.8)": "verified",
    "pass|decisive(0.97)": "verified",
    "fail|absent": "unsupported",
    "fail|outOfRange": "unsupported",
    "fail|below": "unsupported",
    "fail|decisive(1)": "unsupported",
    "missing|absent": "unsupported",
    "missing|outOfRange": "unsupported",
    "missing|below": "unsupported",
    "missing|decisive(1)": "unsupported"
  };

  const cases: Readonly<Record<string, unknown>> = { absent, outOfRange, unreadable, below, "decisive(0.8)": decisive(0.8), "decisive(0.97)": decisive(0.97), "decisive(1)": decisive(1) };

  for (const gate of ["pass", "fail", "missing"] as const) {
    for (const [label, confidence] of Object.entries(cases)) {
      const key = `${gate}|${label}`;
      if (expected[key] === undefined) continue;
      it(`resolves ${key} to ${expected[key]}`, () => {
        expect(
          deriveClaimVerdict({ claimId: "contract", gate, confidence, threshold: DEFAULT_CLAIM_CONFIDENCE_THRESHOLD }).status
        ).toBe(expected[key]);
      });
    }
  }
});
