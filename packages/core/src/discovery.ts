import { readdir, readFile } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export type Proof = Readonly<{
  path: string;
  line: number;
  excerpt: string;
}>;

export type IndexedFile = Readonly<{
  path: string;
  lines: readonly string[];
}>;

export type RepositoryIndex = Readonly<{
  root: string;
  files: readonly IndexedFile[];
}>;

export type ObjectCandidate = Readonly<{
  name: string;
  proof: Proof;
  recordTypes: readonly string[];
  identifiers: readonly IdentifierCandidate[];
  openers: readonly OpenerCandidate[];
}>;
export type IdentifierCandidate = Readonly<{ property: string; proof: Proof }>;
export type OpenerCandidate = Readonly<{ symbol: string; proof: Proof }>;
export type AccessCandidate = Readonly<{ symbol: string; proof: Proof }>;

export type Discovery = Readonly<{
  repository: string;
  objects: readonly ObjectCandidate[];
  access: readonly AccessCandidate[];
}>;

const SKIPPED_DIRECTORIES = new Set([
  ".git",
  ".build",
  ".intentlane",
  "build",
  "DerivedData",
  "Pods",
  "Carthage",
  "node_modules"
]);

async function swiftFiles(root: string, current = root): Promise<readonly string[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const found: string[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const full = join(current, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) found.push(...(await swiftFiles(root, full)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".swift")) found.push(full);
  }
  return found;
}

export async function indexRepository(root: string): Promise<RepositoryIndex> {
  const files: IndexedFile[] = [];
  for (const full of await swiftFiles(root)) {
    const contents = await readFile(full, "utf8");
    files.push({
      path: relative(root, full).split(sep).join("/"),
      lines: contents.split("\n")
    });
  }
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { root, files };
}

