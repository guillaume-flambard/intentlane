import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyIntentLane, ensureGeneratedSourceRegistered, resolveGeneratorInvocation } from "./apply.cjs";

async function projectWithConfig(contents = 'schema: "0.1"\n'): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-plugin-"));
  await writeFile(join(root, "intentlane.yaml"), contents, "utf8");
  return root;
}

describe("resolveGeneratorInvocation", () => {
  it("builds a portable invocation rooted in the app project", async () => {
    const projectRoot = await projectWithConfig();
    const resolveModule = (request: string): string => `/app/node_modules/${request}`;

    const invocation = resolveGeneratorInvocation({
      projectRoot,
      configFile: "intentlane.yaml",
      outputDirectory: "/app/ios/Example/IntentLaneGenerated",
      resolveModule
    });

    expect(invocation.cwd).toBe(projectRoot);
    expect(invocation.command).toBe(process.execPath);
    expect(invocation.args).toEqual([
      "/app/node_modules/tsx/cli",
      "/app/node_modules/@intentlane/cli/src/index.ts",
      "generate",
      "--config",
      join(projectRoot, "intentlane.yaml"),
      "--output",
      "/app/ios/Example/IntentLaneGenerated"
    ]);
    expect(invocation.args.some((argument) => argument.includes("packages/cli"))).toBe(false);
  });

  it("fails with an actionable message when the config is missing", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "intentlane-plugin-"));
    expect(() =>
      resolveGeneratorInvocation({
        projectRoot,
        configFile: "intentlane.yaml",
        outputDirectory: "/app/ios/Example/IntentLaneGenerated",
        resolveModule: (request) => `/x/${request}`
      })
    ).toThrow(/intentlane\.yaml.*intentlane init/s);
  });

  it("fails with an actionable message when the CLI is not installed", async () => {
    const projectRoot = await projectWithConfig();
    expect(() =>
      resolveGeneratorInvocation({
        projectRoot,
        configFile: "intentlane.yaml",
        outputDirectory: "/app/ios/Example/IntentLaneGenerated",
        resolveModule: (request) => {
          if (request.startsWith("@intentlane/cli")) throw new Error("module not found");
          return `/x/${request}`;
        }
      })
    ).toThrow(/npm install --save-dev @intentlane\/cli/);
  });
});

describe("ensureGeneratedSourceRegistered", () => {
  it("registers the generated source exactly once across repeated runs", () => {
    const project = { id: "project" };
    const addBuildSourceFileToGroup = vi.fn();
    const group = { children: [{ comment: "AppDelegate.swift" }] };
    const xcodeUtils = {
      ensureGroupRecursively: vi.fn(() => group),
      addBuildSourceFileToGroup,
      getApplicationNativeTarget: vi.fn(() => ({ uuid: "TARGET-UUID" }))
    };

    expect(ensureGeneratedSourceRegistered({ project, projectName: "Example", xcodeUtils })).toBe(true);
    expect(addBuildSourceFileToGroup).toHaveBeenCalledTimes(1);
    expect(addBuildSourceFileToGroup).toHaveBeenCalledWith({
      filepath: "Example/IntentLaneGenerated/IntentLaneGenerated.swift",
      groupName: "Example/IntentLaneGenerated",
      project,
      targetUuid: "TARGET-UUID"
    });

    group.children.push({ comment: "IntentLaneGenerated.swift" } as never);
    expect(ensureGeneratedSourceRegistered({ project, projectName: "Example", xcodeUtils })).toBe(false);
    expect(addBuildSourceFileToGroup).toHaveBeenCalledTimes(1);
  });
});

describe("applyIntentLane", () => {
  let generated: { projectRoot: string; configFile: string; outputDirectory: string }[];

  beforeEach(() => {
    generated = [];
  });

  it("runs the generator before the iOS project and registers the source", async () => {
    const iosMods: ((modConfig: unknown) => Promise<unknown>)[] = [];
    const xcodeMods: ((modConfig: unknown) => unknown)[] = [];
    const plugins = {
      withDangerousMod: vi.fn((config: unknown, entry: readonly [string, (modConfig: any) => Promise<unknown>]) => {
        expect(entry[0]).toBe("ios");
        iosMods.push(entry[1]);
        return { ...(config as object), dangerous: true };
      }),
      withXcodeProject: vi.fn((config: unknown, action: (modConfig: any) => unknown) => {
        xcodeMods.push(action);
        return { ...(config as object), xcode: true };
      })
    };
    const addBuildSourceFileToGroup = vi.fn();
    const xcodeUtils = {
      ensureGroupRecursively: () => ({ children: [] }),
      addBuildSourceFileToGroup,
      getApplicationNativeTarget: () => ({ uuid: "TARGET-UUID" })
    };

    const result = applyIntentLane({ name: "app" }, {}, {
      plugins,
      xcodeUtils,
      projectRoot: "/app",
      runGenerator: (request) => {
        generated.push(request);
      }
    });

    expect(result).toMatchObject({ dangerous: true, xcode: true });

    await iosMods[0]?.({
      modRequest: { projectName: "Example", platformProjectRoot: "/app/ios" }
    });
    expect(generated[0]).toEqual({
      projectRoot: "/app",
      configFile: "intentlane.yaml",
      outputDirectory: "/app/ios/Example/IntentLaneGenerated"
    });

    xcodeMods[0]?.({ modRequest: { projectName: "Example" }, modResults: { id: "project" } });
    expect(addBuildSourceFileToGroup).toHaveBeenCalledTimes(1);
  });

  it("honours a custom config file name", async () => {
    const iosMods: ((modConfig: unknown) => Promise<unknown>)[] = [];
    applyIntentLane({}, { configFile: "intentlane.prod.yaml" }, {
      plugins: {
        withDangerousMod: (_config, entry) => {
          iosMods.push(entry[1]);
          return {};
        },
        withXcodeProject: (config) => config
      },
      xcodeUtils: {
        ensureGroupRecursively: () => ({ children: [] }),
        addBuildSourceFileToGroup: () => undefined,
        getApplicationNativeTarget: () => ({ uuid: "TARGET-UUID" })
      },
      projectRoot: "/app",
      runGenerator: (request) => {
        generated.push(request);
      }
    });
    await iosMods[0]?.({ modRequest: { projectName: "Example", platformProjectRoot: "/app/ios" } });
    expect(generated[0]?.configFile).toBe("intentlane.prod.yaml");
  });
});
