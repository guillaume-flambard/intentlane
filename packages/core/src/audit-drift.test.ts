import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOGUE_DRIFT_FRAMEWORKS,
  DEFAULT_SWIFTINTERFACE_VARIANT,
  DRIFT_FINDING_KINDS,
  SWIFTINTERFACE_VARIANTS,
  catalogueFrameworks,
  compareCatalogueWithSdk,
  parseObjcHeaders,
  parseSwiftinterface,
  readFrameworkSymbols,
  readSdkSymbolIndex
} from "./audit-drift.js";
import { readSdkInfo } from "./audit-sdk.js";
import { AUDIT_STATES } from "./audit.js";
import { CAPABILITY_CATALOGUE } from "./audit-catalogue.js";
import { runAudit } from "./audit-run.js";

const INTERFACE_HEADER = ["// swift-interface-format-version: 1.0", "@available(macOS 27.0, *)"].join("\n");

const APP_INTENTS_INTERFACE = [
  INTERFACE_HEADER,
  "public protocol AppIntent : Swift::Sendable {",
  "  func perform() async throws -> some IntentResult",
  "}",
  "public struct IntentResult {",
  "  internal var hidden: Swift::Int",
  "}",
  "public enum ParameterMode {",
  "  case required",
  "}",
  "struct InternalOnly {",
  "}",
  "public class UnclaimedSymbol {",
  "}"
];

const CORE_SPOTLIGHT_INTERFACE = [INTERFACE_HEADER, "public struct CSSearchableItemRefinement {", "}"];

const FOUNDATION_MODELS_INTERFACE = [INTERFACE_HEADER, "public protocol Generable {", "}", "public struct GenerationOptions {", "}"];

const CORE_SPOTLIGHT_HEADER = [
  "//  CSSearchableIndex.h",
  "@interface CSSearchableIndex : NSObject",
  "@end",
  "",
  "@interface CSSearchableIndex (CSOptionalBatching) : CSSearchableIndex",
  "@end",
  "",
  "//  CSSearchableItem.h",
  "@interface CSSearchableItem : NSObject",
  "@end"
];

const APP_INTENTS_TESTING_INTERFACE = [INTERFACE_HEADER, "public protocol AppIntentTypeDefinition {", "}"];

const APP_INTENTS_SYMBOLS = ["AppIntent", "IntentResult", "ParameterMode", "UnclaimedSymbol", "perform", "required"];

/** An interface that declares exactly the symbols the catalogue attributes to one framework. */
function interfaceDeclaring(symbols: readonly string[]): readonly string[] {
  return symbols.map((symbol) => (/^[A-Z]/.test(symbol) ? `public struct ${symbol} {` : `public func ${symbol}()`));
}

const CLAIMED_BY_APP_INTENTS = [
  ...new Set(
    CAPABILITY_CATALOGUE.flatMap((record) => record.sdk)
      .filter((entry) => entry.framework === "AppIntents")
      .map((entry) => entry.symbol)
  )
].sort();

const CLAIMED_BY_CORE_SPOTLIGHT = [
  ...new Set(
    CAPABILITY_CATALOGUE.flatMap((record) => record.sdk)
      .filter((entry) => entry.framework === "CoreSpotlight")
      .map((entry) => entry.symbol)
  )
].sort();

type FrameFixture = Readonly<{ interface?: readonly string[]; headers?: readonly string[] }>;

async function sdkFixture(
  frames: Readonly<Record<string, FrameFixture>>,
  variant: string = DEFAULT_SWIFTINTERFACE_VARIANT,
  options: Readonly<{ platformFrameworks?: boolean }> = {}
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-drift-"));
  const sdk = join(root, "SDKs", "MacOSX.sdk");
  const bases = [join(sdk, "System", "Library", "Frameworks")];
  if (options.platformFrameworks === true) bases.push(join(root, "Developer", "Library", "Frameworks"));
  for (const [framework, frame] of Object.entries(frames)) {
    for (const base of bases) {
      if (frame.interface !== undefined) {
        const bundle = join(base, `${framework}.framework`, "Modules", `${framework}.swiftmodule`);
        await mkdir(bundle, { recursive: true });
        await writeFile(join(bundle, `${variant}.swiftinterface`), frame.interface.join("\n"), "utf8");
      }
      if (frame.headers !== undefined) {
        const headers = join(base, `${framework}.framework`, "Headers");
        await mkdir(headers, { recursive: true });
        await writeFile(join(headers, `${framework}.h`), frame.headers.join("\n"), "utf8");
      }
    }
  }
  return sdk;
}