const LIST_DATA_SOURCE = /\b(NSOutlineViewDataSource|NSTableViewDataSource|NSCollectionViewDataSource)\b/;
const TYPE_DECLARATION = /\b(?:final\s+)?(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/;
const STRING_PROPERTY = /^\s*(?:@\w+\s+)*(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+)?(?:static\s+)?(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:String\??|NSString\b)/;
const FUNCTION_DECLARATION = /^\s*(?:@\w+\s+)*(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+)?(?:static\s+)?func\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
const OPENS_A_URL = /\bopenURL\s*\(/;

const DISPLAY_NAMES = new Set([
  "title",
  "name",
  "displayName",
  "displayTitle",
  "subtitle",
  "label",
  "text",
  "filename",
  "fileName"
]);

const BOOLEAN_PROPERTY =
  /^\s*(?:@\w+\s+)*(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+)?(?:static\s+)?(?:let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?::\s*Bool\b|\s*=\s*(?:true|false)\b)/;

const ACCESS_NAMES = /(?:history|record|enable|disable|allow|exclude|privacy|consent|optIn|permission)/i;

function eachLine(
  index: RepositoryIndex,
  visit: (file: IndexedFile, line: number, text: string) => void
): void {
  for (const file of index.files) {
    file.lines.forEach((text, position) => visit(file, position + 1, text));
  }
}

const HELD_RECORD_TYPE =
  /^\s*(?:@\w+\s+)*(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+)?(?:let|var)\s+[A-Za-z_][A-Za-z0-9_]*\s*:\s*(?:\[\s*([A-Za-z_][A-Za-z0-9_]*)\s*\]|([A-Za-z_][A-Za-z0-9_]*)\??\s*$)/;

const STANDARD_LIBRARY_TYPES = new Set([
  "String",
  "Int",
  "Double",
  "Float",
  "Bool",
  "URL",
  "Date",
  "Data",
  "Array",
  "Dictionary",
  "Set",
  "Optional",
  "Any",
  "AnyObject"
]);

const DIGEST_CALL = /=\s*[A-Za-z_][A-Za-z0-9_.]*\s*\(\s*[^)]*\)/;
const DIGEST_NAME = /(?:md5|sha\d*|hash|checksum|uuid|identifier)/i;

function code(text: string): string {
  return text.trimStart().startsWith("//") ? "" : text;
}

function declaredTypes(index: RepositoryIndex): ReadonlySet<string> {
  const names = new Set<string>();
  eachLine(index, (_file, _line, text) => {
    const name = TYPE_DECLARATION.exec(code(text))?.[1];
    if (name !== undefined && !STANDARD_LIBRARY_TYPES.has(name)) names.add(name);
  });
  return names;
}

function objectMotif(index: RepositoryIndex): readonly Readonly<{ name: string; proof: Proof }>[] {
  const found: { name: string; proof: Proof }[] = [];
  eachLine(index, (file, line, text) => {
    if (!LIST_DATA_SOURCE.test(text)) return;
    const name = TYPE_DECLARATION.exec(text)?.[1];
    if (name === undefined) return;
    found.push({ name, proof: { path: file.path, line, excerpt: text.trim() } });
  });
  return found.sort((left, right) => left.name.localeCompare(right.name));
}

function recordTypesOf(
  index: RepositoryIndex,
  objects: readonly Readonly<{ name: string; proof: Proof }>[]
): ReadonlyMap<string, readonly string[]> {
  const known = declaredTypes(index);
  const held = new Map<string, string[]>();
  for (const object of objects) {
    const file = index.files.find((entry) => entry.path === object.proof.path);
    const types: string[] = [];
    for (const text of file?.lines ?? []) {
      const match = HELD_RECORD_TYPE.exec(text);
      const type = match?.[1] ?? match?.[2];
      if (type === undefined || !known.has(type) || type === object.name) continue;
      if (!types.includes(type)) types.push(type);
    }
    held.set(object.name, types);
  }
  return held;
}

const INFERRED_PROPERTY = /^\s*(?:@\w+\s+)*(?:public\s+|private\s+|internal\s+|fileprivate\s+|open\s+)?(?:static\s+)?let\s+([A-Za-z_][A-Za-z0-9_]*)/;

function isDigest(text: string): boolean {
  const property = INFERRED_PROPERTY.exec(text)?.[1];
  if (property === undefined) return false;
  if (DISPLAY_NAMES.has(property)) return false;
  return DIGEST_CALL.test(text) && DIGEST_NAME.test(text);
}

function identifiersOf(index: RepositoryIndex, recordTypes: readonly string[]): readonly IdentifierCandidate[] {
  const wanted = new Set(recordTypes);
  const found: IdentifierCandidate[] = [];
  for (const file of index.files) {
    let enclosing: string | undefined;
    let bodyIndent = 0;
    for (const [position, text] of file.lines.entries()) {
      const declared = TYPE_DECLARATION.exec(code(text))?.[1];
      if (declared !== undefined) {
        enclosing = declared;
        bodyIndent = text.length - text.trimStart().length + 2;
        continue;
      }
      if (enclosing === undefined || !wanted.has(enclosing)) continue;
      if (code(text) === "") continue;
      const indent = text.length - text.trimStart().length;
      if (indent !== bodyIndent) continue;
      const annotated = STRING_PROPERTY.exec(text)?.[1];
      const digest = isDigest(text) ? INFERRED_PROPERTY.exec(text)?.[1] : undefined;
      const property = annotated ?? digest;
      if (property === undefined) continue;
      if (DISPLAY_NAMES.has(property)) continue;
      found.push({ property, proof: { path: file.path, line: position + 1, excerpt: text.trim() } });
    }
  }
  return found;
}

function openerMotif(
  index: RepositoryIndex,
  objects: readonly Readonly<{ name: string; proof: Proof }>[]
): readonly OpenerCandidate[] {
  const owned = new Set(objects.map((entry) => entry.proof.path));
  const found: OpenerCandidate[] = [];
  for (const file of index.files) {
    if (!owned.has(file.path)) continue;
    let enclosing: { symbol: string; proof: Proof } | undefined;
    for (const [position, text] of file.lines.entries()) {
      const declared = FUNCTION_DECLARATION.exec(text)?.[1];
      if (declared !== undefined) {
        enclosing = { symbol: declared, proof: { path: file.path, line: position + 1, excerpt: text.trim() } };
        continue;
      }
      if (enclosing === undefined) continue;
      if (!OPENS_A_URL.test(text)) continue;
      if (found.some((entry) => entry.symbol === enclosing?.symbol)) continue;
      found.push({ symbol: enclosing.symbol, proof: enclosing.proof });
    }
  }
  return found;
}

function accessMotif(index: RepositoryIndex): readonly AccessCandidate[] {
  const found: AccessCandidate[] = [];
  eachLine(index, (file, line, text) => {
    const symbol = BOOLEAN_PROPERTY.exec(text)?.[1];
    if (symbol === undefined) return;
    if (!ACCESS_NAMES.test(symbol)) return;
    found.push({ symbol, proof: { path: file.path, line, excerpt: text.trim() } });
  });
  return found;
}

export function discoverFromIndex(index: RepositoryIndex): Discovery {
  const candidates = objectMotif(index);
  const held = recordTypesOf(index, candidates);
  const objects: ObjectCandidate[] = candidates.map((candidate) => {
    const recordTypes = held.get(candidate.name) ?? [];
    return {
      name: candidate.name,
      proof: candidate.proof,
      recordTypes,
      identifiers: identifiersOf(index, recordTypes),
      openers: openerMotif(index, [candidate])
    };
  });
  return {
    repository: index.root,
    objects,
    access: accessMotif(index)
  };
}

export async function discover(index: RepositoryIndex): Promise<Discovery> {
  return discoverFromIndex(index);
}
