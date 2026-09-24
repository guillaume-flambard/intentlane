import { describe, expect, it } from "vitest";
import { evaluateReleaseVerification } from "./release-verification.js";

describe("release verification", () => {
  it("certifies only a complete automatic build and independently reproduced live evidence", () => {
    expect(evaluateReleaseVerification({
      contract: "pass",
      generated: "pass",
      applicationTests: "pass",
      metadata: "pass",
      liveEvidence: "verified"
    })).toMatchObject({ status: "certified", automaticReady: true, liveReady: true });
  });

  it("keeps a passing build distinct from unverified Siri and Spotlight evidence", () => {
    const result = evaluateReleaseVerification({
      contract: "pass",
      generated: "pass",
      applicationTests: "pass",
      metadata: "pass",
      liveEvidence: "unverified"
    });
    expect(result.status).toBe("awaiting-live-evidence");
    expect(result.automaticReady).toBe(true);
    expect(result.liveReady).toBe(false);
    expect(result.nextAction).toContain("independent");
  });

  it("blocks certification when a client did not provide an application test command", () => {
    const result = evaluateReleaseVerification({
      contract: "pass",
      generated: "pass",
      applicationTests: "missing",
      metadata: "pass",
      liveEvidence: "not-requested"
    });
    expect(result.status).toBe("blocked");
    expect(result.automaticReady).toBe(false);
    expect(result.blockers).toContain("applicationTests");
  });
});
