import { claim, type PilotClaimId } from "./claims.js";
import { PILOT_LEDGER_REQUIRED_LAYERS, type PilotLedger, type PilotLedgerDiagnostic, type PilotLedgerLayer, type PilotLedgerLayerStatus, type PilotLedgerStatus } from "./pilot-ledger.js";
import type { ClaimOutcome } from "./release-verification.js";

export const JOURNEY_VIEW_VERSION = "1.0";

export type JourneyClaimView = Readonly<{
  id: PilotClaimId;
  title: string;
  status: ClaimOutcome["status"];
  reason: string;
  confidence: ClaimOutcome["confidence"];
  requires: readonly PilotLedgerLayer[];
  evidenceComplete: boolean;
  unmetLayers: readonly PilotLedgerLayer[];
}>;

export type JourneyView = Readonly<{
  id: string;
  claims: readonly JourneyClaimView[];
  requiredLayers: readonly PilotLedgerLayer[];
  unmetLayers: readonly PilotLedgerLayer[];
  evidenceSatisfied: number;
  evidenceRequired: number;
  status: "verified" | "unverified";
  reasons: readonly string[];
}>;

export type JourneyReport = Readonly<{
  reportVersion: string;
  ledgerStatus: PilotLedgerStatus;
  journeys: readonly JourneyView[];
}>;

export type JourneyViewInput = Readonly<{
  ledger: PilotLedger;
  ledgerStatus: PilotLedgerStatus;
  diagnostics: readonly PilotLedgerDiagnostic[];
  outcomes: readonly ClaimOutcome[];
}>;

function layerIsPassed(layers: Readonly<Record<PilotLedgerLayer, PilotLedgerLayerStatus>>, layer: PilotLedgerLayer): boolean {
  return layers[layer] === "pass";
}

function outcomeFor(outcomes: readonly ClaimOutcome[], id: PilotClaimId): ClaimOutcome | undefined {
  return outcomes.find((outcome) => outcome.id === id);
}

function claimView(
  id: PilotClaimId,
  layers: Readonly<Record<PilotLedgerLayer, PilotLedgerLayerStatus>>,
  outcomes: readonly ClaimOutcome[]
): JourneyClaimView {
  const entry = claim(id);
  const outcome = outcomeFor(outcomes, id);
  const unmetLayers = entry.requires.filter((layer) => !layerIsPassed(layers, layer));
  const reason = outcome?.reason ?? `No verification ran for this claim, so nothing is known about it.`;
  return {
    id,
    title: entry.title,
    status: outcome?.status ?? "missing",
    reason,
    confidence: outcome?.confidence,
    requires: entry.requires,
    evidenceComplete: unmetLayers.length === 0,
    unmetLayers
  };
}

export function journeyView(input: JourneyViewInput): JourneyReport {
  const { ledger, ledgerStatus, diagnostics, outcomes } = input;

  const journeys: JourneyView[] = ledger.journeys.map((journey): JourneyView => {
    const layers = journey.layers as Readonly<Record<PilotLedgerLayer, PilotLedgerLayerStatus>>;
    const held = new Set<PilotLedgerLayer>([...PILOT_LEDGER_REQUIRED_LAYERS, ...journey.claimed]);
    const claims = (journey.claims ?? []).map((id) => claimView(id, layers, outcomes));
    const requiredLayers = [...new Set(claims.flatMap((entry) => entry.requires))].filter((layer) => held.has(layer));
    const unmetLayers = requiredLayers.filter((layer) => !layerIsPassed(layers, layer));

    const reasons: string[] = [];
    if (journey.claims === undefined) {
      reasons.push("This journey names no claim, so nothing is inferred from its layers.");
    }
    for (const entry of claims) {
      if (entry.status !== "verified") {
        reasons.push(`Claim '${entry.id}' is ${entry.status}. ${entry.reason}`);
      }
    }
    for (const layer of unmetLayers) {
      reasons.push(`Layer '${layer}' is required by a named claim and is not at pass.`);
    }
    for (const diagnostic of diagnostics) {
      if (diagnostic.path.startsWith(`journeys.${journey.id}.`)) {
        reasons.push(`${diagnostic.code} ${diagnostic.message}`);
      }
    }
    for (const diagnostic of diagnostics) {
      if (!diagnostic.path.startsWith("journeys.")) {
        reasons.push(`${diagnostic.code} ${diagnostic.message}`);
      }
    }

    const status: JourneyView["status"] = ledgerStatus === "verified" && reasons.length === 0 ? "verified" : "unverified";
    return {
      id: journey.id,
      claims,
      requiredLayers,
      unmetLayers,
      evidenceSatisfied: requiredLayers.length - unmetLayers.length,
      evidenceRequired: requiredLayers.length,
      status,
      reasons
    };
  });

  return { reportVersion: JOURNEY_VIEW_VERSION, ledgerStatus, journeys };
}

export function formatJourneyReport(report: JourneyReport): string {
  const lines: string[] = [`journeys ${report.reportVersion}  (ledger ${report.ledgerStatus})`, ""];
  for (const journey of report.journeys) {
    lines.push(`${journey.status.toUpperCase()}  ${journey.id}`);
    if (journey.claims.length === 0) {
      lines.push("  no claim is named for this journey");
    }
    for (const entry of journey.claims) {
      const evidence = entry.unmetLayers.length === 0 ? "evidence complete" : `missing ${entry.unmetLayers.join(", ")}`;
      lines.push(`  ${entry.status.padEnd(11)} ${entry.id}  ${evidence}`);
    }
    if (journey.evidenceRequired > 0) {
      lines.push(`  proof state: ${journey.evidenceSatisfied}/${journey.evidenceRequired} required layers at pass (not a verdict)`);
    }
    for (const reason of journey.reasons) lines.push(`  reason: ${reason}`);
    lines.push("");
  }
  lines.push("No verdict is computed here. `intentlane verify` derives claims, and the ledger states what a journey holds.");
  return `${lines.join("\n")}\n`;
}
