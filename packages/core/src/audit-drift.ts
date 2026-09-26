import { readdir, readFile, stat } from "node:fs/promises";
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

export type SwiftinterfaceMember = Readonly<{ owner: string; member: string }>;

/**
 * What one framework read actually established. A read is a diagnostic about the
 * SDK, never a verdict about an audited project, so it borrows none of the audit
 * vocabulary. `complete` is the only state whose symbols may support a claim: a
 * symbol missing from a `partial` set is unknown rather than refuted, so a
 * partial read must never produce a resolution verdict in either direction.
 */
export const FRAMEWORK_READ_STATES = ["complete", "partial", "absent", "unreadable"] as const;
export type FrameworkReadState = (typeof FRAMEWORK_READ_STATES)[number];

export type FrameworkRead = Readonly<{
  framework: string;
  state: FrameworkReadState;
  reason: string;
  symbols: readonly string[];
  members: readonly SwiftinterfaceMember[];
}>;

export type SdkFrameworkSymbols = FrameworkRead;
export type SdkSymbolIndex = readonly SdkFrameworkSymbols[];

/**
 * The symbols of a framework that are fit to support a claim. A framework that
 * was not read in full has no such symbols: returning its partial set would let
 * an absence look like a refutation.
 */
export function findFrameworkSymbols(index: SdkSymbolIndex, framework: string): readonly string[] | undefined {
  const entry = index.find((candidate) => candidate.framework === framework);
  return entry?.state === "complete" ? entry.symbols : undefined;
}

