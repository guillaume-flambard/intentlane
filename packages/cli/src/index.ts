#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import { parse } from "yaml";
import { collectDoctorChecks, compareMetadataToContract, defaultClaimSet, deriveScaffoldDefaults, evaluateReleaseVerification, parseConfigFile, parsePilotManifest, PILOT_CLAIMS, scaffoldConfig, validatePilotLedger, type ConfigIR, type Diagnostic, type DoctorFacts, type GateStatus, type ObservedStatus, type PilotClaimId, type PilotLedgerResult, type PilotManifest } from "../../core/src/index.js";
import { ADAPTER_TEMPLATE_FILE, GENERATED_SWIFT_FILE, generateAdapterTemplate, generateArtifacts, generatedFileHash, type GeneratedArtifact } from "../../generator-apple/src/index.js";
import { analyseDiscovery, applyAnalyse, applyImplement, applyPrepare, applyTest, evaluateImplement, evaluateTest, resolveSigning, PILOT_ADAPTER_DIRECTORIES, PILOT_BUILD_TARGETS, buildInvocation, discover, indexRepository, demoBuildOverrides, parseBuildOutcome, parsePilotRunJournal, planRun, retargetJournal, startRunJournal, type PilotRunJournal, type PrepareResult } from "../../core/src/index.js";
import { compareCatalogueWithSdk, driftIsComplete, readSdkSymbolIndex } from "../../core/src/audit-drift.js";
import { formatObservations, runObservations } from "../../core/src/index.js";
import { AUDIT_FORMATS, AUDIT_PLATFORM_SELECTIONS, AuditDiffError, SDK_SETTINGS_FILE, blockingGaps, diffAuditDocuments, formatDeltaJson, formatDeltaText, formatReport, formatReports, runAudit, type AuditFormat, type AuditPlatform, type AuditReport } from "../../core/src/index.js";

const configPath = (value: string): string => resolve(value);
const diagnosticsText = (diagnostics: readonly Diagnostic[]): string => diagnostics.map((item) => `${item.severity.toUpperCase()} ${item.code} ${item.path}: ${item.message}`).join("\n");

async function load(file: string) {
  const result = await parseConfigFile(configPath(file));
  if (result.diagnostics.length > 0) process.stderr.write(`${diagnosticsText(result.diagnostics)}\n`);
  if (!result.ir) process.exitCode = 1;
  return result.ir;
}

async function atomicWrite(file: string, contents: string): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, contents, "utf8");
  await rename(temporary, file);
}

async function modifiedFiles(
  output: string,
  expected: readonly Readonly<{ file: string; contents: string }>[],
  stored: readonly string[]
): Promise<readonly string[]> {
  try {
    const manifest = JSON.parse(await readFile(join(output, MANIFEST_FILE), "utf8")) as {
      files?: readonly { path?: string; hash?: string }[];
    };
    const recorded = new Map((manifest.files ?? []).map((entry) => [entry.path, entry.hash]));
    return expected
      .map((item, index) => ({ path: relative(output, item.file), contents: stored[index] ?? "" }))
      .filter((entry) => {
        const hash = recorded.get(entry.path);
        return hash !== undefined && hash !== generatedFileHash(entry.contents);
      })
      .map((entry) => entry.path);
  } catch {
    return [];
  }
}

async function isPluginDeclared(): Promise<boolean> {
  try {
    const manifest = JSON.parse(await readFile(resolve("package.json"), "utf8")) as Record<string, Record<string, unknown> | undefined>;
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    if (Object.keys(dependencies).includes("@intentlane/expo")) return true;
  } catch {
  }
  for (const candidate of ["app.json", "app.config.js", "app.config.ts", "app.config.mjs"]) {
    const file = resolve(candidate);
    if (existsSync(file) && readFileSync(file, "utf8").includes("intentlane")) return true;
  }
  return false;
}

function commandAvailable(command: string): boolean {
  return spawnSync(command, ["--version"], { stdio: "ignore" }).status === 0;
}

function environmentFacts(): {
  osVersion?: string;
  xcodeVersion?: string;
  architecture?: string;
  locale?: string;
  region?: string;
} {
  const facts: {
    osVersion?: string;
    xcodeVersion?: string;
    architecture?: string;
    locale?: string;
    region?: string;
  } = { architecture: process.arch };
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  if (locale.length > 0) {
    facts.locale = locale;
    const region = locale.split("-")[1];
    if (region !== undefined) facts.region = region;
  }
  if (process.platform === "darwin") {
    const version = spawnSync("sw_vers", ["-productVersion"], { encoding: "utf8" });
    const osVersion = version.status === 0 ? version.stdout.trim() : "";
    if (osVersion.length > 0) facts.osVersion = osVersion;
    const xcode = spawnSync("xcodebuild", ["-version"], { encoding: "utf8" });
    const xcodeVersion = xcode.status === 0 ? xcode.stdout.trim().split("\n").pop()?.replace("Build version ", "") ?? "" : "";
    if (xcodeVersion.length > 0) facts.xcodeVersion = xcodeVersion;
  }
  return facts;
}

