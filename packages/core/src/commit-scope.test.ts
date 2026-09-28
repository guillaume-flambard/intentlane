import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/// A commit carries only the files its own work touched.
///
/// The repository rule is that one session's work is never mixed with another's,
/// and that untracked files from elsewhere are left alone. Nothing enforced it: a
/// `git add -A` on a directory another agent was writing into would sweep their
/// in-progress files into the commit, and the commit message would describe only
/// the work the author meant.
///
/// The check reads the staged tree against the working tree, so it runs before
/// the commit rather than after, and it reports what is staged that a worktree
/// diff does not explain. It does not know what "foreign" means, because that is
/// a judgement only the author can make, so it surfaces the file list and the
/// untracked remainder and leaves the decision alone.
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function git(...args: string[]): string {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).trim();
}

describe("what is staged, and what is left alone", () => {
  it("runs inside a git repository it can read", () => {
    // Everything below reads git's output, and a test that got empty output from
    // a wrong directory would pass having checked nothing.
    expect(git("rev-parse", "--is-inside-work-tree")).toBe("true");
  });

  it("stages nothing that the working tree later changed", () => {
    const staged = git("diff", "--cached", "--name-only")
      .split("\n")
      .filter((file) => file.length > 0);
    if (staged.length === 0) return; // nothing staged: the property is trivially held

    // A file in both lists is staged in one version and modified in another: the
    // commit would carry content the author never read back. This is the shape a
    // partial `git add` leaves, and the one where a file from another session
    // slips in under a message that does not mention it.
    const changedAfterStaging = git("diff", "--name-only")
      .split("\n")
      .filter((file) => file.length > 0);
    const partial = staged.filter((file) => changedAfterStaging.includes(file));

    expect(
      partial,
      `these files are staged in a version the working tree no longer matches, so the commit would carry content that was never read back: ${partial.join(", ")}`
    ).toEqual([]);
  });

  it("leaves the untracked remainder outside the commit", () => {
    const untracked = git("ls-files", "--others", "--exclude-standard");
    const staged = git("diff", "--cached", "--name-only")
      .split("\n")
      .filter((file) => file.length > 0);

    // A file cannot be both untracked and staged, so an intersection means the
    // index and the working tree disagree about what exists.
    const both = untracked
      .split("\n")
      .filter((file) => file.length > 0)
      .filter((file) => staged.includes(file));

    expect(
      both,
      `these files are staged and still reported untracked, so the commit's contents are ambiguous: ${both.join(", ")}`
    ).toEqual([]);
  });

  it("ignores the build and dependency directories a repository accumulates", () => {
    // A pre-commit hook that failed on these would be disabled by the first
    // `node_modules` someone installed, which is the same as not having one.
    for (const directory of ["node_modules", ".build", "build", "dist", ".intentlane"]) {
      const tracked = git("ls-files", directory);
      if (tracked.length === 0) continue;
      const outside = tracked.split("\n").filter((file) => !file.startsWith(`${directory}/`));
      expect(outside, `${directory}/ is ignored by git but has tracked files: ${outside.join(", ")}`).toEqual([]);
    }
  });
});