async function projectFixture(contents: readonly string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-drift-project-"));
  await mkdir(join(root, "Sources", "App"), { recursive: true });
  await writeFile(join(root, "Sources", "App", "Actions.swift"), contents.join("\n"), "utf8");
  return root;
}

const PROJECT = [
  "import AppIntents",
  "",
  "struct CreateNote: AppIntent {",
  "}",
  "",
  "struct Shortcuts: AppShortcutsProvider {",
  "  static var appShortcuts: [AppShortcut] { [] }",
  "}"
];

describe("parseSwiftinterface", () => {
  it("reads public declarations, protocol requirements and modifiers in any order", () => {
    const names = parseSwiftinterface(
      [
        "// swift-interface-format-version: 1.0",
        "@available(macOS 27.0, iOS 27.0, *)",
        "public protocol AppIntent : Swift::Sendable {",
        "  func perform() async throws -> some IntentResult",
        "}",
        "@_alwaysEmitConformanceMetadata public protocol AppEntity {",
        "  static var defaultQuery: some EntityQuery { get }",
        "}",
        "final public class PrivateCloudComputeLanguageModel {",
        "}",
        "@attached(extension) public macro AppEnum<T>(schema: T) = #externalMacro(module: \"M\", type: \"T\")",
        "public var exported: Swift::Bool { get }"
      ].join("\n")
    );

    expect(names).toEqual([
      "AppEntity",
      "AppEnum",
      "AppIntent",
      "PrivateCloudComputeLanguageModel",
      "defaultQuery",
      "exported",
      "perform"
    ]);
  });

  it("never promotes an explicit non-public declaration", () => {
    const names = parseSwiftinterface(
      [
        "struct Hidden {",
        "}",
        "public struct Shown {",
        "  internal var hidden: Swift::Int",
        "  public var shown: Swift::Int",
        "}"
      ].join("\n")
    );

    expect(names).toEqual(["Shown", "shown"]);
  });

  it("ignores a declaration that hides behind a line comment", () => {
    expect(parseSwiftinterface(["public struct Real {", "// public struct Commented {"].join("\n"))).toEqual(["Real"]);
  });
});

describe("parseObjcHeaders", () => {
  it("reads base interfaces and protocols without counting a category", () => {
    expect(parseObjcHeaders(CORE_SPOTLIGHT_HEADER.join("\n"))).toEqual(["CSSearchableIndex", "CSSearchableItem"]);
    expect(parseObjcHeaders(["@protocol CSIndexableDelegate", "@protocol ForwardDeclared;"].join("\n"))).toEqual([
      "CSIndexableDelegate"
    ]);
  });
});

describe("readFrameworkSymbols", () => {
  it("lists the public symbols a framework ships", async () => {
    const sdk = await sdkFixture({
      AppIntents: { interface: APP_INTENTS_INTERFACE },
      CoreSpotlight: { interface: CORE_SPOTLIGHT_INTERFACE, headers: CORE_SPOTLIGHT_HEADER }
    });

    expect(await readFrameworkSymbols(sdk, "AppIntents")).toEqual(APP_INTENTS_SYMBOLS);
    expect(await readFrameworkSymbols(sdk, "CoreSpotlight")).toEqual([
      "CSSearchableIndex",
      "CSSearchableItem",
      "CSSearchableItemRefinement"
    ]);
  });

  it("returns nothing for a framework the SDK does not ship, rather than an empty set", async () => {
    const sdk = await sdkFixture({ AppIntents: { interface: APP_INTENTS_INTERFACE } });

    expect(await readFrameworkSymbols(sdk, "FoundationModels")).toBeUndefined();
    expect(await readFrameworkSymbols(join(sdk, "absent"), "AppIntents")).toBeUndefined();
  });

  it("returns nothing for a variant the SDK does not ship", async () => {
    const sdk = await sdkFixture({ AppIntents: { interface: APP_INTENTS_INTERFACE } }, "arm64e-apple-macos");

    expect(await readFrameworkSymbols(sdk, "AppIntents", "x86_64-apple-ios-macabi")).toBeUndefined();
    expect(await readFrameworkSymbols(sdk, "AppIntents", "arm64e-apple-macos")).toEqual(APP_INTENTS_SYMBOLS);
  });

  it("reads a framework the platform developer directory ships next to the SDK", async () => {
    const sdk = await sdkFixture({ AppIntentsTesting: { interface: APP_INTENTS_TESTING_INTERFACE } }, undefined, {
      platformFrameworks: true
    });

    expect(await readFrameworkSymbols(sdk, "AppIntentsTesting")).toEqual(["AppIntentTypeDefinition"]);
  });
});

