import { describe, expect, it } from "vitest";
import { PILOT_CLAIMS, claim, defaultClaimSet, unknownClaimIds, type PilotClaimId } from "./claims.js";

describe("pilot claims", () => {
  it("publishes a claim catalogue where every claim names how it is verified", () => {
    for (const entry of PILOT_CLAIMS) {
      expect(entry.title.length, `${entry.id} has a title`).toBeGreaterThan(0);
      expect(entry.verifiedBy.length, `${entry.id} names its verifier`).toBeGreaterThan(0);
    }
  });

  it("keeps the default claim set free of any claim only a person can verify", () => {
    const observed = defaultClaimSet()
      .map((id) => claim(id))
      .filter((entry) => entry.evidence === "observed");
    expect(observed).toEqual([]);
  });

  it("resolves a known claim and rejects a typo", () => {
    expect(claim("contract").evidence).toBe("deterministic");
    expect(() => claim("siri-conversations" as PilotClaimId)).toThrow(/unknown claim/i);
  });

  it("reports unknown claim identifiers instead of dropping them", () => {
    expect(unknownClaimIds(["contract", "spotlight-ui-result", "nope"])).toEqual(["nope"]);
  });

  it("separates the claims a machine can prove from the ones only an observation can", () => {
    expect(claim("siri-conversation").evidence).toBe("observed");
    expect(claim("spotlight-ui-result").evidence).toBe("observed");
    expect(claim("integrationTests").evidence).toBe("deterministic");
  });
});
