import {
  pilotRunJournalSchema,
  type PilotRunEvidenceEntry,
  type PilotRunJournal,
  type PilotRunStepId
} from "../../schema/src/index.js";
import { pilotRunSequence } from "./pilot-run.js";

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
