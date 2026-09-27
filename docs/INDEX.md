# IntentLane documentation index

The root of the repository holds six files and nothing else. This is the map to
the rest. Every path below is relative to the repository root, and the same
index is the list the link test checks, so a document cannot be moved without
this page and the test noticing.

## At the root

| File | What it is |
|---|---|
| [README.md](../README.md) | What IntentLane is, how to run it, and the measured status of the project. Start here. |
| [AGENTS.md](../AGENTS.md) | Instructions for an agent working in this repository. |
| [AGENT-GUIDE.md](../AGENT-GUIDE.md) | Product boundaries and the Apple naming rules. |
| [SPEC.md](../SPEC.md) | The normative contract. When the code and the spec disagree, the spec wins. |
| [ROADMAP.md](../ROADMAP.md) | The execution roadmap and its current ticket order. |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to work on this repository. |

## Product, offer, market

What is sold, to whom, and what is proven about the selling.

| File | What it is |
|---|---|
| [docs/product/PRD.md](product/PRD.md) | The product authority: what IntentLane is for. |
| [docs/product/AUDIT-OFFER.md](product/AUDIT-OFFER.md) | The fixed-scope audit as an offer. |
| [docs/product/AUDIT-GUIDE.md](product/AUDIT-GUIDE.md) | Every `intentlane audit` option, report block and diagnostic code. |
| [docs/product/AUDIT-REPORT-TEMPLATE.md](product/AUDIT-REPORT-TEMPLATE.md) | The skeleton for the client-facing readiness report built from an audit run. |
| [docs/product/CLIENT-QUICKSTART.md](product/CLIENT-QUICKSTART.md) | The client-facing integration guide. |
| [docs/product/CLIENT-READY-V1.md](product/CLIENT-READY-V1.md) | What "client-ready v1" means, with its exit criteria. |
| [docs/product/COMMERCIAL-READINESS.md](product/COMMERCIAL-READINESS.md) | The claim matrix and the conditions to launch. |
| [docs/product/OPEN-CORE-READINESS.md](product/OPEN-CORE-READINESS.md) | What must be true before the repository opens. |
| [docs/product/PUBLIC-PILOT-CANDIDATES.md](product/PUBLIC-PILOT-CANDIDATES.md) | Public applications worth piloting, and why. |
| [docs/product/MARKET-STUDY.md](product/MARKET-STUDY.md) | Market study. Its closing verdict predates the current product position and no longer describes it; the research sections still hold. |
| [docs/product/UNEXPLORED-ANGLES.md](product/UNEXPLORED-ANGLES.md) | Angles not to miss, to turn into auditor checks or hypotheses. |

## Architecture

| File | What it is |
|---|---|
| [docs/architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Repository layout and the role of each package. |
| [docs/architecture/MIGRATION.md](architecture/MIGRATION.md) | The schema version policy. |
| [docs/architecture/APP-AGNOSTIC-INTEGRATION-METHOD.md](architecture/APP-AGNOSTIC-INTEGRATION-METHOD.md) | How an app integrates whatever its UI framework. |

## Studio

The macOS environment for App Intents, built on the engine rather than beside it.

| File | What it is |
|---|---|
| [docs/studio/M0-ENGINE-PROTOCOL.md](studio/M0-ENGINE-PROTOCOL.md) | The engine contract Studio runs today, written from the shell that exists, and what is deliberately absent before a JSON-RPC layer is justified. |

## Specification and evidence

| File | What it is |
|---|---|
| [docs/spec/AUDITOR-SPEC.md](spec/AUDITOR-SPEC.md) | What the auditor asserts, and what it refuses to assert. |
| [docs/spec/CLAIMS-REGISTRY.md](spec/CLAIMS-REGISTRY.md) | Every public claim, its target platform and its proof. |
| [docs/spec/AUTOMATED-VERIFICATION.md](spec/AUTOMATED-VERIFICATION.md) | Which verification is automated and which is manual. |

`openspec/specs/` is the requirement contract: one directory per capability, each
with the requirements that are already true of the product. `openspec/changes/`
is the work in flight, and `openspec/changes/archive/` is the work that landed.

## Apple 27

Read the SDK before trusting any of this. It records what was verified, and
when it contradicts the installed SDK the SDK wins.

| File | What it is |
|---|---|
| [docs/apple/APPLE-27-APP-INTENTS-RESEARCH.md](apple/APPLE-27-APP-INTENTS-RESEARCH.md) | The App Intents surface of SDK 27. |
| [docs/apple/APPLE-27-OFFICIAL-SOURCE-UPDATE.md](apple/APPLE-27-OFFICIAL-SOURCE-UPDATE.md) | Revalidation against the installed SDK, the contract floor and surface gating. |
| [docs/apple/APPLE-27-SYSTEM-SEARCH-OPEN-IMPLEMENTATION-RESEARCH.md](apple/APPLE-27-SYSTEM-SEARCH-OPEN-IMPLEMENTATION-RESEARCH.md) | The system search and open path. |
| [docs/apple/APPLE-SCHEMA-REFERENCE.md](apple/APPLE-SCHEMA-REFERENCE.md) | The App Intents schema reference. |
| [docs/apple/SIRI-27-ROADMAP.md](apple/SIRI-27-ROADMAP.md) | The normative Siri 27 phase sequence. |

## Pilots

| File | What it is |
|---|---|
| [docs/pilots/PILOT-PLAYBOOK.md](pilots/PILOT-PLAYBOOK.md) | How to select, isolate and scale a pilot. |
| [docs/pilots/PILOT-NETNEWSWIRE.md](pilots/PILOT-NETNEWSWIRE.md) | The NetNewsWire pilot contract. |
| [docs/pilots/PILOT-NETNEWSWIRE-VALIDATION-RUNBOOK.md](pilots/PILOT-NETNEWSWIRE-VALIDATION-RUNBOOK.md) | Its measured validation runbook. |
| [docs/pilots/PILOT-IINA-DISCOVERY.md](pilots/PILOT-IINA-DISCOVERY.md) | The IINA discovery pilot. |
| [docs/pilots/NETNEWSWIRE-ACTION-BACKLOG.md](pilots/NETNEWSWIRE-ACTION-BACKLOG.md) | The actions the NetNewsWire pilot still owes. |
| [docs/pilots/MANUAL-SIRI-ACCEPTANCE.md](pilots/MANUAL-SIRI-ACCEPTANCE.md) | The manual acceptance steps automation cannot replace. |

## Also in the repository

- `research/` : dated reference material gathered from Apple documentation.
- `pilots/` : the per-pilot contracts, ledgers and evidence, as data.
- `openspec/` : the change proposals and their task lists. `SPEC.md` and the
  root files are the contract; `openspec` is the work in flight.
- `.agents/product-marketing.md` : audience, positioning, objections and
  commercial goals.