const MANIFEST_FILE = "intentlane.manifest.json";

type ArtifactSet = Readonly<{ files: readonly GeneratedArtifact[]; manifest: string }>;

async function inputHash(configFile: string): Promise<string> {
  return createHash("sha256").update(await readFile(configFile)).digest("hex");
}

function artifactSet(ir: ConfigIR, hash: string): ArtifactSet {
  const files = generateArtifacts(ir);
  const manifest = `${JSON.stringify({ version: ir.schemaVersion, minIos: ir.app.minIos, inputHash: hash, files: files.map((file) => ({ path: file.path, hash: generatedFileHash(file.contents) })) }, null, 2)}\n`;
  return { files, manifest };
}

function expectedOutputs(output: string, set: ArtifactSet): readonly Readonly<{ file: string; contents: string }>[] {
  return [...set.files.map((file) => ({ file: join(output, file.path), contents: file.contents })), { file: join(output, MANIFEST_FILE), contents: set.manifest }];
}

async function generatedStatus(configFile: string, ir: ConfigIR | undefined, output: string): Promise<DoctorFacts["generatedStatus"]> {
  if (!ir) return "missing";
  const expected = expectedOutputs(output, artifactSet(ir, await inputHash(configFile)));
  if (expected.some((item) => !existsSync(item.file))) return "missing";
  try {
    const stored = await Promise.all(expected.map((item) => readFile(item.file, "utf8")));
    return stored.every((contents, index) => contents === expected[index]?.contents) ? "fresh" : "stale";
  } catch {
    return "stale";
  }
}

async function doctorFacts(config: string, output: string): Promise<DoctorFacts> {
  const exists = existsSync(config);
  let diagnostics: Diagnostic[] = [];
  let schemaVersion: string | undefined;
  let intentCount: number | undefined;
  let ir: ConfigIR | undefined;
  if (exists) {
    try {
      const result = await parseConfigFile(config);
      diagnostics = [...result.diagnostics];
      ir = result.ir;
      schemaVersion = result.ir?.schemaVersion;
      intentCount = result.ir?.intents.length;
    } catch (reason) {
      diagnostics = [{ code: "IL1001", severity: "error", message: reason instanceof Error ? reason.message : "Unable to read configuration.", path: config }];
    }
  }
  return {
    nodeVersion: process.version,
    configFile: config,
    configExists: exists,
    diagnostics,
    ...(schemaVersion ? { schemaVersion } : {}),
    ...(intentCount === undefined ? {} : { intentCount }),
    generatedStatus: await generatedStatus(config, ir, output),
    platform: process.platform,
    xcrunAvailable: process.platform === "darwin" ? commandAvailable("xcrun") : false,
    swiftcAvailable: process.platform === "darwin" ? commandAvailable("swiftc") : false,
    pluginDeclared: await isPluginDeclared()
  };
}

const program = new Command();
program.version("0.1.0");
program.name("intentlane").description("IntentLane deterministic App Intents compiler");

program.command("init")
  .option("-c, --config <file>", "IntentLane YAML file", "intentlane.yaml")
  .option("--app-id <id>", "Bundle identifier")
  .option("--app-name <name>", "Application display name")
  .option("--url-scheme <scheme>", "Deep link URL scheme")
  .option("-f, --force", "Overwrite an existing configuration")
  .action(async (options: { config: string; appId?: string; appName?: string; urlScheme?: string; force?: boolean }) => {
    const file = configPath(options.config);
    if (existsSync(file) && !options.force) {
      process.stderr.write(`${file} already exists. Re-run with --force to overwrite.\n`);
      process.exitCode = 1;
      return;
    }
    const defaults = deriveScaffoldDefaults({ directoryName: basename(process.cwd()), ...(options.appName ? { packageName: options.appName } : {}) });
    const contents = scaffoldConfig({ appId: options.appId ?? defaults.appId, appName: options.appName ?? defaults.appName, urlScheme: options.urlScheme ?? defaults.urlScheme });
    await atomicWrite(file, contents);
    process.stdout.write(`Created ${file}\nNext: intentlane validate && intentlane generate\n`);
  });

program.command("doctor")
  .option("-c, --config <file>", "IntentLane YAML file", "intentlane.yaml")
  .option("-o, --output <directory>", "Generated source directory", "ios/IntentLaneGenerated")
  .action(async (options: { config: string; output: string }) => {
    const checks = collectDoctorChecks(await doctorFacts(configPath(options.config), resolve(options.output)));
    for (const check of checks) {
      process.stdout.write(`${check.status === "ok" ? "ok" : check.status === "warning" ? "warn" : "fail"}  ${check.id}: ${check.message}\n`);
      if (check.hint) process.stdout.write(`      hint: ${check.hint}\n`);
    }
    if (checks.some((check) => check.status === "error")) process.exitCode = 1;
  });

