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

/**
 * An Xcode project inside a repository does not prove that the audited platform is
 * native there. Ardour ships a macOS crash reporter and an audio library as Xcode
 * projects while its application is built with waf and contains no Swift at all.
 */
describe("route against the target evidence", () => {
  const xcodeProject = "tools/CrashReporter/CrashReporter.xcodeproj/project.pbxproj";

  it("does not claim a native route when the Xcode project carries no application target", () => {
    const route = detectIntegrationRoute([xcodeProject, "README.md"], [], {
      platform: "macos",
      targetCount: 0,
      targetsForPlatform: 0,
      targetsElsewhere: 0
    });

    expect(route.route).toBe("unknown");
    expect(route.nextAction).toMatch(/no application target/i);
  });

  it("does not claim a native route when every target compiles for another platform", () => {
    const route = detectIntegrationRoute(["App.xcodeproj/project.pbxproj"], [], {
      platform: "macos",
      targetCount: 1,
      targetsForPlatform: 0,
      targetsElsewhere: 1
    });

    expect(route.route).toBe("unknown");
    expect(route.nextAction).toContain("macos");
    expect(route.nextAction).toContain("other platforms");
  });

  it("keeps the native route when a target compiles for the audited platform", () => {
    expect(
      detectIntegrationRoute(["App.xcodeproj/project.pbxproj"], [], {
        platform: "macos",
        targetCount: 2,
        targetsForPlatform: 1,
        targetsElsewhere: 1
      })
    ).toMatchObject({ route: "native", confidence: "high" });
  });

  it("keeps the native route when a real target exists but its platform is unresolved", () => {
    expect(
      detectIntegrationRoute(["App.xcodeproj/project.pbxproj"], [], {
        platform: "macos",
        targetCount: 1,
        targetsForPlatform: 0,
        targetsElsewhere: 0
      })
    ).toMatchObject({ route: "native", confidence: "high" });
  });

  it("leaves a bridge and a web project alone when target evidence is absent", () => {
    expect(
      detectIntegrationRoute(["app.json", "App.tsx", "ios/App.xcodeproj/project.pbxproj"], [], {
        platform: "macos",
        targetCount: 1,
        targetsForPlatform: 0,
        targetsElsewhere: 1
      })
    ).toMatchObject({ route: "bridged" });
    expect(
      detectIntegrationRoute(["package.json", "index.html"], [], {
        platform: "macos",
        targetCount: 0,
        targetsForPlatform: 0,
        targetsElsewhere: 0
      })
    ).toMatchObject({ route: "ineligible" });
  });
});
