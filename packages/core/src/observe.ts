import { spawn } from "node:child_process";
import {
  claimConfidenceSchema,
  observationProbeManifestSchema,
  type ClaimConfidence,
  type ObservationProbe,
  type ObservationProbeFormat
} from "../../schema/src/index.js";

export const OBSERVATION_REPORT_VERSION = "1.0";

export const OBSERVATION_STATES = ["observed", "absent", "unavailable", "unreadable"] as const;

export type ObservationState = (typeof OBSERVATION_STATES)[number];

export type Observation = Readonly<{
  id: string;
  question: string;
  subject: string | undefined;
  state: ObservationState;
  detail: string;
  command: string;
  exitStatus: number | undefined;
  confidence: ClaimConfidence;
}>;

export type ObservationReport = Readonly<{
  reportVersion: string;
  observations: readonly Observation[];
  unavailable: readonly string[];
  unobserved: readonly string[];
}>;

export type ProbeOutcome = Readonly<{ exitStatus: number | undefined; stdout: string; stderr: string; ran: boolean }>;

export type ProbeRunner = (probe: ObservationProbe) => ProbeOutcome | Promise<ProbeOutcome>;

function runCommand(probe: ObservationProbe): Promise<ProbeOutcome> {
  const [command, ...args] = probe.command.split(" ").filter((part) => part.length > 0);
  return new Promise((resolve) => {
    const child = spawn(command ?? "", args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", () => resolve({ exitStatus: undefined, stdout, stderr, ran: false }));
    child.on("close", (code) => resolve({ exitStatus: code ?? undefined, stdout, stderr, ran: true }));
  });
}

const distribution = (key: string, confidence: number): ClaimConfidence => ({ confidence, distribution: { [key]: confidence } });

function confidenceFromExitStatus(exitStatus: number | undefined, ran: boolean, format: ObservationProbeFormat): ClaimConfidence {
  if (!ran) return distribution("unavailable", 0);
  const textOnly = format === "text";
  return distribution(textOnly ? (exitStatus === 0 ? "observed" : "absent") : "read", exitStatus === 0 ? 1 : 0);
}

function parseStructured(stdout: string): ReadonlyArray<Readonly<{ state?: unknown; detail?: unknown; confidence?: unknown }>> {
  const parsed: unknown = JSON.parse(stdout);
  if (typeof parsed !== "object" || parsed === null) return [];
  const record = parsed as Record<string, unknown>;
  const list = Array.isArray(record["observations"]) ? record["observations"] : [record];
  return list.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null) as never;
}

function stateFor(value: unknown, fallback: ObservationState): ObservationState {
  return typeof value === "string" && (OBSERVATION_STATES as readonly string[]).includes(value)
    ? (value as ObservationState)
    : fallback;
}

function observationFrom(
  probe: ObservationProbe,
  result: ProbeOutcome,
  state: ObservationState,
  detail: string,
  confidence: ClaimConfidence
): Observation {
  return {
    id: probe.id,
    question: probe.question,
    subject: probe.subject,
    state,
    detail,
    command: probe.command,
    exitStatus: result.exitStatus,
    confidence
  };
}

export async function runObservations(manifest: unknown, runner: ProbeRunner = runCommand): Promise<ObservationReport> {
  const parsed = observationProbeManifestSchema.parse(manifest);
  const observations: Observation[] = [];

  for (const probe of parsed.probes) {
    const result = await runner(probe);
    const text = result.stdout.trim();

    if (!result.ran) {
      observations.push(
        observationFrom(probe, result, "unavailable", result.stderr.trim() || "The probe could not be executed.", distribution("unavailable", 0))
      );
      continue;
    }

    if (probe.format === "json") {
      let entries: ReturnType<typeof parseStructured>;
      try {
        entries = parseStructured(text);
      } catch {
        entries = [];
      }
      if (entries.length === 0) {
        observations.push(
          observationFrom(probe, result, "unreadable", text || result.stderr.trim(), distribution("unreadable", 0))
        );
        continue;
      }
      for (const entry of entries) {
        const validated = claimConfidenceSchema.safeParse(entry["confidence"]);
        const detail = typeof entry["detail"] === "string" ? entry["detail"] : text;
        if (!validated.success) {
          observations.push(observationFrom(probe, result, "unreadable", detail, distribution("unreadable", 0)));
          continue;
        }
        observations.push(
          observationFrom(probe, result, stateFor(entry["state"], "observed"), detail, validated.data)
        );
      }
      continue;
    }

    const exit = result.exitStatus ?? 1;
    observations.push(
      observationFrom(
        probe,
        result,
        exit === 0 ? "observed" : "absent",
        text || result.stderr.trim(),
        confidenceFromExitStatus(exit, result.ran, "text")
      )
    );
  }

  const ids = parsed.probes.map((probe) => probe.id);
  return {
    reportVersion: OBSERVATION_REPORT_VERSION,
    observations,
    unavailable: observations.filter((entry) => entry.state === "unavailable").map((entry) => entry.id),
    unobserved: ids.filter((id) => !observations.some((entry) => entry.id === id))
  };
}

export function formatObservations(report: ObservationReport): string {
  const lines: string[] = [`observations ${report.reportVersion}`, ""];
  for (const observation of report.observations) {
    const confidence = observation.confidence.confidence;
    lines.push(`${observation.state.padEnd(11)} ${observation.id}  confidence ${confidence}`);
    lines.push(`  question: ${observation.question}`);
    if (observation.detail.length > 0) {
      for (const line of observation.detail.split("\n")) lines.push(`  ${line}`);
    }
    lines.push(`  command: ${observation.command} (exit ${observation.exitStatus ?? "none"})`);
    lines.push("");
  }
  lines.push("No verdict. Certification is derived by `intentlane verify`, not recorded here.");
  return `${lines.join("\n")}\n`;
}
