import { describe, expect, it } from "vitest";
import {
  DEMO_BUNDLE_ID,
  SIGNING_POLICY,
  buildInvocation,
  demoBuildOverrides,
  parseBuildOutcome,
  sandboxProfile
} from "./pilot-executor.js";

describe("the reference build invocation", () => {
  it("builds the iina scheme, because that is the app target and not the plugin", () => {
    expect(buildInvocation("/tmp/iina").args).toContain("iina");
  });

  it("names the project file, because xcodebuild cannot infer it", () => {
    expect(buildInvocation("/tmp/iina").args).toContain("/tmp/iina/iina.xcodeproj");
  });

  it("keeps derived data inside the run directory, so a run leaves nothing outside its own space", () => {
    expect(buildInvocation("/tmp/iina").args.join(" ")).toContain("/tmp/iina/.intentlane");
  });

  it("has no model in the invocation, because generation and build are deterministic", () => {
    const joined = buildInvocation("/tmp/iina").args.join(" ");
    expect(joined).not.toMatch(/model|llm|claude|gpt|gemini/i);
  });

  it("builds for the host architecture rather than a pinned one, because a run on another machine should not fail on a slice that is not there", () => {
    expect(buildInvocation("/tmp/iina").args.join(" ")).not.toMatch(/ARCHS|arm64|x86_64/);
  });
});

describe("the signing policy", () => {
  it("is the host's, because an integration does not rewrite the distribution chain of the application it extends", () => {
    expect(SIGNING_POLICY).toBe("host");
  });

  it("gives the demo build its own bundle identifier, so it cannot replace the developer's own application", () => {
    expect(demoBuildOverrides().PRODUCT_BUNDLE_IDENTIFIER).toBe(DEMO_BUNDLE_ID);
  });

  it("does not claim a distribution identity, so a demo build asks for no certificate", () => {
    expect(demoBuildOverrides().CODE_SIGN_IDENTITY).toBe("-");
  });
});

describe("reading a build outcome", () => {
  it("is a pass when xcodebuild exits zero and says BUILD SUCCEEDED", () => {
    expect(parseBuildOutcome(0, "** BUILD SUCCEEDED **").status).toBe("pass");
  });

  it("is a fail when xcodebuild exits zero but the log says FAILED, because the two can disagree", () => {
    expect(parseBuildOutcome(0, "** BUILD FAILED **").status).toBe("fail");
  });

  it("is a fail on a non-zero exit even if the log looks clean", () => {
    expect(parseBuildOutcome(65, "** BUILD SUCCEEDED **").status).toBe("fail");
  });

  it("extracts the first compiler error, because that is what a human reads first", () => {
    const log = ["noise", "/a/b/File.swift:12:9: error: cannot find 'X' in scope", "more"].join("\n");
    expect(parseBuildOutcome(65, log).diagnostic).toContain("cannot find 'X' in scope");
  });

  it("keeps a signature short and stable, because the repair loop compares signatures across attempts", () => {
    const first = parseBuildOutcome(65, "/a/b/File.swift:12:9: error: cannot find 'X' in scope");
    const second = parseBuildOutcome(65, "/a/b/File.swift:99:4: error: cannot find 'X' in scope");
    expect(first.signature).toBe(second.signature);
  });

  it("gives the same error in two different files the same signature, because the repair loop must see one failure and not two", () => {
    const inPlayer = parseBuildOutcome(65, "/x/Player.swift:12:9: error: cannot find X in scope");
    const inOther = parseBuildOutcome(65, "/y/Other.swift:980:4: error: cannot find X in scope");
    expect(inPlayer.signature).toBe(inOther.signature);
  });

  it("gives two different errors different signatures, so a real change is visible", () => {
    const missing = parseBuildOutcome(65, "/x/Player.swift:12:9: error: cannot find X in scope");
    const operator = parseBuildOutcome(65, "/x/Player.swift:20:1: error: binary operator cannot be applied");
    expect(missing.signature).not.toBe(operator.signature);
  });

  it("drops the file and line from the signature, so moving a line is not mistaken for a fix", () => {
    const outcome = parseBuildOutcome(65, "/x/Player.swift:12:9: error: cannot find X in scope");
    expect(outcome.signature).not.toContain("Player.swift");
    expect(outcome.diagnostic).toContain("Player.swift");
  });

  it("still gives a signature when the log has no recognisable error, so the loop cannot be fooled into thinking it changed", () => {
    expect(parseBuildOutcome(2, "something went wrong").signature).toBeTruthy();
  });
});

describe("the sandbox profile", () => {
  it("gives the run its own HOME, so the application cannot touch the developer's defaults", () => {
    expect(sandboxProfile("/tmp/run").env.HOME).toBe("/tmp/run/home");
  });

  it("keeps a fake media directory, so the run can only see what it created", () => {
    expect(sandboxProfile("/tmp/run").mediaDir).toBe("/tmp/run/media");
  });

  it("derives a distinct bundle identifier, so the demo build does not replace the developer's app", () => {
    expect(sandboxProfile("/tmp/run").bundleId).not.toBe("com.colliderli.iina");
  });
});
