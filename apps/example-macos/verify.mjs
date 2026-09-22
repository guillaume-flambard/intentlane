#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "..", "..");
const protocols = join(here, "protocols.json");

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

assert(
  capture(swiftc, ["-help-hidden"]).includes("-const-gather-protocols-list"),
  `Xcode ${xcodeVersion} cannot extract App Intents metadata: its swiftc has no '-const-gather-protocols-list'. Xcode 27 or newer is required.`
);

function extract({ contract, moduleName, directory }) {
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });

  run(process.execPath, [
    tsxCli,
    join(repositoryRoot, "packages", "cli", "src", "index.ts"),
    "generate",
    "--config",
    contract,
    "--output",
    directory
  ], { cwd: repositoryRoot });

  const generatedSource = join(directory, "IntentLaneGenerated.swift");
  const objectFile = join(directory, "IntentLaneGenerated.o");
  const constantValues = join(directory, "IntentLaneGenerated.swiftconstvalues");

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

  const sourceList = join(directory, "sources.txt");
  const constantValuesList = join(directory, "constvals.txt");
  writeFileSync(sourceList, `${generatedSource}\n`, "utf8");
  writeFileSync(constantValuesList, `${constantValues}\n`, "utf8");

  const metadataDirectory = join(directory, "metadata");
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

  return JSON.parse(readFileSync(actionsFile, "utf8"));
}

