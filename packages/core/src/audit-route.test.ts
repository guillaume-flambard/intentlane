import { describe, expect, it } from "vitest";
import { AUDIT_ROUTES, detectIntegrationRoute } from "./audit-route.js";

describe("integration route", () => {
  it("publishes the documented routes", () => {
    expect([...AUDIT_ROUTES]).toEqual(["native", "bridged", "ineligible", "unknown"]);
  });

  it("reports a native target that nothing bridges", () => {
    const route = detectIntegrationRoute([
      "App.xcodeproj/project.pbxproj",
      "Sources/App/App.swift",
      "Sources/App/Notes.swift"
    ]);

    expect(route).toMatchObject({ route: "native", confidence: "high" });
    expect(route.evidence).toContainEqual({ kind: "project", path: "App.xcodeproj/project.pbxproj" });
  });

  it("reports a bridge that already produces a native target", () => {
    const route = detectIntegrationRoute([
      "app.json",
      "App.tsx",
      "package.json",
      "ios/IntentLaneExample.xcodeproj/project.pbxproj"
    ]);

    expect(route).toMatchObject({ route: "bridged", confidence: "high" });
    expect(route.evidence).toContainEqual({ kind: "project", path: "ios/IntentLaneExample.xcodeproj/project.pbxproj" });
    expect(route.evidence).toContainEqual({ kind: "config", path: "app.json" });
  });

  it("reports a bridge whose native target is not generated yet", () => {
    const route = detectIntegrationRoute(["app.json", "App.tsx", "package.json"]);

    expect(route).toMatchObject({ route: "bridged", confidence: "medium" });
    expect(route.evidence).toContainEqual({ kind: "config", path: "app.json" });
  });

  it("reports Swift without a target as a native project of lower confidence", () => {
    const route = detectIntegrationRoute(["IntentLaneGenerated.swift", "intentlane.manifest.json"]);

    expect(route).toMatchObject({ route: "native", confidence: "medium" });
    expect(route.evidence).toContainEqual({ kind: "swift", path: "IntentLaneGenerated.swift" });
  });

  it("reports a web-only project as ineligible", () => {
    const route = detectIntegrationRoute(["package.json", "index.html", "src/main.ts"]);

    expect(route).toMatchObject({ route: "ineligible", confidence: "high" });
    expect(route.evidence).toContainEqual({ kind: "config", path: "package.json" });
  });

  it("stays unknown when nothing recognizable is present", () => {
    expect(detectIntegrationRoute([])).toMatchObject({ route: "unknown", confidence: "low" });
    expect(detectIntegrationRoute(["README.md"])).toMatchObject({ route: "unknown", confidence: "medium" });
  });
});
