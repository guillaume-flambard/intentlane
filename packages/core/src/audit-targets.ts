import { dirname, join, normalize } from "node:path";
import type { AuditPlatform } from "./audit.js";

export type AuditBuildTarget = Readonly<{
  name: string;
  platform?: AuditPlatform;
  files: readonly string[];
  folders: readonly string[];
}>;

export type AuditTargetsReport = Readonly<{
  targets: readonly AuditBuildTarget[];
  scoped: boolean;
  nextAction: string;
}>;

export type TargetFileReader = (path: string) => string | undefined;

const IDENTIFIER = "[0-9A-Fa-f]{24}";
const HEAD = new RegExp(`^\\t*(${IDENTIFIER})\\s*(?:\\/\\* (.*?) \\*\\/)?\\s*=\\s*\\{(.*)$`);

function sections(contents: string): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  let name: string | undefined;
  let buffer: string[] = [];
  for (const line of contents.split("\n")) {
    const begin = /\/\* Begin (\w+) section \*\//.exec(line);
    if (begin) {
      name = begin[1];
      buffer = [];
      continue;
    }
    const end = /\/\* End (\w+) section \*\//.exec(line);
    if (end) {
      if (name) result.set(name, buffer.join("\n"));
      name = undefined;
      continue;
    }
    if (name) buffer.push(line);
  }
  return result;
}

function depthOf(line: string): number {
  const stripped = line.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  for (const character of stripped) {
    if (character === "{") depth += 1;
    else if (character === "}") depth -= 1;
  }
  return depth;
}

function entries(body: string): readonly Readonly<{ id: string; name?: string; body: string }>[] {
  const lines = body.split("\n");
  const result: { id: string; name?: string; body: string }[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const head = HEAD.exec(lines[index] ?? "");
    if (!head) continue;
    const id = head[1] ?? "";
    const name = head[2];
    const rest = head[3] ?? "";
    let entry = rest;
    let depth = 1 + depthOf(rest);
    while (depth > 0 && index + 1 < lines.length) {
      index += 1;
      const line = lines[index] ?? "";
      entry += `\n${line}`;
      depth += depthOf(line);
    }
    result.push({ id, ...(name ? { name } : {}), body: entry });
  }
  return result;
}

function unquote(value: string): string {
  const trimmed = value.replace(/\/\*[\s\S]*?\*\//g, "").trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1);
  return trimmed;
}

function field(body: string, name: string): string | undefined {
  const match = new RegExp(`\\b${name} = ([^;]*);`).exec(body);
  return match?.[1] === undefined ? undefined : unquote(match[1]);
}

function identifiers(body: string, name: string): readonly string[] {
  const match = new RegExp(`\\b${name} = \\(([\\s\\S]*?)\\)`).exec(body);
  if (!match) return [];
  return [...(match[1] ?? "").matchAll(new RegExp(IDENTIFIER, "g"))].map((entry) => entry[0]);
}

function platformOf(sdkroot: string | undefined, supported?: string): AuditPlatform | undefined {
  if (sdkroot) {
    if (sdkroot.startsWith("macosx")) return "macos";
    if (sdkroot.startsWith("iphoneos") || sdkroot.startsWith("iphonesimulator")) return "ios";
  }
  return platformOfSupported(supported);
}

// Modern Xcode projects, Nextcloud among them, state the platform with
// SUPPORTED_PLATFORMS and leave SDKROOT out or set it to "auto". Exactly one of the
// two platforms the audit knows is a declaration. Both, or none, is not: the target
// stays undeclared, and an undeclared target is never dropped from the inspection.
function platformOfSupported(supported: string | undefined): AuditPlatform | undefined {
  if (!supported) return undefined;
  const names = supported.split(/\s+/).filter(Boolean);
  const macos = names.some((name) => name === "macosx");
  const ios = names.some((name) => name === "iphoneos" || name === "iphonesimulator");
  if (macos === ios) return undefined;
  return macos ? "macos" : "ios";
}

function resolveSdkRoot(readFile: TargetFileReader, path: string, seen: Set<string>): string | undefined {
  if (seen.has(path)) return undefined;
  seen.add(path);
  const contents = readFile(path);
  if (contents === undefined) return undefined;
  const directory = dirname(path);
  let value: string | undefined;
  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    const include = /^#include\??\s+"([^"]+)"/.exec(trimmed);
    if (include) {
      const nested = resolveSdkRoot(readFile, normalize(join(directory, include[1] ?? "")), seen);
      if (nested) value = nested;
      continue;
    }
    const assignment = /^SDKROOT\s*=\s*([^;]+);/.exec(trimmed);
    if (assignment) value = unquote(assignment[1] ?? "");
  }
  return value;
}

