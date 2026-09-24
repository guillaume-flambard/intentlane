import { describe, expect, it } from "vitest";
import { compareMetadataToContract } from "./metadata-contract.js";

describe("compareMetadataToContract", () => {
  it("passes when the metadata advertises exactly the declared intents", () => {
    const result = compareMetadataToContract({ actions: { OpenNotebook: {}, SearchNotebooks: {} } }, ["OpenNotebook", "SearchNotebooks"]);

    expect(result).toMatchObject({ status: "pass", missing: [], unexpected: [] });
  });

  it("fails and names a declared intent the metadata does not advertise", () => {
    const result = compareMetadataToContract({ actions: { OpenNotebook: {} } }, ["OpenNotebook", "SearchNotebooks"]);

    expect(result.status).toBe("fail");
    expect(result.missing).toEqual(["SearchNotebooks"]);
    expect(result.nextAction).toContain("SearchNotebooks");
  });

  it("fails and names an action the contract does not declare", () => {
    const result = compareMetadataToContract({ actions: { OpenNotebook: {}, DeleteEverything: {} } }, ["OpenNotebook"]);

    expect(result.status).toBe("fail");
    expect(result.unexpected).toEqual(["DeleteEverything"]);
    expect(result.nextAction).toContain("DeleteEverything");
  });

  it("fails when the metadata carries no actions at all", () => {
    const result = compareMetadataToContract({}, ["OpenNotebook"]);

    expect(result.status).toBe("fail");
    expect(result.missing).toEqual(["OpenNotebook"]);
  });

  it("fails when actions is a list rather than a keyed object", () => {
    const result = compareMetadataToContract({ actions: ["OpenNotebook"] }, ["OpenNotebook"]);

    expect(result.status).toBe("fail");
    expect(result.nextAction).toContain("keyed by action name");
  });

  it("fails when the contract declares nothing and the metadata advertises something", () => {
    const result = compareMetadataToContract({ actions: { OpenNotebook: {} } }, []);

    expect(result.status).toBe("fail");
    expect(result.unexpected).toEqual(["OpenNotebook"]);
  });

  it("passes when neither side declares anything", () => {
    expect(compareMetadataToContract({ actions: {} }, [])).toMatchObject({ status: "pass" });
  });

  it("is not fooled by an inherited object key", () => {
    const result = compareMetadataToContract({ actions: {} }, ["toString"]);

    expect(result.status).toBe("fail");
    expect(result.missing).toEqual(["toString"]);
  });
});
