"use strict";

const { applyIdeaResolver, resolveExpoConfigPlugins } = require("./applyIdeaResolver.cjs");

function resolveFromRoots(request, roots) {
  return require.resolve(request, { paths: roots });
}

module.exports = function withIdeaResolver(config, options = {}) {
  const projectRoot = config._internal?.projectRoot ?? process.cwd();
  const plugins = require(resolveExpoConfigPlugins({ projectRoot, resolveModule: resolveFromRoots }));

  return applyIdeaResolver(config, options, {
    plugins,
    xcodeUtils: plugins.IOSConfig.XcodeUtils,
    projectRoot
  });
};
