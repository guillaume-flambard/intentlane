import { describe, expect, it } from "vitest";
import { PILOT_LEDGER_REQUIRED_LAYERS, validatePilotLedger } from "./pilot-ledger.js";

const journey = (overrides: Record<string, unknown> = {}) => {
  const claimed = (overrides["claimed"] as string[] | undefined) ?? ["siri"];
  return {
    id: "open-article",
    claimed,
    risky: false,
    ...overrides,
    layers: { contract: "pass", build: "pass", ...Object.fromEntries(claimed.map((layer) => [layer, "pass"])) }
  };
};

const ledger = (journeys: unknown[]) => ({
  schema: "pilot-evidence/1.0",
  pilot: "binding-fixture",
  platform: "macos",
  revision: "abc1234",
  conditions: { osBuild: "macOS 27.0" },
  journeys,
  reproduction: { by: "someone", status: "pass" }
});

const verify = (...journeys: unknown[]) => validatePilotLedger(ledger(journeys));
const codes = (result: ReturnType<typeof verify>) => result.diagnostics.map((diagnostic) => diagnostic.code);
const messageOf = (result: ReturnType<typeof verify>, code: string) =>
  result.diagnostics.find((diagnostic) => diagnostic.code === code)?.message ?? "";

describe("a journey that names no claim deduces no association", () => {
  it("stays valid, because an old ledger is not a ledger that claims nothing", () => {
    const result = verify(journey());
    expect(codes(result)).toEqual([]);
    expect(result.status).toBe("verified");
  });

  it("infers no claim from a layer sitting at pass, which is the inference this removes", () => {
    const result = verify(journey({ claimed: ["spotlight", "siri"] }));
    expect(codes(result)).toEqual([]);
  });

  it("infers no claim from a layer at pass even when a claim of that name exists", () => {
    const result = verify(journey({ claimed: ["spotlight", "siri"] }));
    expect(codes(result)).not.toContain("ILA181");
    expect(codes(result)).not.toContain("ILA182");
  });
});

describe("a journey that names claims is authoritative", () => {
  it("accepts claims whose requirements the journey can hold", () => {
    const result = verify(journey({ claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] }));
    expect(codes(result)).toEqual([]);
    expect(result.status).toBe("verified");
  });

  it("accepts several claims at once", () => {
    const result = verify(journey({ claimed: ["metadata", "query", "spotlight"], claims: ["indexSync", "spotlight-ui-result"] }));
    expect(codes(result)).toEqual([]);
  });

  it("does not demand the layers a journey always holds be claimed", () => {
    const result = verify(journey({ claimed: ["metadata"], claims: ["metadata"] }));
    expect(codes(result)).toEqual([]);
    expect(PILOT_LEDGER_REQUIRED_LAYERS).toEqual(["contract", "build"]);
  });
});

describe("a claim the journey cannot hold is refused, not downgraded", () => {
  it("refuses a claim requiring layers the journey does not claim", () => {
    const result = verify(journey({ claimed: ["siri"], claims: ["siri-conversation"] }));
    expect(codes(result)).toContain("ILA182");
    expect(result.status).toBe("unverified");
  });

  it("names every uncovered layer, so the fix is obvious", () => {
    const message = messageOf(verify(journey({ claimed: ["siri"], claims: ["siri-conversation"] })), "ILA182");
    expect(message).toContain("siri-conversation");
    expect(message).toContain("metadata");
    expect(message).toContain("runtime");
  });

  it("points at the claim entry that is uncovered", () => {
    const result = verify(journey({ claimed: ["siri"], claims: ["siri-conversation"] }));
    expect(result.diagnostics.find((d) => d.code === "ILA182")?.path).toBe("journeys[0].claims[0]");
  });

  it("accepts the same claim once the journey claims what it needs", () => {
    const before = verify(journey({ claimed: ["siri"], claims: ["siri-conversation"] }));
    expect(codes(before)).toContain("ILA182");
    const after = verify(journey({ claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] }));
    expect(codes(after)).toEqual([]);
  });

  it("refuses a claim needing an index when the journey claims no index layer", () => {
    const result = verify(journey({ claimed: ["metadata"], claims: ["indexSync"] }));
    expect(codes(result)).toContain("ILA182");
    expect(messageOf(result, "ILA182")).toContain("spotlight");
  });
});

describe("a claim that does not exist is refused", () => {
  it("refuses an unknown claim id and says a ledger may not name one", () => {
    const result = verify(journey({ claims: ["siri-conversations"] }));
    expect(codes(result)).toContain("ILA181");
    expect(messageOf(result, "ILA181")).toMatch(/known claim id/);
  });

  it("refuses the same claim named twice", () => {
    const result = verify(journey({ claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation", "siri-conversation"] }));
    expect(codes(result)).toContain("ILA181");
    expect(messageOf(result, "ILA181")).toMatch(/named twice/);
  });

  it("refuses a claims field that is not a list", () => {
    expect(codes(verify(journey({ claims: "siri-conversation" })))).toContain("ILA181");
  });

  it("refuses a claim id that is not a string", () => {
    expect(codes(verify(journey({ claims: [7] })))).toContain("ILA181");
  });
});

describe("several journeys bind independently", () => {
  it("lets one journey hold a claim and another name none", () => {
    const result = verify(
      journey({ id: "with-siri", claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] }),
      journey({ id: "without-claims", claimed: ["spotlight"] })
    );
    expect(codes(result)).toEqual([]);
  });

  it("refuses the ledger when one journey among many cannot hold a claim it names", () => {
    const result = verify(
      journey({ id: "good", claimed: ["metadata", "runtime", "siri"], claims: ["siri-conversation"] }),
      journey({ id: "bad", claimed: ["siri"], claims: ["siri-conversation"] })
    );
    expect(codes(result)).toContain("ILA182");
    expect(result.status).toBe("unverified");
  });
});

describe("the shipped IINA ledger is untouched by the binding", () => {
  it("names no claim, so nothing is inferred and the diagnostic count is unchanged", async () => {
    const { readFileSync } = await import("node:fs");
    const { parse } = await import("yaml");
    const { resolve } = await import("node:path");
    const document = parse(
      readFileSync(resolve(import.meta.dirname, "..", "..", "..", "pilots", "iina", "evidence-ledger.yaml"), "utf8")
    ) as unknown;
    const result = validatePilotLedger(document);
    expect(result.diagnostics.map((d) => d.code).sort()).toEqual([
      "ILA174", "ILA174", "ILA174", "ILA174", "ILA174", "ILA175"
    ]);
  });
});