program.command("validate")
  .option("-c, --config <file>", "IntentLane YAML file", "intentlane.yaml")
  .action(async (options: { config: string }) => {
    const ir = await load(options.config);
    if (ir) process.stdout.write(`Valid IntentLane ${ir.schemaVersion}: ${ir.intents.length} intent(s) ready.\n`);
  });

program.command("generate")
  .option("-c, --config <file>", "IntentLane YAML file", "intentlane.yaml")
  .option("-o, --output <directory>", "Generated source directory", "ios/IntentLaneGenerated")
  .option("--adapter-output <file>", "Write a customer-owned App Intents adapter template")
  .option("--overwrite-adapter", "Allow replacement of an existing adapter template")
  .option("--check", "Fail if generated files are stale")
  .action(async (options: { config: string; output: string; adapterOutput?: string; overwriteAdapter?: boolean; check?: boolean }) => {
    const config = configPath(options.config);
    const ir = await load(config);
    if (!ir) return;
    const output = resolve(options.output);
    const expected = expectedOutputs(output, artifactSet(ir, await inputHash(config)));
    if (options.check) {
      if (expected.some((item) => !existsSync(item.file))) {
        process.stderr.write(`Generated files are missing in ${output}. Run 'intentlane generate'.\n`);
        process.exitCode = 1;
        return;
      }
      let stored: readonly string[];
      try {
        stored = await Promise.all(expected.map((item) => readFile(item.file, "utf8")));
      } catch (reason) {
        process.stderr.write(`Unable to read generated files in ${output}: ${reason instanceof Error ? reason.message : "unknown error"}\n`);
        process.exitCode = 1;
        return;
      }
      if (!stored.every((contents, index) => contents === expected[index]?.contents)) {
        const edited = await modifiedFiles(output, expected, stored);
        if (edited.length > 0) {
          for (const file of edited) {
            process.stderr.write(`ERROR IL1701 ${file}: generated file was modified after generation. Restore it or run 'intentlane generate'.\n`);
          }
          process.exitCode = 1;
          return;
        }
        process.stderr.write(`Generated files are stale. Run 'intentlane generate'.\n`);
        process.exitCode = 1;
      }
      return;
    }
    for (const item of expected) await atomicWrite(item.file, item.contents);
    if (options.adapterOutput) {
      const adapter = resolve(options.adapterOutput);
      if (existsSync(adapter) && !options.overwriteAdapter) {
        process.stderr.write(`${adapter} already exists. IntentLane will not overwrite application-owned mapping code; use --overwrite-adapter to replace the template.\n`);
        process.exitCode = 1;
        return;
      }
      await atomicWrite(adapter, generateAdapterTemplate(ir));
      process.stdout.write(`Created ${adapter}\n`);
    }
    process.stdout.write(`Generated ${join(output, GENERATED_SWIFT_FILE)}\n`);
  });

