# IntentLane roadmap

This roadmap describes product gates, not calendar promises. The live CI workflow
owns automated status, and the claims registry owns what may be said publicly.

## Current foundation

The repository already contains:

- a versioned YAML contract and deterministic Swift generator;
- a read-only repository auditor with text, JSON, and SARIF output;
- native and bridged route qualification;
- capability, data, architecture, condition, quality, and target evidence;
- report comparison, evidence ledgers, and declared-claim verification;
- macOS and Expo fixtures exercised in CI;
- an unreleased Studio app that runs the same audit engine;
- source-visible schema work beyond the last npm release.

The latest published package is `@memolabs-apps/intentlane@0.1.0`. The repository
prepares the next prerelease without presenting it as published. The Expo plugin
is workspace-only until a tagged npm release exists.

## Gate 1: trustworthy public surface

Exit criteria:

- The root README has one installable quickstart using only a published package.
- Package metadata names the repository, issue tracker, license, and README.
- Public documents do not expose private paths, credentials, commercial targets,
  account failures, or unsent maintainer outreach.
- Bug, capability, pilot, pull request, conduct, and security paths are clear.
- Documentation claims are tied to code, CI, or a named evidence artifact.

## Gate 2: reproducible external audit

Exit criteria:

- A person outside the maintainer's development workflow installs the published
  CLI in a clean application repository.
- They produce a useful audit without private support or repository mutation.
- The elapsed time, confusing steps, and missing diagnostics are recorded.
- The public quickstart is corrected from that observation.

This gate is still open.

## Gate 3: versioned release

Exit criteria:

- A release commit is selected and tagged.
- The CLI version, package manifest, lockfile, documentation, and built artifact
  agree.
- The package is installed in a clean directory and its documented commands are
  exercised from the tarball.
- GitHub Release notes state what changed and what remains unavailable.
- The Expo plugin is published only under a scope the maintainer controls.

No source-visible command becomes part of the npm promise before this gate.

## Gate 4: named Apple journey

Exit criteria for one journey:

1. The app and platform are named.
2. The action and content entity are useful to that app.
3. The application-owned resolver, permissions, navigation, and side effects are tested.
4. Build and metadata evidence pass on the target SDK.
5. System-surface observations, if claimed, record their conditions.
6. A second person reproduces any claim described as verified.

A build, metadata file, or Core Spotlight index test does not substitute for a
Siri observation.

## Gate 5: bounded implementation offer

The audit may lead to an implementation only when it identifies a useful and
feasible journey. The implementation remains limited to one domain and two or
three named journeys, with customer-owned adapters and an evidence ledger.

Recurring verification, production observability, marketplace features, MCP,
Android, Flutter, and a hosted dashboard remain demand-gated future directions.

## Contribution priorities

1. Run the published auditor on public or non-confidential applications.
2. Report contract shapes that block a valuable named journey.
3. Improve diagnostics that do not state a clear next action.
4. Add focused Apple SDK fixtures with explicit availability.
5. Remove duplicated status from documents and point to live evidence instead.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development and review contract.
