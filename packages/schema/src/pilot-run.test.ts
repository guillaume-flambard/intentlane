import { describe, expect, it } from "vitest";
import { pilotRunJournalSchema } from "./index.js";

const evidence = (overrides: Record<string, unknown> = {}) => ({
  kind: "command",
  command: "bash pilots/iina/tests/run-all-tests.sh",
  exitCode: 0,
  ...overrides
});

const step = (overrides: Record<string, unknown> = {}) => ({
  id: "prepare",
  status: "pass",
  commit: "43e4abcd",
  attempts: 1,
  evidence: [evidence()],
  ...overrides
});

const journal = (overrides: Record<string, unknown> = {}) => ({
  schema: "pilot-run/1.0",
  pilot: "iina",
  branch: "intentlane/pilot-playedmedia",
  commit: "43e4abcd",
  steps: [step()],
  ...overrides
});

const parses = (value: unknown) => pilotRunJournalSchema.safeParse(value).success;

describe("a run journal", () => {
  it("accepts a journal with one passed step", () => {
    expect(parses(journal())).toBe(true);
  });

  it("accepts a journal whose steps are empty, because a run starts before anything has happened", () => {
    expect(parses(journal({ steps: [] }))).toBe(true);
  });

  it("rejects an unknown step name, because a typo must not read as a completed step", () => {
    expect(parses(journal({ steps: [step({ id: "prepeare" })] }))).toBe(false);
  });

  it("rejects a status the runner cannot produce", () => {
    expect(parses(journal({ steps: [step({ status: "probably" })] }))).toBe(false);
  });

  it("rejects a step that claims a pass with no evidence, because a pass nobody can inspect is a claim", () => {
    expect(parses(journal({ steps: [step({ evidence: [] })] }))).toBe(false);
  });

  it("rejects a blocked step with no diagnostic, because a block without a reason cannot be acted on", () => {
    const blocked = step({ status: "blocked", attempts: 3, evidence: [] });
    expect(parses(journal({ steps: [blocked] }))).toBe(false);
  });

  it("accepts a blocked step that carries a diagnostic and a diff", () => {
    const blocked = step({
      status: "blocked",
      attempts: 3,
      evidence: [],
      diagnostic: "the reference build fails and produced the same error three times",
      diff: "errors are identical across attempts 1, 2 and 3"
    });
    expect(parses(journal({ steps: [blocked] }))).toBe(true);
  });

  it("rejects a negative attempt count", () => {
    expect(parses(journal({ steps: [step({ attempts: -1 })] }))).toBe(false);
  });

  it("rejects a step whose attempts exceed the repair budget, because the budget is enforced at write time too", () => {
    expect(parses(journal({ steps: [step({ attempts: 4 })] }))).toBe(false);
  });

  it("rejects a commit that is not a revision", () => {
    expect(parses(journal({ commit: "HEAD" }))).toBe(false);
  });

  it("rejects an unknown evidence kind, so a proof type the runner never produced is not accepted later", () => {
    const unknown = step({ evidence: [evidence({ kind: "vibes" })] });
    expect(parses(journal({ steps: [unknown] }))).toBe(false);
  });

  it("rejects duplicate step names, because two records of the same step cannot both be authoritative", () => {
    expect(parses(journal({ steps: [step(), step({ status: "blocked" })] }))).toBe(false);
  });

  it("rejects an unknown top-level key rather than carrying it into the runner", () => {
    expect(parses(journal({ phase: "done" }))).toBe(false);
  });
});
