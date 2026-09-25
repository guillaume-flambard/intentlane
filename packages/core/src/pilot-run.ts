import {
  PILOT_RUN_REPAIR_BUDGET,
  PILOT_RUN_STEPS,
  pilotRunJournalSchema,
  type PilotRunJournal,
  type PilotRunStep,
  type PilotRunStepId
} from "../../schema/src/index.js";

export { PILOT_RUN_REPAIR_BUDGET, PILOT_RUN_STEPS };
export type { PilotRunJournal, PilotRunStep, PilotRunStepId };

export const pilotRunSequence: readonly PilotRunStepId[] = [
  "prepare",
  "analyse",
  "implement",
  "test",
  "repair",
  "demonstrate",
  "deliver"
];

export type PilotRunDiagnostic = Readonly<{
  code: "ILA179" | "ILA180";
  message: string;
  path: string;
}>;

export type PilotRunJournalResult = Readonly<{
  journal?: PilotRunJournal;
  diagnostics: readonly PilotRunDiagnostic[];
}>;

export function parsePilotRunJournal(source: string): PilotRunJournalResult {
  let document: unknown;
  try {
    document = JSON.parse(source);
  } catch {
    return {
      diagnostics: [
        {
          code: "ILA179",
          message: "A run journal must be a JSON document. Delete the file to start a run from the beginning.",
          path: "journal"
        }
      ]
    };
  }

  const parsed = pilotRunJournalSchema.safeParse(document);
  if (parsed.success) {
    return { journal: parsed.data, diagnostics: [] };
  }

  return {
    diagnostics: parsed.error.issues.map((issue) => ({
      code: issue.code === "invalid_type" ? ("ILA180" as const) : ("ILA179" as const),
      message: issue.message,
      path: ["journal", ...issue.path.map(String)].join(".")
    }))
  };
}

export type RepairAttempt = Readonly<{
  attempt: number;
  exitCode: number;
  signature: string;
}>;

export type RepairVerdict = Readonly<{
  action: "retry" | "block";
  reason: string;
  diagnostic: string;
  distinctSignatures: number;
}>;

export function nextRepairVerdict(attempts: readonly RepairAttempt[]): RepairVerdict {
  const last = attempts[attempts.length - 1];
  const diagnostic = last?.signature ?? "";
  const distinctSignatures = new Set(attempts.map((entry) => entry.signature)).size;

  if (attempts.length === 0) {
    return {
      action: "retry",
      reason: "No attempt has been made yet.",
      diagnostic,
      distinctSignatures
    };
  }

  if (distinctSignatures === 1 && attempts.length > 1) {
    return {
      action: "block",
      reason: `Attempt ${attempts.length} produced no new information: the failure signature is identical across every attempt.`,
      diagnostic,
      distinctSignatures
    };
  }

  if (attempts.length >= PILOT_RUN_REPAIR_BUDGET) {
    return {
      action: "block",
      reason: `The repair budget of ${PILOT_RUN_REPAIR_BUDGET} attempts is spent.`,
      diagnostic,
      distinctSignatures
    };
  }

  return {
    action: "retry",
    reason: `The error changed since the previous attempt, so the last fix moved something. ${attempts.length} of ${PILOT_RUN_REPAIR_BUDGET} attempts used.`,
    diagnostic,
    distinctSignatures
  };
}

export function replanFrom(journal: PilotRunJournal): readonly PilotRunStepId[] {
  const stale = new Set<PilotRunStepId>();
  const passed = new Map<PilotRunStepId, PilotRunStep>();

  for (const entry of journal.steps) {
    if (entry.status === "pass" && entry.commit === journal.commit) {
      passed.set(entry.id, entry);
    } else {
      stale.add(entry.id);
    }
  }

  const firstUntrusted = pilotRunSequence.findIndex((id) => !passed.has(id) || stale.has(id));
  if (firstUntrusted < 0) {
    return [];
  }
  return pilotRunSequence.slice(firstUntrusted);
}