program.command("audit")
  .argument("[directory]", "Project directory to audit", ".")
  .option("-p, --platform <platform>", "Target platform", "macos")
  .option("-f, --format <format>", "Report format", "text")
  .option("-o, --output <file>", "Write the report to a file")
  .option("--min-macos <version>", "macOS deployment floor to record")
  .option("--min-ios <version>", "iOS deployment floor to record")
  .option("--sdk-path <path>", "SDK path to inspect")
  .option("--build-metadata <path>", "Existing build metadata to inspect")
  .option("--strict", "Exit non-zero on high-confidence blockers")
  .action(async (directory: string, options: { platform: string; format: string; output?: string; minMacos?: string; minIos?: string; sdkPath?: string; buildMetadata?: string; strict?: boolean }) => {
    if (!(AUDIT_PLATFORM_SELECTIONS as readonly string[]).includes(options.platform)) {
      process.stderr.write(`Unsupported platform '${options.platform}'. Use one of: ${AUDIT_PLATFORM_SELECTIONS.join(", ")}.\n`);
      process.exitCode = 1;
      return;
    }
    if (!(AUDIT_FORMATS as readonly string[]).includes(options.format)) {
      process.stderr.write(`Unsupported format '${options.format}'. Use one of: ${AUDIT_FORMATS.join(", ")}.\n`);
      process.exitCode = 1;
      return;
    }
    const target = resolve(directory);
    if (!existsSync(target) || !statSync(target).isDirectory()) {
      process.stderr.write(`No directory to audit at ${target}.\n`);
      process.exitCode = 1;
      return;
    }
    const platforms: readonly AuditPlatform[] =
      options.platform === "both" ? ["macos", "ios"] : [options.platform as AuditPlatform];
    const reports: AuditReport[] = [];
    for (const platform of platforms) {
      const deploymentTarget = platform === "macos" ? options.minMacos : options.minIos;
      const report = await runAudit({
        directory: resolve(directory),
        platform,
        ...(deploymentTarget ? { deploymentTarget } : {}),
        ...(options.buildMetadata ? { buildMetadata: resolve(options.buildMetadata) } : {}),
        ...(options.sdkPath ? { sdkPath: resolve(options.sdkPath) } : {}),
        environment: environmentFacts()
      });
      if (options.sdkPath !== undefined && report.sdk === undefined) {
        process.stderr.write(
          `warning: no ${SDK_SETTINGS_FILE} under ${resolve(options.sdkPath)}, so the SDK version is not recorded.\n`
        );
      }
      reports.push(report);
    }
    const first = reports[0];
    const rendered =
      reports.length === 1 && first
        ? formatReport(first, options.format as AuditFormat)
        : formatReports(reports, options.format as AuditFormat);
    if (options.output) {
      await atomicWrite(resolve(options.output), rendered);
      process.stdout.write(`Wrote ${resolve(options.output)}\n`);
    } else {
      process.stdout.write(rendered);
    }
    if (options.strict) {
      const blockers = reports.flatMap((report) => blockingGaps(report));
      if (blockers.length > 0) {
        for (const gap of blockers) process.stderr.write(`${gap.code} ${gap.message}\n`);
        process.exitCode = 1;
      }
      // A strict audit also claims the catalogue holds against an installed SDK.
      // That claim is evidence, so a read which established nothing must fail
      // rather than pass quietly: an unreadable framework is not a resolved
      // symbol, and a partial read is not a refuted one. The read states are the
      // vocabulary of the SDK, not of the audit, so the audit diagnostic codes
      // are left alone.
      if (options.sdkPath === undefined) {
        process.stderr.write(
          "catalogue-sdk-evidence no-sdk-path: --strict verifies the capability catalogue against an installed SDK, and no --sdk-path was given, so no evidence was established.\n"
        );
        process.exitCode = 1;
      } else {
        const drift = compareCatalogueWithSdk(await readSdkSymbolIndex(resolve(options.sdkPath)));
        for (const read of drift.reads) {
          if (read.state === "complete") continue;
          process.stderr.write(`catalogue-sdk-evidence ${read.state} ${read.framework}: ${read.reason}\n`);
          process.exitCode = 1;
        }
        for (const finding of drift.unresolvedEvidence) {
          process.stderr.write(
            `catalogue-sdk-evidence ${finding.kind} ${finding.framework} ${finding.symbol}: ${finding.detail}\n`
          );
          process.exitCode = 1;
        }
        if (driftIsComplete(drift) && drift.unresolvedEvidence.length === 0) {
          process.stderr.write(
            `catalogue-sdk-evidence complete: the catalogue ${drift.catalogueVersion} is established against the SDK (${drift.variant}), ${drift.reads.length} frameworks read, ${drift.gaps.length} public symbols to examine.\n`
          );
        }
      }
    }
  });

program.command("observe")
  .argument("<manifest>", "Observation probe manifest to run")
  .option("-o, --output <file>", "Write the report to a file")
  .option("--format <format>", "Report format", "text")
  .action(async (manifestPath: string, options: { output?: string; format: string }) => {
    const path = resolve(manifestPath);
    if (!existsSync(path)) {
      process.stderr.write(`No observation manifest at ${path}.\n`);
      process.exitCode = 1;
      return;
    }
    let parsed: unknown;
    try {
      parsed = parse(readFileSync(path, "utf8"));
    } catch (error) {
      process.stderr.write(`Could not read ${path} as YAML: ${(error as Error).message}\n`);
      process.exitCode = 1;
      return;
    }
    let report: Awaited<ReturnType<typeof runObservations>>;
    try {
      report = await runObservations(parsed);
    } catch (error) {
      process.stderr.write(`${path} is not a valid observation manifest: ${(error as Error).message}\n`);
      process.exitCode = 1;
      return;
    }
    const rendered = options.format === "json" ? `${JSON.stringify(report, null, 2)}\n` : formatObservations(report);
    if (options.output) {
      await atomicWrite(resolve(options.output), rendered);
      process.stdout.write(`Wrote ${resolve(options.output)}\n`);
    } else {
      process.stdout.write(rendered);
    }
    if (report.unobserved.length > 0) {
      process.stderr.write(`no observation was recorded for: ${report.unobserved.join(", ")}\n`);
      process.exitCode = 1;
    }
  });

