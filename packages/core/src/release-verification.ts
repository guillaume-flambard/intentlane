export const AUTOMATIC_VERIFICATION_GATES = [
  "contract",
  "generated",
  "applicationTests",
  "metadata"
] as const;

export type AutomaticVerificationGate = (typeof AUTOMATIC_VERIFICATION_GATES)[number];
export type AutomaticVerificationStatus = "pass" | "fail" | "missing";
export type LiveEvidenceStatus = "verified" | "unverified" | "not-requested";

export type ReleaseVerificationInput = Readonly<Record<AutomaticVerificationGate, AutomaticVerificationStatus>> & Readonly<{
  liveEvidence: LiveEvidenceStatus;
}>;

export type ReleaseVerificationResult = Readonly<{
  status: "certified" | "awaiting-live-evidence" | "blocked";
  automaticReady: boolean;
  liveReady: boolean;
  blockers: readonly AutomaticVerificationGate[];
  nextAction: string;
}>;

/**
 * Keep deterministic build confidence separate from the operating-system
 * experience. A green compile cannot certify a Siri UI conversation; only a
 * separately reproduced evidence ledger can do that.
 */
export function evaluateReleaseVerification(input: ReleaseVerificationInput): ReleaseVerificationResult {
  const blockers = AUTOMATIC_VERIFICATION_GATES.filter((gate) => input[gate] !== "pass");
  const automaticReady = blockers.length === 0;
  const liveReady = input.liveEvidence === "verified";
  if (!automaticReady) {
    return {
      status: "blocked",
      automaticReady,
      liveReady,
      blockers,
      nextAction: "Fix or supply the blocked automatic verification gates before certifying this integration."
    };
  }
  if (!liveReady) {
    return {
      status: "awaiting-live-evidence",
      automaticReady,
      liveReady,
      blockers: [],
      nextAction: "Record independently reproduced live Spotlight and Siri evidence before claiming certification."
    };
  }
  return {
    status: "certified",
    automaticReady,
    liveReady,
    blockers: [],
    nextAction: "The integration is certified for the declared contract, build and recorded system evidence."
  };
}
