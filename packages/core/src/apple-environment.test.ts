import { describe, expect, it } from "vitest";
import { appleRoutingVerdict, readEnhancedSiriState, type AppleEnvironment } from "./apple-environment.js";

const NOW = new Date("2026-09-28T12:00:00Z");
const CF_EPOCH_OFFSET_SECONDS = 978_307_200;

/** A waitlist payload fetched `days` before NOW. */
function waitlist(status: string, features: readonly string[] = ["ai.enhanced-siri"], days = 0): string {
  const fetched = NOW.getTime() / 1000 - CF_EPOCH_OFFSET_SECONDS - days * 86_400;
  return JSON.stringify([{ bootSessionID: "0000", fetched, value: { featureIDs: features, status } }]);
}

function environment(overrides: Partial<AppleEnvironment> = {}): AppleEnvironment {
  return {
    enhancedSiri: "granted",
    enhancedSiriDetail: "not listed in any waitlist entry",
    onDeviceModel: "not-probed",
    siriLanguages: ["en-US"],
    ...overrides
  };
}

describe("readEnhancedSiriState", () => {
  it("treats a feature absent from the waitlist as served", () => {
    const reading = readEnhancedSiriState(waitlist("enqueued", ["cloud.llm"]), NOW);
    expect(reading.state).toBe("granted");
    expect(reading.detail).toBe("not listed in any waitlist entry");
  });

  it("treats an empty waitlist as served", () => {
    expect(readEnhancedSiriState("[]", NOW).state).toBe("granted");
  });

  it("reports a fresh enqueued reading as blocked and echoes the status", () => {
    const reading = readEnhancedSiriState(waitlist("enqueued"), NOW);
    expect(reading.state).toBe("blocked");
    expect(reading.detail).toBe("waitlist reports enqueued");
    expect(reading.stale).toBe(false);
  });

  it("never invents a grant out of an unknown status", () => {
    const reading = readEnhancedSiriState(waitlist("pending-review"), NOW);
    expect(reading.state).toBe("blocked");
    expect(reading.detail).toBe("waitlist reports pending-review");
  });

  it("accepts an explicit grant", () => {
    expect(readEnhancedSiriState(waitlist("granted"), NOW).state).toBe("granted");
  });

  it("refuses a grant when the entries disagree", () => {
    const payload = JSON.stringify([
      { value: { featureIDs: ["ai.enhanced-siri"], status: "granted" } },
      { value: { featureIDs: ["ai.enhanced-siri"], status: "enqueued" } }
    ]);
    expect(readEnhancedSiriState(payload, NOW).state).toBe("blocked");
  });

  it("downgrades a stale listing to unknown, because a block ages and must be rechecked", () => {
    const reading = readEnhancedSiriState(waitlist("enqueued", ["ai.enhanced-siri"], 11), NOW);
    expect(reading.state).toBe("unknown");
    expect(reading.stale).toBe(true);
    expect(reading.ageDays).toBe(11);
    expect(reading.detail).toContain("too old to read as a current block");
  });

  it("keeps a stale absence, which is weaker but not wrong", () => {
    const reading = readEnhancedSiriState(waitlist("enqueued", ["cloud.llm"], 30), NOW);
    expect(reading.state).toBe("granted");
    expect(reading.stale).toBe(true);
  });

  it("keeps a fresh listing of seven days as a block, the boundary being inclusive", () => {
    expect(readEnhancedSiriState(waitlist("enqueued", ["ai.enhanced-siri"], 7), NOW).state).toBe("blocked");
    expect(readEnhancedSiriState(waitlist("enqueued", ["ai.enhanced-siri"], 8), NOW).state).toBe("unknown");
  });

  it("concludes nothing when the payload is missing", () => {
    expect(readEnhancedSiriState(undefined, NOW)).toEqual({ state: "unknown", detail: "no waitlist state on this machine", stale: false });
  });

  it("concludes nothing when the payload is not JSON", () => {
    expect(readEnhancedSiriState("not json", NOW).state).toBe("unknown");
  });

  it("concludes nothing when the payload is not a list", () => {
    expect(readEnhancedSiriState('{"state":"granted"}', NOW).state).toBe("unknown");
  });

  it("concludes nothing when the entry carries no status", () => {
    const payload = JSON.stringify([{ value: { featureIDs: ["ai.enhanced-siri"] } }]);
    const reading = readEnhancedSiriState(payload, NOW);
    expect(reading.state).toBe("unknown");
    expect(reading.detail).toBe("listed with no status");
  });
});

describe("appleRoutingVerdict", () => {
  it("allows Siri evidence when the enhanced Siri is served", () => {
    const verdict = appleRoutingVerdict(environment());
    expect(verdict.testable).toBe(true);
    expect(verdict.misleadingSignal).toBe(false);
  });

  it("refuses to interpret a failure when the enhanced Siri is not served", () => {
    const verdict = appleRoutingVerdict(environment({ enhancedSiri: "blocked", enhancedSiriDetail: "waitlist reports enqueued" }));
    expect(verdict.testable).toBe(false);
    expect(verdict.reason).toContain("waitlist reports enqueued");
  });

  it("calls out the trap when the model runs but routing is blocked", () => {
    const verdict = appleRoutingVerdict(
      environment({ enhancedSiri: "blocked", enhancedSiriDetail: "waitlist reports enqueued", onDeviceModel: "available" })
    );
    expect(verdict.misleadingSignal).toBe(true);
  });

  it("does not call out a trap that was not probed", () => {
    const verdict = appleRoutingVerdict(environment({ enhancedSiri: "blocked", enhancedSiriDetail: "waitlist reports enqueued" }));
    expect(verdict.misleadingSignal).toBe(false);
  });

  it("refuses to conclude when the state is unknown", () => {
    const verdict = appleRoutingVerdict(environment({ enhancedSiri: "unknown", enhancedSiriDetail: "not readable JSON" }));
    expect(verdict.testable).toBe(false);
    expect(verdict.reason).toContain("could not be established");
  });
});
