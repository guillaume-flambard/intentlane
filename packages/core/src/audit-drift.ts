import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { CAPABILITY_CATALOGUE, CAPABILITY_CATALOGUE_VERSION, type CapabilitySymbol } from "./audit-catalogue.js";

/**
 * Every architecture variant a macOS SDK ships a `.swiftinterface` for. The
 * reader takes one of them explicitly and never guesses: a variant that is
 * missing is an absent reading, never an empty symbol set.
 */
export const SWIFTINTERFACE_VARIANTS = [
  "arm64e-apple-macos",
  "x86_64-apple-macos",
  "arm64e-apple-ios-macabi",
  "x86_64-apple-ios-macabi"
] as const;
export type SwiftinterfaceVariant = (typeof SWIFTINTERFACE_VARIANTS)[number];
export const DEFAULT_SWIFTINTERFACE_VARIANT: SwiftinterfaceVariant = "arm64e-apple-macos";

/**
 * The frameworks the drift scan lists public symbols for: the App Intents and
 * Foundation Models stack, public modules and bridge modules alike, because a
 * symbol that is only public in a bridge module is a symbol a public-only scan
 * would miss.
 */
export const CATALOGUE_DRIFT_FRAMEWORKS = [
  "AppIntents",
  "AppIntentsTypeSupport",
  "CoreTransferable",
  "CoreSpotlight",
  "RelevanceKit",
  "FoundationModels",
  "_CoreSpotlight_FoundationModels",
  "_FoundationModels_AppKit",
  "_FoundationModels_SwiftUI",
  "_Vision_FoundationModels"
] as const;

const SYSTEM_FRAMEWORKS = ["System", "Library", "Frameworks"] as const;
/**
 * An SDK ships its system frameworks, but the platform directory next to it
 * ships the App Intents testing framework, so both roots are searched. The
 * layout is `<platform>/Developer/SDKs/<sdk>` and `<platform>/Developer/Library`.
 */
const PLATFORM_FRAMEWORKS = ["..", "..", "Library", "Frameworks"] as const;

export type SdkFrameworkSymbols = Readonly<{ framework: string; symbols: readonly string[] }>;
export type SdkSymbolIndex = readonly SdkFrameworkSymbols[];

export function findFrameworkSymbols(index: SdkSymbolIndex, framework: string): readonly string[] | undefined {
  return index.find((entry) => entry.framework === framework)?.symbols;
}

function interfaceCandidates(framework: string, variant: SwiftinterfaceVariant): readonly string[] {
  const module = join(framework + ".swiftmodule", variant + ".swiftinterface");
  return [join(framework + ".framework", "Modules", module), join(framework + ".framework", "Versions", "A", "Modules", module)];
}

function headerCandidates(framework: string): readonly string[] {
  return [join(framework + ".framework", "Headers"), join(framework + ".framework", "Versions", "A", "Headers")];
}

function frameworkRoots(sdkPath: string): readonly string[] {
  return [join(sdkPath, ...SYSTEM_FRAMEWORKS), join(sdkPath, ...PLATFORM_FRAMEWORKS)];
}

async function readFirst(paths: readonly string[]): Promise<string | undefined> {
  for (const path of paths) {
    try {
      return await readFile(path, "utf8");
    } catch {
      continue;
    }
  }
  return undefined;
}

const DECL_MODIFIERS = new Set([
  "public",
  "open",
  "package",
  "internal",
  "fileprivate",
  "private",
  "final",
  "indirect",
  "static",
  "weak",
  "unowned",
  "lazy",
  "dynamic",
  "optional",
  "mutating",
  "nonmutating",
  "override",
  "convenience",
  "required",
  "consuming",
  "borrowing",
  "distributed",
  "isolated",
  "nonisolated",
  "async",
  "throws"
]);

