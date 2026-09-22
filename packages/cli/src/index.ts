#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, relative, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import { collectDoctorChecks, deriveScaffoldDefaults, parseConfigFile, scaffoldConfig, type ConfigIR, type Diagnostic, type DoctorFacts } from "../../core/src/index.js";
import { GENERATED_SWIFT_FILE, generateArtifacts, generatedFileHash, type GeneratedArtifact } from "../../generator-apple/src/index.js";
import { AUDIT_FORMATS, AUDIT_PLATFORM_SELECTIONS, SDK_SETTINGS_FILE, blockingGaps, formatReport, formatReports, runAudit, type AuditFormat, type AuditPlatform, type AuditReport } from "../../core/src/index.js";

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
    // No readable package.json: fall through to the app config check.
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
  .option("--check", "Fail if generated files are stale")
  .action(async (options: { config: string; output: string; check?: boolean }) => {
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
    }
  });

program.parseAsync().catch((reason: unknown) => {
  process.stderr.write(`${reason instanceof Error ? reason.message : String(reason)}\n`);
  process.exitCode = 1;
});
