import { findCapability, type CapabilityRecord } from "./audit-catalogue.js";
import { AUDIT_DIAGNOSTIC_CODES } from "./audit.js";
import { claim, isPilotClaimId, type PilotClaimId } from "./claims.js";
import type { PilotLedgerLayer } from "./pilot-ledger.js";
import type { ClaimOutcome } from "./release-verification.js";

export type ExplainSubjectKind = "claim" | "capability" | "diagnostic";

export type ExplainSubject = Readonly<{
  kind: ExplainSubjectKind;
  id: string;
}>;

export const EXPLAIN_SUBJECT_KINDS: Readonly<Record<ExplainSubjectKind, string>> = {
  claim: "a claim id from the claims registry",
  capability: "a capability id from the Apple 27 catalogue",
  diagnostic: "a diagnostic code the tools can emit"
};

export function resolveExplainSubject(subject: string): ExplainSubject | undefined {
  if (isPilotClaimId(subject)) return { kind: "claim", id: subject };
  if (findCapability(subject) !== undefined) return { kind: "capability", id: subject };
  if ((AUDIT_DIAGNOSTIC_CODES as readonly string[]).includes(subject)) return { kind: "diagnostic", id: subject };
  return undefined;
}

const unrecorded = (what: string, where: string) =>
  `${what} is not recorded in a form this command can read. A human has to read ${where}. This command will not invent one, because a reference it made up would be worse than none.`;

function claimSections(id: PilotClaimId, outcomes: readonly ClaimOutcome[], pilotClaims: readonly string[] | undefined): readonly string[] {
  const found = claim(id);
  const outcome = outcomes.find((candidate) => candidate.id === id);
  const held = outcome?.status === "verified";
  return [
    `  What this means: ${found.title}`,
    "",
    "  Observed",
    outcome === undefined
      ? pilotClaims !== undefined && !pilotClaims.includes(id)
        ? "    - this claim is not part of the pilot that was read, so this command knows nothing about it"
        : "    - no verification has run, so nothing has been observed"
      : `    - status ${outcome.status}${
          outcome.confidence === undefined || outcome.status === "contested" || outcome.status === "verified"
            ? outcome.confidence === undefined
              ? ""
              : `, confidence ${outcome.confidence.confidence}`
            : ", with no contestable confidence: a hard command outcome is not a contest"
        }`,
    ...(outcome === undefined ? [] : [`    - ${outcome.reason}`]),
    "",
    "  Derived",
    `    - evidence family ${found.evidence}`,
    `    - settled by ${found.verifiedBy}`,
    "",
    "  Not proved",
    held
      ? "    - nothing beyond what the settled command already proves"
      : `    - the claim itself is not settled, so it proves nothing about the application today`,
    "",
    "  Required evidence",
    `    - layers ${found.requires.join(", ")}`,
    "",
    "  Next proof",
    found.evidence === "observed"
      ? "    - a person records the observation, and a second tester reproduces it"
      : `    - run ${found.verifiedBy}`,
    "",
    `  Apple reference: ${unrecorded("an Apple documentation link for this claim", "CLAIMS-REGISTRY.md")}`
  ].filter((line) => line !== undefined);
}

function capabilitySections(record: CapabilityRecord): readonly string[] {
  const availability = [
    record.availability.macos === undefined ? undefined : `macOS ${record.availability.macos}`,
    record.availability.ios === undefined ? undefined : `iOS ${record.availability.ios}`
  ].filter((entry): entry is string => entry !== undefined);
  return [
    `  What this means: the ${record.group} capability surfaced by ${record.surface}.`,
    "",
    "  Observed",
    "    - the capability is in the IntentLane Apple 27 catalogue, which is a statement about Apple's surface, not about an application",
    ...(availability.length === 0 ? [] : [`    - available on ${availability.join(", ")}`]),
    ...(record.security === undefined ? [] : [`    - security ${record.security}`]),
    "",
    "  Derived",
    `    - catalogue claim level ${record.claim}`,
    `    - evidence kinds ${record.evidence.join(", ")}`,
    "",
    "  Not proved",
    "    - that any application implements this capability",
    "    - that the system reaches it at runtime, which build metadata cannot show",
    "",
    "  Required evidence",
    `    - evidence kinds ${record.evidence.join(", ")}`,
    "",
    "  Next proof",
    record.companions.length === 0
      ? "    - implement it, then observe it"
      : `    - implement it together with ${record.companions.join(", ")}, then observe it`,
    "",
    `  Apple reference: ${unrecorded("an Apple documentation link for this capability", "research/")}`
  ];
}

function diagnosticSections(id: string): readonly string[] {
  return [
    `  What this means: ${unrecorded("the meaning of this diagnostic", "the source file that emits it")}`,
    "",
    "  Observed",
    `    - the code ${id} is in the closed set of ${AUDIT_DIAGNOSTIC_CODES.length} codes the tools can emit`,
    "    - the messages that ship with it are literals inside the emitting source, not a registry this command can read",
    "",
    "  Derived",
    "    - nothing: a code without its meaning is an identifier, not an explanation",
    "",
    "  Not proved",
    "    - what the code means, and therefore nothing about any application",
    "",
    "  Required evidence",
    `    - a diagnostic meaning registry, which does not exist yet`,
    "",
    "  Next proof",
    "    - grep the sources for the code, or add a registry this command can read",
    "",
    `  Apple reference: ${unrecorded("an Apple documentation link for this diagnostic", "the emitting source")}`
  ];
}

export type ExplainContext = Readonly<{
  outcomes?: readonly ClaimOutcome[];
  pilotClaims?: readonly string[];
}>;

function toContext(context: ExplainContext | readonly ClaimOutcome[]): ExplainContext {
  if (Array.isArray(context)) return { outcomes: context as readonly ClaimOutcome[] };
  return context as ExplainContext;
}

export function explain(subject: string, rawContext: ExplainContext | readonly ClaimOutcome[] = {}): readonly string[] {
  const resolved = resolveExplainSubject(subject);
  if (resolved === undefined) {
    throw new Error(
      `'${subject}' is not something this command can explain. Accepted forms: ${(Object.keys(EXPLAIN_SUBJECT_KINDS) as ExplainSubjectKind[])
        .map((kind) => `${kind} (${EXPLAIN_SUBJECT_KINDS[kind]})`)
        .join("; ")}.`
    );
  }
  const settings = toContext(rawContext);
  const outcomes = settings.outcomes ?? [];
  const pilotClaims = settings.pilotClaims;
  const head = `${resolved.kind.toUpperCase()} ${resolved.id}`;
  const body =
    resolved.kind === "claim"
      ? claimSections(resolved.id as PilotClaimId, outcomes, pilotClaims)
      : resolved.kind === "capability"
        ? capabilitySections(findCapability(resolved.id) as CapabilityRecord)
        : diagnosticSections(resolved.id);
  return [head, "", ...body, "", "This command explains and does not judge. Verdicts come from `intentlane verify`."];
}

export function formatExplanation(subject: string, context: ExplainContext | readonly ClaimOutcome[] = {}): string {
  return `${explain(subject, context).join("\n")}\n`;
}

