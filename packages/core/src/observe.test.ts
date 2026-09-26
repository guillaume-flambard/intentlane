import { describe, expect, it } from "vitest";
import { runObservations, type ProbeOutcome, type ProbeRunner } from "./observe.js";

const manifest = (probes: unknown[]) => ({ schema: "observation-probes/1.0", probes });

const probe = (overrides: Record<string, unknown> = {}) => ({
  id: "registration",
  question: "Does the system list our app as an App Intent provider?",
  command: "bash pilots/iina/tests/probe-registration.sh",
  format: "text",
  ...overrides
});

const outcome = (overrides: Partial<ProbeOutcome> = {}): ProbeOutcome => ({
  exitStatus: 0,
  stdout: "PASS registration",
  stderr: "",
  ran: true,
  ...overrides
});

const runnerReturning = (...results: readonly ProbeOutcome[]): ProbeRunner => {
  let index = 0;
  return () => results[index++] ?? outcome();
};

describe("an observation records what happened and judges nothing", () => {
  it("records the text a probe printed, including a probe that prints PASS", async () => {
    const report = await runObservations(manifest([probe()]), runnerReturning(outcome()));
    expect(report.observations[0]?.detail).toBe("PASS registration");
    expect(report.observations[0]?.state).toBe("observed");
  });

  it("carries no verdict field at all, so a probe cannot award itself a pass", async () => {
    const report = await runObservations(manifest([probe()]), runnerReturning(outcome()));
    expect(Object.keys(report.observations[0] ?? {}).sort()).toEqual([
      "command",
      "confidence",
      "detail",
      "exitStatus",
      "id",
      "question",
      "state",
      "subject"
    ]);
  });

  it("certifies nothing, because judgement belongs to the derivation", async () => {
    const report = await runObservations(manifest([probe()]), runnerReturning(outcome()));
    expect(Object.keys(report).sort()).toEqual(["observations", "reportVersion", "unavailable", "unobserved"]);
  });
});

describe("a probe that cannot run is recorded rather than dropped", () => {
  it("records it as unavailable with a confidence of zero", async () => {
    const report = await runObservations(manifest([probe()]), runnerReturning(outcome({ ran: false, exitStatus: undefined })));
    expect(report.observations[0]?.state).toBe("unavailable");
    expect(report.observations[0]?.confidence.confidence).toBe(0);
    expect(report.unavailable).toEqual(["registration"]);
  });

  it("keeps a missing result distinct from a negative result", async () => {
    const report = await runObservations(
      manifest([probe({ id: "negative" }), probe({ id: "missing" })]),
      runnerReturning(outcome({ exitStatus: 1, stdout: "" }), outcome({ ran: false }))
    );
    const byId = new Map(report.observations.map((entry) => [entry.id, entry]));
    expect(byId.get("negative")?.state).toBe("absent");
    expect(byId.get("missing")?.state).toBe("unavailable");
  });

  it("lists a probe that produced no observation as unobserved rather than as fine", async () => {
    const report = await runObservations(manifest([probe({ id: "a" }), probe({ id: "b" })]), runnerReturning(outcome(), outcome({ ran: false })));
    expect(report.unobserved).toEqual([]);
    expect(report.unavailable).toEqual(["b"]);
  });
});

describe("every observation is reproducible from the report", () => {
  it("carries the exact command, the exit status and the distribution", async () => {
    const report = await runObservations(manifest([probe()]), runnerReturning(outcome()));
    const observation = report.observations[0];
    expect(observation?.command).toBe("bash pilots/iina/tests/probe-registration.sh");
    expect(observation?.exitStatus).toBe(0);
    expect(observation?.confidence).toEqual({ confidence: 1, distribution: { observed: 1 } });
  });

  it("derives a text probe's confidence from the exit status alone, not from what it printed", async () => {
    const loud = await runObservations(manifest([probe()]), runnerReturning(outcome({ stdout: "PASS PASS PASS" })));
    const quiet = await runObservations(manifest([probe()]), runnerReturning(outcome({ stdout: "" })));
    expect(loud.observations[0]?.confidence).toEqual(quiet.observations[0]?.confidence);
  });
});

describe("a structured probe may state its own confidence", () => {
  const jsonProbe = probe({ id: "index", format: "json" });

  it("keeps a valid confidence and reads the state", async () => {
    const stdout = JSON.stringify({ observations: [{ state: "observed", detail: "indexed 1, deleted 0, left 0", confidence: { confidence: 0.97, distribution: { observed: 0.97 } } }] });
    const report = await runObservations(manifest([jsonProbe]), runnerReturning(outcome({ stdout })));
    expect(report.observations[0]?.state).toBe("observed");
    expect(report.observations[0]?.detail).toBe("indexed 1, deleted 0, left 0");
    expect(report.observations[0]?.confidence.confidence).toBe(0.97);
  });

  it("records an unreadable confidence as unreadable and keeps the raw text", async () => {
    const stdout = JSON.stringify({ observations: [{ state: "observed", detail: "half a number", confidence: { confidence: 4 } }] });
    const report = await runObservations(manifest([jsonProbe]), runnerReturning(outcome({ stdout })));
    expect(report.observations[0]?.state).toBe("unreadable");
    expect(report.observations[0]?.confidence.confidence).toBe(0);
    expect(report.observations[0]?.detail).toBe("half a number");
  });

  it("records output that is not json at all as unreadable rather than as a pass", async () => {
    const report = await runObservations(manifest([jsonProbe]), runnerReturning(outcome({ stdout: "PASS" })));
    expect(report.observations[0]?.state).toBe("unreadable");
    expect(report.observations[0]?.confidence.confidence).toBe(0);
  });

  it("reads a bare object as one observation, so a probe need not wrap its answer", async () => {
    const stdout = JSON.stringify({ state: "absent", detail: "no index", confidence: { confidence: 0, distribution: { absent: 1 } } });
    const report = await runObservations(manifest([jsonProbe]), runnerReturning(outcome({ stdout })));
    expect(report.observations[0]?.state).toBe("absent");
  });

  it("falls back to the observed state when a probe states an unknown one", async () => {
    const stdout = JSON.stringify({ observations: [{ state: "probably", detail: "x", confidence: { confidence: 0.9, distribution: { a: 0.9 } } }] });
    const report = await runObservations(manifest([jsonProbe]), runnerReturning(outcome({ stdout })));
    expect(report.observations[0]?.state).toBe("observed");
  });

  it("records several structured observations from one probe, each with the same command", async () => {
    const stdout = JSON.stringify({
      observations: [
        { state: "observed", detail: "first", confidence: { confidence: 1, distribution: { observed: 1 } } },
        { state: "absent", detail: "second", confidence: { confidence: 0, distribution: { absent: 1 } } }
      ]
    });
    const report = await runObservations(manifest([jsonProbe]), runnerReturning(outcome({ stdout })));
    expect(report.observations.map((entry) => entry.detail)).toEqual(["first", "second"]);
    expect(report.observations.every((entry) => entry.command === jsonProbe.command)).toBe(true);
  });
});

describe("a malformed manifest is refused before anything runs", () => {
  it("refuses a manifest whose probe names no question", async () => {
    const calls: string[] = [];
    const runner: ProbeRunner = (p) => {
      calls.push(p.id);
      return outcome();
    };
    await expect(runObservations(manifest([probe({ question: undefined })]), runner)).rejects.toThrow();
    expect(calls).toEqual([]);
  });
});