export function readTargetMembership(contents: string, readFile?: TargetFileReader): readonly AuditBuildTarget[] {
  const body = sections(contents);
  const fileReferences = new Map(
    entries(body.get("PBXFileReference") ?? "").map((entry) => [entry.id, field(entry.body, "path") ?? entry.name ?? ""])
  );
  const groups = new Map(
    entries(body.get("PBXGroup") ?? "").map((entry) => [
      entry.id,
      { children: identifiers(entry.body, "children"), path: field(entry.body, "path") }
    ])
  );
  const buildFiles = new Map(
    entries(body.get("PBXBuildFile") ?? "").map((entry) => [entry.id, field(entry.body, "fileRef") ?? ""])
  );
  const phases = new Map(
    entries(body.get("PBXSourcesBuildPhase") ?? "").map((entry) => [entry.id, identifiers(entry.body, "files")])
  );
  const configurations = new Map(
    entries(body.get("XCBuildConfiguration") ?? "").map((entry) => [
      entry.id,
      {
        sdkroot: field(entry.body, "SDKROOT"),
        supported: field(entry.body, "SUPPORTED_PLATFORMS"),
        base: field(entry.body, "baseConfigurationReference"),
        anchor: field(entry.body, "baseConfigurationReferenceAnchor"),
        relative: field(entry.body, "baseConfigurationReferenceRelativePath")
      }
    ])
  );
  const groupPaths = new Map(
    entries(body.get("PBXGroup") ?? "").map((entry) => [entry.id, field(entry.body, "path") ?? ""])
  );
  const lists = new Map(
    entries(body.get("XCConfigurationList") ?? "").map((entry) => [
      entry.id,
      identifiers(entry.body, "buildConfigurations")
    ])
  );
  const synchronized = new Map(
    entries(body.get("PBXFileSystemSynchronizedRootGroup") ?? "").map((entry) => [
      entry.id,
      field(entry.body, "path") ?? ""
    ])
  );
  const project = entries(body.get("PBXProject") ?? "")[0];
  const projectSettings = (lists.get(field(project?.body ?? "", "buildConfigurationList") ?? "") ?? []).map((id) =>
    configurations.get(id)
  );

  const paths = new Map<string, string>();
  const seen = new Set<string>();
  const visit = (id: string, prefix: string): void => {
    if (seen.has(id)) return;
    seen.add(id);
    const group = groups.get(id);
    if (group) {
      const next = group.path ? (prefix ? `${prefix}/${group.path}` : group.path) : prefix;
      for (const child of group.children) visit(child, next);
      return;
    }
    const file = fileReferences.get(id);
    if (file) paths.set(id, prefix ? `${prefix}/${file}` : file);
  };
  visit(field(project?.body ?? "", "mainGroup") ?? "", "");

  const targets: AuditBuildTarget[] = [];
  for (const target of entries(body.get("PBXNativeTarget") ?? "")) {
    const files = new Set<string>();
    for (const phase of identifiers(target.body, "buildPhases")) {
      for (const buildFile of phases.get(phase) ?? []) {
        const reference = buildFiles.get(buildFile);
        const path = reference ? paths.get(reference) : undefined;
        if (path) files.add(path);
      }
    }
    const folders = new Set<string>();
    for (const group of identifiers(target.body, "fileSystemSynchronizedGroups")) {
      const path = synchronized.get(group);
      if (path) folders.add(path);
    }
    const list = field(target.body, "buildConfigurationList");
    const targetSettings = (lists.get(list ?? "") ?? []).map((id) => configurations.get(id));
    const levels = [targetSettings, projectSettings];
    let sdkroot = levels
      .flat()
      .map((setting) => setting?.sdkroot)
      .find((value) => value !== undefined);
    if (sdkroot === undefined && readFile) {
      for (const setting of levels.flat()) {
        if (!setting) continue;
        const entry = setting.base
          ? (paths.get(setting.base) ?? fileReferences.get(setting.base) ?? setting.base)
          : setting.anchor && setting.relative
            ? [synchronized.get(setting.anchor) ?? groupPaths.get(setting.anchor) ?? "", setting.relative]
                .filter(Boolean)
                .join("/")
            : undefined;
        if (!entry) continue;
        const resolved = resolveSdkRoot(readFile, entry, new Set());
        if (resolved) {
          sdkroot = resolved;
          break;
        }
      }
    }
    const supported = levels
      .flat()
      .map((setting) => setting?.supported)
      .find((value) => value !== undefined);
    const platform = platformOf(sdkroot, supported);
    targets.push({
      name: target.name ?? field(target.body, "name") ?? "Target",
      ...(platform ? { platform } : {}),
      files: [...files].sort(),
      folders: [...folders].sort()
    });
  }
  return targets.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
}

function owns(target: AuditBuildTarget, path: string, base: string): boolean {
  for (const file of target.files) {
    if (path === `${base}${file}`) return true;
  }
  for (const folder of target.folders) {
    if (folder && path.startsWith(`${base}${folder}/`)) return true;
  }
  return false;
}

export function filesForPlatform(
  memberships: readonly AuditBuildTarget[],
  platform: AuditPlatform,
  files: readonly string[],
  prefix = ""
): readonly string[] {
  const base = prefix && prefix !== "." ? `${prefix}/` : "";
  return [...files]
    .filter((file) => {
      let owned = false;
      for (const target of memberships) {
        if (!owns(target, file, base)) continue;
        owned = true;
        // A target with no declared platform may compile for this one. Dropping its
        // files made a 440 file app disappear from an audit that named one extension.
        if (target.platform === platform || target.platform === undefined) return true;
      }
      return !owned;
    })
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

export function describeTargets(targets: readonly AuditBuildTarget[], platform: AuditPlatform): AuditTargetsReport {
  const matching = targets.filter((target) => target.platform === platform);
  const undeclared = targets.filter((target) => target.platform === undefined);
  const scoped = matching.length > 0;
  const undeclaredNote =
    undeclared.length > 0
      ? ` ${undeclared.map((target) => target.name).join(", ")} ${undeclared.length === 1 ? "has" : "have"} no declared platform and ${undeclared.length === 1 ? "was" : "were"} inspected too.`
      : "";
  const nextAction =
    targets.length === 0
      ? "No Xcode target was found, so every Swift file in the tree was inspected."
      : scoped
        ? `Only the Swift files that ${matching.map((target) => target.name).join(", ")} compile were inspected for ${platform}.${undeclaredNote}`
        : `No target declares ${platform}, so the report describes the whole tree.`;
  return { targets, scoped, nextAction };
}
