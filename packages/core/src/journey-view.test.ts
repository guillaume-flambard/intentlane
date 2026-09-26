import { describe, expect, it } from "vitest";
import { evaluateReleaseVerification, type ClaimOutcome } from "./release-verification.js";
import { validatePilotLedger, type PilotLedger } from "./pilot-ledger.js";
import { formatJourneyReport, journeyView } from "./journey-view.js";

const document = (journeys: unknown[], reproduction: unknown = { by: "someone", status: "pass" }) => ({
  schema: "pilot-evidence/1.0",
  pilot: "view-fixture",
  platform: "macos",
  revision: "abc1234",
  conditions: { osBuild: "macOS 27.0" },
  journeys,
  reproduction
});

const journey = (overrides: Record<string, unknown> = {}) => {
  const claimed = (overrides["claimed"] as string[] | undefined) ?? ["siri"];
  return {
    id: "open-article",
    claimed,
    risky: false,
    ...overrides,
    layers:
      (overrides["layers"] as Record<string, string> | undefined) ??
      { contract: "pass", build: "pass", ...Object.fromEntries(claimed.map((layer) => [layer, "pass"])) }
  };
};

const gates = {
  contract: "pass",
  generated: "pass",
  applicationTests: "pass",
  integrationTests: "pass",
  metadata: "pass",
  indexSync: "pass"
} as const;

function report(journeys: unknown[], claims: string[], reproduction?: unknown) {
  const validation = validatePilotLedger(document(journeys, reproduction));
  const derived = evaluateReleaseVerification({ claims, gates, observed: {} });
  return journeyView({
    ledger: validation.ledger as PilotLedger,
    ledgerStatus: validation.status,
    diagnostics: validation.diagnostics,
    outcomes: derived.claims
  });
}

describe("the journey view computes no verdict of its own", () => {
  it("reflects the claim outcomes the derivation already produced", () => {
    const result = report([journey({ claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] })], ["siri-conversation"]);
    const entry = result.journeys[0]?.claims[0];
    expect(entry?.id).toBe("siri-conversation");
    expect(entry?.status).toBe("pending");
  });

  it("carries the reason the derivation gave, not one of its own", () => {
    const result = report([journey({ claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] })], ["siri-conversation"]);
    expect(result.journeys[0]?.claims[0]?.reason).toContain("No public API can settle this");
  });

  it("says nothing is known about a claim that was never verified", () => {
    const result = report([journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync"] })], ["contract"]);
    expect(result.journeys[0]?.claims[0]?.status).toBe("missing");
    expect(result.journeys[0]?.claims[0]?.reason).toContain("nothing is known");
  });
});

