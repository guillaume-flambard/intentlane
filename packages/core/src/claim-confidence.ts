import { claimConfidenceSchema, type ClaimConfidence } from "../../schema/src/index.js";
import type { GateStatus } from "./release-verification.js";

export const DEFAULT_CLAIM_CONFIDENCE_THRESHOLD = 0.8;

export const LOCAL_CONFIDENCE_SOURCE_ID = "local-deterministic";

export type ClaimVerdictStatus = "verified" | "contested" | "unevaluated" | "unsupported";

export type ClaimVerdict = Readonly<{
  claimId: string;
  status: ClaimVerdictStatus;
  reason: string;
  confidence: ClaimConfidence | undefined;
  threshold: number;
}>;

export type ClaimConfidenceSource = Readonly<{
  id: string;
  network: boolean;
  confidenceFor: (claimId: string, gate: GateStatus) => ClaimConfidence;
}>;

export function parseClaimConfidence(value: unknown): ClaimConfidence {
  return claimConfidenceSchema.parse(value);
}

export function readClaimConfidence(value: unknown): ClaimConfidence | undefined {
  const parsed = claimConfidenceSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export const localDeterministicConfidence: ClaimConfidenceSource = {
  id: LOCAL_CONFIDENCE_SOURCE_ID,
  network: false,
  confidenceFor: (_claimId, gate) =>
    gate === "pass"
      ? { confidence: 1, distribution: { verified: 1 } }
      : { confidence: 1, distribution: { unsupported: 1 } }
};

export type DeriveClaimVerdictInput = Readonly<{
  claimId: string;
  gate: GateStatus;
  confidence: unknown;
  threshold: number;
}>;

export function deriveClaimVerdict(input: DeriveClaimVerdictInput): ClaimVerdict {
  const { claimId, gate, threshold } = input;

  if (gate !== "pass") {
    return {
      claimId,
      status: "unsupported",
      reason: `The deterministic command reported '${gate}'. A hard deterministic result is not a contestable question, so no confidence revises it in either direction.`,
      confidence: readClaimConfidence(input.confidence),
      threshold
    };
  }

  if (input.confidence === undefined || input.confidence === null) {
    return {
      claimId,
      status: "unevaluated",
      reason:
        "No confidence source produced a value for this claim, so its contestability is unknown. An unknown contestability is not a pass.",
      confidence: undefined,
      threshold
    };
  }

  const confidence = readClaimConfidence(input.confidence);
  if (confidence === undefined) {
    return {
      claimId,
      status: "unevaluated",
      reason:
        "The confidence a source reported is not a readable confidence: it needs a value between 0 and 1 and the distribution that produced it. An unreadable confidence is not a pass, and it is not rounded into one.",
      confidence: undefined,
      threshold
    };
  }

  if (confidence.confidence < threshold) {
    return {
      claimId,
      status: "contested",
      reason:
        `The deterministic command passed, but confidence ${confidence.confidence} is below the threshold ${threshold}, so the evidence does not support a claim. The most probable option does not decide this: a value judgement split between two options is not a defensible answer, and a strong preference is not certainty.`,
      confidence,
      threshold
    };
  }

  return {
    claimId,
    status: "verified",
    reason: "The deterministic command agreed and the confidence is at or above the threshold.",
    confidence,
    threshold
  };
}
