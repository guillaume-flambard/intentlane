import type { ClaimConfidence } from "../../schema/src/index.js";
import {
  DEFAULT_CLAIM_CONFIDENCE_THRESHOLD,
  deriveClaimVerdict,
  localDeterministicConfidence,
  type ClaimConfidenceSource
} from "./claim-confidence.js";
import { claim, isPilotClaimId, type PilotClaimId } from "./claims.js";

export type GateStatus = "pass" | "fail" | "missing";
export type ObservedStatus = "verified" | "unverified" | "not-requested";

export type ClaimOutcomeStatus = "verified" | "failed" | "missing" | "pending" | "contested" | "unknown-claim";

export type ClaimOutcome = Readonly<{
  id: string;
  evidence: "deterministic" | "observed";
  status: ClaimOutcomeStatus;
  verifiedBy: string;
  reason: string;
  confidence: ClaimConfidence | undefined;
}>;

export type ReleaseVerificationInput = Readonly<{
  claims: readonly string[];
  gates: Readonly<Record<string, GateStatus | undefined>>;
  observed: Readonly<Record<string, ObservedStatus | undefined>>;
  confidence?: Readonly<Record<string, ClaimConfidence | undefined>>;
  confidenceSource?: ClaimConfidenceSource;
  confidenceThreshold?: number;
}>;

export type ReleaseVerificationResult = Readonly<{
  status: "certified" | "pending-evidence" | "blocked";
  claims: readonly ClaimOutcome[];
  failures: readonly string[];
  pending: readonly string[];
  nextAction: string;
}>;

export function evaluateReleaseVerification(input: ReleaseVerificationInput): ReleaseVerificationResult {
  const unknown = input.claims.filter((id) => !isPilotClaimId(id));
  if (unknown.length > 0) {
    return {
      status: "blocked",
      claims: unknown.map((id) => ({
        id,
        evidence: "deterministic",
        status: "unknown-claim",
        verifiedBy: "unknown",
        reason: "The claim is not a known claim, so nothing can settle it.",
        confidence: undefined
      })),
      failures: unknown,
      pending: [],
      nextAction: `Remove or correct the unknown claim(s): ${unknown.join(", ")}. Certification refuses to run on a claim it cannot resolve.`
    };
  }

  if (input.claims.length === 0) {
    return {
      status: "blocked",
      claims: [],
      failures: [],
      pending: [],
      nextAction: "The claim set is empty, so nothing would be certified. Declare at least one claim."
    };
  }

  const source = input.confidenceSource ?? localDeterministicConfidence;
  const threshold = input.confidenceThreshold ?? DEFAULT_CLAIM_CONFIDENCE_THRESHOLD;

  const outcomes: ClaimOutcome[] = [];
  const failures: string[] = [];
  const pending: string[] = [];

  for (const id of input.claims) {
    const entry = claim(id as PilotClaimId);
    if (entry.evidence === "observed") {
      const status = input.observed[id];
      if (status === "verified") {
        outcomes.push({
          id,
          evidence: "observed",
          status: "verified",
          verifiedBy: entry.verifiedBy,
          reason: "A person recorded the observation.",
          confidence: undefined
        });
      } else {
        outcomes.push({
          id,
          evidence: "observed",
          status: "pending",
          verifiedBy: entry.verifiedBy,
          reason: "No public API can settle this, so it needs a person.",
          confidence: undefined
        });
        pending.push(id);
      }
      continue;
    }

    const gate: GateStatus = input.gates[id] ?? "missing";
    const stated = input.confidence !== undefined && id in input.confidence;
    const confidence = stated ? input.confidence?.[id] : source.confidenceFor(id, gate);
    const verdict = deriveClaimVerdict({ claimId: id, gate, confidence, threshold });
    if (verdict.status === "verified") {
      outcomes.push({ id, evidence: "deterministic", status: "verified", verifiedBy: entry.verifiedBy, reason: verdict.reason, confidence });
      continue;
    }

    if (verdict.status === "unsupported") {
      const status: ClaimOutcomeStatus = gate === "fail" ? "failed" : "missing";
      outcomes.push({ id, evidence: "deterministic", status, verifiedBy: entry.verifiedBy, reason: verdict.reason, confidence });
      failures.push(id);
      continue;
    }

    outcomes.push({ id, evidence: "deterministic", status: "contested", verifiedBy: entry.verifiedBy, reason: verdict.reason, confidence });
    failures.push(id);
  }
  if (failures.length > 0) {
    const contested = outcomes.filter((outcome) => outcome.status === "contested").map((outcome) => outcome.id);
    const unsupported = failures.filter((id) => !contested.includes(id));
    return {
      status: "blocked",
      claims: outcomes,
      failures,
      pending,
      nextAction:
        contested.length > 0
          ? `Contested claim(s), whose evidence cleared no threshold and is therefore not claimed: ${contested.join(", ")}. Read the distribution on each one before deciding. Then fix: ${unsupported.join(", ") || "none"}.`
          : `Fix the failing claim(s) before certifying: ${failures.join(", ")}.`
    };
  }
  if (pending.length > 0) {
    return {
      status: "pending-evidence",
      claims: outcomes,
      failures,
      pending,
      nextAction: `Record the observation for: ${pending.join(", ")}. No public API can settle these, so they need a person, and until then they are simply not certified.`
    };
  }
  return {
    status: "certified",
    claims: outcomes,
    failures,
    pending,
    nextAction: `Certified for the declared claims only: ${outcomes.map((outcome) => outcome.id).join(", ")}. Any claim not listed here is not certified.`
  };
}
