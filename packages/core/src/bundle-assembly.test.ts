import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/// What a finished bundle carries, and what it must not.
///
/// The failure is a resource that outlived its deletion: a strings table removed
/// from the sources, a pilot manifest that no longer exists, anything that
/// survives inside a bundle assembled before the deletion. Nobody opens a bundle
/// and counts its resources, so the only way this fails visibly is a test that
/// reads the bundle back and compares it to what the sources declare.
///
/// The assembler is exercised directly, in a temporary tree, so no Swift build
/// runs and the test costs milliseconds.
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const assemblerPath = resolve(scriptDirectory, "../../../apps/studio/Scripts/assemble-bundle.mjs");

/// The assembler's shape, declared here rather than imported: it lives in a
/// package this one does not depend on, and a structural type is what the test
/// actually relies on.
interface Assembler {
  assembleBundle(options: {
    bundle: string;
    binary: string;
    packageRoot: string;
    repository: string;
    launcher?: string;
  }): string;
  bundleResources(bundle: string): string[];
}

async function loadAssembler(): Promise<Assembler> {
  return import(`file://${assemblerPath}`);
}

let workspace: string;

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "intentlane-bundle-"));
  // The source tree the assembler reads: a binary, an Info.plist, the engine
  // bundle and the pilot manifests.
  mkdirSync(join(workspace, "package/Resources"), { recursive: true });
  mkdirSync(join(workspace, "repo/packages/cli/dist"), { recursive: true });
  mkdirSync(join(workspace, "repo/pilots/fsnotes"), { recursive: true });
  writeFileSync(join(workspace, "package/Resources/Info.plist"), "<plist/>");
  writeFileSync(join(workspace, "bin"), "binary");
  writeFileSync(join(workspace, "repo/packages/cli/dist/index.cjs"), "engine");
  writeFileSync(join(workspace, "repo/pilots/fsnotes/contract.yaml"), "contract");
});

afterEach(() => {
  if (workspace !== undefined) rmSync(workspace, { recursive: true, force: true });
});

function assemble(assembler: Assembler, overrides: Record<string, unknown> = {}): string {
  return assembler.assembleBundle({
    bundle: join(workspace, "IntentLaneStudio.app"),
    binary: join(workspace, "bin"),
    packageRoot: join(workspace, "package"),
    repository: join(workspace, "repo"),
    launcher: "#!/bin/sh\nexec node\n",
    ...overrides
  });
}

describe("the bundle carries what the sources declare, and nothing else", () => {
  it("assembles the engine, the pilot manifests and the plist", async () => {
    const assembler = await loadAssembler();
    const bundle = assemble(assembler);

    const resources = assembler.bundleResources(bundle);
    expect(resources).toContain("Info.plist");
    expect(resources).toContain("MacOS/IntentLaneStudio");
    expect(resources).toContain("Resources/engine/index.cjs");
    expect(resources).toContain("Resources/engine/run");
    expect(resources).toContain("Resources/pilots/fsnotes/contract.yaml");
  });

  it("carries no strings table, because the bundle declares no localization", async () => {
    const assembler = await loadAssembler();
    const bundle = assemble(assembler);
    const resources = assembler.bundleResources(bundle);

    // A `.lproj` in the bundle is a language the bundle would be speaking without
    // declaring, or declaring without speaking.
    expect(resources.filter((path: string) => path.endsWith(".lproj/Localizable.strings"))).toEqual([]);
    expect(existsSync(join(bundle, "Contents/Resources/en.lproj"))).toBe(false);
  });

  it("a resource deleted from the sources does not survive a rebuild", async () => {
    const assembler = await loadAssembler();

    // A first bundle that did carry a strings table, the state the repository was
    // in before the localization claim was withdrawn.
    const first = join(workspace, "first.app");
    const firstResources = join(first, "Contents/Resources/en.lproj");
    mkdirSync(firstResources, { recursive: true });
    writeFileSync(join(firstResources, "Localizable.strings"), '"Run" = "Run";');
    expect(assembler.bundleResources(first)).toContain("Resources/en.lproj/Localizable.strings");

    // The rebuilt bundle is assembled into a directory that does not exist, so
    // the deleted resource cannot be inherited from the one that had it.
    const bundle = assemble(assembler);
    expect(assembler.bundleResources(bundle)).not.toContain("Resources/en.lproj/Localizable.strings");
  });

  it("refuses to assemble into a directory that already exists", async () => {
    const assembler = await loadAssembler();
    const bundle = join(workspace, "IntentLaneStudio.app");
    assemble(assembler);

    // The second build into the same path would inherit whatever the first left,
    // which is the whole reason the shell script stages and swaps.
    expect(() => assemble(assembler)).toThrow(/already exists/);
  });

  it("a manifest removed from the pilots directory disappears from the bundle", async () => {
    const assembler = await loadAssembler();
    const bundle = assemble(assembler);
    expect(assembler.bundleResources(bundle)).toContain("Resources/pilots/fsnotes/contract.yaml");

    rmSync(join(workspace, "repo/pilots/fsnotes"), { recursive: true });
    const rebuilt = assemble(assembler, { bundle: join(workspace, "second.app") });
    expect(assembler.bundleResources(rebuilt)).not.toContain("Resources/pilots/fsnotes/contract.yaml");
  });

  it("the plist in the bundle is the one in the sources", async () => {
    const assembler = await loadAssembler();
    const bundle = assemble(assembler);
    const plist = readFileSync(join(bundle, "Contents/Info.plist"), "utf8");
    expect(plist).toBe(readFileSync(join(workspace, "package/Resources/Info.plist"), "utf8"));
  });
});

describe("the shell script stages and swaps rather than writing in place", () => {
  const scriptPath = resolve(scriptDirectory, "../../../apps/studio/Scripts/build-app.sh");

  it("never assembles directly into the bundle it is about to publish", () => {
    const script = readFileSync(scriptPath, "utf8");
    // `mkdir -p "$app/Contents/..."` is the old shape: it creates the final bundle
    // in place, so a failed build leaves a half-written one and a deleted
    // resource survives inside the next.
    expect(script).not.toMatch(/mkdir -p "\$app\/Contents/);
    expect(script).toContain("mktemp -d");
    expect(script).toContain('mv "$staging" "$app"');
  });

  it("runs the assembler rather than copying resources itself", () => {
    const script = readFileSync(scriptPath, "utf8");
    expect(script).toContain("assemble-bundle.mjs");
    // The engine and the manifests are the assembler's business; the script
    // copying them too is how the two lists start disagreeing.
    expect(script).not.toMatch(/cp -R "\$repo\/pilots/);
  });

  it("the assembler's shebang and node invocation exist in the repository", () => {
    expect(existsSync(assemblerPath)).toBe(true);
    expect(() => execFileSync("node", ["--check", assemblerPath])).not.toThrow();
  });
});
