import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyIntentLane,
  ensureDeploymentTarget,
  ensureGeneratedSourceRegistered,
  ensureLocaleResourcesRegistered,
  localeResources,
  readManifest,
  resolveExpoConfigPlugins,
  resolveGeneratorInvocation
} from "./apply.cjs";

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
      addResourceFileToGroup: vi.fn(),
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

    xcodeMods[0]?.({
      modRequest: { projectName: "Example", platformProjectRoot: "/app/ios" },
      modResults: { id: "project" }
    });
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
        addResourceFileToGroup: () => undefined,
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

async function manifestDirectory(files: unknown): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-manifest-"));
  const contents = typeof files === "string" ? files : JSON.stringify({ version: "0.1", inputHash: "hash", files });
  await writeFile(join(root, "intentlane.manifest.json"), contents, "utf8");
  return root;
}

describe("localeResources", () => {
  it("reads locale resources in code point order and ignores everything else", async () => {
    const root = await manifestDirectory([
      { path: "fr.lproj/IntentLane.strings" },
      { path: "IntentLaneGenerated.swift" },
      { path: "de.lproj/IntentLane.strings" },
      { path: "nested/de.lproj/IntentLane.strings" },
      { path: "fr.lproj" }
    ]);

    expect(localeResources(join(root, "intentlane.manifest.json"))).toEqual([
      { locale: "de", file: "IntentLane.strings", path: "de.lproj/IntentLane.strings" },
      { locale: "fr", file: "IntentLane.strings", path: "fr.lproj/IntentLane.strings" }
    ]);
  });

  it("returns nothing when the manifest is missing, unreadable or malformed", async () => {
    expect(localeResources(join(tmpdir(), "intentlane-plugin-missing", "intentlane.manifest.json"))).toEqual([]);

    const unreadable = await manifestDirectory("not json");
    expect(localeResources(join(unreadable, "intentlane.manifest.json"))).toEqual([]);

    const malformed = await manifestDirectory(undefined);
    expect(localeResources(join(malformed, "intentlane.manifest.json"))).toEqual([]);
  });
});

describe("ensureLocaleResourcesRegistered", () => {
  it("registers locale resources once and stays idempotent", async () => {
    const outputDirectory = await manifestDirectory([
      { path: "fr.lproj/IntentLane.strings" },
      { path: "IntentLaneGenerated.swift" }
    ]);
    const project = { id: "project" };
    const group = { children: [{ comment: "existing" }] };
    const addResourceFileToGroup = vi.fn();
    const ensureGroupRecursively = vi.fn(() => group);

    const options = {
      project,
      projectName: "Example",
      outputDirectory,
      xcodeUtils: {
        ensureGroupRecursively,
        addResourceFileToGroup,
        getApplicationNativeTarget: () => ({ uuid: "TARGET-UUID" })
      }
    };

    expect(ensureLocaleResourcesRegistered(options)).toBe(1);
    expect(ensureGroupRecursively).toHaveBeenCalledWith(project, "Example/IntentLaneGenerated/fr.lproj");
    expect(addResourceFileToGroup).toHaveBeenCalledWith({
      filepath: join("Example", "IntentLaneGenerated", "fr.lproj/IntentLane.strings"),
      groupName: "Example/IntentLaneGenerated/fr.lproj",
      project,
      isBuildFile: true,
      verbose: true,
      targetUuid: "TARGET-UUID"
    });

    group.children.push({ comment: "IntentLane.strings" });
    expect(ensureLocaleResourcesRegistered(options)).toBe(0);
    expect(addResourceFileToGroup).toHaveBeenCalledTimes(1);
  });
});

describe("resolveExpoConfigPlugins", () => {
  it("anchors the lookup on the project expo package", () => {
    const seen: [string, readonly string[]][] = [];
    const resolveModule = (request: string, roots: readonly string[]): string => {
      seen.push([request, roots]);
      if (request === "expo/package.json") {
        return "/app/node_modules/.pnpm/expo@54.0.37/node_modules/expo/package.json";
      }
      if (request === "@expo/config-plugins" && roots[0] === "/app/node_modules/.pnpm/expo@54.0.37/node_modules/expo") {
        return "/app/node_modules/.pnpm/expo@54.0.37/node_modules/@expo/config-plugins/build/index.js";
      }
      throw new Error(`Cannot find module '${request}'`);
    };

    expect(resolveExpoConfigPlugins({ projectRoot: "/app", resolveModule })).toBe(
      "/app/node_modules/.pnpm/expo@54.0.37/node_modules/@expo/config-plugins/build/index.js"
    );
    expect(seen).toEqual([
      ["expo/package.json", ["/app"]],
      ["@expo/config-plugins", ["/app/node_modules/.pnpm/expo@54.0.37/node_modules/expo"]]
    ]);
  });

  it("falls back to the project root when expo cannot be resolved", () => {
    const resolveModule = (request: string, roots: readonly string[]): string => {
      if (request === "expo/package.json") {
        throw new Error("Cannot find module 'expo/package.json'");
      }
      if (roots[0] === "/app") {
        return "/app/node_modules/@expo/config-plugins/build/index.js";
      }
      throw new Error(`Cannot find module '${request}'`);
    };

    expect(resolveExpoConfigPlugins({ projectRoot: "/app", resolveModule })).toBe(
      "/app/node_modules/@expo/config-plugins/build/index.js"
    );
  });

  it("fails with an actionable message when the config plugins are unreachable", () => {
    const resolveModule = (request: string): string => {
      throw new Error(`Cannot find module '${request}'`);
    };

    expect(() => resolveExpoConfigPlugins({ projectRoot: "/app", resolveModule })).toThrow(
      /could not load '@expo\/config-plugins'.*'expo' is installed in \/app/
    );
  });
});

describe("ensureDeploymentTarget", () => {
  it("raises every deployment target below the contract minimum", () => {
    const configurations = {
      first: { buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: "15.1" } },
      second: { buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: "17.5" } },
      third: { buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: "18.0" } },
      fourth: { buildSettings: { PRODUCT_NAME: "IntentLaneExample" } }
    };
    const project = { pbxXCBuildConfigurationSection: () => configurations };

    expect(ensureDeploymentTarget({ project, minIos: "18.0" })).toBe(2);
    expect(configurations.first.buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe("18.0");
    expect(configurations.second.buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe("18.0");
    expect(configurations.third.buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe("18.0");
    expect(configurations.fourth.buildSettings).toEqual({ PRODUCT_NAME: "IntentLaneExample" });
  });

  it("never lowers a deployment target that is already above the minimum", () => {
    const configurations = { only: { buildSettings: { IPHONEOS_DEPLOYMENT_TARGET: "19.0" } } };
    const project = { pbxXCBuildConfigurationSection: () => configurations };

    expect(ensureDeploymentTarget({ project, minIos: "18.0" })).toBe(0);
    expect(configurations.only.buildSettings.IPHONEOS_DEPLOYMENT_TARGET).toBe("19.0");
  });
});

describe("readManifest", () => {
  it("reads the manifest and stays quiet when it is missing", async () => {
    const root = await manifestDirectory([{ path: "fr.lproj/IntentLane.strings" }]);

    expect(readManifest(join(root, "intentlane.manifest.json"))).toEqual({
      version: "0.1",
      inputHash: "hash",
      files: [{ path: "fr.lproj/IntentLane.strings" }]
    });
    expect(readManifest(join(tmpdir(), "intentlane-plugin-absent", "intentlane.manifest.json"))).toBeUndefined();
  });
});
