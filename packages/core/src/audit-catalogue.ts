import type { AuditEvidenceKind } from "./audit.js";

import { compareVersions } from "./audit-sdk.js";

export const CAPABILITY_CATALOGUE_VERSION = "27.0";

export const CAPABILITY_GROUPS = [
  "foundation",
  "semantics",
  "discovery",
  "cross-app",
  "relevance",
  "execution",
  "proof"
] as const;
export type CapabilityGroup = (typeof CAPABILITY_GROUPS)[number];

export const ADVANCED_CAPABILITY_GROUPS = ["discovery", "cross-app", "relevance", "execution"] as const;
export type AdvancedCapabilityGroup = (typeof ADVANCED_CAPABILITY_GROUPS)[number];

export function isAdvancedCapability(record: CapabilityRecord): boolean {
  return (ADVANCED_CAPABILITY_GROUPS as readonly string[]).includes(record.group);
}

export const CAPABILITY_CLAIMS = ["auditor", "build", "surfaces", "siri-journey", "domain-package"] as const;
export type CapabilityClaim = (typeof CAPABILITY_CLAIMS)[number];

export const SCHEMA_CLASSIFICATIONS = ["siri-eligible", "shortcuts-only", "unknown"] as const;
export type SchemaClassification = (typeof SCHEMA_CLASSIFICATIONS)[number];

export type CapabilityAvailability = Readonly<{ macos?: string; ios?: string }>;

export type CapabilityRecord = Readonly<{
  id: string;
  group: CapabilityGroup;
  surface: string;
  availability: CapabilityAvailability;
  companions: readonly string[];
  evidence: readonly AuditEvidenceKind[];
  claim: CapabilityClaim;
  security: string;
  classification?: SchemaClassification;
}>;

export const CAPABILITY_CATALOGUE: readonly CapabilityRecord[] = [
  {
    id: "foundation.app-intent",
    group: "foundation",
    surface: "AppIntent",
    availability: { macos: "13.0", ios: "16.0" },
    companions: [],
    evidence: ["swift", "metadata"],
    claim: "build",
    security: "low"
  },
  {
    id: "foundation.parameters",
    group: "foundation",
    surface: "@Parameter",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift"],
    claim: "build",
    security: "low"
  },
  {
    id: "foundation.result-traits",
    group: "foundation",
    surface: "IntentResult traits",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "metadata"],
    claim: "build",
    security: "low"
  },
  {
    id: "foundation.shortcuts-provider",
    group: "foundation",
    surface: "AppShortcutsProvider",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "metadata"],
    claim: "surfaces",
    security: "low"
  },
  {
    id: "foundation.localization",
    group: "foundation",
    surface: "LocalizedStringResource",
    availability: { macos: "13.0", ios: "16.0" },
    companions: [],
    evidence: ["swift"],
    claim: "build",
    security: "low"
  },
  {
    id: "semantics.app-schema",
    group: "semantics",
    surface: "App Schema conformance",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "metadata"],
    claim: "siri-journey",
    security: "low",
    classification: "siri-eligible"
  },
  {
    id: "semantics.schema-intent",
    group: "semantics",
    surface: "@AppIntent(schema:)",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["semantics.app-schema"],
    evidence: ["swift", "metadata"],
    claim: "siri-journey",
    security: "low",
    classification: "siri-eligible"
  },
  {
    id: "semantics.schema-entity",
    group: "semantics",
    surface: "@AppEntity(schema:)",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["semantics.app-schema", "discovery.entity-query"],
    evidence: ["swift", "metadata"],
    claim: "siri-journey",
    security: "low",
    classification: "siri-eligible"
  },
  {
    id: "semantics.schema-enum",
    group: "semantics",
    surface: "@AppEnum(schema:)",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["semantics.app-schema"],
    evidence: ["swift", "metadata"],
    claim: "siri-journey",
    security: "low",
    classification: "siri-eligible"
  },
  {
    id: "semantics.schema-completeness",
    group: "semantics",
    surface: "schema parameter and result completeness",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["semantics.schema-intent", "semantics.schema-entity"],
    evidence: ["swift", "metadata", "test"],
    claim: "domain-package",
    security: "medium",
    classification: "siri-eligible"
  },
  {
    id: "semantics.shortcuts-only-schema",
    group: "semantics",
    surface: "Shortcuts automation schema",
    availability: { macos: "27.0", ios: "27.0" },
    companions: [],
    evidence: ["swift", "metadata"],
    claim: "surfaces",
    security: "low",
    classification: "shortcuts-only"
  },
  {
    id: "discovery.entity-query",
    group: "discovery",
    surface: "EntityQuery",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift"],
    claim: "build",
    security: "low"
  },
  {
    id: "discovery.intent-value-query",
    group: "discovery",
    surface: "IntentValueQuery",
    availability: { macos: "26.0", ios: "26.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift"],
    claim: "build",
    security: "medium"
  },
  {
    id: "discovery.indexed-entity",
    group: "discovery",
    surface: "IndexedEntity",
    availability: { macos: "15.0", ios: "18.0" },
    companions: ["discovery.entity-query", "discovery.spotlight-lifecycle"],
    evidence: ["swift", "metadata", "test"],
    claim: "domain-package",
    security: "high"
  },
  {
    id: "discovery.spotlight-lifecycle",
    group: "discovery",
    surface: "Spotlight indexing lifecycle",
    availability: { macos: "15.0", ios: "18.0" },
    companions: ["discovery.indexed-entity"],
    evidence: ["swift", "test"],
    claim: "surfaces",
    security: "high"
  },
  {
    id: "cross-app.transferable",
    group: "cross-app",
    surface: "Transferable value",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "test"],
    claim: "domain-package",
    security: "medium"
  },
  {
    id: "cross-app.view-annotations",
    group: "cross-app",
    surface: "onscreen view annotations",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["semantics.schema-entity"],
    evidence: ["swift"],
    claim: "domain-package",
    security: "medium"
  },
  {
    id: "relevance.donations",
    group: "relevance",
    surface: "intent donations",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "test"],
    claim: "domain-package",
    security: "medium"
  },
  {
    id: "relevance.relevant-entities",
    group: "relevance",
    surface: "RelevantEntities",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["discovery.entity-query"],
    evidence: ["swift", "test"],
    claim: "domain-package",
    security: "medium"
  },
  {
    id: "relevance.syncable-entity",
    group: "relevance",
    surface: "SyncableEntity",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["discovery.entity-query"],
    evidence: ["swift", "test"],
    claim: "domain-package",
    security: "high"
  },
  {
    id: "execution.native-handler",
    group: "execution",
    surface: "app-owned perform implementation",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "test"],
    claim: "build",
    security: "medium"
  },
  {
    id: "execution.long-running",
    group: "execution",
    surface: "long running intent",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["execution.native-handler"],
    evidence: ["swift", "test"],
    claim: "domain-package",
    security: "medium"
  },
  {
    id: "execution.live-activity",
    group: "execution",
    surface: "LiveActivityIntent",
    availability: { ios: "17.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift"],
    claim: "domain-package",
    security: "medium"
  },
  {
    id: "proof.confirmation",
    group: "proof",
    surface: "requestConfirmation",
    availability: { macos: "15.0", ios: "18.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "test"],
    claim: "build",
    security: "high"
  },
  {
    id: "proof.authentication",
    group: "proof",
    surface: "IntentAuthenticationPolicy",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.app-intent"],
    evidence: ["swift", "metadata", "test"],
    claim: "build",
    security: "high"
  },
  {
    id: "proof.app-intents-testing",
    group: "proof",
    surface: "AppIntentsTesting",
    availability: { macos: "15.0", ios: "18.0" },
    companions: ["execution.native-handler"],
    evidence: ["test"],
    claim: "domain-package",
    security: "low"
  },
  {
    id: "proof.shortcuts-surface",
    group: "proof",
    surface: "Shortcuts app surface",
    availability: { macos: "13.0", ios: "16.0" },
    companions: ["foundation.shortcuts-provider"],
    evidence: ["metadata"],
    claim: "surfaces",
    security: "low"
  },
  {
    id: "proof.spotlight-surface",
    group: "proof",
    surface: "Spotlight content surface",
    availability: { macos: "15.0", ios: "18.0" },
    companions: ["discovery.indexed-entity"],
    evidence: ["metadata", "test"],
    claim: "surfaces",
    security: "high"
  },
  {
    id: "proof.siri-surface",
    group: "proof",
    surface: "Siri and Apple Intelligence surface",
    availability: { macos: "27.0", ios: "27.0" },
    companions: ["semantics.app-schema"],
    evidence: ["test", "metadata"],
    claim: "siri-journey",
    security: "medium",
    classification: "siri-eligible"
  }
];

