import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", "dist", ".intentlane", "build"]);
const DOCUMENT = /\.md$/;
const MARKDOWN_LINK = /\]\(([^)\s]+)\)/g;
const ROOT_DOCUMENTS = ["AGENT-GUIDE.md", "AGENTS.md", "CONTRIBUTING.md", "README.md", "ROADMAP.md", "SPEC.md"];

function markdownFiles(directory: string): readonly string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (IGNORED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...markdownFiles(path));
    else if (DOCUMENT.test(entry.name)) found.push(path);
  }
  return found;
}

function isExternal(link: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(link) || link.startsWith("#");
}

type BrokenLink = Readonly<{ from: string; link: string }>;

function brokenLinks(): readonly BrokenLink[] {
  const broken: BrokenLink[] = [];
  for (const file of markdownFiles(repositoryRoot)) {
    for (const match of readFileSync(file, "utf8").matchAll(MARKDOWN_LINK)) {
      const link = match[1];
      if (link === undefined || isExternal(link)) continue;
      const target = resolve(dirname(file), link.split("#")[0] ?? "");
      if (existsSync(target)) continue;
      broken.push({ from: relative(repositoryRoot, file), link });
    }
  }
  return broken;
}

describe("documentation links", () => {
  // A relative link that resolves to nothing is invisible in a diff and in a
  // review: the sentence around it still reads correctly, so the document looks
  // fine while the path it offers no longer exists. That is how a repository
  // accumulates a flat root of documents nobody can place. This test is the
  // reason a move has to carry its links with it.
  it("resolves every relative markdown link to a file that exists", () => {
    expect(brokenLinks()).toEqual([]);
  });

  it("keeps the repository root to the six documents that are read by convention", () => {
    const atRoot = markdownFiles(repositoryRoot)
      .map((path) => relative(repositoryRoot, path))
      .filter((path) => !path.includes("/"))
      .sort();
    expect(atRoot).toEqual(ROOT_DOCUMENTS);
  });

  it("indexes every document that is not at the root", () => {
    // The index is the answer to "where is this file". A document that moves out
    // of the root and out of the index is invisible again, so the index has to
    // name it.
    const index = readFileSync(join(repositoryRoot, "docs", "INDEX.md"), "utf8");
    const indexed = new Set([...index.matchAll(MARKDOWN_LINK)].map((match) => match[1]).filter((link) => link !== undefined));
    const indexedPaths = new Set(
      [...indexed].map((link) => (isExternal(link) ? undefined : resolve(join(repositoryRoot, "docs"), link.split("#")[0] ?? "")))
    );

    const unindexed = markdownFiles(join(repositoryRoot, "docs"))
      .map((path) => relative(repositoryRoot, path))
      .filter((path) => !path.endsWith("INDEX.md"))
      .filter((path) => !path.startsWith("docs/superpowers/"))
      .filter((path) => !indexedPaths.has(resolve(repositoryRoot, path)))
      .filter((path) => {
        try {
          return statSync(resolve(repositoryRoot, path)).isFile();
        } catch {
          return false;
        }
      })
      .sort();

    expect(unindexed).toEqual([]);
  });
});