program.command("audit-diff")
  .argument("<baseline>", "Baseline audit JSON produced by 'intentlane audit --format json'")
  .argument("<candidate>", "Candidate audit JSON produced by 'intentlane audit --format json'")
  .option("-f, --format <format>", "Delta format", "text")
  .option("-o, --output <file>", "Write the delta to a file")
  .option("--fail-on <kind>", "Exit non-zero when the delta holds the kind")
  .action(async (baseline: string, candidate: string, options: { format: string; output?: string; failOn?: string }) => {
    if (options.format !== "text" && options.format !== "json") {
      process.stderr.write(`Unsupported format '${options.format}'. Use one of: text, json.\n`);
      process.exitCode = 1;
      return;
    }
    if (options.failOn !== undefined && options.failOn !== "regression") {
      process.stderr.write(`Unsupported --fail-on '${options.failOn}'. Use: regression.\n`);
      process.exitCode = 1;
      return;
    }
    let baselineText: string;
    let candidateText: string;
    try {
      baselineText = await readFile(resolve(baseline), "utf8");
      candidateText = await readFile(resolve(candidate), "utf8");
    } catch (reason) {
      process.stderr.write(`Unable to read the audit files: ${reason instanceof Error ? reason.message : "unknown error"}\n`);
      process.exitCode = 1;
      return;
    }
    let rendered: string;
    let regressions = 0;
    try {
      const delta = diffAuditDocuments(baselineText, candidateText);
      rendered = options.format === "json" ? formatDeltaJson(delta) : formatDeltaText(delta);
      regressions = delta.regressions;
    } catch (reason) {
      if (reason instanceof AuditDiffError) process.stderr.write(`${reason.message}\n`);
      else process.stderr.write(`${reason instanceof Error ? reason.message : String(reason)}\n`);
      process.exitCode = 1;
      return;
    }
    if (options.output) {
      await atomicWrite(resolve(options.output), rendered);
      process.stdout.write(`Wrote ${resolve(options.output)}\n`);
    } else {
      process.stdout.write(rendered);
    }
    if (options.failOn === "regression" && regressions > 0) {
      process.stderr.write(`${regressions} regression(s) found between the baseline and the candidate.\n`);
      process.exitCode = 1;
    }
  });

const evidence = program.command("evidence").description("Validate pilot evidence");

evidence.command("validate <ledger>")
  .option("-f, --format <format>", "Output format", "text")
  .option("--strict", "Exit non-zero when the ledger is unverified")
  .action(async (ledger: string, options: { format: string; strict?: boolean }) => {
    if (options.format !== "text" && options.format !== "json") {
      process.stderr.write(`Unsupported format '${options.format}'. Use one of: text, json.\n`);
      process.exitCode = 1;
      return;
    }
    const file = resolve(ledger);
    let source: string;
    try {
      source = await readFile(file, "utf8");
    } catch (reason) {
      process.stderr.write(`Unable to read ledger ${file}: ${reason instanceof Error ? reason.message : "unknown error"}\n`);
      process.exitCode = 1;
      return;
    }
    let value: unknown;
    try {
      value = parse(source) as unknown;
    } catch (reason) {
      process.stderr.write(`ILA173 root: ${file} is not valid YAML: ${reason instanceof Error ? reason.message : "unknown error"}\n`);
      process.exitCode = 1;
      return;
    }
    const result: PilotLedgerResult = validatePilotLedger(value);
    if (options.format === "json") {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`${result.summary}\n`);
      for (const diagnostic of result.diagnostics) {
        process.stdout.write(`${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}\n`);
      }
    }
    if (options.strict && result.status === "unverified") process.exitCode = 1;
  });

async function metadataVerificationStatus(path: string | undefined, declaredActions: readonly string[] | undefined): Promise<GateStatus> {
  if (!path) return "missing";
  if (declaredActions === undefined) return "fail";
  const input = resolve(path);
  const candidate = input.endsWith("extract.actionsdata") ? input : join(input, "extract.actionsdata");
  if (!existsSync(candidate)) return "fail";
  try {
    const comparison = compareMetadataToContract(JSON.parse(await readFile(candidate, "utf8")) as unknown, declaredActions);
    if (comparison.status === "fail") process.stderr.write(`${comparison.nextAction}\n`);
    return comparison.status;
  } catch {
    return "fail";
  }
}

program.command("claims")
  .description("List the claims an integration may make, what proves each one, and which need a person")
  .action(() => {
    for (const entry of PILOT_CLAIMS) {
      const scope = entry.defaultClaimed ? "default" : "opt-in";
      process.stdout.write(`${entry.id}  [${entry.evidence}]  (${scope})\n  ${entry.title}\n  verified by: ${entry.verifiedBy}\n`);
    }
  });

type VerifyOptions = {
  config: string;
  output: string;
  pilot?: string;
  claim?: string[];
  appTest?: string;
  integrationTest?: string;
  indexTest?: string;
  metadata?: string;
  ledger?: string;
  probe?: string;
  strict?: boolean;
};

