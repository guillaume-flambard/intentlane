"use strict";

const { execFileSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const { dirname, join, resolve } = require("node:path");

const CLI_PACKAGE = "@intentlane/cli";
const GENERATED_SOURCE = "IntentLaneGenerated.swift";
const GENERATED_GROUP = "IntentLaneGenerated";

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
    ensureGeneratedSourceRegistered({
      project: modConfig.modResults,
      projectName: modConfig.modRequest.projectName,
      xcodeUtils
    });
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
  applyIntentLane,
  ensureGeneratedSourceRegistered,
  resolveGeneratorInvocation,
  runGenerator
};
