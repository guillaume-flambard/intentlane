import { describe, expect, it } from "vitest";
import { CAPABILITY_CATALOGUE } from "./audit-catalogue.js";
import { AUDIT_DIAGNOSTIC_CODES } from "./audit.js";
import { PILOT_CLAIMS } from "./claims.js";
import { explain, formatExplanation, resolveExplainSubject } from "./explain.js";
import { evaluateReleaseVerification, type ClaimOutcome } from "./release-verification.js";

const gates = {
  contract: "pass",
  generated: "pass",
  applicationTests: "pass",
  integrationTests: "pass",
  metadata: "pass",
  indexSync: "pass"
} as const;

const outcomes = evaluateReleaseVerification({
  claims: ["contract", "generated", "indexSync", "siri-conversation"],
  gates,
  observed: { "siri-conversation": "verified" }
}).claims;

const SECTION_NAMES = ["What this means", "Observed", "Derived", "Not proved", "Required evidence", "Next proof", "Apple reference"];

describe("explain accepts the three documented forms", () => {
  it("resolves a claim id", () => {
    expect(resolveExplainSubject("indexSync")).toEqual({ kind: "claim", id: "indexSync" });
  });

  it("resolves a capability id from the catalogue", () => {
    expect(resolveExplainSubject("proof.app-intents-testing")?.kind).toBe("capability");
  });

  it("resolves a diagnostic code", () => {
    expect(resolveExplainSubject("ILA160")).toEqual({ kind: "diagnostic", id: "ILA160" });
  });

  it("refuses anything else and names the accepted forms", () => {
    expect(() => explain("discovery.indexed-entityx")).toThrow(/claim/);
    expect(() => explain("nonsense")).toThrow(/capability/);
    expect(() => explain("nonsense")).toThrow(/diagnostic/);
  });
});

describe("every accepted form renders the same structure", () => {
  const subjects = ["indexSync", "proof.app-intents-testing", "ILA160"];

  it.each(subjects)("renders every section for %s", (subject) => {
    const text = formatExplanation(subject, outcomes);
    for (const section of SECTION_NAMES) {
      expect(text, `${subject} is missing the ${section} section`).toContain(section);
    }
  });

  it.each(subjects)("says it does not judge for %s", (subject) => {
    expect(formatExplanation(subject, outcomes)).toContain("does not judge");
  });
});

