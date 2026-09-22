import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compareVersions, readSdkInfo } from "./audit-sdk.js";

async function fixture(settings: unknown): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-sdk-"));
  await mkdir(join(root, "SDK"), { recursive: true });
  if (settings !== undefined) {
    await writeFile(join(root, "SDK", "SDKSettings.json"), JSON.stringify(settings), "utf8");
  }
  return join(root, "SDK");
}

describe("readSdkInfo", () => {
  it("reads the versioned settings of an SDK directory", async () => {
    const directory = await fixture({
      Version: "27.0",
      CanonicalName: "macosx27.0",
      DisplayName: "macOS 27.0",
      DefaultDeploymentTarget: "27.0",
      MaximumDeploymentTarget: "27.0.99",
      SupportedTargets: { macosx: {}, iosmac: {} }
    });

    expect(await readSdkInfo(directory)).toEqual({
      path: directory,
      version: "27.0",
      canonicalName: "macosx27.0",
      name: "macOS 27.0",
      defaultDeploymentTarget: "27.0",
      maximumDeploymentTarget: "27.0.99",
      targets: ["macosx", "iosmac"]
    });
  });

  it("accepts the settings file itself", async () => {
    const directory = await fixture({ Version: "26.5", CanonicalName: "macosx26.5" });
    const info = await readSdkInfo(join(directory, "SDKSettings.json"));
    expect(info?.version).toBe("26.5");
    expect(info?.name).toBe("macosx26.5");
    expect(info?.targets).toEqual([]);
  });

  it("returns nothing when the settings are missing or unusable", async () => {
    const empty = await fixture(undefined);
    expect(await readSdkInfo(empty)).toBeUndefined();
    expect(await readSdkInfo(join(tmpdir(), "intentlane-sdk-missing"))).toBeUndefined();
    const versionless = await fixture({ CanonicalName: "macosx27.0" });
    expect(await readSdkInfo(versionless)).toBeUndefined();
  });
});

describe("compareVersions", () => {
  it("orders dotted versions numerically", () => {
    expect(compareVersions("27.0", "26.5")).toBeGreaterThan(0);
    expect(compareVersions("26.5", "27.0")).toBeLessThan(0);
    expect(compareVersions("27.0", "27.0")).toBe(0);
    expect(compareVersions("27.0.1", "27.0")).toBeGreaterThan(0);
  });
});