export function findCapability(id: string): CapabilityRecord | undefined {
  return CAPABILITY_CATALOGUE.find((record) => record.id === id);
}

export function capabilitiesInGroup(group: CapabilityGroup): readonly CapabilityRecord[] {
  return CAPABILITY_CATALOGUE.filter((record) => record.group === group);
}

export function availableOn(record: CapabilityRecord, platform: "macos" | "ios"): string | undefined {
  return platform === "macos" ? record.availability.macos : record.availability.ios;
}

export const AUDIT_CATALOGUE_STATES = ["current", "newer", "older", "unknown"] as const;

export type AuditCatalogueState = (typeof AUDIT_CATALOGUE_STATES)[number];

export type AuditCatalogueReport = Readonly<{
  version: string;
  capabilities: number;
  sdkVersion?: string;
  state: AuditCatalogueState;
  nextAction: string;
}>;

export function describeCatalogue(sdkVersion?: string): AuditCatalogueReport {
  const capabilities = CAPABILITY_CATALOGUE.length;
  if (!sdkVersion) {
    return {
      version: CAPABILITY_CATALOGUE_VERSION,
      capabilities,
      state: "unknown",
      nextAction: `Pass --sdk-path to compare the catalogue (${CAPABILITY_CATALOGUE_VERSION}) with the installed SDK.`
    };
  }
  const difference = compareVersions(CAPABILITY_CATALOGUE_VERSION, sdkVersion);
  const state: AuditCatalogueState = difference === 0 ? "current" : difference > 0 ? "newer" : "older";
  const nextAction =
    state === "current"
      ? `Keep the catalogue in step with the installed SDK (${sdkVersion}).`
      : state === "older"
        ? `Refresh the catalogue, which was derived from ${CAPABILITY_CATALOGUE_VERSION}, before trusting a capability the SDK ${sdkVersion} may ship.`
        : `The inspected SDK (${sdkVersion}) is older than the catalogue (${CAPABILITY_CATALOGUE_VERSION}), so a capability can read unsupported because of the SDK.`;
  return { version: CAPABILITY_CATALOGUE_VERSION, capabilities, sdkVersion, state, nextAction };
}
