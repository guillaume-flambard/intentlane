import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SDK_SETTINGS_FILE = "SDKSettings.json";

export type SdkInfo = Readonly<{
  path: string;
  version: string;
  canonicalName: string;
  name: string;
  defaultDeploymentTarget?: string;
  maximumDeploymentTarget?: string;
  targets: readonly string[];
}>;

export function compareVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export async function readSdkInfo(path: string): Promise<SdkInfo | undefined> {
  for (const candidate of [join(path, SDK_SETTINGS_FILE), path]) {
    try {
      const parsed = JSON.parse(await readFile(candidate, "utf8")) as Record<string, unknown>;
      const version = parsed.Version;
      const canonicalName = parsed.CanonicalName;
      if (typeof version !== "string" || typeof canonicalName !== "string") continue;
      const supported = parsed.SupportedTargets as Record<string, unknown> | undefined;
      return {
        path,
        version,
        canonicalName,
        name: typeof parsed.DisplayName === "string" ? parsed.DisplayName : canonicalName,
        ...(typeof parsed.DefaultDeploymentTarget === "string"
          ? { defaultDeploymentTarget: parsed.DefaultDeploymentTarget }
          : {}),
        ...(typeof parsed.MaximumDeploymentTarget === "string"
          ? { maximumDeploymentTarget: parsed.MaximumDeploymentTarget }
          : {}),
        targets: supported ? Object.keys(supported) : []
      };
    } catch {
      continue;
    }
  }
  return undefined;
}