describe("required layers are the union of what the named claims require", () => {
  it("unions the requirements of every claim on the journey", () => {
    const result = report(
      [journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync", "spotlight-ui-result"] })],
      ["indexSync", "spotlight-ui-result"]
    );
    expect([...result.journeys[0]?.requiredLayers ?? []].sort()).toEqual(["build", "contract", "metadata", "query", "spotlight"]);
  });

  it("reports the proof state as information and never as a threshold", () => {
    const result = report(
      [journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync"] })],
      ["indexSync"]
    );
    const view = result.journeys[0];
    expect(view?.evidenceRequired).toBe(5);
    expect(view?.evidenceSatisfied).toBe(5);
    expect(formatJourneyReport(result)).toContain("not a verdict");
  });

  it("counts a layer that is not at pass as unmet", () => {
    const result = report(
      [journey({ claimed: ["metadata", "query", "spotlight"], layers: { contract: "pass", build: "pass", metadata: "pass", query: "blocked", spotlight: "pass" }, claims: ["indexSync"] })],
      ["indexSync"]
    );
    expect(result.journeys[0]?.unmetLayers).toEqual(["query"]);
    expect(result.journeys[0]?.evidenceSatisfied).toBe(4);
  });
});

describe("a journey is verified only when everything already decided says so", () => {
  it("is verified when the ledger holds and every named claim is verified", () => {
    const result = report(
      [journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync", "metadata"] })],
      ["indexSync", "metadata"]
    );
    expect(result.journeys[0]?.status).toBe("verified");
    expect(result.journeys[0]?.reasons).toEqual([]);
  });

  it("stays unverified while a claim of the journey needs a person, and says so", () => {
    const result = report(
      [journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync", "spotlight-ui-result"] })],
      ["indexSync", "spotlight-ui-result"]
    );
    expect(result.journeys[0]?.status).toBe("unverified");
    expect(result.journeys[0]?.reasons.join(" ")).toContain("needs a person");
  });

  it("verifies once a person records the observation the journey names", () => {
    const journeys = [journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync", "spotlight-ui-result"] })];
    const validation = validatePilotLedger(document(journeys));
    const before = evaluateReleaseVerification({ claims: ["indexSync", "spotlight-ui-result"], gates, observed: {} });
    const after = evaluateReleaseVerification({
      claims: ["indexSync", "spotlight-ui-result"],
      gates,
      observed: { "spotlight-ui-result": "verified" }
    });
    const view = (outcomes: typeof before.claims) =>
      journeyView({ ledger: validation.ledger as PilotLedger, ledgerStatus: validation.status, diagnostics: validation.diagnostics, outcomes });
    expect(view(before.claims).journeys[0]?.status).toBe("unverified");
    expect(view(after.claims).journeys[0]?.status).toBe("verified");
  });

  it("is unverified when one of its claims is not verified, and says which", () => {
    const result = report(
      [journey({ claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] })],
      ["siri-conversation"]
    );
    expect(result.journeys[0]?.status).toBe("unverified");
    expect(result.journeys[0]?.reasons.join(" ")).toContain("siri-conversation");
  });

  it("is unverified when the ledger itself is unverified, and surfaces the ledger reason", () => {
    const result = report(
      [journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync"] })],
      ["indexSync"],
      { by: "none yet", status: "blocked" }
    );
    expect(result.journeys[0]?.status).toBe("unverified");
    expect(result.journeys[0]?.reasons.join(" ")).toContain("Independent reproduction");
  });

  it("verifies a clean journey even when a sibling journey is broken", () => {
    const result = report(
      [
        journey({ id: "clean", claimed: ["metadata"], claims: ["metadata"] }),
        journey({ id: "broken", claimed: ["siri"], layers: { contract: "pass", build: "pass", siri: "blocked" } })
      ],
      ["metadata"]
    );
    const clean = result.journeys.find((entry) => entry.id === "clean");
    expect(clean?.status).toBe("verified");
    expect(clean?.reasons).toEqual([]);
  });

  it("never reports a journey unverified without saying why", () => {
    const result = report(
      [
        journey({ id: "clean", claimed: ["metadata"], claims: ["metadata"] }),
        journey({ id: "broken", claimed: ["siri"], layers: { contract: "pass", build: "pass", siri: "blocked" } })
      ],
      ["metadata"]
    );
    for (const entry of result.journeys) {
      if (entry.status === "unverified") {
        expect(entry.reasons.length, `${entry.id} is unverified with no reason`).toBeGreaterThan(0);
      }
    }
  });

  it("does not put a sibling journey's defect on this journey", () => {
    const result = report(
      [
        journey({ id: "clean", claimed: ["metadata"], claims: ["metadata"] }),
        journey({ id: "broken", claimed: ["siri"], layers: { contract: "pass", build: "pass", siri: "blocked" } })
      ],
      ["metadata"]
    );
    const clean = result.journeys.find((entry) => entry.id === "clean");
    expect(JSON.stringify(clean?.reasons)).not.toContain("broken");
  });

  it("never verifies a journey that names no claim, because nothing was shown", () => {
    const result = report([journey({ claimed: ["spotlight"] })], ["contract"]);
    expect(result.journeys[0]?.status).toBe("unverified");
    expect(result.journeys[0]?.reasons.join(" ")).toContain("names no claim");
  });
});

describe("a journey that cannot hold a claim it names never reaches the view", () => {
  it("is refused by the validator, so there is nothing to show", () => {
    const validation = validatePilotLedger(document([journey({ claimed: ["siri"], claims: ["siri-conversation"] })]));
    expect(validation.ledger).toBeUndefined();
    expect(validation.diagnostics.some((d) => d.code === "ILA182")).toBe(true);
  });
});

describe("the rendered report is readable by a person", () => {
  it("names the journey, its claims, its proof state and the reason", () => {
    const result = report(
      [journey({ claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] })],
      ["siri-conversation"]
    );
    const text = formatJourneyReport(result);
    expect(text).toContain("UNVERIFIED  open-article");
    expect(text).toContain("siri-conversation");
    expect(text).toContain("reason:");
  });

  it("says plainly that it computes no verdict", () => {
    expect(formatJourneyReport(report([journey()], []))).toContain("No verdict is computed here");
  });

  it("handles a journey that names no claim without pretending it has evidence", () => {
    const text = formatJourneyReport(report([journey({ claimed: ["spotlight"] })], []));
    expect(text).toContain("no claim is named for this journey");
  });
});

describe("the view needs both decisions and refuses to invent either", () => {
  it("takes outcomes as given and does not call the derivation itself", () => {
    const empty: readonly ClaimOutcome[] = [];
    const result = journeyView({
      ledger: validatePilotLedger(document([journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync"] })])).ledger as PilotLedger,
      ledgerStatus: "verified",
      diagnostics: [],
      outcomes: empty
    });
    expect(result.journeys[0]?.claims[0]?.status).toBe("missing");
    expect(result.journeys[0]?.status).toBe("unverified");
  });
});
