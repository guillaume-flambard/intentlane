import { describe, expect, it } from "vitest";
import { AUDIT_CATALOGUE_STATES, CAPABILITY_CATALOGUE, describeCatalogue } from "./audit-catalogue.js";

describe("catalogue state", () => {
  it("publishes the state contract", () => {
    expect([...AUDIT_CATALOGUE_STATES]).toEqual(["current", "newer", "older", "unknown"]);
  });

  it("stays unknown until an SDK is inspected", () => {
    const report = describeCatalogue();
    expect(report.state).toBe("unknown");
    expect(report.version).toBe("27.0");
    expect(report.capabilities).toBe(CAPABILITY_CATALOGUE.length);
    expect(report.sdkVersion).toBeUndefined();
    expect(report.nextAction).toBe(
      "Pass --sdk-path to compare the catalogue (27.0) with the installed SDK."
    );
  });

  it("reads the catalogue as current on the SDK it was derived from", () => {
    const report = describeCatalogue("27.0");
    expect(report).toMatchObject({ state: "current", sdkVersion: "27.0" });
    expect(report.nextAction).toBe("Keep the catalogue in step with the installed SDK (27.0).");
  });

  it("asks for a refresh when the SDK is newer than the catalogue", () => {
    const report = describeCatalogue("28.0");
    expect(report.state).toBe("older");
    expect(report.nextAction).toContain("Refresh the catalogue");
  });

  it("explains that an older SDK can make a capability read unsupported", () => {
    const report = describeCatalogue("26.5");
    expect(report.state).toBe("newer");
    expect(report.nextAction).toContain("older than the catalogue");
  });
});
