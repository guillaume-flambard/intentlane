"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync, readFileSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const CLI_PACKAGE = "@intentlane/cli";
const GENERATED_SOURCE = "IntentLaneGenerated.swift";
const GENERATED_GROUP = "IntentLaneGenerated";
const MANIFEST_FILE = "intentlane.manifest.json";
const LOCALIZATION_DIRECTORY_SUFFIX = ".lproj";

function generatorResolutionError(missing, projectRoot, cause) {
  const error = new Error(`IntentLane could not start the code generator: '${missing}' is not installed in ${projectRoot}. Install it with 'npm install --save-dev ${missing}'.`);
  if (cause) error.cause = cause;
  return error;
}

function resolveGeneratorInvocation({ projectRoot, configFile, outputDirectory, resolveModule }) {
  const config = resolve(projectRoot, configFile);
  if (!existsSync(config)) {
    throw new Error(`IntentLane configuration not found: ${config}. Run 'npx intentlane init' in ${projectRoot}.`);
  }

  let cliEntry;
  try {
    cliEntry = join(dirname(resolveModule(`${CLI_PACKAGE}/package.json`)), "src", "index.ts");
  } catch (cause) {
    throw generatorResolutionError(CLI_PACKAGE, projectRoot, cause);
  }

  let tsxCli;
  try {
    tsxCli = resolveModule("tsx/cli");
  } catch (tsxError) {
    try {
      tsxCli = join(dirname(resolveModule("tsx/package.json")), "dist", "cli.mjs");
    } catch (cause) {
      throw generatorResolutionError("tsx", projectRoot, cause ?? tsxError);
    }
  }

  return {
    command: process.execPath,
    args: [tsxCli, cliEntry, "generate", "--config", config, "--output", outputDirectory],
    cwd: projectRoot
  };
}

function ensureGeneratedSourceRegistered({ project, projectName, xcodeUtils }) {
  const groupName = `${projectName}/${GENERATED_GROUP}`;
  const group = xcodeUtils.ensureGroupRecursively(project, groupName);
  if (group && Array.isArray(group.children) && group.children.some((child) => child.comment === GENERATED_SOURCE)) {
    return false;
  }
  xcodeUtils.addBuildSourceFileToGroup({
    filepath: join(projectName, GENERATED_GROUP, GENERATED_SOURCE),
    groupName,
    project,
    targetUuid: xcodeUtils.getApplicationNativeTarget({ project, projectName }).uuid
  });
  return true;
}

function localeResources(manifestFile) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  } catch {
    return [];
  }

  const files = Array.isArray(manifest?.files) ? manifest.files : [];
  const resources = [];
  for (const entry of files) {
    if (!entry || typeof entry.path !== "string") continue;
    const segments = entry.path.split("/");
    if (segments.length !== 2) continue;
    const directory = segments[0];
    const file = segments[1];
    if (!directory || !file) continue;
    if (!directory.endsWith(LOCALIZATION_DIRECTORY_SUFFIX)) continue;
    resources.push({
      locale: directory.slice(0, -LOCALIZATION_DIRECTORY_SUFFIX.length),
      file,
      path: entry.path
    });
  }

  return resources.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

function ensureLocaleResourcesRegistered({ project, projectName, outputDirectory, xcodeUtils }) {
  const resources = localeResources(join(outputDirectory, MANIFEST_FILE));
  let registered = 0;

  for (const resource of resources) {
    const groupName = `${projectName}/${GENERATED_GROUP}/${resource.locale}${LOCALIZATION_DIRECTORY_SUFFIX}`;
    const group = xcodeUtils.ensureGroupRecursively(project, groupName);
    if (group && Array.isArray(group.children) && group.children.some((child) => child.comment === resource.file)) {
      continue;
    }
    xcodeUtils.addResourceFileToGroup({
      filepath: join(projectName, GENERATED_GROUP, resource.path),
      groupName,
      project,
      isBuildFile: true,
      verbose: true,
      targetUuid: xcodeUtils.getApplicationNativeTarget({ project, projectName }).uuid
    });
    registered += 1;
  }

  return registered;
}

