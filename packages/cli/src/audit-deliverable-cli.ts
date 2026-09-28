import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Command } from "commander";
import { renderDeliverable, type ScoredAuditReport } from "../../core/src/audit-deliverable.js";

/// The command that turns a report into the document a client reads.
///
/// It reads a report the audit already wrote and renders it. It does not audit
/// anything, does not read the audited repository, and does not touch a single
/// file other than the one it is asked to write. A deliverable can therefore be
/// re-rendered from a report the client already has, which is what makes every
/// figure in it traceable to a run rather than to this command.
///
/// Refusal is the other half. A report that cannot be read, or that parses into
/// something that is not a report, exits non-zero, names the file, and writes
/// nothing at all. A half-written deliverable is the failure a client cannot
/// detect, so the command refuses rather than degrading.

/// Whether a parsed document is a scored audit report.
///
/// `findings` is what makes it a report: a report that carries no findings is a
/// document claiming an audit found nothing, which is a different statement from a
/// document that does not know.
///
/// `score` is required because the document copies it rather than computing it. A
/// report without a score block was not written by the current engine, and
/// rendering it would either crash or, worse, quietly substitute a score the audit
/// never stated. Refusing names the missing block, which is what a person holding
/// that file needs to be told.
export function isAuditReport(value: unknown): value is ScoredAuditReport {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as { findings?: unknown; target?: unknown; score?: unknown };
  return (
    Array.isArray(candidate.findings) &&
    typeof candidate.target === "object" &&
    candidate.target !== null &&
    typeof candidate.score === "object" &&
    candidate.score !== null
  );
}

/// Why a document is not a report a deliverable can be rendered from.
///
/// Separate from the exit so the message names the actual problem: a reader who
/// handed the command the wrong file, or a report from an older tool, needs to know
/// which of the two it is.
export function describeUnrenderable(value: unknown): string {
  if (typeof value !== "object" || value === null) return "not an object";
  const candidate = value as { findings?: unknown; target?: unknown; score?: unknown };
  if (!Array.isArray(candidate.findings)) return "no findings";
  if (typeof candidate.target !== "object" || candidate.target === null) return "no target";
  if (typeof candidate.score !== "object" || candidate.score === null) {
    return "no score block, so every figure in the document would have to be invented";
  }
  return "not an audit report";
}

export function registerDeliverableCommand(program: Command): void {
  program
    .command("deliverable")
    .description("Render the client deliverable from an audit report the engine already wrote")
    .argument("<report>", "Audit report JSON produced by 'intentlane audit --format json'")
    .option("-o, --out <file>", "Write the deliverable to a file instead of stdout")
    .action(async (report: string, options: { out?: string }) => {
      const path = resolve(report);

      let text: string;
      try {
        text = await readFile(path, "utf8");
      } catch (reason) {
        process.stderr.write(
          `Unable to read the audit report ${report}: ${reason instanceof Error ? reason.message : "unknown error"}\n`
        );
        process.exitCode = 1;
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch (reason) {
        process.stderr.write(
          `${report} is not valid JSON: ${reason instanceof Error ? reason.message : "unknown error"}\n`
        );
        process.exitCode = 1;
        return;
      }

      if (!isAuditReport(parsed)) {
        process.stderr.write(
          `${report} parses, but it cannot be rendered: ${describeUnrenderable(parsed)}.\n`
        );
        process.exitCode = 1;
        return;
      }

      const deliverable = renderDeliverable([parsed]);

      if (options.out === undefined) {
        process.stdout.write(deliverable);
        return;
      }
      try {
        await writeFile(resolve(options.out), deliverable, "utf8");
      } catch (reason) {
        process.stderr.write(
          `Unable to write the deliverable ${options.out}: ${reason instanceof Error ? reason.message : "unknown error"}\n`
        );
        process.exitCode = 1;
        return;
      }
    });
}
