import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(path: string): string {
  return readFileSync(resolve(repositoryRoot, path), "utf8");
}

function json(path: string): Record<string, unknown> {
  return JSON.parse(read(path)) as Record<string, unknown>;
}

function trackedFiles(): readonly string[] {
  return execFileSync("git", ["ls-files"], { cwd: repositoryRoot, encoding: "utf8" })
    .split("\n")
    .filter((entry) => entry.length > 0);
}

describe("the public repository surface", () => {
  it("keeps the root README short and installable from the published CLI", () => {
    const contents = read("README.md");
    const words = contents.trim().split(/\s+/);

    expect(words.length).toBeLessThan(1_500);
    expect(contents).toContain("npm install --save-dev @memolabs-apps/intentlane@0.1.0");
    expect(contents).toContain("The Expo config plugin");
    expect(contents).toContain("it is not published on npm today");
    expect(contents).not.toMatch(/npm install[^\n]*intentlane-expo/);
  });

  it("prepares complete metadata for the next packages without calling them released", () => {
    const cli = json("packages/cli/package.json");
    const expo = json("packages/expo-plugin/package.json");
    const cliSource = read("packages/cli/src/index.ts");

    expect(cli.name).toBe("@memolabs-apps/intentlane");
    expect(expo.name).toBe("@memolabs-apps/intentlane-expo");
    expect(cli.version).toBe("0.2.0-next.0");
    expect(expo.version).toBe("0.2.0-next.0");
    expect(cliSource).toContain(`program.version("${String(cli.version)}")`);

    for (const manifest of [cli, expo]) {
      expect(manifest.description).toEqual(expect.any(String));
      expect(manifest.repository).toEqual(expect.objectContaining({ type: "git" }));
      expect(manifest.homepage).toMatch(/^https:\/\/github\.com\//);
      expect(manifest.bugs).toEqual(expect.objectContaining({ url: expect.stringMatching(/^https:\/\/github\.com\//) }));
      expect(manifest.keywords).toEqual(expect.arrayContaining(["app-intents"]));
      expect(manifest.publishConfig).toEqual({ access: "public" });
    }

    expect(read("packages/cli/README.md")).toContain("prepared for the next prerelease");
    expect(read("packages/expo-plugin/README.md")).toContain("not published on npm");
  });

  it("parses every public issue form and the maintained client workflow", () => {
    const forms = trackedFiles().filter((path) => path.startsWith(".github/ISSUE_TEMPLATE/") && path.endsWith(".yml"));
    expect(forms.length).toBeGreaterThanOrEqual(3);

    for (const form of forms) {
      expect(() => parse(read(form)), form).not.toThrow();
    }

    const workflow = parse(read("docs/examples/intentlane-ci.yml")) as {
      jobs?: { verify?: { steps?: readonly Record<string, unknown>[] } };
    };
    const steps = workflow.jobs?.verify?.steps ?? [];
    expect(steps).toHaveLength(5);
    expect(steps[0]).toEqual({ uses: "actions/checkout@v5" });
    expect(steps[1]).toEqual(expect.objectContaining({ uses: "actions/setup-node@v5" }));
    expect(steps.at(-1)).toEqual(expect.objectContaining({ run: expect.stringContaining("intentlane verify") }));
  });

  it("does not publish known machine, mirror, account, or commercial-milestone details", () => {
    const forbidden = [
      ["/Users", "/memo"].join(""),
      ["intentlane", "-private"].join(""),
      ["npm", " whoami"].join(""),
      ["2026", "-10-10"].join(""),
      ["2026", "-11-15"].join("")
    ];
    const offenders: string[] = [];

    for (const path of trackedFiles()) {
      const bytes = readFileSync(resolve(repositoryRoot, path));
      if (bytes.includes(0)) continue;
      const contents = bytes.toString("utf8");
      for (const marker of forbidden) {
        if (contents.includes(marker)) offenders.push(`${path}: ${marker}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
