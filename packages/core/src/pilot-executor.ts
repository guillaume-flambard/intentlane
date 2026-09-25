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

export function buildInvocation(
  repository: string,
  overrides: Readonly<Record<string, string>> = {}
): BuildInvocation {
  return {
    command: "xcodebuild",
    args: [
      "build",
      "-project",
      `${repository}/iina.xcodeproj`,
      "-scheme",
      "iina",
      "-configuration",
      "Debug",
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

export function demoBuildOverrides(): Readonly<Record<string, string>> {
  return {
    PRODUCT_BUNDLE_IDENTIFIER: DEMO_BUNDLE_ID,
    CODE_SIGN_IDENTITY: "-",
    CODE_SIGN_STYLE: "Manual",
    CODE_SIGNING_REQUIRED: "NO",
    CODE_SIGNING_ALLOWED: "NO"
  };
}