function verifyShelf(metadata) {
  const expectedActions = ["DeleteLink", "OpenLink", "OpenShelf", "PinLink", "SaveLink"];
  const nativeActions = ["PinLink"];
  const expectedShortcuts = ["DeleteLink", "OpenLink", "PinLink", "SaveLink"];
  const expectedParameterTitles = ["Link address", "Link title", "Tag", "Pinned"];
  const actions = metadata.actions;

  for (const name of expectedActions) {
    assert(Object.hasOwn(actions, name), `Missing action ${name} in the extracted metadata.`);
  }

  const flags = Object.fromEntries(expectedActions.map((name) => [name, actions[name].outputFlags]));
  const openAppActions = expectedActions.filter((name) => !nativeActions.includes(name));
  assert(
    openAppActions.every((name) => actions[name].outputFlags === 7) &&
      nativeActions.every((name) => actions[name].outputFlags === 4),
    `Expected outputFlags 7 for the open_app actions and 4 for the native ones, got ${JSON.stringify(flags)}.`
  );

  assert(
    actions.DeleteLink.authenticationPolicy === 1,
    `Expected DeleteLink to require authentication, got ${actions.DeleteLink.authenticationPolicy}.`
  );
  assert(
    actions.DeleteLink.isAuthPolExplicit === true,
    "Expected DeleteLink to declare its authentication policy explicitly."
  );

  for (const name of ["OpenLink", "OpenShelf", "PinLink", "SaveLink"]) {
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

  assert(
    actions.PinLink.outputType?.entity?.wrapper?.typeName === "IntentLaneLinkEntity",
    `Expected PinLink to return IntentLaneLinkEntity, got ${JSON.stringify(actions.PinLink.outputType)}.`
  );

  for (const name of expectedActions) {
    assert(
      (actions[name].systemProtocols ?? []).length === 0,
      `Expected no assistant schema on ${name} yet, found ${JSON.stringify(actions[name].systemProtocols)}.`
    );
  }

  process.stdout.write(`shelf actions: ${expectedActions.join(", ")}\n`);
  process.stdout.write(`shelf output flags: ${JSON.stringify(flags)}\n`);
  process.stdout.write(`shelf native PinLink returns ${actions.PinLink.outputType.entity.wrapper.typeName}\n`);
  process.stdout.write(`shelf parameter titles: ${JSON.stringify(titles.SaveLink)}\n`);
  process.stdout.write("shelf entity IntentLaneLinkEntity, query IntentLaneLinkQuery, enum IntentLaneSaveLinkTag\n");
  process.stdout.write(`shelf shortcuts: ${expectedShortcuts.join(", ")}\n`);
}

function verifyStudio(metadata) {
  const actions = metadata.actions;

  assert(Object.hasOwn(actions, "StopCapture"), "Missing action StopCapture in the extracted metadata.");
  assert(
    actions.StopCapture.outputFlags === 7,
    `Expected StopCapture to keep the open_app result, got ${actions.StopCapture.outputFlags}.`
  );
  assert(
    JSON.stringify(actions.StopCapture.systemProtocols) === JSON.stringify(["com.apple.link.systemProtocol.AssistantIntent"]),
    `Expected StopCapture to declare the assistant intent protocol, got ${JSON.stringify(actions.StopCapture.systemProtocols)}.`
  );
  assert(
    JSON.stringify(actions.StopCapture.assistantDefinedSchemas) ===
      JSON.stringify([{ domain: "camera", name: "StopCaptureIntent", version: "1.0.0" }]),
    `Expected StopCapture to conform to camera.stopCapture, got ${JSON.stringify(actions.StopCapture.assistantDefinedSchemas)}.`
  );

  assert(Object.hasOwn(metadata.entities, "IntentLaneSoundEntity"), "Missing IntentLaneSoundEntity in the extracted metadata.");
  assert(
    JSON.stringify(metadata.entities.IntentLaneSoundEntity.assistantDefinedSchemas) ===
      JSON.stringify([{ domain: "audio", name: "AmbientSoundEntity", version: "1.0.0" }]),
    `Expected IntentLaneSoundEntity to conform to audio.ambientSound, got ${JSON.stringify(metadata.entities.IntentLaneSoundEntity.assistantDefinedSchemas)}.`
  );
  assert(Object.hasOwn(metadata.queries, "IntentLaneSoundQuery"), "Missing IntentLaneSoundQuery in the extracted metadata.");

  const registered = new Set((metadata.autoShortcuts ?? []).map((shortcut) => shortcut.actionIdentifier));
  assert(registered.has("StopCapture"), "Missing App Shortcut StopCapture in the extracted metadata.");

  process.stdout.write(`studio actions: ${Object.keys(actions).join(", ")}\n`);
  process.stdout.write(`studio output flags: ${JSON.stringify({ StopCapture: actions.StopCapture.outputFlags })}\n`);
  process.stdout.write(`studio schemas: ${JSON.stringify(actions.StopCapture.assistantDefinedSchemas)}\n`);
  process.stdout.write(`studio entity schemas: ${JSON.stringify(metadata.entities.IntentLaneSoundEntity.assistantDefinedSchemas)}\n`);
}

verifyShelf(await extract({
  contract: join(here, "intentlane.yaml"),
  moduleName: "IntentLaneShelf",
  directory: join(here, "build", "shelf")
}));

verifyStudio(await extract({
  contract: join(here, "schemas.yaml"),
  moduleName: "IntentLaneStudio",
  directory: join(here, "build", "studio")
}));

function verifyReader(metadata) {
  const actions = metadata.actions;
  const open = actions.OpenPage;
  const remove = actions.DeletePages;
  const rotate = actions.RotatePages;

  assert(open, "Missing OpenPage in the extracted metadata.");
  assert(remove, "Missing DeletePages in the extracted metadata.");
  assert(rotate, "Missing RotatePages in the extracted metadata.");

  assert(open.outputFlags === 0, `Expected OpenPage to open the app without a dialog, got ${open.outputFlags}.`);
  assert(open.openAppWhenRun === true, "Expected OpenPage to open the app.");
  assert(
    JSON.stringify(open.assistantDefinedSchemas) === JSON.stringify([{ domain: "reader", name: "ReaderOpenPageIntent", version: "1.0.0" }]),
    `Expected OpenPage to conform to reader.openPage, got ${JSON.stringify(open.assistantDefinedSchemas)}.`
  );
  assert(
    (open.systemProtocols ?? []).includes("com.apple.link.systemProtocol.OpenEntity"),
    `Expected OpenPage to carry the OpenEntity protocol, got ${JSON.stringify(open.systemProtocols)}.`
  );

  assert(
    JSON.stringify(remove.assistantDefinedSchemas) === JSON.stringify([{ domain: "reader", name: "ReaderDeletePagesIntent", version: "1.0.0" }]),
    `Expected DeletePages to conform to reader.deletePages, got ${JSON.stringify(remove.assistantDefinedSchemas)}.`
  );
  assert(
    (remove.systemProtocols ?? []).includes("com.apple.link.systemProtocol.DeleteEntity"),
    `Expected DeletePages to carry the DeleteEntity protocol, got ${JSON.stringify(remove.systemProtocols)}.`
  );

  assert(
    JSON.stringify(rotate.assistantDefinedSchemas) === JSON.stringify([{ domain: "reader", name: "ReaderRotatePagesIntent", version: "1.0.0" }]),
    `Expected RotatePages to conform to reader.rotatePages, got ${JSON.stringify(rotate.assistantDefinedSchemas)}.`
  );
  assert(rotate.outputFlags === 4, `Expected RotatePages to return a dialog, got ${rotate.outputFlags}.`);
  const rotateParameters = (rotate.parameters ?? []).map((parameter) => parameter.name);
  assert(
    JSON.stringify(rotateParameters) === JSON.stringify(["pages", "isClockwise"]),
    `Expected RotatePages to declare pages and isClockwise, got ${JSON.stringify(rotateParameters)}.`
  );

  assert(Object.hasOwn(metadata.entities, "IntentLanePageEntity"), "Missing IntentLanePageEntity in the extracted metadata.");
  assert(
    JSON.stringify(metadata.entities.IntentLanePageEntity.assistantDefinedSchemas) ===
      JSON.stringify([{ domain: "reader", name: "ReaderPageEntity", version: "1.0.0" }]),
    `Expected IntentLanePageEntity to conform to reader.page, got ${JSON.stringify(metadata.entities.IntentLanePageEntity.assistantDefinedSchemas)}.`
  );
  assert(Object.hasOwn(metadata.queries, "IntentLanePageQuery"), "Missing IntentLanePageQuery in the extracted metadata.");

  process.stdout.write(`reader actions: ${Object.keys(actions).join(", ")}\n`);
  process.stdout.write(`reader open protocols: ${JSON.stringify(open.systemProtocols)}\n`);
  process.stdout.write(`reader rotate parameters: ${JSON.stringify(rotateParameters)}\n`);
  process.stdout.write(`reader entity schemas: ${JSON.stringify(metadata.entities.IntentLanePageEntity.assistantDefinedSchemas)}\n`);
}

verifyShelf(await extract({
  contract: join(here, "intentlane.yaml"),
  moduleName: "IntentLaneShelf",
  directory: join(here, "build", "shelf")
}));

verifyStudio(await extract({
  contract: join(here, "schemas.yaml"),
  moduleName: "IntentLaneStudio",
  directory: join(here, "build", "studio")
}));

verifyReader(await extract({
  contract: join(here, "reader.yaml"),
  moduleName: "IntentLaneReader",
  directory: join(here, "build", "reader")
}));

process.stdout.write(`toolchain: Xcode ${xcodeVersion}, ${target}, sdk ${sdkVersion}\n`);
