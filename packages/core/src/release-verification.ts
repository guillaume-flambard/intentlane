import { claim, isPilotClaimId, type PilotClaimId } from "./claims.js";

export type GateStatus = "pass" | "fail" | "missing";
export type ObservedStatus = "verified" | "unverified" | "not-requested";

export type ClaimOutcomeStatus = "verified" | "failed" | "missing" | "pending" | "unknown-claim";

export type ClaimOutcome = Readonly<{
  id: string;
  evidence: "deterministic" | "observed";
  status: ClaimOutcomeStatus;
  verifiedBy: string;
}>;

export type ReleaseVerificationInput = Readonly<{
  /** The claims being certified, as declared by the pilot or passed on the command line. */
  claims: readonly string[];
  /** Result of every deterministic gate, keyed by claim id. */
  gates: Readonly<Record<string, GateStatus | undefined>>;
  /** Result of every observed claim, keyed by claim id. */
  observed: Readonly<Record<string, ObservedStatus | undefined>>;
}>;

export type ReleaseVerificationResult = Readonly<{
  status: "certified" | "pending-evidence" | "blocked";
  claims: readonly ClaimOutcome[];
  failures: readonly string[];
  pending: readonly string[];
  nextAction: string;
}>;

/**
 * Certify a declared claim set, and nothing else.
 *
 * A deterministic claim is settled by a gate. An observed claim is settled only by
 * a person. The result therefore names every claim it covers, so `certified` can
 * never be read on its own as "the system surface works": a caller that certifies
 * five deterministic claims and claims no observation gets exactly that.
 */
export function evaluateReleaseVerification(input: ReleaseVerificationInput): ReleaseVerificationResult {
  const unknown = input.claims.filter((id) => !isPilotClaimId(id));
  if (unknown.length > 0) {
    return {
      status: "blocked",
      claims: unknown.map((id) => ({ id, evidence: "deterministic", status: "unknown-claim", verifiedBy: "unknown" })),
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

  const outcomes: ClaimOutcome[] = [];
  const failures: string[] = [];
  const pending: string[] = [];

  for (const id of input.claims) {
    const entry = claim(id as PilotClaimId);
    if (entry.evidence === "observed") {
      const status = input.observed[id];
      if (status === "verified") {
        outcomes.push({ id, evidence: "observed", status: "verified", verifiedBy: entry.verifiedBy });
      } else {
        outcomes.push({ id, evidence: "observed", status: "pending", verifiedBy: entry.verifiedBy });
        pending.push(id);
      }
      continue;
    }
    const status = input.gates[id] ?? "missing";
    const outcome: ClaimOutcomeStatus = status === "pass" ? "verified" : status === "fail" ? "failed" : "missing";
    outcomes.push({ id, evidence: "deterministic", status: outcome, verifiedBy: entry.verifiedBy });
    if (outcome !== "verified") failures.push(id);
  }

  if (failures.length > 0) {
    return {
      status: "blocked",
      claims: outcomes,
      failures,
      pending,
      nextAction: `Fix the failing claim(s) before certifying: ${failures.join(", ")}.`
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