program.command("verify")
  .description("Certify a declared claim set: every claimed item is named, with what proves it")
  .option("-c, --config <file>", "IntentLane YAML file", "intentlane.yaml")
  .option("-o, --output <directory>", "Generated source directory", "ios/IntentLaneGenerated")
  .option("--pilot <file>", "Pilot manifest declaring the claim set and the commands that settle it")
  .option("--claim <id...>", "Add a claim to the declared set, for example siri-conversation")
  .option("--app-test <command>", "Application-owned test command, for example xcodebuild test")
  .option("--integration-test <command>", "Command exercising the resolver, open path and search routing")
  .option("--index-test <command>", "Command exercising the named Core Spotlight index")
  .option("--probe <command>", "Command proving the adapter registers at launch")
  .option("--metadata <path>", "Metadata.appintents directory or extract.actionsdata file produced by the build")
  .option("--ledger <file>", "Evidence ledger, read only when an observed claim is claimed")
  .option("--strict", "Exit non-zero unless every claimed item is certified")
  .action(async (options: VerifyOptions) => {
    let manifest: PilotManifest | undefined;
    if (options.pilot) {
      const parsed = parsePilotManifest(parse(await readFile(resolve(options.pilot), "utf8")) as unknown);
      for (const diagnostic of parsed.diagnostics) {
        process.stderr.write(`${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}\n`);
      }
      if (!parsed.manifest) {
        process.exitCode = 1;
        return;
      }
      manifest = parsed.manifest;
    }

    const manifestDirectory = options.pilot === undefined ? undefined : dirname(resolve(options.pilot));
    const fromManifest = (value: string): string => (manifestDirectory === undefined ? resolve(value) : resolve(manifestDirectory, value));
    const configFile = manifest?.contract === undefined ? configPath(options.config) : fromManifest(manifest.contract);
    const outputDirectory = manifest?.generated === undefined ? resolve(options.output) : fromManifest(manifest.generated);
    const metadataPath = options.metadata ?? (manifest?.metadata === undefined ? undefined : fromManifest(manifest.metadata));
    const ledgerPath = options.ledger ?? (manifest?.ledger === undefined ? undefined : fromManifest(manifest.ledger));

    const gateCommands = new Map<string, { command: string; cwd?: string }>();
    for (const [id, command] of Object.entries(manifest?.gates ?? {})) {
      gateCommands.set(id, { command, ...(manifestDirectory === undefined ? {} : { cwd: manifestDirectory }) });
    }
    if (options.appTest !== undefined) gateCommands.set("applicationTests", { command: options.appTest });
    if (options.integrationTest !== undefined) gateCommands.set("integrationTests", { command: options.integrationTest });
    if (options.indexTest !== undefined) gateCommands.set("indexSync", { command: options.indexTest });
    if (options.probe !== undefined) gateCommands.set("registration", { command: options.probe });

    const declaredClaims = options.claim === undefined && options.pilot === undefined
      ? defaultClaimSet()
      : [...(manifest?.claims ?? []), ...(options.claim ?? [])];

    const configResult = await parseConfigFile(configFile);
    const configValid = configResult.ir !== undefined && configResult.diagnostics.every((item) => item.severity !== "error");
    const generated = await generatedStatus(configFile, configResult.ir, outputDirectory);

    const gates: Record<string, GateStatus> = {
      contract: configValid ? "pass" : "fail",
      generated: generated === "fresh" ? "pass" : generated === "missing" ? "missing" : "fail"
    };
    if (metadataPath !== undefined) {
      gates["metadata"] = await metadataVerificationStatus(
        metadataPath,
        configResult.ir?.intents.map((intent) => intent.swiftName)
      );
    }
    for (const [id, gate] of gateCommands) {
      const run = spawnSync(gate.command, { shell: true, stdio: "inherit", ...(gate.cwd === undefined ? {} : { cwd: gate.cwd }) });
      gates[id] = run.status === 0 ? "pass" : "fail";
    }

    const observed: Record<string, ObservedStatus> = {};
    const wantsObservation = declaredClaims.some((id) => PILOT_CLAIMS.find((entry) => entry.id === id)?.evidence === "observed");
    if (wantsObservation) {
      if (ledgerPath === undefined) {
        observed["__absent-ledger"] = "unverified";
      } else {
        try {
          const ledger: PilotLedgerResult = validatePilotLedger(parse(await readFile(resolve(ledgerPath), "utf8")) as unknown);
          for (const journey of ["siri-conversation", "spotlight-ui-result"]) {
            if (!declaredClaims.includes(journey)) continue;
            observed[journey] = ledger.status;
          }
        } catch {
          observed["__unreadable-ledger"] = "unverified";
        }
      }
    }

    const result = evaluateReleaseVerification({ claims: declaredClaims, gates, observed });
    for (const outcome of result.claims) {
      const mark =
        outcome.status === "verified"
          ? "pass"
          : outcome.status === "pending"
            ? "pending"
            : outcome.status === "contested"
              ? "contested"
              : "fail";
      process.stdout.write(`${mark}  ${outcome.id} [${outcome.evidence}]: ${outcome.status}\n`);
    }
    process.stdout.write(`${result.status}: ${result.nextAction}\n`);
    if (result.failures.length > 0) process.stdout.write(`failing claims: ${result.failures.join(", ")}\n`);
    if (result.pending.length > 0) process.stdout.write(`claims waiting on a person: ${result.pending.join(", ")}\n`);
    if (options.strict && result.status !== "certified") process.exitCode = 1;
    if (!options.strict && result.status === "blocked") process.exitCode = 1;
  });

