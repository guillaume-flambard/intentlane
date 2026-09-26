import { describe, expect, it } from "vitest";
import { findCapability } from "./audit-catalogue.js";

const record = findCapability("proof.app-intents-testing");

describe("the catalogue states AppIntentsTesting's real availability", () => {
  it("requires macOS 27, which is what the shipped framework declares", () => {
    expect(record?.availability.macos).toBe("27.0");
  });

  it("requires iOS 27, which is what the shipped framework declares", () => {
    expect(record?.availability.ios).toBe("27.0");
  });

  it("does not inherit a lower floor from a neighbouring record", () => {
    expect(findCapability("proof.confirmation")?.availability.macos).toBe("15.0");
    expect(record?.availability.macos).not.toBe(findCapability("proof.confirmation")?.availability.macos);
  });
});
