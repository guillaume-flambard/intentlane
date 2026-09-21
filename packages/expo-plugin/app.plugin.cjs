"use strict";

const { applyIntentLane, runGenerator } = require("./src/apply.cjs");

function resolveFromProject(request, projectRoot) {
  return require.resolve(request, { paths: [projectRoot] });
}

module.exports = function withIntentLane(config, options = {}) {
  const projectRoot = config._internal?.projectRoot ?? process.cwd();
  const plugins = require(resolveFromProject("@expo/config-plugins", projectRoot));

  return applyIntentLane(config, options, {
    plugins,
    xcodeUtils: plugins.IOSConfig.XcodeUtils,
    projectRoot,
    runGenerator: (request) => runGenerator({ ...request, resolveModule: (module) => resolveFromProject(module, projectRoot) })
  });
};