const pilot = program.command("pilot").description("Run a transformation end to end, with its state on disk");

const UNOBSERVED_BY_DEFAULT = [
  "a system search result opens that exact item",
  "the Siri conversation itself"
] as const;

pilot.command("run")
  .requiredOption("--pilot <id>", "Identifier of the pilot being run")
  .requiredOption("--repository <path>", "Path to the application repository")
  .option("--run-dir <path>", "Directory holding the journal and its evidence", ".intentlane/run")
  .option("--plan", "Print the steps this run would take and stop")
  .action(async (options: { pilot: string; repository: string; runDir: string; plan?: boolean }) => {
    const repository = resolve(options.repository);
    const runDirectory = resolve(options.runDir);
    const journalFile = join(runDirectory, "journal.json");

    if (!existsSync(repository)) {
      process.stderr.write(`ILA179 root: the repository is not there: ${repository}\n`);
      process.exitCode = 1;
      return;
    }

    const git = (...gitArgs: string[]): string =>
      spawnSync("git", ["-C", repository, ...gitArgs], { encoding: "utf8" }).stdout.trim();

    const commit = git("rev-parse", "--short=12", "HEAD");
    const branch = git("rev-parse", "--abbrev-ref", "HEAD");
    if (!/^[0-9a-f]{7,40}$/.test(commit) || branch === "") {
      process.stderr.write(`ILA179 root: ${repository} is not a git repository with a commit.\n`);
      process.exitCode = 1;
      return;
    }

    const facts = { pilot: options.pilot, branch, commit };
    let journal: PilotRunJournal;
    let resuming = false;

    if (existsSync(journalFile)) {
      const parsed = parsePilotRunJournal(await readFile(journalFile, "utf8"));
      if (parsed.journal === undefined) {
        for (const diagnostic of parsed.diagnostics) {
          process.stderr.write(`${diagnostic.code} ${diagnostic.path}: ${diagnostic.message}\n`);
        }
        process.exitCode = 1;
        return;
      }
      journal = retargetJournal(parsed.journal, commit);
      resuming = true;
    } else {
      journal = startRunJournal(facts);
    }

    const plan = planRun(journal);
    process.stdout.write(`pilot ${options.pilot} on ${branch} at ${commit}\n`);
    process.stdout.write(`journal: ${journalFile}\n`);
    process.stdout.write(`state: ${resuming ? "resumed" : "new"}\n`);
    process.stdout.write(`steps: ${plan.steps.length === 0 ? "none, every step passed at this commit" : plan.steps.join(" -> ")}\n`);

    if (options.plan === true || plan.steps.length === 0) return;

    if (plan.steps[0] === "prepare") {
      const target = PILOT_BUILD_TARGETS[options.pilot];
      if (target === undefined) {
        process.stderr.write(`FAIL no build target is declared for the pilot: ${options.pilot}\n`);
        process.exitCode = 1;
        return;
      }
      const identities = spawnSync("security", ["find-identity", "-v", "-p", "codesigning"], { encoding: "utf8" });
      const signing = resolveSigning((identities.stdout ?? "").split("\n"));
      const { assistantWillRefuse, warning, ...signingSettings } = signing;
      void assistantWillRefuse;
      process.stdout.write(`signing with: ${signingSettings.CODE_SIGN_IDENTITY}${signingSettings.DEVELOPMENT_TEAM === undefined ? "" : ` (team ${signingSettings.DEVELOPMENT_TEAM})`}\n`);
      if (warning !== undefined) process.stdout.write(`warning: ${warning}\n`);
      const overrides = { ...demoBuildOverrides(options.pilot), ...signingSettings };
      const invocation = buildInvocation(repository, overrides, target);
      const started = Date.now();
      process.stdout.write(`running: ${invocation.command} ${invocation.args.join(" ")}\n`);
      const run = spawnSync(invocation.command, invocation.args, { encoding: "utf8" });
      const outcome = parseBuildOutcome(run.status ?? 1, `${run.stdout ?? ""}\n${run.stderr ?? ""}`);
      const result: PrepareResult = {
        status: outcome.status,
        exitCode: outcome.exitCode,
        signature: outcome.signature,
        diagnostic: outcome.diagnostic,
        durationMs: Date.now() - started,
        command: `${invocation.command} ${invocation.args.join(" ")}`,
        artifact: target.artifact
      };
      await atomicWrite(journalFile, `${JSON.stringify(applyPrepare(journal, result), null, 2)}\n`);
      process.stdout.write(`${outcome.status} prepare in ${(result.durationMs / 1000).toFixed(1)}s\n`);
      process.stdout.write(`diagnostic: ${outcome.diagnostic}\n`);
      process.stdout.write(`failure signature: ${outcome.signature || "none"}\n`);
      if (outcome.status === "fail") process.exitCode = 1;
      return;
    }

    if (plan.steps[0] === "analyse") {
      const discovery = await discover(await indexRepository(repository));
      const analysis = analyseDiscovery(discovery);
      await atomicWrite(join(runDirectory, "discovery.json"), `${JSON.stringify(discovery, null, 2)}\n`);
      await atomicWrite(journalFile, `${JSON.stringify(applyAnalyse(journal, analysis), null, 2)}\n`);
      for (const object of discovery.objects) {
        const seams = [
          ...object.identifiers.map((entry) => `identifier ${entry.property}`),
          ...object.openers.map((entry) => `opener ${entry.symbol}`)
        ];
        process.stdout.write(
          `${object.name}  ${object.proof.path}:${object.proof.line}  [${seams.join(", ") || "no seam found"}]\n`
        );
      }
      process.stdout.write(`${analysis.status} analyse: ${analysis.reason}\n`);
      process.stdout.write(`findings written to ${join(runDirectory, "discovery.json")}\n`);
      if (analysis.status === "fail") process.exitCode = 1;
      return;
    }

    if (plan.steps[0] === "implement") {
      const target = PILOT_BUILD_TARGETS[options.pilot];
      const adapter = PILOT_ADAPTER_DIRECTORIES[options.pilot];
      if (target === undefined || adapter === undefined) {
        process.stderr.write(`FAIL the pilot declares neither a build target nor an adapter directory: ${options.pilot}\n`);
        process.exitCode = 1;
        return;
      }
      const adapterDirectory = join(repository, adapter);
      const generated = join(adapterDirectory, "IntentLaneGenerated.swift");
      const swiftFiles = existsSync(adapterDirectory) ? (await readdir(adapterDirectory)).filter((name) => name.endsWith(".swift")) : [];
      let blockingTodos = 0;
      for (const name of swiftFiles) {
        const source = await readFile(join(adapterDirectory, name), "utf8");
        blockingTodos += (source.match(/\bTODO\b/g) ?? []).length;
      }
      const built = existsSync(join(repository, ".intentlane", "derived", "Build", "Products", target.configuration, target.artifact));
      const result = evaluateImplement({
        generatedPresent: existsSync(generated),
        adapterPresent: swiftFiles.length > 0,
        blockingTodos,
        compiles: built
      });
      await atomicWrite(journalFile, `${JSON.stringify(applyImplement(journal, result), null, 2)}\n`);
      process.stdout.write(`generated declarations: ${existsSync(generated) ? "present" : "absent"}\n`);
      process.stdout.write(`adapter swift files: ${swiftFiles.length}\n`);
      process.stdout.write(`blocking TODOs: ${blockingTodos}\n`);
      process.stdout.write(`${result.status} implement: ${result.reason}\n`);
      if (result.status === "fail") process.exitCode = 1;
      return;
    }

    if (plan.steps[0] === "test") {
      const productRoot = resolve(import.meta.dirname, "..", "..", "..");
      const suites = join(productRoot, "pilots", options.pilot, "tests", "run-all-tests.sh");
      if (!existsSync(suites)) {
        process.stderr.write(`FAIL there is no application-owned test command for the pilot: ${suites}\n`);
        process.exitCode = 1;
        return;
      }
      const started = Date.now();
      const run = spawnSync("bash", [suites], { encoding: "utf8" });
      const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
      const checks = (output.match(/^ok /gm) ?? []).length;
      const commands = (output.match(/^== /gm) ?? []).length;
      const result = evaluateTest({
        suitesPassed: run.status === 0,
        checks,
        commands,
        unobserved: UNOBSERVED_BY_DEFAULT,
        unblock: "open the built application by hand and play one of the pilot fixtures; the agent shell has no accessibility permission to drive the search UI"
      });
      await atomicWrite(journalFile, `${JSON.stringify(applyTest(journal, result), null, 2)}\n`);
      process.stdout.write(`${checks} check(s) across ${commands} suite(s) in ${((Date.now() - started) / 1000).toFixed(1)}s\n`);
      process.stdout.write(`${result.status} test: ${result.reason}\n`);
      if (result.status === "fail") process.exitCode = 1;
      return;
    }

    process.stdout.write("the first step this run owes has no implementation yet, so nothing was claimed\n");
  });

program.parseAsync().catch((reason: unknown) => {
  process.stderr.write(`${reason instanceof Error ? reason.message : String(reason)}\n`);
  process.exitCode = 1;
});
