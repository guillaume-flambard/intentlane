import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/// The repository root, from this file rather than from the working directory,
/// because vitest may run from anywhere and a test that passes only when it is
/// launched in one place is a test that will be skipped.
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/// Every tracked markdown file, read through git rather than by walking the
/// filesystem, so an untracked draft cannot fail a check and a deleted file
/// cannot pass one.
function trackedMarkdown(): string[] {
  return execFileSync("git", ["ls-files", "*.md"], { cwd: repositoryRoot, encoding: "utf8" })
    .split("\n")
    .filter((line) => line.length > 0);
}

interface MarkdownLink {
  readonly file: string;
  readonly target: string;
  readonly line: number;
}

/// A markdown inline link, its target and the line it sits on. Only inline
/// links are read: the documents in this repository use them, and a partial
/// reader that reports no links would make the check pass on the very
/// documents it cannot understand.
function inlineLinks(file: string, text: string): MarkdownLink[] {
  const links: MarkdownLink[] = [];
  text.split("\n").forEach((line, index) => {
    for (const match of line.matchAll(/\]\(([^)\s]+)\)/g)) {
      links.push({ file, target: match[1]!, line: index + 1 });
    }
  });
  return links;
}

/// Links that name a place rather than a page: they are the ones that rot when
/// a directory moves. A URL, a mail address and a bare anchor are excluded
/// because they cannot be resolved against the filesystem.
function isPathLink(target: string): boolean {
  if (target.startsWith("http://") || target.startsWith("https://")) return false;
  if (target.startsWith("#") || target.startsWith("mailto:")) return false;
  return true;
}

describe("every document link resolves", () => {
  it("finds the documents and the links they carry", () => {
    // A guard on the guard: if the file list came back empty the loop below
    // would report success having checked nothing at all.
    const files = trackedMarkdown();
    expect(files.length).toBeGreaterThan(10);

    const links = files.flatMap((file) => inlineLinks(file, readFileSync(resolve(repositoryRoot, file), "utf8")));
    expect(links.filter((link) => isPathLink(link.target)).length).toBeGreaterThan(10);
  });

  it("resolves relative and repository-relative links alike", () => {
    const broken: string[] = [];
    for (const file of trackedMarkdown()) {
      const directory = dirname(file);
      const text = readFileSync(resolve(repositoryRoot, file), "utf8");
      for (const link of inlineLinks(file, text)) {
        if (!isPathLink(link.target)) continue;
        // The anchor is stripped before resolving: `file.md#section` names a
        // heading inside a file, not a second file.
        const path = link.target.split("#")[0]!;
        if (path.length === 0) continue;
        // Relative to the document, which covers both `../spec.md` and the
        // repository-relative form an author reaches for from inside a
        // subdirectory.
        const target = resolve(repositoryRoot, directory, path);
        if (!existsSync(target)) broken.push(`${file}:${link.line} -> ${link.target}`);
      }
    }
    expect(
      broken,
      `these document links name a path that does not exist, which is what an archived directory looks like from a document that still points at the old name:\n${broken.join("\n")}`
    ).toEqual([]);
  });

  it("fails on a link to a change that has been archived", () => {
    // The specific failure this test exists to catch, asserted directly. A
    // change lives at `changes/<name>/` and, once archived, at
    // `changes/archive/<date>-<name>/`, so a document still saying
    // `changes/<name>/` points at nothing.
    const archived = "openspec/changes/archive/2026-09-27-studio-capability-map";
    expect(existsSync(resolve(repositoryRoot, archived))).toBe(true);
    expect(existsSync(resolve(repositoryRoot, "openspec/changes/studio-capability-map"))).toBe(false);
  });
});
