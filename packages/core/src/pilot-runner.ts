import {
  pilotRunJournalSchema,
  type PilotRunEvidenceEntry,
  type PilotRunJournal,
  type PilotRunStepId
} from "../../schema/src/index.js";
import { pilotRunSequence } from "./pilot-run.js";
import type { Discovery, Proof } from "./discovery.js";

export type PilotRunFacts = Readonly<{
  pilot: string;
  branch: string;
  commit: string;
}>;

export type PrepareResult = Readonly<{
  status: "pass" | "fail";
  exitCode: number;
  signature: string;
  diagnostic: string;
  durationMs: number;
  command: string;
  artifact: string;
}>;

export type PilotRunPlan = Readonly<{
  steps: readonly PilotRunStepId[];
  resuming: boolean;
}>;

export function startRunJournal(facts: PilotRunFacts): PilotRunJournal {
  return {
    schema: "pilot-run/1.0",
    pilot: facts.pilot,
    branch: facts.branch,
    commit: facts.commit,
    steps: pilotRunSequence.map((id) => ({
      id,
      status: "pending" as const,
      commit: facts.commit,
      attempts: 1,
      evidence: []
    }))
  };
}

export function planRun(journal: PilotRunJournal): PilotRunPlan {
  const trusted = new Set(
    journal.steps
      .filter((entry) => entry.status === "pass" && entry.commit === journal.commit)
      .map((entry) => entry.id)
  );
  const firstUntrusted = pilotRunSequence.findIndex((id) => !trusted.has(id));
  const steps = firstUntrusted < 0 ? [] : pilotRunSequence.slice(firstUntrusted);
  return { steps, resuming: steps.length > 0 && steps[0] !== "prepare" };
}

export type AnalysisResult = Readonly<{
  status: "pass" | "fail" | "refused";
  reason: string;
  objects: number;
  actionable: number;
  findings: number;
}>;

function isBacked(proof: Proof): boolean {
  return proof.path !== "" && proof.line > 0 && proof.excerpt !== "";
}

export function analyseDiscovery(discovery: Discovery): AnalysisResult {
  const findings = discovery.objects.flatMap((object) => [
    object.proof,
    ...object.identifiers.map((entry) => entry.proof),
    ...object.openers.map((entry) => entry.proof),
    ...discovery.access.map((entry) => entry.proof)
  ]);

  const unbacked = findings.find((proof) => !isBacked(proof));
  if (unbacked !== undefined) {
    return {
      status: "fail",
      reason: `A finding carries no file and line, so it is not evidence: ${unbacked.path}:${unbacked.line}`,
      objects: discovery.objects.length,
      actionable: 0,
      findings: findings.length
    };
  }

  if (discovery.objects.length === 0) {
    return {
      status: "refused",
      reason: "No object class was found in the list-view class, so there is nothing to integrate.",
      objects: 0,
      actionable: 0,
      findings: findings.length
    };
  }

  const actionable = discovery.objects.filter(
    (object) => object.identifiers.length > 0 && object.openers.length > 0
  ).length;

  return {
    status: "pass",
    reason: `${actionable} of ${discovery.objects.length} object classes carry both an identifier and an opening path, every one of them backed by a file and a line.`,
    objects: discovery.objects.length,
    actionable,
    findings: findings.length
  };
}

export function applyAnalyse(journal: PilotRunJournal, result: AnalysisResult): PilotRunJournal {
  const previous = journal.steps.find((entry) => entry.id === "analyse");
  const attempts =
    previous === undefined || previous.status === "pending" ? 1 : previous.attempts + 1;
  const status = result.status === "pass" ? "pass" : result.status === "refused" ? "blocked" : "fail";
  const steps = journal.steps.map((entry) =>
    entry.id === "analyse"
      ? {
          id: entry.id,
          status,
          commit: journal.commit,
          attempts,
          evidence:
            status === "pass"
              ? [{ kind: "command" as const, command: "intentlane analyse", note: result.reason }]
              : [],
          ...(status === "pass" ? {} : { diagnostic: result.reason })
        }
      : entry
  );
  return pilotRunJournalSchema.parse({ ...journal, steps });
}

export function applyPrepare(journal: PilotRunJournal, result: PrepareResult): PilotRunJournal {
  const evidence: PilotRunEvidenceEntry = {
    kind: "build",
    command: result.command,
    exitCode: result.exitCode,
    artifact: result.artifact
  };
  const previous = journal.steps.find((entry) => entry.id === "prepare");
  const attempts =
    previous === undefined || previous.status === "pending" ? 1 : previous.attempts + 1;
  const steps = journal.steps.map((entry) =>
    entry.id === "prepare"
      ? {
          id: entry.id,
          status: result.status,
          commit: journal.commit,
          attempts,
          evidence: [evidence],
          ...(result.status === "fail" ? { diagnostic: result.diagnostic } : {}),
          durationMs: result.durationMs
        }
      : entry
  );
  return pilotRunJournalSchema.parse({ ...journal, steps });
}