describe("explain invents nothing it cannot source", () => {
  it("states that an Apple reference is not recorded rather than producing a link", () => {
    for (const subject of ["indexSync", "proof.app-intents-testing", "ILA160"]) {
      const text = formatExplanation(subject, outcomes);
      expect(text).toMatch(/Apple reference: .*not recorded/);
      expect(text).not.toMatch(/https?:\/\//);
    }
  });

  it("names where a human can read the missing knowledge", () => {
    expect(formatExplanation("indexSync", outcomes)).toContain("CLAIMS-REGISTRY.md");
    expect(formatExplanation("proof.app-intents-testing", outcomes)).toContain("research/");
  });

  it("says a diagnostic has no runtime meaning instead of guessing one", () => {
    const text = formatExplanation("ILA160", outcomes);
    expect(text).toMatch(/nothing: a code without its meaning is an identifier/);
    expect(text).toContain(`the closed set of ${AUDIT_DIAGNOSTIC_CODES.length} codes`);
  });
});

describe("a claim explanation reports what the derivation already decided", () => {
  it("shows a settled claim as settled, with the command that settles it", () => {
    const text = formatExplanation("indexSync", outcomes);
    expect(text).toContain("status verified");
    expect(text).toContain("confidence 1");
    expect(text).toMatch(/nothing beyond what the settled command already proves/);
  });

  it("shows an observed claim as recorded by a person, not by a command", () => {
    const text = formatExplanation("siri-conversation", outcomes);
    expect(text).toContain("A person recorded the observation.");
    expect(text).toMatch(/a person records the observation/);
  });

  it("says an unrecorded observation needs a person", () => {
    const pending = evaluateReleaseVerification({ claims: ["siri-conversation"], gates, observed: {} }).claims;
    expect(formatExplanation("siri-conversation", pending)).toContain("needs a person");
  });

  it("says nothing has been observed when no verification ran", () => {
    const text = formatExplanation("indexSync", []);
    expect(text).toMatch(/no verification has run/);
  });

  it("lists the layers the claim requires", () => {
    const text = formatExplanation("indexSync", outcomes);
    expect(text).toMatch(/layers contract, build, metadata, query, spotlight/);
  });

  it("says which evidence family fills the claim, without guessing which layer a person writes", () => {
    const text = formatExplanation("siri-conversation", outcomes);
    expect(text).toContain("evidence family observed");
    expect(text).toContain("settled by a person");
    expect(text).not.toContain("a person fills");
  });

  it("never claims a person fills a layer, because no data says which one", () => {
    for (const claim of PILOT_CLAIMS) {
      expect(formatExplanation(claim.id, outcomes), `${claim.id} guessed a person layer`).not.toContain("a person fills");
    }
  });

  it("distinguishes a claim nobody verified from a claim the pilot does not claim", () => {
    expect(formatExplanation("registration", { outcomes })).toMatch(/no verification has run/);
    expect(formatExplanation("spotlight-ui-result", { outcomes, pilotClaims: ["indexSync"] })).toMatch(
      /not part of the pilot that was read/
    );
  });

  it("says a claim the pilot holds is unverified, not unknown, when no gate ran here", () => {
    const text = formatExplanation("indexSync", { pilotClaims: ["indexSync"] });
    expect(text).toMatch(/no verification has run/);
    expect(text).not.toMatch(/not part of the pilot/);
  });

  it("never invents a hard command outcome from an empty gate set", () => {
    const text = formatExplanation("indexSync", { pilotClaims: ["indexSync"] });
    expect(text).not.toContain("status missing");
    expect(text).not.toContain("status failed");
  });

  it("prints a bare confidence only where it means something", () => {
    const hard: ClaimOutcome[] = [
      { id: "contract", evidence: "deterministic", status: "failed", verifiedBy: "intentlane validate", reason: "The contract did not validate.", confidence: { confidence: 1, distribution: { unsupported: 1 } } }
    ];
    expect(formatExplanation("contract", { outcomes: hard })).toMatch(/no contestable confidence/);
    const contested: ClaimOutcome[] = [
      { id: "contract", evidence: "deterministic", status: "contested", verifiedBy: "intentlane validate", reason: "Below the threshold.", confidence: { confidence: 0.26, distribution: { a: 0.5, b: 0.5 } } }
    ];
    expect(formatExplanation("contract", { outcomes: contested })).toContain("confidence 0.26");
  });

  it("draws nothing but its own evidence, and every claim renders", () => {
    for (const claim of PILOT_CLAIMS) {
      const text = formatExplanation(claim.id, outcomes);
      expect(text).toContain(claim.title);
      for (const layer of claim.requires) {
        expect(text).toContain(layer);
      }
    }
  });
});

describe("a capability explanation describes Apple's surface, not an application", () => {
  it("names the group and the surface", () => {
    const text = formatExplanation("proof.app-intents-testing", outcomes);
    expect(text).toContain("the proof capability surfaced by AppIntentsTesting");
  });

  it("states that catalogue presence says nothing about an application", () => {
    const text = formatExplanation("proof.app-intents-testing", outcomes);
    expect(text).toMatch(/statement about Apple's surface, not about an application/);
    expect(text).toMatch(/that any application implements this capability/);
  });

  it("says build metadata cannot show runtime reachability", () => {
    expect(formatExplanation("proof.app-intents-testing", outcomes)).toMatch(
      /build metadata cannot show/
    );
  });

  it("names the companions as part of the next proof", () => {
    expect(formatExplanation("proof.app-intents-testing", outcomes)).toContain("execution.native-handler");
  });

  it("renders every capability in the catalogue", () => {
    for (const record of CAPABILITY_CATALOGUE) {
      const text = formatExplanation(record.id, outcomes);
      expect(text, `${record.id} did not render`).toContain(record.surface);
    }
  });
});

describe("explain reads the outcomes it is given and invents none", () => {
  it("reflects a contested claim as contested", () => {
    const contested: ClaimOutcome[] = [
      { id: "indexSync", evidence: "deterministic", status: "contested", verifiedBy: "the index test command", reason: "Confidence 0.26 is below the threshold 0.8.", confidence: { confidence: 0.26, distribution: { a: 0.5, b: 0.5 } } }
    ];
    const text = formatExplanation("indexSync", contested);
    expect(text).toContain("status contested");
    expect(text).toContain("confidence 0.26");
    expect(text).toContain("Confidence 0.26 is below the threshold 0.8.");
  });

  it("keeps a claim unproven when the outcome says so, and draws no conclusion of its own", () => {
    const failed: ClaimOutcome[] = [
      { id: "contract", evidence: "deterministic", status: "failed", verifiedBy: "intentlane validate", reason: "The contract did not validate.", confidence: { confidence: 1, distribution: { unsupported: 1 } } }
    ];
    const text = formatExplanation("contract", failed);
    expect(text).toContain("status failed");
    expect(text).toMatch(/proves nothing about the application today/);
    expect(text).not.toMatch(/verified/);
  });
});
