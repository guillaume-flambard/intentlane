import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { CAPABILITY_CATALOGUE, availableOn } from "./audit-catalogue.js";
import { detectSources, detectedCapabilities, evidenceFor, hasSchemaEvidence } from "./audit-detect.js";
import { discoverProjects, listProjectFiles } from "./audit-project.js";
import { detectDataArchitecture } from "./audit-architecture.js";
import { describeConditions, type AuditEnvironment } from "./audit-conditions.js";
import { classifyData } from "./audit-data.js";
import { detectIntegrationRoute } from "./audit-route.js";
import { compareVersions, readSdkInfo } from "./audit-sdk.js";
import {
  createAuditReport,
  type AuditConfidence,
  type AuditEvidence,
  type AuditFinding,
  type AuditGap,
  type AuditPlatform,
  type AuditReport,
  type AuditState
} from "./audit.js";

const SOURCE_EXTENSIONS: readonly string[] = [".swift"];

export type AuditOptions = Readonly<{
  directory: string;
  platform: AuditPlatform;
  name?: string;
  deploymentTarget?: string;
  buildMetadata?: string;
  sdkPath?: string;
  environment?: AuditEnvironment;
}>;

const METADATA_FILE = "Metadata.appintents/extract.actionsdata";

async function readBuildMetadata(path: string): Promise<string | undefined> {
  for (const candidate of [path, join(path, "extract.actionsdata"), join(path, METADATA_FILE)]) {
    try {
      const info = await stat(candidate);
      if (!info.isFile()) continue;
      const parsed = JSON.parse(await readFile(candidate, "utf8")) as { actions?: Record<string, unknown> };
      if (parsed.actions && Object.keys(parsed.actions).length > 0) return candidate;
    } catch {
      continue;
    }
  }
  return undefined;
}

async function readSources(
  directory: string,
  files: readonly string[]
): Promise<readonly Readonly<{ path: string; contents: string }>[]> {
  const sources: { path: string; contents: string }[] = [];
  for (const file of files) {
    if (!SOURCE_EXTENSIONS.some((extension) => file.endsWith(extension))) continue;
    try {
      sources.push({ path: file, contents: await readFile(join(directory, file), "utf8") });
    } catch {
      continue;
    }
  }
  return sources;
}

export async function runAudit(options: AuditOptions): Promise<AuditReport> {
  const files = await listProjectFiles(options.directory);
  const sources = await readSources(options.directory, files);
  const detections = detectSources(sources);
  const detected = detectedCapabilities(detections);
  const schemaEvidence = hasSchemaEvidence(detections);
  const metadata = options.buildMetadata ? await readBuildMetadata(options.buildMetadata) : undefined;
  const sdk = options.sdkPath ? await readSdkInfo(options.sdkPath) : undefined;
  const route = detectIntegrationRoute(files, await discoverProjects(options.directory));
  const data = classifyData(files, sources);
  const architecture = detectDataArchitecture(files, sources);
  const conditions = describeConditions(options.environment);
  const findings: AuditFinding[] = [];

  for (const record of CAPABILITY_CATALOGUE) {
    const version = availableOn(record, options.platform);
    const sdkTooOld = version !== undefined && sdk !== undefined && compareVersions(version, sdk.version) > 0;
    const evidence: AuditEvidence[] = evidenceFor(detections, record.id).map((item) => ({
      kind: item.kind,
      path: item.path,
      line: item.line,
      platform: options.platform
    }));
    const gaps: AuditGap[] = [];
    let state: AuditState;
    let confidence: AuditConfidence;
    let nextAction: string;

    if (version === undefined) {
      state = "unsupported";
      confidence = "high";
      gaps.push({ code: "ILA100", message: `${record.id} is not available on ${options.platform}.` });
      nextAction = `Scope ${record.id} out of the ${options.platform} work.`;
    } else if (sdkTooOld && sdk !== undefined) {
      state = "unsupported";
      confidence = "high";
      gaps.push({
        code: "ILA160",
        message: `${record.id} requires ${options.platform} ${version}, and the SDK at ${sdk.path} is ${sdk.version}.`
      });
      nextAction = `Build against ${options.platform} ${version} or newer before relying on ${record.id}.`;
    } else {
      const missing = record.companions.filter((id) => !detected.has(id));
      if (detected.has(record.id)) {
        if (missing.length === 0) {
          state = "implemented";
          confidence = "high";
          nextAction = `Keep ${record.id} covered by tests and extracted metadata.`;
        } else {
          state = "detected";
          confidence = "high";
          gaps.push({ code: "ILA110", message: `${record.id} is declared without ${missing.join(", ")}.` });
          nextAction = `Implement ${missing.join(", ")} before relying on ${record.id}.`;
        }
      } else if (record.id === "proof.siri-surface" && schemaEvidence) {
        state = "detected";
        confidence = "medium";
        nextAction = "Record a manual Siri proof before claiming the journey.";
      } else if (record.id === "proof.siri-surface") {
        state = "unknown";
        confidence = "medium";
        gaps.push({
          code: "ILA140",
          message: "Shortcut-only evidence does not establish Siri or Apple Intelligence discovery."
        });
        nextAction = "Add schema-backed intents before claiming Siri discovery.";
      } else {
        state = "unknown";
        confidence = "low";
        nextAction = `No evidence for ${record.id} in this project.`;
      }
    }

    if (
      metadata !== undefined &&
      state === "implemented" &&
      (record.id.startsWith("foundation.") || record.id.startsWith("semantics."))
    ) {
      state = "tested";
      confidence = "high";
      evidence.push({ kind: "metadata", path: metadata, platform: options.platform });
      nextAction = `Metadata proves ${record.id} is registered. Live Siri execution stays unverified.`;
    }

    findings.push({
      capability: record.id,
      platform: options.platform,
      state,
      confidence,
      evidence,
      requirements: record.companions,
      gaps,
      nextAction
    });
  }

  return createAuditReport(
    {
      name: options.name ?? "Project",
      platform: options.platform,
      ...(options.deploymentTarget ? { deploymentTarget: options.deploymentTarget } : {})
    },
    findings,
    {
      ...(sdk ? { sdk: { version: sdk.version, canonicalName: sdk.canonicalName } } : {}),
      route,
      data,
      architecture,
      conditions
    }
  );
}
