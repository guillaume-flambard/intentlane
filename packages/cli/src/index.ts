#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import { collectDoctorChecks, deriveScaffoldDefaults, parseConfigFile, scaffoldConfig, type ConfigIR, type Diagnostic, type DoctorFacts } from "../../core/src/index.js";
import { generateSwift, generatedFileHash } from "../../generator-apple/src/index.js";

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

async function generatedStatus(configFile: string, ir: ConfigIR | undefined, output: string): Promise<DoctorFacts["generatedStatus"]> {
  if (!ir) return "missing";
  const swiftFile = join(output, "IntentLaneGenerated.swift");
  const manifestFile = join(output, "intentlane.manifest.json");
  if (!existsSync(swiftFile) || !existsSync(manifestFile)) return "missing";
  const contents = generateSwift(ir);
  const manifest = `${JSON.stringify({ version: ir.schemaVersion, inputHash: createHash("sha256").update(await readFile(configFile)).digest("hex"), files: [{ path: "IntentLaneGenerated.swift", hash: generatedFileHash(contents) }] }, null, 2)}\n`;
  const [swift, stored] = await Promise.all([readFile(swiftFile, "utf8"), readFile(manifestFile, "utf8")]);
  return swift === contents && stored === manifest ? "fresh" : "stale";
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
    const contents = generateSwift(ir);
    const output = resolve(options.output);
    const swiftFile = join(output, "IntentLaneGenerated.swift");
    const manifestFile = join(output, "intentlane.manifest.json");
    const manifest = `${JSON.stringify({ version: ir.schemaVersion, inputHash: createHash("sha256").update(await readFile(config)).digest("hex"), files: [{ path: "IntentLaneGenerated.swift", hash: generatedFileHash(contents) }] }, null, 2)}\n`;
    if (options.check) {
      if (!existsSync(swiftFile) || !existsSync(manifestFile)) {
        process.stderr.write(`Generated files are missing in ${output}. Run 'intentlane generate'.\n`);
        process.exitCode = 1;
        return;
      }
      let identical = false;
      try {
        const [existingSwift, existingManifest] = await Promise.all([readFile(swiftFile, "utf8"), readFile(manifestFile, "utf8")]);
        identical = existingSwift === contents && existingManifest === manifest;
      } catch (reason) {
        process.stderr.write(`Unable to read generated files in ${output}: ${reason instanceof Error ? reason.message : "unknown error"}\n`);
        process.exitCode = 1;
        return;
      }
      if (!identical) {
        process.stderr.write(`Generated files are stale. Run 'intentlane generate'.\n`);
        process.exitCode = 1;
      }
      return;
    }
    await atomicWrite(swiftFile, contents);
    await atomicWrite(manifestFile, manifest);
    process.stdout.write(`Generated ${swiftFile}\n`);
  });

await program.parseAsync();
