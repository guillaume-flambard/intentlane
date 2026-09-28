// Assembles the app bundle from a list of sources, into a directory that does not
// exist yet.
//
// The logic lives here rather than in the shell script because this is the part
// that can be wrong in a way nobody notices: a resource deleted from the sources
// must be absent from the bundle, and the only way to know that is to assemble
// into a fresh directory and read back what landed. The shell script builds and
// swaps; this decides what a bundle contains.
//
// Every path arrives through the environment, so a test can assemble a bundle in a
// temporary directory from a temporary source tree without building Swift.
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function required(name) {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is not set, so the bundle cannot be assembled`);
  }
  return value;
}

/// Writes one file, creating the directory it lives in.
function write(target, contents, mode) {
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, contents);
  if (mode !== undefined) chmodSync(target, mode);
}

/// The engine the window drives, bundled rather than resolved from a path, so the
/// app cannot silently run a different engine than the one it was built with.
function assembleEngine(bundle, repository, launcher) {
  const engineDirectory = join(bundle, "Contents/Resources/engine");
  mkdirSync(engineDirectory, { recursive: true });
  cpSync(join(repository, "packages/cli/dist/index.cjs"), join(engineDirectory, "index.cjs"));
  // The engine is a Node bundle, so it needs an executable to point at. The
  // wrapper is written by the caller, which knows the bundle's final path, and
  // passed in so a test can supply its own.
  if (launcher !== undefined) write(join(engineDirectory, "run"), launcher, 0o755);
}

/// The pilot manifests the window loads, copied whole because the window reads
/// them by name and a partial copy is an app that starts and then cannot run.
function assemblePilots(bundle, repository) {
  const pilots = join(repository, "pilots");
  if (!existsSync(pilots)) return;
  cpSync(pilots, join(bundle, "Contents/Resources/pilots"), { recursive: true });
}

/// Assembles a bundle, and refuses to do so into a directory that already exists.
export function assembleBundle({ bundle, binary, packageRoot, repository, launcher }) {
  // The bundle is assembled into a directory that must not exist, so a previous
  // build's resources cannot be inherited. This is the property the whole module
  // exists to hold.
  if (existsSync(bundle)) {
    throw new Error(`${bundle} already exists, so its resources would be inherited rather than declared`);
  }
  mkdirSync(join(bundle, "Contents/MacOS"), { recursive: true });

  write(join(bundle, "Contents/MacOS/IntentLaneStudio"), readFileSync(binary));
  write(join(bundle, "Contents/Info.plist"), readFileSync(join(packageRoot, "Resources/Info.plist"), "utf8"));

  // No .lproj is copied: the window writes its labels inline and the bundle
  // declares no localization, so a strings table here would be a promise nobody
  // reads. `AppSurfaceTests` fails if a declared language ever comes back without
  // strings the views use, or if a strings file returns without a declared
  // language.
  assembleEngine(bundle, repository, launcher);
  assemblePilots(bundle, repository);
  return bundle;
}

/// The resources a finished bundle carries, as sorted relative paths. A test reads
/// this back and compares it to the list the sources declare, so a resource that
/// is no longer declared cannot be hiding in there.
export function bundleResources(bundle) {
  const root = join(bundle, "Contents");
  const found = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) walk(path);
      else found.push(path.slice(root.length + 1));
    }
  };
  walk(root);
  return found.sort();
}

const invokedDirectly =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  const launcherPath = process.env.INTENTLANE_STUDIO_LAUNCHER;
  assembleBundle({
    bundle: resolve(required("INTENTLANE_STUDIO_APP")),
    binary: resolve(required("INTENTLANE_STUDIO_BINARY")),
    packageRoot: resolve(required("INTENTLANE_STUDIO_PACKAGE")),
    repository: resolve(required("INTENTLANE_STUDIO_REPO")),
    launcher: launcherPath === undefined ? undefined : readFileSync(launcherPath, "utf8")
  });
}