export function frameworkRead(index: SdkSymbolIndex, framework: string): FrameworkRead | undefined {
  return index.find((candidate) => candidate.framework === framework);
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

const NON_MEMBER_KEYWORDS = new Set(["struct", "class", "enum", "protocol", "actor", "macro", "extension"]);

/**
 * Lists the members a public declaration owns, against the declaration that owns
 * them. The SDK overloads member names across a module, so a bare member name
 * cannot say which overload is the evidence; only the owning type can. A member
 * declared with an explicit non-public modifier is never a member of the public
 * surface, a member of a non-public type is never recorded at all, and a nested
 * type is not a member either: a type is named by `symbol`, and an evidence
 * entry that mixed the two would read as a requirement the SDK never declared.
 */
export function parseSwiftinterfaceMembers(text: string): readonly SwiftinterfaceMember[] {
  const pairs = new Map<string, SwiftinterfaceMember>();
  const scopes: { name?: string; public: boolean }[] = [];
  for (const raw of text.split("\n")) {
    const line = stripComment(raw);
    const enclosing = scopes[scopes.length - 1];
    const declared = parseDeclaration(line);
    const isPublic = declared !== undefined && (declared.access === "public" || (declared.access === "inherited" && enclosing?.public === true));
    if (declared !== undefined && isPublic && !NON_MEMBER_KEYWORDS.has(declared.keyword)) {
      const owner = [...scopes].reverse().find((scope) => scope.name !== undefined);
      // A public member of a non-public type is not publicly reachable, so the
      // owner has to be public too, not only the member.
      if (owner?.name !== undefined && owner.public) {
        pairs.set(`${owner.name} ${declared.name}`, { owner: owner.name, member: declared.name });
      }
    }
    let quoted = false;
    let braces = 0;
    for (const character of line) {
      if (character === '"') {
        quoted = !quoted;
        continue;
      }
      if (quoted) continue;
      if (character === "{") {
        const opensFirst = braces === 0 && declared !== undefined && declared.keyword !== "extension";
        scopes.push({ ...(opensFirst ? { name: declared.name } : {}), public: isPublic });
        braces += 1;
      } else if (character === "}") scopes.pop();
    }
  }
  return [...pairs.values()].sort((left, right) =>
    left.owner === right.owner ? left.member.localeCompare(right.member) : left.owner.localeCompare(right.owner)
  );
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

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads one framework and reports what the read established, which is not the
 * same question as which symbols it declares. A framework the SDK does not ship
 * is `absent`, a framework it ships but will not open is `unreadable`, and a
 * framework that yielded some sources and failed others is `partial`. Only
 * `complete` may support a claim, because a symbol missing from a partial read
 * is unknown rather than refuted.
 */
export async function readFramework(
  sdkPath: string,
  framework: string,
  variant: SwiftinterfaceVariant = DEFAULT_SWIFTINTERFACE_VARIANT
): Promise<FrameworkRead> {
  const roots = frameworkRoots(sdkPath);
  const bundles = await Promise.all(roots.map((root) => exists(join(root, `${framework}.framework`))));
  if (!bundles.some(Boolean)) {
    return {
      framework,
      state: "absent",
      reason: `the SDK ships no ${framework}.framework under ${roots.join(" or ")}`,
      symbols: [],
      members: []
    };
  }
  const interfaceText = await readFirst(
    roots.flatMap((root) => interfaceCandidates(framework, variant).map((relative) => join(root, relative)))
  );
  const headerDirectories = roots.flatMap((root) => headerCandidates(framework).map((relative) => join(root, relative)));
  const headerTexts: string[] = [];
  let headerDirectorySeen = false;
  let headerUnreadable = 0;
  for (const directory of headerDirectories) {
    let entries: string[];
    try {
      entries = await readdir(directory);
    } catch {
      continue;
    }
    headerDirectorySeen = true;
    for (const entry of entries.filter((name) => name.endsWith(".h")).sort()) {
      try {
        headerTexts.push(await readFile(join(directory, entry), "utf8"));
      } catch {
        headerUnreadable += 1;
      }
    }
  }
  if (interfaceText === undefined && !headerDirectorySeen) {
    return {
      framework,
      state: "unreadable",
      reason: `${framework}.framework opens no readable ${variant}.swiftinterface and no readable Headers directory`,
      symbols: [],
      members: []
    };
  }
  const symbols = new Set<string>();
  const members: SwiftinterfaceMember[] = [];
  if (interfaceText !== undefined) {
    for (const name of parseSwiftinterface(interfaceText)) symbols.add(name);
    members.push(...parseSwiftinterfaceMembers(interfaceText));
  }
  for (const text of headerTexts) for (const name of parseObjcHeaders(text)) symbols.add(name);
  const partial = headerUnreadable > 0 || (headerDirectorySeen && interfaceText === undefined);
  return {
    framework,
    state: partial ? "partial" : "complete",
    reason: partial
      ? `${framework} was read only in part: ${interfaceText === undefined ? "no readable .swiftinterface and " : ""}${headerUnreadable} unreadable header file(s), so a symbol it does not list is unknown rather than refuted`
      : `${framework} was read in full`,
    symbols: [...symbols].sort(),
    members
  };
}

/**
 * The symbols of one framework, or undefined when the framework ships nothing
 * readable. Prefer `readFramework`: this cannot tell a partial read from a
 * complete one, and must not be used to decide whether evidence holds.
 */
export async function readFrameworkSymbols(
  sdkPath: string,
  framework: string,
  variant: SwiftinterfaceVariant = DEFAULT_SWIFTINTERFACE_VARIANT
): Promise<readonly string[] | undefined> {
  const read = await readFramework(sdkPath, framework, variant);
  return read.state === "complete" || read.state === "partial" ? read.symbols : undefined;
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
    entries.push(await readFramework(sdkPath, framework, variant));
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
  /**
   * The frameworks nothing could be read from, whether the SDK does not ship
   * them or would not open them. A symbol attributed to one of them is
   * unjudged, not validated, and a finding is deliberately not raised for it:
   * the comparator never saw the SDK refute anything.
   */
  unreadable: readonly string[];
  /**
   * The frameworks that were read in part. A symbol they do not list is unknown
   * rather than refuted, so a partial read is held to the same rule as an
   * unreadable one and is reported apart, because the remedy differs.
   */
  partial: readonly string[];
  /** Every framework the scan attempted, with the state and the reason for it. */
  reads: readonly FrameworkRead[];
  unresolvedEvidence: readonly CatalogueDriftFinding[];
  duplicateSymbols: readonly CatalogueDriftFinding[];
  gaps: readonly CatalogueDriftFinding[];
}>;

/**
 * Whether the comparison established everything it set out to. A caller that
 * reports the catalogue as verified against an SDK must require this: a renamed
 * or moved bridge framework would otherwise turn every attribution it carries
 * into silence, and an empty `unresolvedEvidence` would read as a clean bill of
 * health.
 */
export function driftIsComplete(drift: CatalogueDrift): boolean {
  return drift.unreadable.length === 0 && drift.partial.length === 0;
}

function describes(entry: CapabilitySymbol): string {
  return entry.member === undefined ? `${entry.symbol} in ${entry.framework}` : `${entry.symbol}.${entry.member} in ${entry.framework}`;
}

/**
 * Whether the SDK establishes the evidence a record names. A member is a
 * stronger claim than a symbol and is held to a stronger test: the SDK
 * overloads member names, so a member only counts when the type that owns it
 * declares it, and an owner that does not is an unresolved attribution rather
 * than a resolved one.
 */
function resolvedIn(index: SdkSymbolIndex, entry: CapabilitySymbol): boolean {
  const read = frameworkRead(index, entry.framework);
  if (read === undefined || read.state !== "complete") return false;
  if (!read.symbols.includes(entry.symbol)) return false;
  if (entry.member === undefined) return true;
  return read.members.some((member) => member.owner === entry.symbol && member.member === entry.member);
}

/**
 * Compares the catalogue to the symbols an SDK actually ships. Evidence that
 * does not resolve is a catalogue error, a symbol claimed by two frameworks is
 * an ambiguous attribution, and a public symbol nobody describes is a catalogue
 * gap. None of the three says anything about an audited project.
 */
export function compareCatalogueWithSdk(index: SdkSymbolIndex, variant: SwiftinterfaceVariant = DEFAULT_SWIFTINTERFACE_VARIANT): CatalogueDrift {
  const frameworks = catalogueFrameworks();
  const reads = frameworks.map((framework) => frameworkRead(index, framework) ?? { framework, state: "absent" as const, reason: "the scan did not attempt this framework", symbols: [], members: [] });
  const unreadable = reads.filter((read) => read.state === "absent" || read.state === "unreadable").map((read) => read.framework);
  const partial = reads.filter((read) => read.state === "partial").map((read) => read.framework);
  const unresolvedEvidence: CatalogueDriftFinding[] = [];
  const resolved = new Map<string, CapabilitySymbol>();
  for (const record of CAPABILITY_CATALOGUE) {
    for (const entry of record.sdk) {
      if (findFrameworkSymbols(index, entry.framework) === undefined) continue;
      if (!resolvedIn(index, entry)) {
        unresolvedEvidence.push({
          kind: "unresolved-evidence",
          framework: entry.framework,
          symbol: entry.member === undefined ? entry.symbol : `${entry.symbol}.${entry.member}`,
          capability: record.id,
          detail: `${record.id} claims ${describes(entry)}, and the installed SDK does not establish it there.`
        });
        continue;
      }
      resolved.set(`${entry.framework} ${entry.symbol}`, entry);
    }
  }
  const duplicateSymbols: CatalogueDriftFinding[] = [];
  for (const entry of resolved.values()) {
    const hosts = index
      .filter((frame) => findFrameworkSymbols(index, frame.framework)?.includes(entry.symbol))
      .map((frame) => frame.framework);
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
  // Measured on the installed SDK 27: the scanned scope holds 2160 candidates,
  // Foundation would add 2832 (it declares 2833 public symbols, of which one,
  // LocalizedStringResource, the catalogue already describes) for 4992 in all.
  // A gap is a candidate to examine, never an automatic capability: writing up
  // thousands of records from this list is a separate decision, not this loop.
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
    partial,
    reads,
    unresolvedEvidence,
    duplicateSymbols,
    gaps
  };
}
