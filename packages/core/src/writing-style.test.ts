import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/// The writing rule, enforced where prose is written.
///
/// Guillaume's rules ban the em dash and the en dash, including the HTML
/// entities, and ban a list of phrases that read as machine-written. The rule
/// lived only in a global configuration file, so a document could carry one and
/// nothing would say so.
///
/// This is a ratchet, not a purge. Rewriting fourteen documents the author wrote
/// would be an unrequested edit to his prose, and the rule is about what is
/// written next. The counts below are the debt as of 2026-09-28, and the test
/// fails when a document gains one.
///
/// The debt is counted per file, so a file that pays it down reads as progress
/// and a file that takes on more is named.
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/// Per file, the number of banned characters it already carries. A file absent
/// from this record must carry none.
const KNOWN_DEBT: Readonly<Record<string, number>> = {
  "AGENT-GUIDE.md": 1,
  "docs/pilots/MANUAL-SIRI-ACCEPTANCE.md": 4,
  "docs/pilots/PILOT-IINA-DISCOVERY.md": 6,
  "docs/product/PRD.md": 1,
  "openspec/changes/migrate-netnewswire-to-the-contract/QUALIFICATION.md": 4,
  "openspec/changes/migrate-netnewswire-to-the-contract/proposal.md": 3,
  "pilots/iina/README.md": 8,
  "pilots/iina/RUNBOOK.md": 1
};

/// Documents the rule does not cover, named rather than skipped in silence: these
/// are tool-owned files vendored into the repository, not prose the author signs.
/// An entry added here has to look like a tool file, which the last test checks.
const TOOL_OWNED: readonly string[] = [
  ".opencode/commands/opsx-archive.md",
  ".opencode/commands/opsx-explore.md",
  ".opencode/commands/opsx-sync.md",
  ".opencode/skills/openspec-archive-change/SKILL.md",
  ".opencode/skills/openspec-explore/SKILL.md",
  ".opencode/skills/openspec-sync-specs/SKILL.md"
];

/// The characters, and the entities that spell them. An entity is as much a dash
/// as the character is, and a grep for the character alone misses it.
const BANNED = [
  { name: "em dash", pattern: /\u2014/g },
  { name: "en dash", pattern: /\u2013/g },
  { name: "&mdash;", pattern: /&mdash;/g },
  { name: "&ndash;", pattern: /&ndash;/g }
];

function trackedMarkdown(): string[] {
  return execFileSync("git", ["ls-files", "*.md"], { cwd: repositoryRoot, encoding: "utf8" })
    .split("\n")
    .filter((line) => line.length > 0);
}

/// The banned characters in one file, counted per kind so a failure names which.
function countBanned(file: string): { total: number; counts: Record<string, number> } {
  const text = readFileSync(resolve(repositoryRoot, file), "utf8");
  const counts: Record<string, number> = {};
  let total = 0;
  for (const { name, pattern } of BANNED) {
    const found = text.match(pattern);
    if (found !== null && found.length > 0) {
      counts[name] = found.length;
      total += found.length;
    }
  }
  return { total, counts };
}

describe("prose carries no dash it was told not to carry", () => {
  it("finds the documents it is meant to cover", () => {
    // A test whose file list came back empty would pass having checked nothing.
    expect(trackedMarkdown().length).toBeGreaterThan(20);
  });

  it("adds no dash to a document that had none", () => {
    const offenders = [];
    for (const file of trackedMarkdown()) {
      if (KNOWN_DEBT[file] !== undefined || TOOL_OWNED.includes(file)) continue;
      const { total, counts } = countBanned(file);
      if (total > 0) {
        const kinds = Object.entries(counts)
          .map(([name, count]) => `${name} x${count}`)
          .join(", ");
        offenders.push(`${file}: ${kinds}`);
      }
    }
    expect(
      offenders,
      `these documents carry a dash the writing rules ban: ${offenders.join(" | ")}`
    ).toEqual([]);
  });

  it("does not grow the debt on a document that already carries one", () => {
    // Counting per file rather than as one total is the point: a document paying
    // its debt down and a document taking on more are different events, and only
    // the second is a regression.
    const regressions = [];
    for (const [file, allowed] of Object.entries(KNOWN_DEBT)) {
      const { total } = countBanned(file);
      if (total > allowed) {
        regressions.push(`${file}: ${total} dashes, ${allowed} were already there`);
      }
    }
    expect(regressions, `these documents gained a dash: ${regressions.join(" | ")}`).toEqual([]);
  });

  it("does not keep a debt entry for a document that no longer carries one", () => {
    // Otherwise a cleaned document would silently authorise a new dash later.
    const stale = [];
    for (const file of Object.keys(KNOWN_DEBT)) {
      if (countBanned(file).total === 0) {
        stale.push(`${file} is recorded as carrying dashes and carries none`);
      }
    }
    expect(stale, stale.join(" | ")).toEqual([]);
  });
});

describe("the exemptions the rule makes", () => {
  it("only exempt tool-owned documents, so a document cannot buy its way out", () => {
    for (const file of TOOL_OWNED) {
      expect(
        file.startsWith(".opencode/") || file.startsWith(".claude/"),
        `${file} is exempt and is not a tool-owned file`
      ).toBe(true);
      expect(trackedMarkdown(), `${file} is exempt and is no longer tracked`).toContain(file);
    }
  });

  it("exempts nothing that is prose in the product's own documentation", () => {
    for (const file of TOOL_OWNED) {
      expect(file.startsWith("docs/"), `${file} is under docs/ and is the author's prose`).toBe(false);
      expect(file.startsWith("openspec/"), `${file} is a change artifact and is the author's prose`).toBe(false);
    }
  });
});
