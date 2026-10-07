# Nextcloud iOS pilot: plan

Status: PLANNED. Written 2026-10-07 on the owner's decision: do the real integration on an open source app, locally,
prove the template works, then show a before and after video and offer to adapt it. Nothing is sold before the
machine gates below are green.

## Intent

**Completion sentence.** This pilot is complete when a build of Nextcloud iOS at the pinned revision, with the
IntentLane integration applied by one idempotent script, runs in the iOS 27 simulator against a local fixture server,
exposes three named actions to the system, and a recording shows each of them working, while the machine gates
(contract, generated, metadata, AppIntentsTesting, audit-diff) pass and every public claim stays within that evidence.

**Non-goals.** No Siri or Spotlight claim (no process can drive them, they stay human gates). No upstream pull
request. No Nextcloud server code. No offline sync changes. No second platform. No edit of Nextcloud's own tests.

**Upstream.** `nextcloud/ios`, `master`, `5f992a8f1e381478f5da68daea57b025007868a0`, 2026-10-07, GPL-3.0 with the App Store
exception. Deployment floor 17.0 (project). Xcode 27.0, iOS 27.0 simulator runtime, `xcodebuildmcp` available.

## The three journeys (playbook limit, one entity)

Entity: `NextcloudFile`, resolved from the account's local file metadata (Realm `tableMetadata`: `ocId`, `fileNameView`,
`serverUrl`, `account`, `favorite`).

| ID | Journey | Schema | Negative case |
|---|---|---|---|
| J1 | Search the user's files by name | `system.searchInApp` | no match returns an empty result, no crash, no network call without an account |
| J2 | Open a named file in the app | `system.open` | a file removed since the query is refused with a clear message |
| J3 | Mark a file as favorite (safe, reversible write) | native action on the entity | no account signed in is refused, an already favorite file is idempotent |

## System map (what is touched)

Entry points: `SceneDelegate.scene(_:openURLContexts:)` and `NCDeepLinkHandler` handle section deep links only
(`nextcloud://openFavorites` and similar), none opens one file. Data: Realm `tableMetadata` via `NCManageDatabase`.
Network: `NCNetworking+WebDAV.setFavorite(metadata:)` and NextcloudKit. Targets: the main `Nextcloud` target carries
intents (they need the database and the app process). Build: 41 Swift packages (Firebase, Realm, VLCKit, OpenSSL).
Generated code goes to a new folder of the main target. Hand written: an adapter file and a small hook patch.

## Acceptance (each one is a command or a recording, never "looks right")

- AC1 Contract and generated Swift valid and not stale (`intentlane validate`, `generate --check`).
- AC2 The pristine upstream builds for the iOS 27 simulator (baseline, before any change).
- AC3 The integrated build compiles and its `Metadata.appintents` lists exactly the three actions and the entity.
- AC4 `AppIntentsTesting` passes for J1, J2, J3 and the three negative cases, against a fixture account.
- AC5 `intentlane audit` on the integrated tree reports the three actions, and `audit-diff` baseline to candidate shows no regression.
- AC6 In the simulator against the fixture server, each action runs and the result is visible. Two recordings: before (no
  actions) and after (three actions). Recording method is itself a risk, see R3.
- AC7 `reproduce.sh` rebuilds all of it from a clean checkout. The pilot evidence ledger validates `--strict`.

## Work graph, with a stop rule at every gate

| ID | Pri | Work | Depends | Stop rule |
|---|---|---|---|---|
| W1 | P0 | Pristine workspace as a git worktree outside IntentLane, resolve the 41 packages, build for the simulator (AC2) | none | If it does not build after one focused diagnosis session, stop and report the exact error. Do not patch Nextcloud to make it build. |
| W2 | P0 | Local fixture server (Docker Nextcloud), test account, a few files, app logged in on the simulator | W1 | If login cannot be completed headless, stop and report. |
| W3 | P0 | `contract.yaml` for the entity and three intents, `intentlane generate` into the target (AC1) | W1 | none |
| W4 | P0 | Adapter (query, open, favorite) and the hook patch, applied by an idempotent script (AC3) | W2, W3 | If the entity cannot be resolved from the database in the intent process, stop and report. |
| W5 | P0 | `AppIntentsTesting` tests and negative cases (AC4) | W4 | none |
| W6 | P1 | Audit baseline and candidate, `audit-diff` (AC5), plus the machine gates script | W4 | none |
| W7 | P1 | Recordings before and after (AC6), evidence ledger, `reproduce.sh` (AC7) | W5, W6 | If the Shortcuts surface cannot be driven in the simulator, the recording shows the tests and the app result instead and says so. |

P0 and P1 define completion. Anything found on the way is a defect, a required step, or a follow-up, and it is written
here before it is done.

## Risks

- R1 (high) The fork does not build with Xcode 27 or iOS 27. Mitigation: W1 first, stop rule above.
- R2 (high) Intents run in a process where the Realm database is not usable or the account is not selected. Mitigation:
  intents live in the main target, W4 stop rule.
- R3 (medium) The Shortcuts and Spotlight surfaces cannot be driven or recorded in the simulator. Mitigation: AC4 is the
  contract proof, the recording is best effort and labelled.
- R4 (medium) 41 packages mean a long first build and several hundred MB of downloads from GitHub. Resolved into a
  directory outside the fork.
- R5 (low) The fixture server needs a local Docker image of about 1 GB.
- R6 (medium) Time. This is days, not hours. The plan stops at a gate rather than expanding.

## Human gates, never claimed by a machine

Siri phrase, Spotlight result, a second developer reproducing the pilot. They stay `pending` in the ledger.