describe("compareCatalogueWithSdk", () => {
  it("resolves a catalogue symbol in the framework it declares", async () => {
    const sdk = await sdkFixture({
      AppIntents: { interface: [...INTERFACE_HEADER, ...interfaceDeclaring(CLAIMED_BY_APP_INTENTS), "public class UnclaimedSymbol {"] },
      CoreSpotlight: { interface: CORE_SPOTLIGHT_INTERFACE, headers: CORE_SPOTLIGHT_HEADER }
    });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents", "CoreSpotlight"]));

    expect(drift.unresolvedEvidence).toEqual([]);
    expect(drift.duplicateSymbols).toEqual([]);
    for (const symbol of [...CLAIMED_BY_APP_INTENTS, ...CLAIMED_BY_CORE_SPOTLIGHT]) {
      expect(drift.gaps.map((gap) => gap.symbol)).not.toContain(symbol);
    }
    expect(drift.gaps.map((gap) => gap.symbol)).toContain("UnclaimedSymbol");
  });

  it("reports a symbol the declared framework does not declare, and stays silent on a framework it could not read", async () => {
    const sdk = await sdkFixture({ AppIntents: { interface: [INTERFACE_HEADER, "public struct SomethingElse {", "}"] } });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents"]));

    expect(drift.unreadable).toEqual(expect.arrayContaining(["CoreSpotlight", "CoreTransferable", "Foundation", "FoundationModels"]));
    expect(new Set(drift.unresolvedEvidence.map((finding) => finding.framework))).toEqual(new Set(["AppIntents"]));
    expect(drift.unresolvedEvidence[0]).toEqual({
      kind: "unresolved-evidence",
      framework: "AppIntents",
      symbol: "AppIntent",
      capability: "foundation.app-intent",
      detail: "foundation.app-intent claims AppIntent in AppIntents, and the installed SDK does not declare it there."
    });
    for (const finding of drift.unresolvedEvidence) expect(finding.kind).toBe("unresolved-evidence");
  });

  it("reports a symbol two frameworks declare as an ambiguous attribution", async () => {
    const sdk = await sdkFixture({
      AppIntents: { interface: APP_INTENTS_INTERFACE },
      FoundationModels: { interface: FOUNDATION_MODELS_INTERFACE }
    });
    const drift = compareCatalogueWithSdk([
      ...(await readSdkSymbolIndex(sdk, ["AppIntents", "FoundationModels"])),
      { framework: "AppIntentsTypeSupport", symbols: ["AppIntent"] }
    ]);

    expect(drift.duplicateSymbols).toEqual([
      {
        kind: "duplicate-symbol",
        framework: "AppIntents",
        symbol: "AppIntent",
        detail: "AppIntent is declared by AppIntents, AppIntentsTypeSupport, so a record cannot name it unambiguously."
      }
    ]);
  });

  it("reports an out-of-catalogue symbol as a catalogue gap, never as a finding of an audited project", async () => {
    const sdk = await sdkFixture({ AppIntents: { interface: APP_INTENTS_INTERFACE } });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents"]));

    expect(drift.gaps.filter((gap) => gap.symbol === "UnclaimedSymbol")).toEqual([
      {
        kind: "catalogue-gap",
        framework: "AppIntents",
        symbol: "UnclaimedSymbol",
        detail: "AppIntents declares the public symbol UnclaimedSymbol, and the catalogue 27.0 does not describe it. This is a catalogue gap, not a capability missing from an audited project."
      }
    ]);

    const report = await runAudit({ directory: await projectFixture(PROJECT), platform: "macos", name: "App" });
    const capabilities = report.findings.map((finding) => finding.capability);
    expect(capabilities).toContain("foundation.app-intent");
    expect(capabilities).not.toContain("UnclaimedSymbol");
    expect(JSON.stringify(report)).not.toContain("UnclaimedSymbol");
    expect(JSON.stringify(report)).not.toContain("catalogue-gap");
  });

  it("keeps a drift finding free of the vocabulary of an audited project", async () => {
    const sdk = await sdkFixture({ AppIntents: { interface: APP_INTENTS_INTERFACE } });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents"]));
    const gap = drift.gaps.find((finding) => finding.symbol === "UnclaimedSymbol");
    if (!gap) throw new Error("Expected a catalogue gap for UnclaimedSymbol.");

    expect(Object.keys(gap).sort()).toEqual(["detail", "framework", "kind", "symbol"]);
    for (const field of ["platform", "state", "confidence", "capability", "gaps", "evidence", "nextAction"]) {
      expect(gap).not.toHaveProperty(field);
    }
  });
});