const DECL_KEYWORDS = new Set([
  "struct",
  "class",
  "enum",
  "protocol",
  "actor",
  "macro",
  "extension",
  "associatedtype",
  "typealias",
  "func",
  "var",
  "let",
  "case"
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

type Declaration = Readonly<{ name: string; keyword: string; access: "public" | "explicit" | "inherited" }>;

/** Strips a leading run of attributes, including their balanced parentheses. */
function stripAttributes(line: string): string {
  const isNameCharacter = (character: string | undefined): boolean => character !== undefined && /[A-Za-z0-9_.]/.test(character);
  let index = 0;
  for (;;) {
    while (index < line.length && (line[index] === " " || line[index] === "\t")) index += 1;
    if (line[index] !== "@") return line.slice(index);
    index += 1;
    while (isNameCharacter(line[index])) index += 1;
    if (line[index] !== "(") continue;
    let depth = 0;
    for (; index < line.length; index += 1) {
      if (line[index] === "(") depth += 1;
      else if (line[index] === ")") {
        depth -= 1;
        if (depth === 0) {
          index += 1;
          break;
        }
      }
    }
  }
}

/** Strips a line comment that is not inside a string literal. */
function stripComment(line: string): string {
  let quoted = false;
  for (let index = 0; index < line.length - 1; index += 1) {
    if (line[index] === '"') quoted = !quoted;
    else if (!quoted && line[index] === "/" && line[index + 1] === "/") return line.slice(0, index);
  }
  return line;
}

function parseDeclaration(line: string): Declaration | undefined {
  const parts = stripAttributes(line).split(/[\s(),:<>]+/).filter((part) => part.length > 0);
  let access: Declaration["access"] = "inherited";
  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    if (part === undefined || part.startsWith("@")) continue;
    if (DECL_MODIFIERS.has(part)) {
      if (part === "public" || part === "open" || part === "package") access = "public";
      else if (part === "internal" || part === "fileprivate" || part === "private") access = "explicit";
      continue;
    }
    if (!DECL_KEYWORDS.has(part)) return undefined;
    const name = parts[index + 1];
    if (name === undefined || !IDENTIFIER.test(name)) return undefined;
    return { name, keyword: part, access };
  }
  return undefined;
}

/**
 * Lists the public declarations of a `.swiftinterface`. A member declared
 * without an access modifier inside a public declaration is public API too,
 * which is how a protocol requirement appears in an interface, so the enclosing
 * scope decides. An explicit non-public modifier is never promoted.
 */
export function parseSwiftinterface(text: string): readonly string[] {
  const names: string[] = [];
  const scopes: boolean[] = [];
  for (const raw of text.split("\n")) {
    const line = stripComment(raw);
    const inherited = scopes.length > 0 && scopes[scopes.length - 1];
    const declared = parseDeclaration(line);
    const isPublic = declared !== undefined && (declared.access === "public" || (declared.access === "inherited" && inherited === true));
    if (declared !== undefined && isPublic && declared.keyword !== "extension") names.push(declared.name);
    let quoted = false;
    for (const character of line) {
      if (character === '"') {
        quoted = !quoted;
        continue;
      }
      if (quoted) continue;
      if (character === "{") scopes.push(isPublic);
      else if (character === "}") scopes.pop();
    }
  }
  return [...new Set(names)].sort();
}

const OBJC_INTERFACE = /^[ \t]*@interface[ \t]+([A-Za-z_][A-Za-z0-9_]*)[ \t]*:[ \t]/gm;
const OBJC_PROTOCOL = /^[ \t]*@protocol[ \t]+([A-Za-z_][A-Za-z0-9_]*)(?![A-Za-z0-9_])[ \t]*(?!;)/gm;

/**
 * Lists the public Objective-C declarations of a framework's headers. A
 * category is a redeclaration of a class this framework does not own, so only
 * base interfaces and forward-declared-free protocols count: they are the
 * symbols a framework ships, and counting categories would make a symbol look
 * duplicated in a framework that only extends it.
 */
export function parseObjcHeaders(text: string): readonly string[] {
  const names = new Set<string>();
  for (const match of text.matchAll(OBJC_INTERFACE)) names.add(match[1] ?? "");
  for (const match of text.matchAll(OBJC_PROTOCOL)) names.add(match[1] ?? "");
  names.delete("");
  return [...names].sort();
}

/**
 * Reads the public symbols of one framework for one architecture variant.
 * Returns undefined when the framework ships no readable interface or header,
 * which is the difference between "not readable" and "declares no symbol".
 */
export async function readFrameworkSymbols(
  sdkPath: string,
  framework: string,
  variant: SwiftinterfaceVariant = DEFAULT_SWIFTINTERFACE_VARIANT
): Promise<readonly string[] | undefined> {
  const roots = frameworkRoots(sdkPath);
  const interfaceText = await readFirst(
    roots.flatMap((root) => interfaceCandidates(framework, variant).map((relative) => join(root, relative)))
  );
  let readable = interfaceText !== undefined;
  const names = new Set<string>(interfaceText === undefined ? [] : parseSwiftinterface(interfaceText));
  const directories = roots.flatMap((root) => headerCandidates(framework).map((relative) => join(root, relative)));
  for (const directory of directories) {
    let entries: string[];
    try {
      entries = await readdir(directory);
    } catch {
      continue;
    }
    readable = true;
    for (const entry of entries.filter((name) => name.endsWith(".h")).sort()) {
      try {
        for (const name of parseObjcHeaders(await readFile(join(directory, entry), "utf8"))) names.add(name);
      } catch {
        continue;
      }
    }
  }
  return readable ? [...names].sort() : undefined;
}

/** The frameworks the drift scan reads: the scanned stack plus every framework a record declares. */
export function catalogueFrameworks(): readonly string[] {
  const declared = CAPABILITY_CATALOGUE.flatMap((record) => record.sdk.map((entry) => entry.framework));
  return [...new Set([...CATALOGUE_DRIFT_FRAMEWORKS, ...declared])].sort();
}

export async function readSdkSymbolIndex(
  sdkPath: string,
  frameworks: readonly string[] = catalogueFrameworks(),
  variant: SwiftinterfaceVariant = DEFAULT_SWIFTINTERFACE_VARIANT
): Promise<SdkSymbolIndex> {
  const entries: SdkFrameworkSymbols[] = [];
  for (const framework of frameworks) {
    const symbols = await readFrameworkSymbols(sdkPath, framework, variant);
    if (symbols === undefined) continue;
    entries.push({ framework, symbols });
  }
  return entries;
}

export const DRIFT_FINDING_KINDS = ["unresolved-evidence", "duplicate-symbol", "catalogue-gap"] as const;
export type DriftFindingKind = (typeof DRIFT_FINDING_KINDS)[number];

/**
 * One fact about the catalogue against an installed SDK. A finding names a
 * framework and a symbol. It never carries a project platform, an audit state
 * or a capability verdict, because drift is a fact about the catalogue and not
 * a verdict about an audited project.
 */
export type CatalogueDriftFinding = Readonly<{
  kind: DriftFindingKind;
  framework: string;
  symbol: string;
  capability?: string;
  detail: string;
}>;

export type CatalogueDrift = Readonly<{
  catalogueVersion: string;
  variant: SwiftinterfaceVariant;
  inspected: readonly string[];
  /**
   * The frameworks the SDK did not let the reader open. A symbol attributed to
   * one of them is unjudged, not validated, and a finding is deliberately not
   * raised for it: the comparator never saw the SDK refute anything. That makes
   * a non-empty `unreadable` a failure to compare rather than a clean bill of
   * health, and a caller must not report the catalogue as verified against the
   * SDK while it holds an entry, because a renamed or moved bridge framework
   * would otherwise silence every attribution it carries.
   */
  unreadable: readonly string[];
  unresolvedEvidence: readonly CatalogueDriftFinding[];
  duplicateSymbols: readonly CatalogueDriftFinding[];
  gaps: readonly CatalogueDriftFinding[];
}>;

function resolvedIn(index: SdkSymbolIndex, entry: CapabilitySymbol): boolean {
  return findFrameworkSymbols(index, entry.framework)?.includes(entry.symbol) ?? false;
}

/**
 * Compares the catalogue to the symbols an SDK actually ships. Evidence that
 * does not resolve is a catalogue error, a symbol claimed by two frameworks is
 * an ambiguous attribution, and a public symbol nobody describes is a catalogue
 * gap. None of the three says anything about an audited project.
 */
export function compareCatalogueWithSdk(index: SdkSymbolIndex, variant: SwiftinterfaceVariant = DEFAULT_SWIFTINTERFACE_VARIANT): CatalogueDrift {
  const unreadable = catalogueFrameworks().filter((framework) => findFrameworkSymbols(index, framework) === undefined);
  const unresolvedEvidence: CatalogueDriftFinding[] = [];
  const resolved = new Map<string, CapabilitySymbol>();
  for (const record of CAPABILITY_CATALOGUE) {
    for (const entry of record.sdk) {
      if (findFrameworkSymbols(index, entry.framework) === undefined) continue;
      if (!resolvedIn(index, entry)) {
        unresolvedEvidence.push({
          kind: "unresolved-evidence",
          framework: entry.framework,
          symbol: entry.symbol,
          capability: record.id,
          detail: `${record.id} claims ${entry.symbol} in ${entry.framework}, and the installed SDK does not declare it there.`
        });
        continue;
      }
      resolved.set(`${entry.framework} ${entry.symbol}`, entry);
    }
  }
  const duplicateSymbols: CatalogueDriftFinding[] = [];
  for (const entry of resolved.values()) {
    const hosts = index.filter((frame) => frame.symbols.includes(entry.symbol)).map((frame) => frame.framework);
    if (hosts.length > 1) {
      duplicateSymbols.push({
        kind: "duplicate-symbol",
        framework: entry.framework,
        symbol: entry.symbol,
        detail: `${entry.symbol} is declared by ${hosts.join(", ")}, so a record cannot name it unambiguously.`
      });
    }
  }
  const described = new Set(resolved.keys());
  const gaps: CatalogueDriftFinding[] = [];
  // The scan covers the App Intents and Foundation Models stack only. Foundation
  // is read because foundation.localization attributes a symbol to it, and it is
  // deliberately not scanned: its public surface is a general-purpose
  // framework's, not a capability IntentLane is meant to describe, and admitting
  // it would turn most of the gap report into that one framework's inventory.
  for (const framework of CATALOGUE_DRIFT_FRAMEWORKS) {
    const symbols = findFrameworkSymbols(index, framework);
    if (symbols === undefined) continue;
    for (const symbol of symbols) {
      if (described.has(`${framework} ${symbol}`)) continue;
      gaps.push({
        kind: "catalogue-gap",
        framework,
        symbol,
        detail: `${framework} declares the public symbol ${symbol}, and the catalogue ${CAPABILITY_CATALOGUE_VERSION} does not describe it. This is a catalogue gap, not a capability missing from an audited project.`
      });
    }
  }
  return {
    catalogueVersion: CAPABILITY_CATALOGUE_VERSION,
    variant,
    inspected: index.map((frame) => frame.framework),
    unreadable,
    unresolvedEvidence,
    duplicateSymbols,
    gaps
  };
}
