import { describe, expect, it } from "vitest";
import { PILOT_RUN_REPAIR_BUDGET, nextRepairVerdict, type RepairAttempt } from "./pilot-run.js";

const attempt = (overrides: Partial<RepairAttempt> = {}): RepairAttempt => ({
  attempt: 1,
  exitCode: 1,
  signature: "error: cannot find type Storage in scope",
  ...overrides
});

describe("the repair budget", () => {
  it("is three attempts", () => {
    expect(PILOT_RUN_REPAIR_BUDGET).toBe(3);
  });
});

describe("deciding what to do after an attempt", () => {
  it("retries while the error changes, because new information means the previous fix moved something", () => {
    const verdict = nextRepairVerdict([attempt(), attempt({ attempt: 2, signature: "error: no member scopeForChild" })]);
    expect(verdict.action).toBe("retry");
    expect(verdict.reason).toContain("error changed");
  });

  it("retries on the first attempt even when there is nothing to compare against", () => {
    expect(nextRepairVerdict([attempt()]).action).toBe("retry");
  });

  it("blocks when the budget is spent on attempts that each failed differently", () => {
    const attempts = [1, 2, 3].map((n) => attempt({ attempt: n, signature: `failure ${n}` }));
    const verdict = nextRepairVerdict(attempts);
    expect(verdict.action).toBe("block");
    expect(verdict.reason).toContain("budget");
  });

  it("blocks on repetition even when the budget is not yet spent, and prefers that reason because it is the more specific one", () => {
    const attempts = [1, 2, 3].map((n) => attempt({ attempt: n, signature: "same failure" }));
    expect(nextRepairVerdict(attempts).reason).toContain("no new information");
  });

  it("blocks before the budget is spent when the error stopped changing, because retrying an identical failure is not repair", () => {
    const attempts = [1, 2].map((n) => attempt({ attempt: n, signature: "same failure" }));
    const verdict = nextRepairVerdict(attempts);
    expect(verdict.action).toBe("block");
    expect(verdict.reason).toContain("no new information");
  });

  it("keeps the diagnostic of the last attempt so the human knows what to read", () => {
    const attempts = [1, 2, 3].map((n) => attempt({ attempt: n, signature: `failure ${n}` }));
    expect(nextRepairVerdict(attempts).diagnostic).toContain("failure 3");
  });

  it("never asks for more than the budget, whatever the caller passes", () => {
    const attempts = Array.from({ length: 9 }, (_, index) => attempt({ attempt: index + 1, signature: "repeated" }));
    expect(nextRepairVerdict(attempts).action).toBe("block");
  });

  it("reports the number of distinct signatures, because that is the evidence for a repetition", () => {
    const attempts = [1, 2, 3].map((n) => attempt({ attempt: n, signature: "same failure" }));
    expect(nextRepairVerdict(attempts).distinctSignatures).toBe(1);
  });

  it("treats an empty attempt list as nothing to decide, so the caller cannot reach a block without trying", () => {
    expect(nextRepairVerdict([]).action).toBe("retry");
  });
});
