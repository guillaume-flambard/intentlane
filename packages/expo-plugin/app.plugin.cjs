"use strict";

const { applyIntentLane, resolveExpoConfigPlugins, runGenerator } = require("./src/apply.cjs");

function resolveFromProject(request, projectRoot) {
  return require.resolve(request, { paths: [projectRoot] });
}

function resolveFromRoots(request, roots) {
  return require.resolve(request, { paths: roots });
}

module.exports = function withIntentLane(config, options = {}) {
  const projectRoot = config._internal?.projectRoot ?? process.cwd();
  const plugins = require(
    resolveExpoConfigPlugins({ projectRoot, resolveModule: resolveFromRoots })
  );

  return applyIntentLane(config, options, {
    plugins,
    xcodeUtils: plugins.IOSConfig.XcodeUtils,
    projectRoot,
    runGenerator: (request) =>
      runGenerator({ ...request, resolveModule: (module) => resolveFromProject(module, projectRoot) })
  });
};
