import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AUDIT_PROJECT_KINDS, discoverProjects, listProjectFiles, worktreeFingerprint } from "./audit-project.js";

async function fixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "intentlane-audit-"));
  await mkdir(join(root, "Sample.xcodeproj"), { recursive: true });
  await mkdir(join(root, "Sources", "App"), { recursive: true });
  await mkdir(join(root, "node_modules", "left-pad"), { recursive: true });
  await writeFile(join(root, "Package.swift"), "// swift-tools-version: 6.0\n", "utf8");
  await writeFile(join(root, "app.json"), "{}\n", "utf8");
  await writeFile(join(root, "Sources", "App", "App.swift"), "import SwiftUI\n", "utf8");
  await writeFile(join(root, "node_modules", "left-pad", "index.js"), "module.exports = 1;\n", "utf8");
  return root;
}

describe("audit project discovery", () => {
  it("publishes the supported project kinds", () => {
    expect([...AUDIT_PROJECT_KINDS]).toEqual(["xcode", "swift-package", "expo"]);
  });

  it("discovers every target and sorts them by path", async () => {
    const root = await fixture();
    expect(await discoverProjects(root)).toEqual([
      { kind: "swift-package", path: join(root, "Package.swift"), name: "Package" },
      { kind: "xcode", path: join(root, "Sample.xcodeproj"), name: "Sample" },
      { kind: "expo", path: join(root, "app.json"), name: "Expo" }
    ]);
  });

  it("lists files in code point order and skips ignored directories", async () => {
    const root = await fixture();
    expect(await listProjectFiles(root)).toEqual(["Package.swift", "Sources/App/App.swift", "app.json"]);
  });

  it("keeps the worktree fingerprint stable and unchanged by an audit", async () => {
    const root = await fixture();
    const before = await worktreeFingerprint(root);
    expect(await worktreeFingerprint(root)).toBe(before);

    await discoverProjects(root);
    await listProjectFiles(root);
    expect(await worktreeFingerprint(root)).toBe(before);

    await writeFile(join(root, "Sources", "App", "Extra.swift"), "import SwiftUI\n", "utf8");
    expect(await worktreeFingerprint(root)).not.toBe(before);
  });
});
