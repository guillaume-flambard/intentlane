export const CLAIM_EVIDENCE_KINDS = ["deterministic", "observed"] as const;

export type ClaimEvidenceKind = (typeof CLAIM_EVIDENCE_KINDS)[number];

export const PILOT_CLAIM_IDS = [
  "contract",
  "generated",
  "applicationTests",
  "integrationTests",
  "metadata",
  "indexSync",
  "registration",
  "siri-conversation",
  "spotlight-ui-result"
] as const;

export type PilotClaimId = (typeof PILOT_CLAIM_IDS)[number];

/**
 * What a client may claim about an integration, and what actually proves it.
 *
 * A deterministic claim is settled by a command that exits with a status. An
 * observed claim is settled only by a person watching the operating system, because
 * no public API can drive Siri or read a named Core Spotlight index back. Keeping
 * the two apart is the point: a project declares which ones it claims, so
 * certification never silently depends on a human nobody scheduled.
 */
export type PilotClaim = Readonly<{
  id: PilotClaimId;
  evidence: ClaimEvidenceKind;
  title: string;
  verifiedBy: string;
  defaultClaimed: boolean;
}>;

export const PILOT_CLAIMS: readonly PilotClaim[] = [
  {
    id: "contract",
    evidence: "deterministic",
    title: "The contract validates against the IntentLane schema",
    verifiedBy: "intentlane validate",
    defaultClaimed: true
  },
  {
    id: "generated",
    evidence: "deterministic",
    title: "The committed generated Swift matches the contract",
    verifiedBy: "intentlane generate --check",
    defaultClaimed: true
  },
  {
    id: "applicationTests",
    evidence: "deterministic",
    title: "The application-owned business tests pass",
    verifiedBy: "the application test command",
    defaultClaimed: true
  },
  {
    id: "integrationTests",
    evidence: "deterministic",
    title: "The resolver, the open path and the search routing run against the real generated entities",
    verifiedBy: "the integration test command",
    defaultClaimed: true
  },
  {
    id: "metadata",
    evidence: "deterministic",
    title: "The built app exposes the declared system protocols and entities",
    verifiedBy: "appintentsmetadataprocessor plus the metadata gate",
    defaultClaimed: true
  },
  {
    id: "indexSync",
    evidence: "deterministic",
    title: "The named index accepts the generated entity and a full refresh cycle",
    verifiedBy: "the index test command",
    defaultClaimed: true
  },
  {
    id: "registration",
    evidence: "deterministic",
    title: "The adapter registers the resolver and both intent handlers at launch",
    verifiedBy: "the registration probe or the registration test",
    defaultClaimed: false
  },
  {
    id: "siri-conversation",
    evidence: "observed",
    title: "Siri resolves a spoken or typed name and opens that exact item",
    verifiedBy: "a person, recorded in the evidence ledger",
    defaultClaimed: false
  },
  {
    id: "spotlight-ui-result",
    evidence: "observed",
    title: "A Spotlight result is attributed to the app and opens that exact item",
    verifiedBy: "a person, recorded in the evidence ledger",
    defaultClaimed: false
  }
];

const CLAIMS_BY_ID = new Map<PilotClaimId, PilotClaim>(PILOT_CLAIMS.map((entry) => [entry.id, entry]));

export function isPilotClaimId(value: string): value is PilotClaimId {
  return CLAIMS_BY_ID.has(value as PilotClaimId);
}

export function claim(id: PilotClaimId): PilotClaim {
  const entry = CLAIMS_BY_ID.get(id);
  if (entry === undefined) {
    throw new Error(`Unknown claim '${id}'. Known claims: ${PILOT_CLAIMS.map((c) => c.id).join(", ")}.`);
  }
  return entry;
}

export function defaultClaimSet(): PilotClaimId[] {
  return PILOT_CLAIMS.filter((entry) => entry.defaultClaimed).map((entry) => entry.id);
}

export function unknownClaimIds(ids: readonly string[]): string[] {
  return ids.filter((id) => !isPilotClaimId(id));
}