async function installedSdk(): Promise<Readonly<{ path: string; version: string }> | undefined> {
  const path = await new Promise<string | undefined>((resolve) => {
    execFile("xcrun", ["--show-sdk-path"], (error, stdout) => resolve(error ? undefined : stdout.trim()));
  });
  if (path === undefined || path.length === 0) return undefined;
  const info = await readSdkInfo(path);
  if (info === undefined || !info.version.startsWith("27.")) return undefined;
  return { path, version: info.version };
}

const installed = await installedSdk();

describe.skipIf(installed === undefined)("the installed SDK 27", () => {
  it("resolves every catalogue symbol in the framework it declares", async () => {
    const sdk = installed;
    if (sdk === undefined) return;
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk.path));

    expect(sdk.version).toBe("27.0");
    expect(drift.unreadable).toEqual([]);
    expect(drift.unresolvedEvidence).toEqual([]);
    expect(drift.duplicateSymbols).toEqual([]);
  });

  it("resolves the same catalogue symbols for every architecture variant the SDK ships", async () => {
    const sdk = installed;
    if (sdk === undefined) return;
    for (const variant of SWIFTINTERFACE_VARIANTS) {
      const index = await readSdkSymbolIndex(sdk.path, catalogueFrameworks(), variant);
      const drift = compareCatalogueWithSdk(index, variant);
      expect({ variant, unresolved: drift.unresolvedEvidence, duplicates: drift.duplicateSymbols }).toEqual({
        variant,
        unresolved: [],
        duplicates: []
      });
      expect(index.map((frame) => frame.framework)).toEqual(
        expect.arrayContaining(["AppIntents", "CoreSpotlight", "CoreTransferable", "Foundation", "FoundationModels"])
      );
    }
  });
});

describe("CATALOGUE_DRIFT_FRAMEWORKS", () => {
  it("scans the App Intents and Foundation Models stack, bridge modules included", () => {
    expect([...CATALOGUE_DRIFT_FRAMEWORKS]).toEqual(
      expect.arrayContaining(["AppIntents", "FoundationModels", "_CoreSpotlight_FoundationModels", "_Vision_FoundationModels"])
    );
    expect(catalogueFrameworks()).toEqual(
      [...new Set([...CATALOGUE_DRIFT_FRAMEWORKS, "CoreSpotlight", "CoreTransferable", "Foundation"])].sort()
    );
  });
});

describe("DRIFT_FINDING_KINDS", () => {
  it("names drift with a vocabulary that is not the vocabulary of an audit state", () => {
    expect([...DRIFT_FINDING_KINDS]).toEqual(["unresolved-evidence", "duplicate-symbol", "catalogue-gap"]);
    for (const kind of DRIFT_FINDING_KINDS) expect(AUDIT_STATES).not.toContain(kind);
  });
});
