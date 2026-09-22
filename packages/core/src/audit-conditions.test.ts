import { describe, expect, it } from "vitest";
import {
  AUDIT_CONDITION_NAMES,
  AUDIT_CONDITION_STATES,
  describeConditions,
  recordedConditionCount
} from "./audit-conditions.js";

const environment = {
  osVersion: "27.0",
  xcodeVersion: "27A266a",
  architecture: "arm64",
  locale: "en-US",
  region: "US"
};

const human: readonly string[] = ["appleIntelligence", "account", "permissions", "testData"];

describe("audit conditions", () => {
  it("publishes the condition contract", () => {
    expect([...AUDIT_CONDITION_NAMES]).toEqual([
      "operatingSystem",
      "xcode",
      "architecture",
      "locale",
      "region",
      "appleIntelligence",
      "account",
      "permissions",
      "testData"
    ]);
    expect([...AUDIT_CONDITION_STATES]).toEqual(["recorded", "unknown"]);
  });

  it("records the environment it was given", () => {
    const report = describeConditions(environment);
    expect(report.conditions).toEqual([
      { name: "operatingSystem", state: "recorded", value: "27.0" },
      { name: "xcode", state: "recorded", value: "27A266a" },
      { name: "architecture", state: "recorded", value: "arm64" },
      { name: "locale", state: "recorded", value: "en-US" },
      { name: "region", state: "recorded", value: "US" },
      { name: "appleIntelligence", state: "unknown" },
      { name: "account", state: "unknown" },
      { name: "permissions", state: "unknown" },
      { name: "testData", state: "unknown" }
    ]);
    expect(recordedConditionCount(report)).toBe(5);
  });

  it("keeps the conditions a person has to confirm unknown", () => {
    const report = describeConditions(environment);
    for (const name of human) {
      expect(report.conditions.find((condition) => condition.name === name)).toMatchObject({ state: "unknown" });
    }
  });

  it("reports every condition as unknown without an environment", () => {
    const report = describeConditions();
    expect(report.conditions.every((condition) => condition.state === "unknown")).toBe(true);
    expect(recordedConditionCount(report)).toBe(0);
  });

  it("names the missing conditions in the next action", () => {
    const report = describeConditions({ osVersion: "27.0", xcodeVersion: "27A266a" });
    expect(report.nextAction).toBe(
      "Record architecture, locale, region, appleIntelligence, account, permissions, testData before claiming a Siri result."
    );
  });

  it("always asks for the conditions a person has to confirm", () => {
    const report = describeConditions(environment);
    expect(report.nextAction).toBe(
      "Record appleIntelligence, account, permissions, testData before claiming a Siri result."
    );
  });
});
