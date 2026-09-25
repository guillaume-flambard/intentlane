import { describe, expect, it } from "vitest";
import {
  parsePilotRunJournal,
  pilotRunSequence,
  replanFrom,
  type PilotRunJournal
} from "./pilot-run.js";

const evidence = () => ({ kind: "command" as const, command: "bash run", exitCode: 0 });

const step = (id: PilotRunJournal["steps"][number]["id"], overrides: Partial<PilotRunJournal["steps"][number]> = {}) => ({
  id,
  status: "pass" as const,
  commit: "43e4abcd",
  attempts: 1,
  evidence: [evidence()],
  ...overrides
});

const journal = (steps: PilotRunJournal["steps"], overrides: Partial<PilotRunJournal> = {}): PilotRunJournal => ({
  schema: "pilot-run/1.0",
  pilot: "iina",
  branch: "intentlane/pilot-playedmedia",
  commit: "43e4abcd",
  steps,
  ...overrides
});

describe("the pilot step sequence", () => {
  it("runs prepare before analyse, and analyse before implement", () => {
    expect(pilotRunSequence.indexOf("prepare")).toBeLessThan(pilotRunSequence.indexOf("analyse"));
    expect(pilotRunSequence.indexOf("analyse")).toBeLessThan(pilotRunSequence.indexOf("implement"));
  });

  it("places repair after test, because a repair without a failing test has nothing to repair", () => {
    expect(pilotRunSequence.indexOf("test")).toBeLessThan(pilotRunSequence.indexOf("repair"));
  });

  it("places deliver last", () => {
    expect(pilotRunSequence[pilotRunSequence.length - 1]).toBe("deliver");
  });
});

describe("reading a journal", () => {
  it("returns the journal when it is valid", () => {
    const parsed = parsePilotRunJournal(JSON.stringify(journal([step("prepare")])));
    expect(parsed.journal?.pilot).toBe("iina");
    expect(parsed.diagnostics).toEqual([]);
  });

  it("reports ILA179 when the file is not valid JSON", () => {
    const parsed = parsePilotRunJournal("{ not json");
    expect(parsed.journal).toBeUndefined();
    expect(parsed.diagnostics.map((entry) => entry.code)).toContain("ILA179");
  });

  it("reports the schema's own diagnostic code when the shape is wrong", () => {
    const parsed = parsePilotRunJournal(JSON.stringify({ ...journal([]), unexpected: true }));
    expect(parsed.journal).toBeUndefined();
    expect(parsed.diagnostics.length).toBeGreaterThan(0);
  });

  it("does not throw on a null document", () => {
    expect(() => parsePilotRunJournal("null")).not.toThrow();
  });
});

describe("deciding what still has to run", () => {
  it("runs every step when the journal is empty", () => {
    expect(replanFrom(journal([]))).toEqual(pilotRunSequence);
  });

  it("skips a passed step", () => {
    expect(replanFrom(journal([step("prepare")]))).not.toContain("prepare");
    expect(replanFrom(journal([step("prepare")]))).toContain("analyse");
  });

  it("runs a failed step again rather than skipping it", () => {
    const failed = step("prepare", { status: "fail", evidence: [] });
    expect(replanFrom(journal([failed]))).toContain("prepare");
  });

  it("runs a blocked step again, because a human may have fixed the cause", () => {
    const blocked = step("prepare", {
      status: "blocked",
      attempts: 3,
      evidence: [],
      diagnostic: "the reference build fails"
    });
    expect(replanFrom(journal([blocked]))).toContain("prepare");
  });

  it("reruns a passed step whose commit is older than the journal, because the code under it moved", () => {
    const stale = step("prepare", { commit: "1111111" });
    expect(replanFrom(journal([stale]))).toContain("prepare");
  });

  it("keeps a passed step whose commit matches", () => {
    expect(replanFrom(journal([step("prepare")]))).not.toContain("prepare");
  });

  it("reruns a stale step and everything after it, because a later step cannot be trusted on a stale predecessor", () => {
    const stalePrepare = step("prepare", { commit: "1111111" });
    const freshAnalyse = step("analyse");
    const remaining = replanFrom(journal([stalePrepare, freshAnalyse]));
    expect(remaining).toContain("prepare");
    expect(remaining).toContain("analyse");
    expect(remaining).toContain("implement");
  });

  it("starts at the first step that has not passed, in sequence order rather than journal order", () => {
    const remaining = replanFrom(journal([step("analyse"), step("prepare")]));
    expect(remaining[0]).toBe("implement");
  });

  it("returns nothing when every step has passed on the current commit", () => {
    const every = pilotRunSequence.map((id) => step(id));
    expect(replanFrom(journal(every))).toEqual([]);
  });
});
