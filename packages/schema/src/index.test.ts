import { describe, expect, it } from "vitest";
import { intentLaneConfigSchema } from "./index.js";

const app = (overrides: Record<string, unknown> = {}) => ({
  id: "dev.intentlane.example",
  name: "Example",
  url_scheme: "example",
  min_ios: "18.0",
  locales: ["en"],
  ...overrides
});

const config = (overrides: Record<string, unknown> = {}) => ({
  schema: "0.1",
  app: app(overrides),
  intents: [{ id: "open_thing", title: { en: "Open" }, parameters: [], execution: { mode: "open_app", route: "/open" } }]
});

describe("platform floors", () => {
  it("accepts a contract that declares min_ios only", () => {
    expect(intentLaneConfigSchema.safeParse(config()).success).toBe(true);
  });

  it("accepts a contract that declares min_macos only", () => {
    expect(intentLaneConfigSchema.safeParse(config({ min_ios: undefined, min_macos: "10.14" })).success).toBe(true);
  });

  it("accepts a contract that declares both floors", () => {
    expect(intentLaneConfigSchema.safeParse(config({ min_macos: "13.0" })).success).toBe(true);
  });

  it("rejects a contract that declares neither floor", () => {
    const result = intentLaneConfigSchema.safeParse(config({ min_ios: undefined }));

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("min_ios or min_macos");
  });

  it.each(["10", "10.14.1", "v10.14", "", "ten"])("rejects the malformed floor %j", (min_macos) => {
    expect(intentLaneConfigSchema.safeParse(config({ min_ios: undefined, min_macos })).success).toBe(false);
  });

  it("rejects an unknown app key", () => {
    expect(intentLaneConfigSchema.safeParse(config({ platform: "macos" })).success).toBe(false);
  });
});
