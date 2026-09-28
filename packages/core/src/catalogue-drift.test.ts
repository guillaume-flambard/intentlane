import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CAPABILITY_GROUPS } from "./audit-catalogue.js";
import { AUDIT_STATES } from "./audit.js";

/// The lists that exist in two languages, checked against the one that is
/// canonical.
///
/// The engine's `CAPABILITY_GROUPS` and `AUDIT_STATES` are the authority: they
/// classify what the engine emits. The Studio shell mirrors both so it can render
/// a report without calling the engine, and a mirror is exactly the thing that
/// drifts. Adding a group on the engine side used to leave the window naming nine
/// groups where the engine knows ten, with nothing failing.
///
/// The comparison is made against the real Swift source rather than a hand-copied
/// list, so the check keeps working when the mirror moves or is renamed, and it
/// reads the constants the engine actually exports rather than a transcription.
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const capabilityMapPath = resolve(repositoryRoot, "apps/studio/Sources/StudioCore/CapabilityMap.swift");

/// The string literals of one Swift static array, in source order.
///
/// The array is read from its `= [` assignment to the closing bracket, which is
/// enough for a literal list. Anchoring on the declaration alone would find the
/// bracket in the type annotation, `[String]`, and read nothing, so a test that
/// compares zero literals to ten would either fail on a mirror that is correct or
/// pass on one that is empty. Both outcomes are wrong, so the read asserts it
/// found something.
function swiftStringLiterals(source: string, declaration: string): string[] {
  const start = source.indexOf(declaration);
  expect(start, `CapabilityMap.swift no longer declares ${declaration}`).toBeGreaterThan(-1);
  const assignment = source.indexOf("= [", start);
  expect(assignment, `${declaration} no longer assigns a literal array`).toBeGreaterThan(-1);
  const open = assignment + 2;
  const close = source.indexOf("]", open);
  expect(close, `${declaration} has no closing bracket`).toBeGreaterThan(-1);
  return [...source.slice(open, close).matchAll(/"([^"]+)"/g)].map((match) => match[1]!);
}

describe("the shell's mirrors of the engine's lists", () => {
  const source = readFileSync(capabilityMapPath, "utf8");

  it("names the engine's capability groups, in the engine's order", () => {
    const mirrored = swiftStringLiterals(source, "catalogueGroups");

    expect(mirrored.length, "the mirror read as empty, so nothing was compared").toBeGreaterThan(0);
    expect(mirrored, "the window's groups have drifted from the engine's CAPABILITY_GROUPS").toEqual([
      ...CAPABILITY_GROUPS
    ]);
  });

  it("names the engine's states, in the engine's order", () => {
    const mirrored = swiftStringLiterals(source, "public static let states");

    expect(mirrored.length, "the mirror read as empty, so nothing was compared").toBeGreaterThan(0);
    expect(mirrored, "the window's states have drifted from the engine's AUDIT_STATES").toEqual([
      ...AUDIT_STATES
    ]);
  });

  it("renders every group the engine can report, and nothing else", () => {
    // The consequence rather than the wording: a finding whose group the window
    // does not know would be routed to `other` rather than shown under the group
    // the engine put it in.
    const mirrored = new Set(swiftStringLiterals(source, "catalogueGroups"));
    const unknown = [...CAPABILITY_GROUPS].filter((group) => !mirrored.has(group));
    expect(unknown, "the window would file these under other instead of their own group").toEqual([]);
  });
});

describe("the engine lists themselves", () => {
  it("declare no duplicate, so a group cannot be shadowed by itself", () => {
    expect(new Set(CAPABILITY_GROUPS).size, "CAPABILITY_GROUPS repeats a group").toBe(CAPABILITY_GROUPS.length);
    expect(new Set(AUDIT_STATES).size, "AUDIT_STATES repeats a state").toBe(AUDIT_STATES.length);
  });

  it("are the lists the rest of the engine reads", () => {
    // If either constant were ever declared in two places, this file's import
    // would silently read a copy while the classifier read the other.
    const catalogue = readFileSync(resolve(repositoryRoot, "packages/core/src/audit-catalogue.ts"), "utf8");
    const audit = readFileSync(resolve(repositoryRoot, "packages/core/src/audit.ts"), "utf8");
    const declarations = (text: string, name: string): number =>
      (text.match(new RegExp(`(?:export )?const ${name}\\s*=`, "g")) ?? []).length;

    expect(declarations(catalogue, "CAPABILITY_GROUPS"), "CAPABILITY_GROUPS is declared more than once").toBe(1);
    expect(declarations(audit, "AUDIT_STATES"), "AUDIT_STATES is declared more than once").toBe(1);
  });
});
