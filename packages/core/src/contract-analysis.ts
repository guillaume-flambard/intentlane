import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { intentLaneConfigSchema, type IntentLaneConfig } from "../../schema/src/index.js";
import type { Proof, RepositoryIndex } from "./discovery.js";
import type { AnalysisResult } from "./pilot-runner.js";

/**
 * Reads the contract a pilot declares, and returns nothing rather than a partially
 * parsed one: an unreadable contract is no contract, and the caller falls back to the
 * motif instead of analysing against a document that was not understood.
 */
export async function readContract(file: string): Promise<IntentLaneConfig | undefined> {
  let source: string;
  try {
    source = await readFile(file, "utf8");
  } catch {
    return undefined;
  }
  const parsed = intentLaneConfigSchema.safeParse(parse(source) as unknown);
  return parsed.success ? parsed.data : undefined;
}

export type ContractSeam = Readonly<{
  kind: "identifier" | "title" | "opening";
  entity: string;
  field: string;
  proof: Proof;
}>;

/**
 * The object motif answers a question by heuristic: which class here looks like a list
 * whose row could be identified and opened. A pilot that carries a contract has already
 * answered it by name, and a regex cannot read a decision that was written down. This
 * reads the contract's own fields instead, and asks only that the repository carries
 * them, each one backed by a file and a line.
 *
 * Nothing here relaxes the rule. An entity is still actionable only when it has an
 * identifier, a display title and an opening path, and a seam without evidence still
 * fails. What changes is where the seam is looked for.
 */
export function analyseContract(config: IntentLaneConfig, index: RepositoryIndex): AnalysisResult {
  if (config.entities.length === 0) {
    return { status: "blocked", reason: "The contract declares no entity, so there is nothing to integrate.", objects: 0, actionable: 0, findings: 0 };
  }

  const opens = new Set(
    config.intents.flatMap((intent) => (intent.target !== undefined && intent.schema === "system.open" ? [intent.target] : []))
  );
  const declaredOpeners = openersOf(index);
  let findings = 0;
  const seams: ContractSeam[] = [];
  const checked: string[] = [];
  // How many entities were fully verified before a failure stopped the walk, so the
  // journal can say that one of them was checked rather than implying none were.
  let verified = 0;

  for (const entity of config.entities) {
    const identifier = fieldNamed(index, entity.identifier, { optional: false });
    if (identifier === undefined) {
      return {
        status: "blocked",
        reason: `The contract names '${entity.identifier}' as the identifier of entity '${entity.id}', and the repository declares no non-optional String field of that name, so the entity cannot be identified.`,
        objects: config.entities.length,
        actionable: verified,
        findings
      };
    }
    seams.push({ kind: "identifier", entity: entity.id, field: entity.identifier, proof: identifier });
    findings += 1;

    const title = fieldNamed(index, entity.display.title, { optional: true });
    if (title === undefined) {
      return {
        status: "blocked",
        reason: `The contract names '${entity.display.title}' as the display title of entity '${entity.id}', and the repository declares no String field of that name, so the entity has nothing to show.`,
        objects: config.entities.length,
        actionable: verified,
        findings
      };
    }
    seams.push({ kind: "title", entity: entity.id, field: entity.display.title, proof: title });
    findings += 1;

    if (!opens.has(entity.id)) {
      return {
        status: "blocked",
        reason: `Entity '${entity.id}' has no open intent in the contract, so there is no opening path to check and the entity is not actionable.`,
        objects: config.entities.length,
        actionable: verified,
        findings
      };
    }

    // The opener has to be the one that is actually reached with this entity's
    // identifier, because a repository can declare more than one `open`.
    const opener = declaredOpeners.find((candidate) => callPassing(index, candidate.name, entity.identifier) !== undefined);
    if (opener === undefined) {
      return {
        status: "blocked",
        reason:
          declaredOpeners.length === 0
            ? `Entity '${entity.id}' has an open intent, and the repository declares no 'open' function taking a String, so nothing opens it.`
            : `Entity '${entity.id}' is not reached by any of the ${declaredOpeners.length} declared opener(s) with the identifier '${entity.identifier}', so no opener opens this entity with the object it must open.`,
        objects: config.entities.length,
        actionable: verified,
        findings
      };
    }
    seams.push({ kind: "opening", entity: entity.id, field: opener.name, proof: opener.proof });
    findings += 2;
    checked.push(`${entity.id} (identifier '${entity.identifier}', title '${entity.display.title}', opened by '${opener.name}')`);
    verified += 1;
  }

  const unbacked = seams.find((seam) => seam.proof.path === "" || seam.proof.line < 1 || seam.proof.excerpt === "");
  if (unbacked !== undefined) {
    return {
      status: "blocked",
      reason: `A seam carries no file and line, so it is not evidence: ${unbacked.kind} on '${unbacked.entity}'.`,
      objects: config.entities.length,
      actionable: verified,
      findings
    };
  }

  return {
    status: "pass",
    reason: `${seams.length} seam(s) across ${config.entities.length} entit${config.entities.length === 1 ? "y" : "ies"} in the contract: ${checked.join("; ")}. Every seam carries a file and a line.`,
    objects: config.entities.length,
    actionable: config.entities.length,
    findings
  };
}

function code(text: string): string {
  return text.trimStart().startsWith("//") ? "" : text;
}

function fieldNamed(index: RepositoryIndex, field: string, options: { optional: boolean }): Proof | undefined {
  const type = options.optional ? "String\\???" : "String";
  const pattern = new RegExp(
    `^\\s*(?:@\\w+\\s+)*(?:public\\s+|private\\s+|internal\\s+|fileprivate\\s+|open\\s+)?(?:static\\s+)?(?:let|var)\\s+${escapeForPattern(field)}\\s*:\\s*${type}\\s*$`
  );
  for (const file of index.files) {
    for (const [position, raw] of file.lines.entries()) {
      const text = code(raw);
      if (text === "" || !pattern.test(text)) continue;
      return { path: file.path, line: position + 1, excerpt: text.trim() };
    }
  }
  return undefined;
}

type OpenDeclaration = Readonly<{ name: string; proof: Proof }>;

/**
 * An opening path has to be a function that takes an identifier-sized argument. Naming
 * it `open` is the convention the generator emits, and requiring a String parameter
 * keeps a zero-argument `open()` that opens something else out of the count.
 */
function openersOf(index: RepositoryIndex): readonly OpenDeclaration[] {
  const declaration = /\bfunc\s+(open[A-Za-z0-9_]*)\s*\(([^)]*)\)/;
  const takesAString = /:\s*String\b/;
  const found: OpenDeclaration[] = [];
  for (const file of index.files) {
    for (const [position, raw] of file.lines.entries()) {
      const text = code(raw);
      if (text === "") continue;
      const match = declaration.exec(text);
      if (match === null || !takesAString.test(match[2] ?? "")) continue;
      found.push({ name: match[1] as string, proof: { path: file.path, line: position + 1, excerpt: text.trim() } });
    }
  }
  return found;
}

function callPassing(index: RepositoryIndex, name: string, identifier: string): Proof | undefined {
  const call = new RegExp(`\\.${escapeForPattern(name)}\\s*\\([^)]*\\b${escapeForPattern(identifier)}\\b`);
  for (const file of index.files) {
    for (const [position, raw] of file.lines.entries()) {
      const text = code(raw);
      if (text === "" || !call.test(text)) continue;
      return { path: file.path, line: position + 1, excerpt: text.trim() };
    }
  }
  return undefined;
}

function escapeForPattern(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