function resolveExpoConfigPlugins({
  projectRoot,
  resolveModule = (request, roots) => require.resolve(request, { paths: roots })
}) {
  const candidates = [];

  try {
    candidates.push(dirname(resolveModule("expo/package.json", [projectRoot])));
  } catch {
    candidates.push(projectRoot);
  }

  for (const root of candidates) {
    try {
      return resolveModule("@expo/config-plugins", [root]);
    } catch {
      continue;
    }
  }

  throw new Error(
    `IntentLane could not load '@expo/config-plugins'. Make sure 'expo' is installed in ${projectRoot}.`
  );
}

function readManifest(manifestFile) {
  try {
    return JSON.parse(readFileSync(manifestFile, "utf8"));
  } catch {
    return undefined;
  }
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);

  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const leftPart = leftParts[index] ?? 0;
    const rightPart = rightParts[index] ?? 0;
    if (leftPart !== rightPart) return leftPart - rightPart;
  }

  return 0;
}

function ensureDeploymentTarget({ project, minIos }) {
  const configurations = project.pbxXCBuildConfigurationSection();
  let updated = 0;

  for (const key of Object.keys(configurations)) {
    const configuration = configurations[key];
    const buildSettings = configuration?.buildSettings;
    const current = buildSettings?.IPHONEOS_DEPLOYMENT_TARGET;

    if (typeof current !== "string") continue;
    if (compareVersions(current, minIos) >= 0) continue;

    buildSettings.IPHONEOS_DEPLOYMENT_TARGET = minIos;
    updated += 1;
  }

  return updated;
}

function applyIntentLane(config, options, dependencies) {
  const { plugins, xcodeUtils, projectRoot, runGenerator } = dependencies;
  const configFile = options.configFile ?? "intentlane.yaml";

  const withDangerousMod = plugins.withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      const projectName = modConfig.modRequest.projectName;
      const outputDirectory = join(modConfig.modRequest.platformProjectRoot, projectName, GENERATED_GROUP);
      await runGenerator({ projectRoot, configFile, outputDirectory });
      return modConfig;
    }
  ]);

  return plugins.withXcodeProject(withDangerousMod, (modConfig) => {
    const projectName = modConfig.modRequest.projectName;
    const outputDirectory = join(modConfig.modRequest.platformProjectRoot, projectName, GENERATED_GROUP);
    const manifest = readManifest(join(outputDirectory, MANIFEST_FILE));

    ensureGeneratedSourceRegistered({
      project: modConfig.modResults,
      projectName,
      xcodeUtils
    });
    ensureLocaleResourcesRegistered({
      project: modConfig.modResults,
      projectName,
      outputDirectory,
      xcodeUtils
    });
    if (typeof manifest?.minIos === "string") {
      ensureDeploymentTarget({ project: modConfig.modResults, minIos: manifest.minIos });
    }
    return modConfig;
  });
}

function runGenerator({ projectRoot, configFile, outputDirectory, resolveModule }) {
  const invocation = resolveGeneratorInvocation({
    projectRoot,
    configFile,
    outputDirectory,
    resolveModule: resolveModule ?? ((request) => require.resolve(request, { paths: [projectRoot] }))
  });
  execFileSync(invocation.command, invocation.args, { cwd: invocation.cwd, stdio: "inherit" });
}

module.exports = {
  CLI_PACKAGE,
  GENERATED_SOURCE,
  MANIFEST_FILE,
  applyIntentLane,
  ensureDeploymentTarget,
  ensureGeneratedSourceRegistered,
  ensureLocaleResourcesRegistered,
  localeResources,
  readManifest,
  resolveExpoConfigPlugins,
  resolveGeneratorInvocation,
  runGenerator
};
