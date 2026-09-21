"use strict";

const { mkdirSync, readFileSync, writeFileSync } = require("node:fs");
const { dirname, join } = require("node:path");

const NATIVE_GROUP = "IntentLaneNative";
const NATIVE_SOURCE = "IdeaResolver.swift";
const MERGE_TAG = "intentlane-entity-resolvers";
const APP_DELEGATE_ANCHOR = /bindReactNativeFactory\(factory\)/;
const REGISTRATION_CALL = "IntentLaneEntityResolverRegistration.register()";

const NATIVE_SOURCE_CONTENTS = `import Foundation

private struct IntentLaneStoredIdea: Decodable {
  let id: String
  let title: String
  let status: String?
}

final class IntentLaneIdeaResolverImplementation: IntentLaneIdeaResolver {
  static let storageKey = "intentlane.ideas"

  private let defaults: UserDefaults

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
  }

  func ideaEntities(for identifiers: [String]) async throws -> [IntentLaneIdeaEntity] {
    entities().filter { identifiers.contains($0.id) }
  }

  func suggestedIdeaEntities() async throws -> [IntentLaneIdeaEntity] {
    entities()
  }

  private func entities() -> [IntentLaneIdeaEntity] {
    guard
      let payload = defaults.string(forKey: Self.storageKey),
      let data = payload.data(using: .utf8),
      let stored = try? JSONDecoder().decode([IntentLaneStoredIdea].self, from: data)
    else {
      return []
    }
    return stored.map { IntentLaneIdeaEntity(id: $0.id, title: $0.title, status: $0.status) }
  }
}

enum IntentLaneEntityResolverRegistration {
  static func register() {
    MainActor.assumeIsolated {
      IntentLaneEntityResolvers.idea = IntentLaneIdeaResolverImplementation()
    }
  }
}
`;

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

function writeNativeSource({ platformProjectRoot, projectName }) {
  const directory = join(platformProjectRoot, projectName, NATIVE_GROUP);
  const file = join(directory, NATIVE_SOURCE);

  let existing;
  try {
    existing = readFileSync(file, "utf8");
  } catch {
    existing = undefined;
  }

  if (existing === NATIVE_SOURCE_CONTENTS) {
    return false;
  }

  mkdirSync(directory, { recursive: true });
  writeFileSync(file, NATIVE_SOURCE_CONTENTS, "utf8");
  return true;
}

function ensureNativeSourceRegistered({ project, projectName, xcodeUtils }) {
  const groupName = `${projectName}/${NATIVE_GROUP}`;
  const group = xcodeUtils.ensureGroupRecursively(project, groupName);

  if (group && Array.isArray(group.children) && group.children.some((child) => child.comment === NATIVE_SOURCE)) {
    return false;
  }

  xcodeUtils.addBuildSourceFileToGroup({
    filepath: join(projectName, NATIVE_GROUP, NATIVE_SOURCE),
    groupName,
    project,
    targetUuid: xcodeUtils.getApplicationNativeTarget({ project, projectName }).uuid
  });
  return true;
}

function registerResolverInAppDelegate({ contents, language, mergeContents }) {
  if (language !== "swift") {
    throw new Error(
      `IntentLane can only register the entity resolver in a Swift AppDelegate, found '${language}'.`
    );
  }

  if (!APP_DELEGATE_ANCHOR.test(contents)) {
    throw new Error(
      `IntentLane could not find 'bindReactNativeFactory(factory)' in the AppDelegate. Register IntentLaneEntityResolverRegistration.register() by hand.`
    );
  }

  const results = mergeContents({
    src: contents,
    newSrc: REGISTRATION_CALL,
    tag: MERGE_TAG,
    anchor: APP_DELEGATE_ANCHOR,
    offset: 1,
    comment: "//"
  });
  return results.contents;
}

function applyIdeaResolver(config, options, dependencies) {
  const { plugins, xcodeUtils, projectRoot } = dependencies;

  const withDangerousMod = plugins.withDangerousMod(config, [
    "ios",
    async (modConfig) => {
      writeNativeSource({
        platformProjectRoot: modConfig.modRequest.platformProjectRoot,
        projectName: modConfig.modRequest.projectName
      });
      return modConfig;
    }
  ]);

  const withXcodeProject = plugins.withXcodeProject(withDangerousMod, (modConfig) => {
    ensureNativeSourceRegistered({
      project: modConfig.modResults,
      projectName: modConfig.modRequest.projectName,
      xcodeUtils
    });
    return modConfig;
  });

  return plugins.withAppDelegate(withXcodeProject, (modConfig) => {
    modConfig.modResults.contents = registerResolverInAppDelegate({
      contents: modConfig.modResults.contents,
      language: modConfig.modResults.language,
      mergeContents: plugins.CodeGenerator.mergeContents
    });
    return modConfig;
  });
}

module.exports = {
  APP_DELEGATE_ANCHOR,
  MERGE_TAG,
  NATIVE_GROUP,
  NATIVE_SOURCE,
  NATIVE_SOURCE_CONTENTS,
  REGISTRATION_CALL,
  applyIdeaResolver,
  ensureNativeSourceRegistered,
  registerResolverInAppDelegate,
  resolveExpoConfigPlugins,
  writeNativeSource
};
