import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  MERGE_TAG,
  NATIVE_SOURCE,
  NATIVE_SOURCE_CONTENTS,
  REGISTRATION_CALL,
  applyIdeaResolver,
  ensureNativeSourceRegistered,
  registerResolverInAppDelegate,
  resolveExpoConfigPlugins,
  writeNativeSource
} from "./applyIdeaResolver.cjs";

const APP_DELEGATE = [
  "public override func application(",
  "  _ application: UIApplication,",
  "  didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil",
  ") -> Bool {",
  "  let factory = ExpoReactNativeFactory(delegate: delegate)",
  "  bindReactNativeFactory(factory)",
  "  return super.application(application, didFinishLaunchingWithOptions: launchOptions)",
  "}"
].join("\n");

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
      if (request === "expo/package.json") throw new Error("Cannot find module 'expo'");
      if (request === "@expo/config-plugins" && roots[0] === "/app") {
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

describe("writeNativeSource", () => {
  it("writes the resolver once and leaves the file alone afterwards", async () => {
    const platformProjectRoot = await mkdtemp(join(tmpdir(), "intentlane-native-"));
    const options = { platformProjectRoot, projectName: "Example" };
    const file = join(platformProjectRoot, "Example", "IntentLaneNative", NATIVE_SOURCE);

    expect(writeNativeSource(options)).toBe(true);
    expect(await readFile(file, "utf8")).toBe(NATIVE_SOURCE_CONTENTS);

    expect(writeNativeSource(options)).toBe(false);
  });

  it("restores a resolver file that was edited by hand", async () => {
    const platformProjectRoot = await mkdtemp(join(tmpdir(), "intentlane-native-"));
    const options = { platformProjectRoot, projectName: "Example" };
    const file = join(platformProjectRoot, "Example", "IntentLaneNative", NATIVE_SOURCE);

    writeNativeSource(options);
    await writeFile(file, "// hand edited\n", "utf8");

    expect(writeNativeSource(options)).toBe(true);
    expect(await readFile(file, "utf8")).toBe(NATIVE_SOURCE_CONTENTS);
  });
});

describe("ensureNativeSourceRegistered", () => {
  it("registers the resolver exactly once across repeated runs", () => {
    const project = { id: "project" };
    const group = { children: [{ comment: "AppDelegate.swift" }] };
    const addBuildSourceFileToGroup = vi.fn();
    const xcodeUtils = {
      ensureGroupRecursively: vi.fn(() => group),
      addBuildSourceFileToGroup,
      getApplicationNativeTarget: vi.fn(() => ({ uuid: "TARGET-UUID" }))
    };

    expect(ensureNativeSourceRegistered({ project, projectName: "Example", xcodeUtils })).toBe(true);
    expect(xcodeUtils.ensureGroupRecursively).toHaveBeenCalledWith(project, "Example/IntentLaneNative");
    expect(addBuildSourceFileToGroup).toHaveBeenCalledWith({
      filepath: join("Example", "IntentLaneNative", NATIVE_SOURCE),
      groupName: "Example/IntentLaneNative",
      project,
      targetUuid: "TARGET-UUID"
    });

    group.children.push({ comment: NATIVE_SOURCE });
    expect(ensureNativeSourceRegistered({ project, projectName: "Example", xcodeUtils })).toBe(false);
    expect(addBuildSourceFileToGroup).toHaveBeenCalledTimes(1);
  });
});

describe("registerResolverInAppDelegate", () => {
  function faithfulMerge({ src, newSrc, tag, anchor, offset, comment }: any): { contents: string } {
    const begin = `${comment} @generated begin ${tag} -`;
    if (src.includes(begin)) return { contents: src };
    const lines = src.split("\n");
    const index = lines.findIndex((line: string) => line.match(anchor));
    if (index < 0) throw new Error(`Failed to match "${anchor}" in contents`);
    lines.splice(index + offset, 0, begin, newSrc, `${comment} @generated end ${tag}`);
    return { contents: lines.join("\n") };
  }

  it("merges the registration call right after the factory binding", () => {
    const mergeContents = vi.fn(() => ({ contents: "merged" }));

    expect(registerResolverInAppDelegate({ contents: APP_DELEGATE, language: "swift", mergeContents })).toBe(
      "merged"
    );
    expect(mergeContents).toHaveBeenCalledWith({
      src: APP_DELEGATE,
      newSrc: REGISTRATION_CALL,
      tag: MERGE_TAG,
      anchor: /bindReactNativeFactory\(factory\)/,
      offset: 1,
      comment: "//"
    });
  });

  it("places the call inside the launch method and stays idempotent", () => {
    const once = registerResolverInAppDelegate({
      contents: APP_DELEGATE,
      language: "swift",
      mergeContents: faithfulMerge
    });
    const twice = registerResolverInAppDelegate({
      contents: once,
      language: "swift",
      mergeContents: faithfulMerge
    });

    expect(twice).toBe(once);
    expect(once.match(new RegExp(REGISTRATION_CALL, "g"))).toHaveLength(1);
    expect(once.indexOf(REGISTRATION_CALL)).toBeGreaterThan(once.indexOf("bindReactNativeFactory(factory)"));
    expect(once.indexOf(REGISTRATION_CALL)).toBeLessThan(once.indexOf("return super.application"));
  });

  it("refuses an AppDelegate that is not Swift", () => {
    expect(() =>
      registerResolverInAppDelegate({ contents: APP_DELEGATE, language: "objc", mergeContents: faithfulMerge })
    ).toThrow(/only register the entity resolver in a Swift AppDelegate, found 'objc'/);
  });

  it("fails with an actionable message when the anchor is gone", () => {
    expect(() =>
      registerResolverInAppDelegate({ contents: "class AppDelegate {}", language: "swift", mergeContents: faithfulMerge })
    ).toThrow(/could not find 'bindReactNativeFactory\(factory\)'/);
  });
});

describe("applyIdeaResolver", () => {
  let iosMods: ((modConfig: any) => Promise<unknown>)[] = [];
  let xcodeMods: ((modConfig: any) => unknown)[] = [];
  let appDelegateMods: ((modConfig: any) => unknown)[] = [];

  beforeEach(() => {
    iosMods = [];
    xcodeMods = [];
    appDelegateMods = [];
  });

  function dependencies() {
    const addBuildSourceFileToGroup = vi.fn();
    const plugins = {
      withDangerousMod: vi.fn((config: unknown, entry: readonly [string, (modConfig: any) => Promise<unknown>]) => {
        expect(entry[0]).toBe("ios");
        iosMods.push(entry[1]);
        return { ...(config as object), dangerous: true };
      }),
      withXcodeProject: vi.fn((config: unknown, action: (modConfig: any) => unknown) => {
        xcodeMods.push(action);
        return { ...(config as object), xcode: true };
      }),
      withAppDelegate: vi.fn((config: unknown, action: (modConfig: any) => unknown) => {
        appDelegateMods.push(action);
        return { ...(config as object), appDelegate: true };
      }),
      CodeGenerator: { mergeContents: vi.fn(() => ({ contents: "merged" })) }
    };

    return {
      plugins,
      xcodeUtils: {
        ensureGroupRecursively: () => ({ children: [] }),
        addBuildSourceFileToGroup,
        getApplicationNativeTarget: () => ({ uuid: "TARGET-UUID" })
      },
      projectRoot: "/app",
      addBuildSourceFileToGroup
    };
  }

  it("writes the source, registers it and patches the AppDelegate", async () => {
    const { plugins, xcodeUtils, projectRoot, addBuildSourceFileToGroup } = dependencies();

    const result = applyIdeaResolver({}, {}, { plugins, xcodeUtils, projectRoot });

    expect(result).toMatchObject({ dangerous: true, xcode: true, appDelegate: true });

    const platformProjectRoot = await mkdtemp(join(tmpdir(), "intentlane-apply-"));
    await iosMods[0]?.({
      modRequest: { projectName: "Example", platformProjectRoot }
    });
    expect(await readFile(join(platformProjectRoot, "Example", "IntentLaneNative", NATIVE_SOURCE), "utf8")).toBe(
      NATIVE_SOURCE_CONTENTS
    );

    xcodeMods[0]?.({
      modRequest: { projectName: "Example", platformProjectRoot },
      modResults: { id: "project" }
    });
    expect(addBuildSourceFileToGroup).toHaveBeenCalledTimes(1);

    const modConfig = { modResults: { contents: APP_DELEGATE, language: "swift" } };
    appDelegateMods[0]?.(modConfig);
    expect(modConfig.modResults.contents).toBe("merged");
    expect(plugins.CodeGenerator.mergeContents).toHaveBeenCalledWith({
      src: APP_DELEGATE,
      newSrc: REGISTRATION_CALL,
      tag: MERGE_TAG,
      anchor: /bindReactNativeFactory\(factory\)/,
      offset: 1,
      comment: "//"
    });
  });
});
