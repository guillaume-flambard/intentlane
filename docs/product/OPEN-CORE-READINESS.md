# IntentLane open-source readiness

This inventory records the public contribution surface. Live CI owns current
test status. Package registries and tagged releases own publication status.

## Present

| Area | Public surface |
| --- | --- |
| License | MIT in `LICENSE` and package manifests. |
| Setup | `CONTRIBUTING.md` gives clean-checkout prerequisites and commands. |
| Intake | Pilot, bug, and capability issue forms plus a pull request template. |
| Conduct | `.github/CODE_OF_CONDUCT.md`. |
| Security | `.github/SECURITY.md` with a private-first reporting path. |
| Documentation | Root entry points plus the indexed `docs/` tree. |
| CI | Typecheck, tests, deterministic generation, Swift compilation, metadata extraction, and the Expo simulator build. |
| Contract | `intentlane.schema.json` and the normative `SPEC.md`. |
| Published CLI | `@memolabs-apps/intentlane@0.1.0`. |
| Next package metadata | `0.2.0-next.0` manifests on `main`; not published. |

## Still owned by a human decision

| Area | Open decision |
| --- | --- |
| Repository metadata | Description, homepage, topics, and social preview require GitHub settings changes. |
| Triage labels | Labels require repository mutation and are not requested by issue forms. |
| Branch protection | Required checks and merge policy require GitHub settings changes. |
| Release process | The maintainer must select the release commit, create the tag, publish npm artifacts, and write release notes. |
| Governance | The maintainer still owns scope and final merge decisions. A broader governance model is not claimed. |
| Security channel | Private vulnerability reporting is not enabled in repository settings, so the documented private contact remains the fallback. |
| External quickstart | No independent user has completed and timed the published path yet. |

## Release gate

Before a new npm version is described as available:

1. The CLI constant and package manifest must agree.
2. Package metadata and README must be present in the tarball.
3. The tarball must be installed in a clean directory.
4. Every command shown in the root quickstart must run from that installation.
5. The release commit must have a remote tag and GitHub Release.
6. Documentation must distinguish that release from newer source on `main`.

The Expo plugin remains workspace-only until these steps are completed under the
maintainer-owned package name.
