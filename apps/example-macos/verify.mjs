#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "..", "..");
const buildDirectory = join(here, "build");
const contract = join(here, "intentlane.yaml");
const protocols = join(here, "protocols.json");
const moduleName = "IntentLaneShelf";
const expectedActions = ["DeleteLink", "OpenLink", "OpenShelf", "SaveLink"];
const expectedShortcuts = ["DeleteLink", "OpenLink", "SaveLink"];
const expectedParameterTitles = ["Link address", "Link title", "Tag", "Pinned"];

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function capture(command, args) {
  return execFileSync(command, args, { encoding: "utf8" }).trim();
}

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: "inherit", ...options });
}

const require = createRequire(join(repositoryRoot, "package.json"));

let tsxCli;
try {
  tsxCli = require.resolve("tsx/cli");
} catch {
  fail(`Unable to resolve 'tsx' from ${repositoryRoot}. Run 'pnpm install' first.`);
}

let swiftc;
try {
  swiftc = capture("xcrun", ["--find", "swiftc"]);
} catch {
  fail("Unable to locate the Swift toolchain. Install Xcode or run 'xcode-select --install'.");
}

const toolchainDirectory = resolve(dirname(swiftc), "..", "..", "..");
const sdkPath = capture("xcrun", ["--sdk", "macosx", "--show-sdk-path"]);
const sdkVersion = capture("xcrun", ["--sdk", "macosx", "--show-sdk-version"]);
const deploymentTarget = sdkVersion;
const architecture = process.arch === "arm64" ? "arm64" : "x86_64";
const target = `${architecture}-apple-macos${deploymentTarget}`;
const xcodeVersion = capture("xcodebuild", ["-version"]).split("\n").at(-1)?.replace("Build version ", "") ?? "";

let processor;
try {
  processor = capture("xcrun", ["--find", "appintentsmetadataprocessor"]);
} catch {
  processor = join(toolchainDirectory, "usr", "bin", "appintentsmetadataprocessor");
}

assert(existsSync(processor), `Unable to locate 'appintentsmetadataprocessor' at ${processor}.`);

rmSync(buildDirectory, { recursive: true, force: true });
mkdirSync(buildDirectory, { recursive: true });

run(process.execPath, [
  tsxCli,
  join(repositoryRoot, "packages", "cli", "src", "index.ts"),
  "generate",
  "--config",
  contract,
  "--output",
  buildDirectory
], { cwd: repositoryRoot });

const generatedSource = join(buildDirectory, "IntentLaneGenerated.swift");
const objectFile = join(buildDirectory, "IntentLaneGenerated.o");
const constantValues = join(buildDirectory, "IntentLaneGenerated.swiftconstvalues");

run("xcrun", [
  "--sdk",
  "macosx",
  "swiftc",
  "-target",
  target,
  "-sdk",
  sdkPath,
  "-module-name",
  moduleName,
  "-emit-const-values",
  "-const-gather-protocols-list",
  protocols,
  "-c",
  generatedSource,
  "-o",
  objectFile
]);

assert(
  existsSync(constantValues),
  `The Swift compiler did not emit ${constantValues}. Both -emit-const-values and -const-gather-protocols-list are required.`
);

const sourceList = join(buildDirectory, "sources.txt");
const constantValuesList = join(buildDirectory, "constvals.txt");
writeFileSync(sourceList, `${generatedSource}\n`, "utf8");
writeFileSync(constantValuesList, `${constantValues}\n`, "utf8");

const metadataDirectory = join(buildDirectory, "metadata");
mkdirSync(metadataDirectory, { recursive: true });

run(processor, [
  "--output",
  metadataDirectory,
  "--toolchain-dir",
  toolchainDirectory,
  "--module-name",
  moduleName,
  "--sdk-root",
  sdkPath,
  "--xcode-version",
  xcodeVersion,
  "--platform-family",
  "macOS",
  "--deployment-target",
  deploymentTarget,
  "--target-triple",
  target,
  "--source-file-list",
  sourceList,
  "--swift-const-vals-list",
  constantValuesList,
  "--force"
]);

const actionsFile = join(metadataDirectory, "Metadata.appintents", "extract.actionsdata");
assert(existsSync(actionsFile), `Expected ${actionsFile} to exist after the metadata processor ran.`);

const metadata = JSON.parse(readFileSync(actionsFile, "utf8"));
const actions = metadata.actions;

for (const name of expectedActions) {
  assert(Object.hasOwn(actions, name), `Missing action ${name} in the extracted metadata.`);
}

const flags = Object.fromEntries(expectedActions.map((name) => [name, actions[name].outputFlags]));
assert(
  new Set(Object.values(flags)).size === 1 && flags[expectedActions[0]] === 7,
  `Expected outputFlags 7 for every action, got ${JSON.stringify(flags)}.`
);

assert(
  actions.DeleteLink.authenticationPolicy === 1,
  `Expected DeleteLink to require authentication, got ${actions.DeleteLink.authenticationPolicy}.`
);
assert(
  actions.DeleteLink.isAuthPolExplicit === true,
  "Expected DeleteLink to declare its authentication policy explicitly."
);

for (const name of ["OpenLink", "OpenShelf", "SaveLink"]) {
  assert(
    actions[name].authenticationPolicy === 0,
    `Expected ${name} to inherit authentication, got ${actions[name].authenticationPolicy}.`
  );
}

assert(Object.hasOwn(metadata.entities, "IntentLaneLinkEntity"), "Missing IntentLaneLinkEntity in the extracted metadata.");
assert(Object.hasOwn(metadata.queries, "IntentLaneLinkQuery"), "Missing IntentLaneLinkQuery in the extracted metadata.");
assert(
  metadata.enums.some((entry) => entry.identifier === "IntentLaneSaveLinkTag"),
  "Missing IntentLaneSaveLinkTag in the extracted metadata."
);

const registered = new Set((metadata.autoShortcuts ?? []).map((shortcut) => shortcut.actionIdentifier));
for (const name of expectedShortcuts) {
  assert(registered.has(name), `Missing App Shortcut ${name} in the extracted metadata.`);
}

const titles = Object.fromEntries(
  Object.entries(actions).map(([name, action]) => [name, (action.parameters ?? []).map((parameter) => parameter.title.key)])
);
assert(
  expectedParameterTitles.every((title) => titles.SaveLink.includes(title)) &&
    titles.SaveLink.length === expectedParameterTitles.length,
  `Unexpected SaveLink parameter titles: ${JSON.stringify(titles.SaveLink)}.`
);

for (const name of expectedActions) {
  assert(
    (actions[name].systemProtocols ?? []).length === 0,
    `Expected no assistant schema on ${name} yet, found ${JSON.stringify(actions[name].systemProtocols)}.`
  );
}

process.stdout.write(`actions: ${expectedActions.join(", ")}\n`);
process.stdout.write(`output flags: ${JSON.stringify(flags)}\n`);
process.stdout.write(`parameter titles: ${JSON.stringify(titles.SaveLink)}\n`);
process.stdout.write(`entity IntentLaneLinkEntity, query IntentLaneLinkQuery, enum IntentLaneSaveLinkTag\n`);
process.stdout.write(`shortcuts: ${expectedShortcuts.join(", ")}\n`);
process.stdout.write(`toolchain: Xcode ${xcodeVersion}, ${target}, sdk ${sdkVersion}\n`);
