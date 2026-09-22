import { createHash } from "node:crypto";
import { readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

export const AUDIT_PROJECT_KINDS = ["xcode", "swift-package", "expo"] as const;
export type AuditProjectKind = (typeof AUDIT_PROJECT_KINDS)[number];

export type AuditProject = Readonly<{
  kind: AuditProjectKind;
  path: string;
  name: string;
}>;

const IGNORED_DIRECTORIES: ReadonlySet<string> = new Set([
  ".git",
  ".expo",
  ".intentlane",
  "build",
  "DerivedData",
  "node_modules",
  "Pods"
]);

type WalkOptions = Readonly<{
  maxDepth?: number;
  ignore?: ReadonlySet<string>;
}>;

export async function listProjectFiles(directory: string, options: WalkOptions = {}): Promise<readonly string[]> {
  const maxDepth = options.maxDepth ?? 6;
  const ignore = options.ignore ?? IGNORED_DIRECTORIES;
  const files: string[] = [];
  await walk(directory, directory, 0, maxDepth, ignore, files);
  return files.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

async function walk(
  root: string,
  current: string,
  depth: number,
  maxDepth: number,
  ignore: ReadonlySet<string>,
  files: string[]
): Promise<void> {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(current, entry.name);
    if (entry.isDirectory()) {
      if (ignore.has(entry.name)) continue;
      await walk(root, path, depth + 1, maxDepth, ignore, files);
    } else if (entry.isFile()) {
      files.push(relative(root, path).split(sep).join("/"));
    }
  }
}

export async function discoverProjects(directory: string): Promise<readonly AuditProject[]> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const projects: AuditProject[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "node_modules" || entry.name === ".git") continue;
    const path = join(directory, entry.name);
    if (entry.name.endsWith(".xcodeproj") || entry.name.endsWith(".xcworkspace")) {
      projects.push({ kind: "xcode", path, name: entry.name.replace(/\.(xcodeproj|xcworkspace)$/, "") });
    }
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === "Package.swift") projects.push({ kind: "swift-package", path: join(directory, entry.name), name: "Package" });
    if (entry.name === "app.json" || entry.name === "app.config.js" || entry.name === "app.config.ts") {
      projects.push({ kind: "expo", path: join(directory, entry.name), name: "Expo" });
    }
  }
  return projects.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

export async function worktreeFingerprint(directory: string): Promise<string> {
  const files = await listProjectFiles(directory);
  const hash = createHash("sha256");
  for (const file of files) {
    let size = 0;
    try {
      size = (await stat(join(directory, file))).size;
    } catch {
      size = -1;
    }
    hash.update(`${file}\0${size}\n`);
  }
  return hash.digest("hex");
}
