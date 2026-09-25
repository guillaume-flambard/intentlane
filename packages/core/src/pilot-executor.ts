export type BuildInvocation = Readonly<{
  command: string;
  args: readonly string[];
}>;

export type BuildOutcome = Readonly<{
  status: "pass" | "fail";
  exitCode: number;
  diagnostic: string;
  signature: string;
}>;

export type SandboxProfile = Readonly<{
  home: string;
  mediaDir: string;
  bundleId: string;
  env: Readonly<Record<string, string>>;
}>;

export const DEMO_BUNDLE_ID = "dev.intentlane.demo.iina";

export const SIGNING_POLICY = "host" as const;

export type BuildTarget = Readonly<{
  project: string;
  scheme: string;
  projectDirectory: string;
  configuration: string;
  artifact: string;
}>;

export const IINA_BUILD_TARGET: BuildTarget = {
  project: "iina.xcodeproj",
  scheme: "iina",
  projectDirectory: ".",
  configuration: "Debug",
  artifact: "IINA.app"
};

export const PILOT_BUILD_TARGETS: Readonly<Record<string, BuildTarget>> = {
  iina: IINA_BUILD_TARGET,
  fsnotes: {
    project: "FSNotes.xcodeproj",
    scheme: "FSNotes",
    projectDirectory: ".",
    configuration: "Debug",
    artifact: "FSNotes.app"
  },
  handbrake: {
    project: "HandBrake.xcodeproj",
    scheme: "HandBrake-Release-Sandbox",
    projectDirectory: "macosx",
    configuration: "release-sandbox",
    artifact: "HandBrake.app"
  }
};

export const PILOT_ADAPTER_DIRECTORIES: Readonly<Record<string, string>> = {
  iina: "iina/IntentLane",
  fsnotes: "FSNotes/IntentLane",
  handbrake: "macosx/IntentLane"
};

export function buildInvocation(
  repository: string,
  overrides: Readonly<Record<string, string>> = {},
  target: BuildTarget = IINA_BUILD_TARGET
): BuildInvocation {
  const prefix = target.projectDirectory === "." ? "" : `${target.projectDirectory}/`;
  return {
    command: "xcodebuild",
    args: [
      "build",
      "-project",
      `${repository}/${prefix}${target.project}`,
      "-scheme",
      target.scheme,
      "-configuration",
      target.configuration,
      "-derivedDataPath",
      `${repository}/.intentlane/derived`,
      ...Object.entries(overrides).map(([key, value]) => `${key}=${value}`)
    ]
  };
}

const ERROR_LINE = /^(.*?):(\d+):(\d+): (error|fatal error): (.*)$/;

function signatureOf(diagnostic: string): string {
  const line = diagnostic.split("\n").find((entry) => ERROR_LINE.test(entry.trim()));
  if (line === undefined) {
    return diagnostic.trim().slice(0, 120);
  }
  const match = ERROR_LINE.exec(line.trim());
  if (match === null) {
    return diagnostic.trim().slice(0, 120);
  }
  return `error: ${match[5] ?? ""}`.slice(0, 120);
}

export function parseBuildOutcome(exitCode: number, log: string): BuildOutcome {
  const lines = log.split("\n");
  const firstError = lines.find((entry) => ERROR_LINE.test(entry.trim()));
  const succeeded = exitCode === 0 && /BUILD SUCCEEDED/.test(log) && !/BUILD FAILED/.test(log);
  const diagnostic = succeeded
    ? "** BUILD SUCCEEDED **"
    : firstError?.trim() ?? lines.filter((entry) => entry.trim()).slice(-1)[0]?.trim() ?? `xcodebuild exited ${exitCode}`;
  return {
    status: succeeded ? "pass" : "fail",
    exitCode,
    diagnostic,
    signature: succeeded ? "" : signatureOf(diagnostic)
  };
}

export function sandboxProfile(runDirectory: string): SandboxProfile {
  return {
    home: `${runDirectory}/home`,
    mediaDir: `${runDirectory}/media`,
    bundleId: DEMO_BUNDLE_ID,
    env: {
      HOME: `${runDirectory}/home`,
      INTENTLANE_MEDIA_DIR: `${runDirectory}/media`
    }
  };
}

export type SigningChoice = Readonly<{
  CODE_SIGN_IDENTITY: string;
  DEVELOPMENT_TEAM?: string;
  CODE_SIGN_STYLE: string;
  CODE_SIGNING_REQUIRED: string;
  CODE_SIGNING_ALLOWED: string;
  assistantWillRefuse: boolean;
  warning?: string;
}>;

const TEAM = /\(([A-Z0-9]{10})\)/;

/**
 * The identity a build is signed with, chosen from what this machine actually has.
 *
 * The assistant's App Intents service rejects a client whose bundle it cannot validate,
 * and an ad-hoc signature is not a validated bundle: the service says
 * `Rejecting invalid client due to requiresValidatedBundle` and `Unable to get teamId`.
 * So a build that is going to be shown to a client has to carry a real team, and the
 * choice is made here rather than by whoever typed the build settings.
 */
export function resolveSigning(listing: readonly string[]): SigningChoice {
  const base = {
    CODE_SIGN_STYLE: "Manual",
    CODE_SIGNING_REQUIRED: "YES",
    CODE_SIGNING_ALLOWED: "YES"
  } as const;

  const macIdentities = listing.filter(
    (line) => /Developer ID Application|Mac Development/.test(line) && TEAM.test(line)
  );
  const developerId = macIdentities.find((line) => line.includes("Developer ID Application"));
  const chosen = developerId ?? macIdentities[0];

  if (chosen === undefined) {
    return {
      ...base,
      CODE_SIGN_IDENTITY: "-",
      assistantWillRefuse: true,
      warning:
        "No macOS signing identity was found on this machine, so the build is ad-hoc. The assistant will reject it and no App Intent will reach Siri, Spotlight or Shortcuts."
    };
  }

  const team = TEAM.exec(chosen)?.[1];
  return {
    ...base,
    CODE_SIGN_IDENTITY: developerId === undefined ? "Mac Development" : "Developer ID Application",
    ...(team === undefined ? {} : { DEVELOPMENT_TEAM: team }),
    assistantWillRefuse: false
  };
}

export function demoBundleId(pilot: string): string {
  return `dev.intentlane.demo.${pilot.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function demoBuildOverrides(pilot = "iina"): Readonly<Record<string, string>> {
  return {
    PRODUCT_BUNDLE_IDENTIFIER: demoBundleId(pilot),
    CODE_SIGN_IDENTITY: "-",
    CODE_SIGN_STYLE: "Manual",
    CODE_SIGNING_REQUIRED: "YES",
    CODE_SIGNING_ALLOWED: "YES"
  };
}
