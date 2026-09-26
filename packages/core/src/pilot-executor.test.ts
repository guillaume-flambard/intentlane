import { describe, expect, it } from "vitest";
import {
  DEMO_BUNDLE_ID,
  SIGNING_POLICY,
  buildInvocation,
  demoBundleId,
  demoBuildOverrides,
  resolveSigning,
  PILOT_BUILD_TARGETS,
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

  it("applies a build setting override, because the demo build has to carry its own identity", () => {
    expect(buildInvocation("/tmp/iina", { PRODUCT_BUNDLE_IDENTIFIER: "dev.intentlane.demo.iina" }).args).toContain(
      "PRODUCT_BUNDLE_IDENTIFIER=dev.intentlane.demo.iina"
    );
  });

  it("applies the whole demo override set, so a demo build is not a half-measure", () => {
    const applied = buildInvocation("/tmp/iina", demoBuildOverrides()).args.join(" ");
    for (const [key, value] of Object.entries(demoBuildOverrides())) {
      expect(applied).toContain(`${key}=${value}`);
    }
  });

  it("adds no override when none is given, so the reference build stays the project's own", () => {
    expect(buildInvocation("/tmp/iina").args.join(" ")).not.toMatch(/PRODUCT_BUNDLE_IDENTIFIER/);
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

  it("signs the build rather than skipping signing, because a build with no signature carries the target's own identifier", () => {
    expect(demoBuildOverrides().CODE_SIGNING_ALLOWED).toBe("YES");
  });

  it("requires a signature, so the demo identifier reaches the signature and not IINA's name", () => {
    expect(demoBuildOverrides().CODE_SIGNING_REQUIRED).toBe("YES");
  });
});

describe("reading a build outcome", () => {
  it("is a pass when xcodebuild exits zero and says BUILD SUCCEEDED", () => {
    expect(parseBuildOutcome(0, "** BUILD SUCCEEDED **").status).toBe("pass");
  });

  it("reports the success marker as its diagnostic, because the last line of a passing build is noise", () => {
    const log = "** BUILD SUCCEEDED **\n{ platform:macOS, name:Any Mac }";
    expect(parseBuildOutcome(0, log).diagnostic).toBe("** BUILD SUCCEEDED **");
  });

  it("has no failure signature when it passed, because there is no failure to compare", () => {
    expect(parseBuildOutcome(0, "** BUILD SUCCEEDED **").signature).toBe("");
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

  it("reads a project-level error, because a build that fails on signing never names a line or a column", () => {
    const log = [
      "{ platform:macOS, name:Any Mac }",
      "/a/FSNotes.xcodeproj: error: Signing for \"FSNotes\" requires selecting either a development team or a provisioning profile",
      "** BUILD FAILED **",
      "(1 failure)"
    ].join("\n");
    const outcome = parseBuildOutcome(65, log);
    expect(outcome.diagnostic).toContain("requires selecting either a development team");
    expect(outcome.signature).toContain("requires selecting either a development team");
  });

  it("still prefers a compiler error, because the first thing a human reads is the file that failed", () => {
    const log = [
      "/a/FSNotes.xcodeproj: error: Signing for \"FSNotes\" requires a development team",
      "/a/File.swift:12:9: error: cannot find 'X' in scope"
    ].join("\n");
    expect(parseBuildOutcome(65, log).diagnostic).toContain("cannot find 'X' in scope");
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

describe("choosing the build target of a pilot", () => {
  it("names IINA's project and scheme, because those are IINA's", () => {
    expect(buildInvocation("/tmp/iina", {}, PILOT_BUILD_TARGETS.iina).args).toContain("/tmp/iina/iina.xcodeproj");
  });

  it("names FSNotes' own project, because a run must not build IINA for a notebook pilot", () => {
    expect(buildInvocation("/tmp/fs", {}, PILOT_BUILD_TARGETS.fsnotes).args).toContain("/tmp/fs/FSNotes.xcodeproj");
  });

  it("looks inside the macosx directory for HandBrake, because that is where its project lives", () => {
    expect(buildInvocation("/tmp/hb", {}, PILOT_BUILD_TARGETS.handbrake).args).toContain("/tmp/hb/macosx/HandBrake.xcodeproj");
  });

  it("gives every pilot a target, so the command never silently builds the wrong application", () => {
    expect(Object.keys(PILOT_BUILD_TARGETS).sort()).toEqual(["fsnotes", "handbrake", "iina"]);
  });

  it("defaults to IINA when no target is named, so the reference invocation stays the one already proven", () => {
    expect(buildInvocation("/tmp/iina").args).toContain("/tmp/iina/iina.xcodeproj");
  });
});

describe("the demo identity of a pilot", () => {
  it("is derived from the pilot, because a notebook demo must not carry a video player's identity", () => {
    expect(demoBundleId("fsnotes")).toBe("dev.intentlane.demo.fsnotes");
  });

  it("is IINA's for IINA, which is the one already proven against a real build", () => {
    expect(demoBundleId("iina")).toBe(DEMO_BUNDLE_ID);
  });

  it("collapses a name to something an identifier accepts", () => {
    expect(demoBundleId("HandBrake")).toBe("dev.intentlane.demo.handbrake");
  });

  it("is what the build override applies, not a constant beside it", () => {
    expect(demoBuildOverrides("fsnotes").PRODUCT_BUNDLE_IDENTIFIER).toBe("dev.intentlane.demo.fsnotes");
  });

  it("defaults to IINA when no pilot is named", () => {
    expect(demoBuildOverrides().PRODUCT_BUNDLE_IDENTIFIER).toBe(DEMO_BUNDLE_ID);
  });
});

describe("choosing a signing identity", () => {
  const listing = [
    '  1) C1D1 "Apple Development: Guillaume Flambard (MB4Z3WNGFF)"',
    '  2) C49C "Developer ID Application: Guillaume Flambard (Q52VN4UT34)"',
    "     2 valid identities found."
  ];
  const none = ["     0 valid identities found."];
  const macOnly = ['  1) C1D1 "Mac Development: Someone (ABCDE12345)"', "  1 valid identities found."];
  const iosOnly = ['  1) C1D1 "Apple Development: Someone (MB4Z3WNGFF)"', "  1 valid identities found."];

  it("prefers a Developer ID identity, because that is the one the assistant accepts", () => {
    expect(resolveSigning(listing).CODE_SIGN_IDENTITY).toBe("Developer ID Application");
  });

  it("carries the team of the identity it chose, because a bundle with no team is refused", () => {
    expect(resolveSigning(listing).DEVELOPMENT_TEAM).toBe("Q52VN4UT34");
  });

  it("falls back to a Mac Development identity when there is no Developer ID", () => {
    expect(resolveSigning(macOnly).DEVELOPMENT_TEAM).toBe("ABCDE12345");
  });

  it("falls back to ad-hoc when the machine has no identity, so a run still produces an application", () => {
    expect(resolveSigning(none).CODE_SIGN_IDENTITY).toBe("-");
  });

  it("says the assistant will refuse an ad-hoc build, so a run does not discover it the hard way", () => {
    expect(resolveSigning(none).warning).toContain("ad-hoc");
  });

  it("warns about nothing when a real identity was found", () => {
    expect(resolveSigning(listing).warning).toBeUndefined();
  });

  it("does not use an iOS-only development certificate for a macOS build, because it cannot sign one", () => {
    expect(resolveSigning(iosOnly).CODE_SIGN_IDENTITY).toBe("-");
  });

  it("still signs ad-hoc in the fallback, because an unsigned build is worse than an unvalidated one", () => {
    expect(resolveSigning(none).CODE_SIGNING_ALLOWED).toBe("YES");
  });

  it("tells the operator the assistant will refuse the ad-hoc build, because a demo of the voice surface is the point", () => {
    expect(resolveSigning(none).assistantWillRefuse).toBe(true);
  });

  it("does not claim the assistant will refuse a team-signed build", () => {
    expect(resolveSigning(listing).assistantWillRefuse).toBe(false);
  });
});

