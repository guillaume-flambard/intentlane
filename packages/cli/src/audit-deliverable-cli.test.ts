import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/// The command, asserted before it exists.
///
/// The renderer is a pure function, so a test proves it by calling it. The
/// command is the other half: it reads a file, writes a file, and can fail. The
/// property that matters most is the one a document makes unverifiable: a
/// deliverable that is half written, from a report nobody could read, looks
/// exactly like a complete one to the person who opens it.
///
/// So the command is run as a subprocess, on a real file, and the exit code and
/// the filesystem are read back. Nothing is stubbed, because a stub would prove
/// the mock behaves.
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const cliEntry = join(repositoryRoot, "packages/cli/src/index.ts");

function runCli(...args: string[]): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync("pnpm", ["exec", "tsx", cliEntry, ...args], {
      cwd: repositoryRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    const failure = error as { status?: number; stdout?: string; stderr?: string };
    return { code: failure.status ?? 1, stdout: failure.stdout ?? "", stderr: failure.stderr ?? "" };
  }
}

function withWorkspace(body: (workspace: string) => void): void {
  const workspace = mkdtempSync(join(tmpdir(), "intentlane-deliverable-"));
  try {
    body(workspace);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

/// A report as the engine writes it: findings plus the score block `formatJson`
/// injects, because the score is derived rather than collected. The command
/// refuses a report without it, so a fixture that left it out would be refused for
/// the wrong reason.
function scoredReport(overrides: { name: string; findings?: unknown[] }): object {
  return {
    reportVersion: "1.0",
    target: { name: overrides.name, platform: "macos" },
    score: {
      version: "1.0",
      score: 0,
      band: "none",
      points: 0,
      maximum: 150,
      applicable: 50,
      counts: { unsupported: 0, unknown: 0, detected: 0, implemented: 0, tested: 0, feasible: 0 },
      discovery: "schema-backed"
    },
    findings: overrides.findings ?? []
  };
}

describe("the command renders a deliverable from a report", () => {
  it("writes the document to the file it was asked for", () => {
    withWorkspace((workspace) => {
      const report = join(workspace, "audit.json");
      const deliverable = join(workspace, "DELIVERABLE.md");
      writeFileSync(
        report,
        JSON.stringify(scoredReport({ name: "MyApp" }))
      );

      const result = runCli("deliverable", report, "--out", deliverable);
      expect(result.code, `the command failed: ${result.stderr}`).toBe(0);
      expect(existsSync(deliverable)).toBe(true);

      const written = readFileSync(deliverable, "utf8");
      expect(written).toContain("MyApp");
      expect(written).toContain("What a person observed");
    });
  });

  it("writes the document to stdout when no file is named", () => {
    withWorkspace((workspace) => {
      const report = join(workspace, "audit.json");
      writeFileSync(
        report,
        JSON.stringify(scoredReport({ name: "StdoutApp" }))
      );

      const result = runCli("deliverable", report);
      expect(result.code, `the command failed: ${result.stderr}`).toBe(0);
      expect(result.stdout).toContain("StdoutApp");
    });
  });
});

describe("the command refuses a report it cannot read", () => {
  it("exits non-zero, names the file, and writes no deliverable", () => {
    withWorkspace((workspace) => {
      const report = join(workspace, "broken.json");
      const deliverable = join(workspace, "DELIVERABLE.md");
      writeFileSync(report, "this is not json at all");

      const result = runCli("deliverable", report, "--out", deliverable);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain("broken.json");
      // The failure that matters: no file. A client must not receive a document
      // produced from a report nobody could read.
      expect(existsSync(deliverable), "a refused report still produced a deliverable").toBe(false);
    });
  });

  it("exits non-zero when the report does not exist, and writes nothing", () => {
    withWorkspace((workspace) => {
      const deliverable = join(workspace, "DELIVERABLE.md");
      const result = runCli("deliverable", join(workspace, "absent.json"), "--out", deliverable);
      expect(result.code).not.toBe(0);
      expect(existsSync(deliverable)).toBe(false);
    });
  });

  it("refuses a report that parses but is not a report", () => {
    withWorkspace((workspace) => {
      // JSON is not enough. A report without findings is a document that claims
      // an audit found nothing, which is a different statement from not knowing.
      const report = join(workspace, "shapeless.json");
      const deliverable = join(workspace, "DELIVERABLE.md");
      writeFileSync(report, JSON.stringify({ hello: "world" }));

      const result = runCli("deliverable", report, "--out", deliverable);
      expect(result.code).not.toBe(0);
      expect(existsSync(deliverable), "an unrecognisable report still produced a deliverable").toBe(false);
    });
  });

  it("refuses a report with no score block, rather than inventing the figures", () => {
    withWorkspace((workspace) => {
      // A report without a score was not written by the current engine. Rendering
      // it would mean computing a score the report never stated, which is the one
      // thing the document promises not to do.
      const report = join(workspace, "unscored.json");
      const deliverable = join(workspace, "DELIVERABLE.md");
      writeFileSync(
        report,
        JSON.stringify({ reportVersion: "1.0", target: { name: "Old", platform: "macos" }, findings: [] })
      );

      const result = runCli("deliverable", report, "--out", deliverable);
      expect(result.code).not.toBe(0);
      expect(result.stderr).toContain("score");
      expect(existsSync(deliverable), "an unscored report still produced a deliverable").toBe(false);
    });
  });
});
