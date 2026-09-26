import { execFile } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATALOGUE_DRIFT_FRAMEWORKS,
  DEFAULT_SWIFTINTERFACE_VARIANT,
  DRIFT_FINDING_KINDS,
  FRAMEWORK_READ_STATES,
  SWIFTINTERFACE_VARIANTS,
  catalogueFrameworks,
  compareCatalogueWithSdk,
  driftIsComplete,
  findFrameworkSymbols,
  parseObjcHeaders,
  parseSwiftinterface,
  parseSwiftinterfaceMembers,
  readFramework,
  readFrameworkSymbols,
  readSdkSymbolIndex
} from "./audit-drift.js";
import { readSdkInfo } from "./audit-sdk.js";
import { AUDIT_STATES } from "./audit.js";
import { AUDIT_CATALOGUE_STATES } from "./audit-catalogue.js";
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

/** An interface that declares exactly the symbols and members one framework is credited with. */
function interfaceDeclaring(symbols: readonly string[], members: readonly string[] = []): readonly string[] {
  const owners = new Set(members.map((pair) => pair.split(" ")[0] ?? ""));
  const lines = symbols
    .filter((symbol) => !owners.has(symbol))
    .map((symbol) => (/^[A-Z]/.test(symbol) ? `public struct ${symbol} {` : `public func ${symbol}()`));
  for (const pair of members) {
    const [owner, member] = pair.split(" ");
    lines.push(`public protocol ${owner} {`, `  func ${member}() async throws`, "}");
  }
  return lines;
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

const CLAIMED_MEMBERS_BY_APP_INTENTS = [
  ...new Set(
    CAPABILITY_CATALOGUE.flatMap((record) => record.sdk)
      .filter((entry) => entry.framework === "AppIntents" && entry.member !== undefined)
      .map((entry) => `${entry.symbol} ${entry.member as string}`)
  )
].sort();

type FrameFixture = Readonly<{
  interface?: readonly string[];
  headers?: readonly string[];
  /** A framework bundle with no readable interface and no headers. */
  bundleOnly?: boolean;
  /** A `.h` entry that is a directory, so reading it fails. */
  brokenHeader?: boolean;
}>;

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
      if (frame.bundleOnly === true) {
        await mkdir(join(base, `${framework}.framework`), { recursive: true });
      }
      if (frame.interface !== undefined) {
        const bundle = join(base, `${framework}.framework`, "Modules", `${framework}.swiftmodule`);
        await mkdir(bundle, { recursive: true });
        await writeFile(join(bundle, `${variant}.swiftinterface`), frame.interface.join("\n"), "utf8");
      }
      if (frame.headers !== undefined || frame.brokenHeader === true) {
        const headers = join(base, `${framework}.framework`, "Headers");
        await mkdir(headers, { recursive: true });
        if (frame.brokenHeader === true) await mkdir(join(headers, "Broken.h"), { recursive: true });
        if (frame.headers !== undefined) {
          await writeFile(join(headers, `${framework}.h`), frame.headers.join("\n"), "utf8");
        }
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

  it("reaches a protocol requirement that carries no access modifier, and only inside a public protocol", () => {
    // execution.native-handler is attributed to the AppIntent requirement
    // perform(), which the SDK prints without an access modifier because the
    // enclosing public protocol already grants it. This pins where that
    // attribution comes from, so a resolution of a bare method name is never
    // mistaken for evidence that any method name is valid evidence.
    const requirement = ["public protocol AppIntent {", "  func perform() async throws -> Self.PerformResult", "}"].join("\n");

    expect(parseSwiftinterface(requirement)).toEqual(["AppIntent", "perform"]);
    expect(parseSwiftinterface(["protocol AppIntent {", "  func perform() async throws", "}"].join("\n"))).toEqual([]);
    expect(parseSwiftinterface(["public extension AppIntent {", "  func perform() async throws", "}"].join("\n"))).toEqual([
      "perform"
    ]);
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

describe("parseSwiftinterfaceMembers", () => {
  it("binds a member to the type that declares it, because the SDK overloads member names", () => {
    // `perform` is declared twelve times in AppIntents, and only the requirement
    // inside `public protocol AppIntent` is the one an app implements. A bare
    // member name cannot say which of the twelve is the evidence; the owner can.
    expect(parseSwiftinterfaceMembers(APP_INTENTS_INTERFACE.join("\n"))).toEqual([
      { owner: "AppIntent", member: "perform" },
      { owner: "ParameterMode", member: "required" }
    ]);
  });

  it("never binds a member of a type that is not public", () => {
    expect(
      parseSwiftinterfaceMembers(["struct Hidden {", "  public var leaked: Swift::Int { get }", "}"].join("\n"))
    ).toEqual([]);
  });

  it("binds a member to the nearest enclosing public type", () => {
    const members = parseSwiftinterfaceMembers(
      ["public struct Outer {", "  public struct Inner {", "    public var deep: Swift::Int { get }", "  }", "}"].join("\n")
    );

    expect(members).toEqual([{ owner: "Inner", member: "deep" }]);
  });
});

describe("readFramework", () => {
  it("separates a framework the SDK does not ship from one it ships but cannot open", async () => {
    const sdk = await sdkFixture({ AppIntents: { interface: APP_INTENTS_INTERFACE }, Sealed: { bundleOnly: true } });

    const absent = await readFramework(sdk, "FoundationModels");
    const unreadable = await readFramework(sdk, "Sealed");

    expect(absent.state).toBe("absent");
    expect(absent.reason).toContain("ships no FoundationModels.framework");
    expect(unreadable.state).toBe("unreadable");
    expect(unreadable.reason).toContain("opens no readable");
    // Neither may support a claim, and neither is an empty symbol set.
    expect(findFrameworkSymbols([absent, unreadable], "Sealed")).toBeUndefined();
  });

  it("calls a framework read in part partial, so its silence is unknown rather than refuted", async () => {
    // The reviewer of the drift reader called this out and it was real: the old
    // reader set `readable` when EITHER source opened, so a framework whose
    // interface failed and whose headers succeeded returned a symbol set with no
    // Swift declarations and was indistinguishable from a complete read.
    const sdk = await sdkFixture({ CoreSpotlight: { headers: CORE_SPOTLIGHT_HEADER, brokenHeader: true } });

    const read = await readFramework(sdk, "CoreSpotlight");

    expect(read.state).toBe("partial");
    expect(read.reason).toContain("read only in part");
    expect(findFrameworkSymbols([read], "CoreSpotlight")).toBeUndefined();
  });

  it("reads a pure-Swift framework that ships no headers as complete", async () => {
    // FoundationModels and the bridge modules ship no Headers directory at all.
    // That is what a pure Swift module looks like, not a partial read.
    const sdk = await sdkFixture({ FoundationModels: { interface: FOUNDATION_MODELS_INTERFACE } });

    expect((await readFramework(sdk, "FoundationModels")).state).toBe("complete");
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
      AppIntents: { interface: [...INTERFACE_HEADER, ...interfaceDeclaring(CLAIMED_BY_APP_INTENTS, CLAIMED_MEMBERS_BY_APP_INTENTS), "public class UnclaimedSymbol {"] },
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
    expect(drift.partial).toEqual([]);
    expect(new Set(drift.unresolvedEvidence.map((finding) => finding.framework))).toEqual(new Set(["AppIntents"]));
    expect(drift.unresolvedEvidence[0]).toEqual({
      kind: "unresolved-evidence",
      framework: "AppIntents",
      symbol: "AppIntent",
      capability: "foundation.app-intent",
      detail: "foundation.app-intent claims AppIntent in AppIntents, and the installed SDK does not establish it there."
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
      {
        framework: "AppIntentsTypeSupport",
        state: "complete",
        reason: "synthetic second host for a symbol AppIntents already declares",
        symbols: ["AppIntent"],
        members: []
      }
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

  it("names an unreadable framework and judges none of the symbols attributed to it", async () => {
    // AppIntents is readable and declares exactly what the catalogue claims of
    // it, so the only thing that can stop the comparison is the frameworks the
    // reader could not open.
    const sdk = await sdkFixture({
      AppIntents: { interface: [...INTERFACE_HEADER, ...interfaceDeclaring(CLAIMED_BY_APP_INTENTS, CLAIMED_MEMBERS_BY_APP_INTENTS)] }
    });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents"]));

    expect(drift.unreadable).toEqual(
      expect.arrayContaining(["CoreSpotlight", "CoreTransferable", "Foundation", "FoundationModels"])
    );

    const judged = new Set(drift.unresolvedEvidence.map((finding) => `${finding.framework}/${finding.symbol}`));
    const silenced: string[] = [];
    for (const record of CAPABILITY_CATALOGUE) {
      for (const entry of record.sdk) {
        if (!drift.unreadable.includes(entry.framework)) continue;
        silenced.push(`${record.id} ${entry.framework}/${entry.symbol}`);
        expect(judged).not.toContain(`${entry.framework}/${entry.symbol}`);
      }
    }

    // The comparison is partial, and it has to say so out loud. A caller that
    // reads only unresolvedEvidence sees nothing at all here, so the comparator
    // must name every framework it could not open, and must not invent a verdict
    // about a symbol it never saw.
    expect(silenced).toEqual(
      expect.arrayContaining([
        "discovery.spotlight-lifecycle CoreSpotlight/CSSearchableIndex",
        "proof.spotlight-surface CoreSpotlight/CSSearchableItem",
        "cross-app.transferable CoreTransferable/Transferable",
        "foundation.localization Foundation/LocalizedStringResource"
      ])
    );
    expect(judged.size).toBe(0);
  });

  it("holds a member to a stronger test than a symbol, and reports a member its owner does not declare", async () => {
    // AppIntent is declared, but not the perform() requirement, so the evidence
    // is not established. A member that resolves as a bare module-level name is
    // exactly the false precision the `member` field exists to remove.
    const sdk = await sdkFixture({
      AppIntents: { interface: [...INTERFACE_HEADER, ...interfaceDeclaring(CLAIMED_BY_APP_INTENTS)] }
    });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents"]));

    expect(drift.unresolvedEvidence).toContainEqual({
      kind: "unresolved-evidence",
      framework: "AppIntents",
      symbol: "AppIntent.perform",
      capability: "execution.native-handler",
      detail:
        "execution.native-handler claims AppIntent.perform in AppIntents, and the installed SDK does not establish it there."
    });
  });

  it("establishes a member only against the type that declares it", async () => {
    const sdk = await sdkFixture({
      AppIntents: {
        interface: [
          INTERFACE_HEADER,
          ...interfaceDeclaring(CLAIMED_BY_APP_INTENTS, CLAIMED_MEMBERS_BY_APP_INTENTS),
          "public struct AppIntent {",
          "}"
        ]
      }
    });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents"]));

    expect(drift.unresolvedEvidence).toEqual([]);
    expect(drift.partial).toEqual([]);
  });

  it("reports an incomplete comparison as incomplete, so a caller cannot read silence as a clean bill of health", async () => {
    // RelevanceKit is a framework the catalogue really scans, shipped here as a
    // bundle that opens nothing: the state that used to be indistinguishable
    // from a framework declaring no symbol.
    const sdk = await sdkFixture({
      AppIntents: {
        interface: [...INTERFACE_HEADER, ...interfaceDeclaring(CLAIMED_BY_APP_INTENTS, CLAIMED_MEMBERS_BY_APP_INTENTS)]
      },
      RelevanceKit: { bundleOnly: true }
    });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, ["AppIntents", "RelevanceKit"]));

    // Everything the catalogue claims of AppIntents resolves, and everything
    // else is unreadable: the worst shape, because unresolvedEvidence is empty
    // while the comparison established almost nothing.
    expect(drift.unresolvedEvidence).toEqual([]);
    expect(driftIsComplete(drift)).toBe(false);
    expect(drift.unreadable).toContain("RelevanceKit");
    expect(drift.reads.find((read) => read.framework === "RelevanceKit")?.state).toBe("unreadable");
  });

  it("reports a comparison that read every framework it attempted as complete", async () => {
    const sdk = await sdkFixture({
      AppIntents: {
        interface: [...INTERFACE_HEADER, ...interfaceDeclaring(CLAIMED_BY_APP_INTENTS, CLAIMED_MEMBERS_BY_APP_INTENTS)]
      },
      CoreSpotlight: { interface: CORE_SPOTLIGHT_INTERFACE, headers: CORE_SPOTLIGHT_HEADER },
      CoreTransferable: { interface: [INTERFACE_HEADER, "public protocol Transferable {", "}"] },
      Foundation: { interface: [INTERFACE_HEADER, "public struct LocalizedStringResource {", "}"] },
      FoundationModels: { interface: FOUNDATION_MODELS_INTERFACE },
      RelevanceKit: { interface: [INTERFACE_HEADER, "public struct RelevantEntities {", "}"] },
      AppIntentsTypeSupport: { interface: [INTERFACE_HEADER, "public struct TypeSupport {", "}"] },
      _CoreSpotlight_FoundationModels: { interface: [INTERFACE_HEADER, "public struct SpotlightSearchTool {", "}"] },
      _FoundationModels_AppKit: { interface: [INTERFACE_HEADER, "public struct AppKitBridge {", "}"] },
      _FoundationModels_SwiftUI: { interface: [INTERFACE_HEADER, "public struct SwiftUIBridge {", "}"] },
      _Vision_FoundationModels: { interface: [INTERFACE_HEADER, "public struct OCRTool {", "}"] }
    });
    const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(sdk, catalogueFrameworks()));

    expect(drift.unreadable).toEqual([]);
    expect(drift.partial).toEqual([]);
    expect(drift.unresolvedEvidence).toEqual([]);
    expect(driftIsComplete(drift)).toBe(true);
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
    expect(drift.partial).toEqual([]);
    expect(drift.unresolvedEvidence).toEqual([]);
    expect(drift.duplicateSymbols).toEqual([]);
    expect(driftIsComplete(drift)).toBe(true);
  });

  it("declares no public symbol named AppIntentsTesting, so the one empty proof list stays a conclusion", async () => {
    const sdk = installed;
    if (sdk === undefined) return;
    // The framework ships outside the SDK root, in the platform developer
    // directory, which is why the reader searches both roots. Reading it proves
    // the module was genuinely inspected rather than silently empty, and the
    // absence of a symbol bearing the module name is what makes proof.app-intents
    // -testing carry nothing. An SDK that published one must fail here.
    const symbols = await readFrameworkSymbols(sdk.path, "AppIntentsTesting");

    expect(symbols).toBeDefined();
    expect(symbols ?? []).toContain("AppIntentTypeDefinition");
    expect(symbols ?? []).not.toContain("AppIntentsTesting");
  });

  // One test per variant: the SDK ships four interfaces for every framework, and
  // reading all four inside a single test would put it at the default timeout.
  for (const variant of SWIFTINTERFACE_VARIANTS) {
    it(`resolves every catalogue symbol for the ${variant} variant`, async () => {
      const sdk = installed;
      if (sdk === undefined) return;
      const index = await readSdkSymbolIndex(sdk.path, catalogueFrameworks(), variant);
      const drift = compareCatalogueWithSdk(index, variant);

      expect({ variant: drift.variant, unresolved: drift.unresolvedEvidence, duplicates: drift.duplicateSymbols }).toEqual({
        variant,
        unresolved: [],
        duplicates: []
      });
      expect(index.map((frame) => frame.framework)).toEqual(
        expect.arrayContaining(["AppIntents", "CoreSpotlight", "CoreTransferable", "Foundation", "FoundationModels"])
      );
    });
  }
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

describe("FRAMEWORK_READ_STATES", () => {
  it("separates the four things a read can fail to be, and borrows no audit state", () => {
    expect([...FRAMEWORK_READ_STATES]).toEqual(["complete", "partial", "absent", "unreadable"]);
    // A read is a diagnostic about the SDK. Reusing an audit state here would
    // let a read outcome be read as a verdict about an audited project, which is
    // the one thing the drift vocabulary must never do.
    for (const state of FRAMEWORK_READ_STATES) {
      expect(AUDIT_STATES).not.toContain(state);
      expect(AUDIT_CATALOGUE_STATES).not.toContain(state);
    }
  });
});
