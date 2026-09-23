import type { AuditDiagnosticCode } from "./audit.js";

export const PILOT_LEDGER_VERSION = "pilot-evidence/1.0";

export const PILOT_LEDGER_PLATFORMS = ["macos", "ios"] as const;

export type PilotLedgerPlatform = (typeof PILOT_LEDGER_PLATFORMS)[number];

export const PILOT_LEDGER_LAYERS = ["contract", "build", "shortcuts", "spotlight", "siri"] as const;

export type PilotLedgerLayer = (typeof PILOT_LEDGER_LAYERS)[number];

export const PILOT_LEDGER_CLAIMABLE_LAYERS = ["shortcuts", "spotlight", "siri"] as const;

export type PilotLedgerClaimableLayer = (typeof PILOT_LEDGER_CLAIMABLE_LAYERS)[number];

export const PILOT_LEDGER_LAYER_STATUSES = ["pass", "fail", "not-applicable", "blocked"] as const;

export type PilotLedgerLayerStatus = (typeof PILOT_LEDGER_LAYER_STATUSES)[number];

export const PILOT_LEDGER_REQUIRED_LAYERS = ["contract", "build"] as const;

export type PilotLedgerRiskEvidence = Readonly<{
  confirmation: boolean;
  authentication: boolean;
  ownership: boolean;
}>;

export type PilotLedgerJourney = Readonly<{
  id: string;
  claimed: readonly PilotLedgerClaimableLayer[];
  layers: Readonly<Record<PilotLedgerLayer, PilotLedgerLayerStatus>>;
  risky: boolean;
  riskEvidence?: PilotLedgerRiskEvidence;
}>;

export type PilotLedgerReproduction = Readonly<{
  by: string;
  status: PilotLedgerLayerStatus;
}>;

export type PilotLedger = Readonly<{
  schema: typeof PILOT_LEDGER_VERSION;
  pilot: string;
  platform: PilotLedgerPlatform;
  revision: string;
  conditions: Readonly<Record<string, string>>;
  journeys: readonly PilotLedgerJourney[];
  reproduction: PilotLedgerReproduction;
  artifacts?: Readonly<{ baseline?: string; delta?: string }>;
}>;

export type PilotLedgerStatus = "verified" | "unverified";

export type PilotLedgerDiagnosticCode = Extract<AuditDiagnosticCode, "ILA173" | "ILA174" | "ILA175">;

export type PilotLedgerDiagnostic = Readonly<{
  code: PilotLedgerDiagnosticCode;
  message: string;
  path: string;
}>;

export type PilotLedgerResult = Readonly<{
  status: PilotLedgerStatus;
  diagnostics: readonly PilotLedgerDiagnostic[];
  summary: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function invalid(code: PilotLedgerDiagnosticCode, message: string, path: string): PilotLedgerDiagnostic {
  return { code, message, path };
}

function checkLayers(value: unknown, path: string, errors: PilotLedgerDiagnostic[]): Record<PilotLedgerLayer, PilotLedgerLayerStatus> | undefined {
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "Evidence layers must be an object.", path));
    return undefined;
  }
  const layers = {} as Record<PilotLedgerLayer, PilotLedgerLayerStatus>;
  for (const layer of PILOT_LEDGER_LAYERS) {
    const status = value[layer];
    if (status === undefined) continue;
    if (typeof status !== "string" || !(PILOT_LEDGER_LAYER_STATUSES as readonly string[]).includes(status)) {
      errors.push(invalid("ILA173", `Layer '${layer}' must be one of: ${PILOT_LEDGER_LAYER_STATUSES.join(", ")}.`, `${path}.${layer}`));
      continue;
    }
    layers[layer] = status as PilotLedgerLayerStatus;
  }
  for (const key of Object.keys(value)) {
    if (!(PILOT_LEDGER_LAYERS as readonly string[]).includes(key)) {
      errors.push(invalid("ILA173", `Unknown evidence layer '${key}'.`, `${path}.${key}`));
    }
  }
  return layers;
}

function checkJourney(value: unknown, path: string, errors: PilotLedgerDiagnostic[]): PilotLedgerJourney | undefined {
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "A journey must be an object.", path));
    return undefined;
  }
  let valid = true;
  if (!isNonEmptyString(value["id"])) {
    errors.push(invalid("ILA173", "A journey must name a non-empty id.", `${path}.id`));
    valid = false;
  }
  const claimedRaw = value["claimed"] ?? [];
  const claimed: PilotLedgerClaimableLayer[] = [];
  if (!Array.isArray(claimedRaw)) {
    errors.push(invalid("ILA173", "Claimed surfaces must be a list.", `${path}.claimed`));
    valid = false;
  } else {
    claimedRaw.forEach((entry, index) => {
      if (typeof entry !== "string" || !(PILOT_LEDGER_CLAIMABLE_LAYERS as readonly string[]).includes(entry)) {
        errors.push(
          invalid("ILA173", `Claimed surface must be one of: ${PILOT_LEDGER_CLAIMABLE_LAYERS.join(", ")}.`, `${path}.claimed[${index}]`)
        );
        valid = false;
        return;
      }
      claimed.push(entry as PilotLedgerClaimableLayer);
    });
  }
  const layers = checkLayers(value["layers"], `${path}.layers`, errors);
  if (layers === undefined) valid = false;
  const risky = value["risky"] ?? false;
  if (typeof risky !== "boolean") {
    errors.push(invalid("ILA173", "A journey risk flag must be a boolean.", `${path}.risky`));
    valid = false;
  }
  let riskEvidence: PilotLedgerRiskEvidence | undefined;
  const riskRaw = value["riskEvidence"];
  if (riskRaw !== undefined) {
    if (!isRecord(riskRaw)) {
      errors.push(invalid("ILA173", "Risk evidence must be an object.", `${path}.riskEvidence`));
      valid = false;
    } else {
      const entries: Record<string, boolean> = {};
      for (const key of ["confirmation", "authentication", "ownership"] as const) {
        const entry = riskRaw[key];
        if (typeof entry !== "boolean") {
          errors.push(invalid("ILA173", `Risk evidence '${key}' must be a boolean.`, `${path}.riskEvidence.${key}`));
          valid = false;
        } else {
          entries[key] = entry;
        }
      }
      if (entries["confirmation"] !== undefined && entries["authentication"] !== undefined && entries["ownership"] !== undefined) {
        riskEvidence = {
          confirmation: entries["confirmation"] as boolean,
          authentication: entries["authentication"] as boolean,
          ownership: entries["ownership"] as boolean
        };
      }
    }
  }
  if (!valid || layers === undefined || !isNonEmptyString(value["id"])) return undefined;
  const journey: PilotLedgerJourney = {
    id: value["id"],
    claimed,
    layers: layers as Readonly<Record<PilotLedgerLayer, PilotLedgerLayerStatus>>,
    risky: risky as boolean,
    ...(riskEvidence ? { riskEvidence } : {})
  };
  return journey;
}

function checkReproduction(value: unknown, errors: PilotLedgerDiagnostic[]): PilotLedgerReproduction | undefined {
  if (value === undefined) {
    errors.push(invalid("ILA175", "A ledger needs an independent reproduction before it can read verified.", "reproduction"));
    return undefined;
  }
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "A reproduction must be an object.", "reproduction"));
    return undefined;
  }
  let valid = true;
  if (!isNonEmptyString(value["by"])) {
    errors.push(invalid("ILA173", "A reproduction must name who reproduced it.", "reproduction.by"));
    valid = false;
  }
  const status = value["status"];
  if (typeof status !== "string" || !(PILOT_LEDGER_LAYER_STATUSES as readonly string[]).includes(status)) {
    errors.push(invalid("ILA173", `A reproduction status must be one of: ${PILOT_LEDGER_LAYER_STATUSES.join(", ")}.`, "reproduction.status"));
    valid = false;
  }
  if (!valid || !isNonEmptyString(value["by"])) return undefined;
  return { by: value["by"], status: status as PilotLedgerLayerStatus };
}

function checkLedger(value: unknown, errors: PilotLedgerDiagnostic[]): PilotLedger | undefined {
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "A pilot evidence ledger must be an object.", "root"));
    return undefined;
  }
  let valid = true;
  if (value["schema"] !== PILOT_LEDGER_VERSION) {
    errors.push(invalid("ILA173", `A ledger schema must be '${PILOT_LEDGER_VERSION}'.`, "schema"));
    valid = false;
  }
  if (!isNonEmptyString(value["pilot"])) {
    errors.push(invalid("ILA173", "A ledger must name a non-empty pilot.", "pilot"));
    valid = false;
  }
  if (typeof value["platform"] !== "string" || !(PILOT_LEDGER_PLATFORMS as readonly string[]).includes(value["platform"])) {
    errors.push(invalid("ILA173", `A ledger platform must be one of: ${PILOT_LEDGER_PLATFORMS.join(", ")}.`, "platform"));
    valid = false;
  }
  if (!isNonEmptyString(value["revision"])) {
    errors.push(invalid("ILA173", "A ledger must name the observed upstream revision.", "revision"));
    valid = false;
  }
  const conditions = value["conditions"];
  if (!isRecord(conditions) || Object.keys(conditions).length === 0) {
    errors.push(invalid("ILA173", "A ledger must record observed conditions.", "conditions"));
    valid = false;
  } else {
    for (const [key, entry] of Object.entries(conditions)) {
      if (!isNonEmptyString(entry)) {
        errors.push(invalid("ILA173", `Condition '${key}' must record a non-empty observation.`, `conditions.${key}`));
        valid = false;
      }
    }
  }
  const journeysRaw = value["journeys"];
  const journeys: PilotLedgerJourney[] = [];
  if (!Array.isArray(journeysRaw) || journeysRaw.length === 0) {
    errors.push(invalid("ILA173", "A ledger must describe at least one journey.", "journeys"));
    valid = false;
  } else if (journeysRaw.length > 3) {
    errors.push(invalid("ILA173", "A ledger holds at most three journeys.", "journeys"));
    valid = false;
  } else {
    journeysRaw.forEach((entry, index) => {
      const journey = checkJourney(entry, `journeys[${index}]`, errors);
      if (journey === undefined) {
        valid = false;
        return;
      }
      journeys.push(journey);
    });
    const ids = journeys.map((journey) => journey.id);
    if (new Set(ids).size !== ids.length) {
      errors.push(invalid("ILA173", "Journey ids must be unique.", "journeys"));
      valid = false;
    }
  }
  const artifacts = value["artifacts"];
  let artifactRefs: Readonly<{ baseline?: string; delta?: string }> | undefined;
  if (artifacts !== undefined) {
    if (!isRecord(artifacts)) {
      errors.push(invalid("ILA173", "Artifact references must be an object.", "artifacts"));
      valid = false;
    } else {
      const refs: { baseline?: string; delta?: string } = {};
      for (const key of ["baseline", "delta"] as const) {
        const entry = artifacts[key];
        if (entry === undefined) continue;
        if (!isNonEmptyString(entry)) {
          errors.push(invalid("ILA173", `Artifact reference '${key}' must be a non-empty relative path.`, `artifacts.${key}`));
          valid = false;
          continue;
        }
        if (entry.startsWith("/")) {
          errors.push(invalid("ILA173", `Artifact reference '${key}' must stay relative to the ledger.`, `artifacts.${key}`));
          valid = false;
          continue;
        }
        refs[key] = entry;
      }
      artifactRefs = refs;
    }
  }
  const reproduction = checkReproduction(value["reproduction"], errors);
  if (reproduction === undefined) valid = false;
  if (
    !valid ||
    !isNonEmptyString(value["pilot"]) ||
    !isNonEmptyString(value["revision"]) ||
    !isRecord(conditions) ||
    reproduction === undefined
  ) {
    return undefined;
  }
  const platform = value["platform"] as PilotLedgerPlatform;
  const recorded: Record<string, string> = {};
  for (const [key, entry] of Object.entries(conditions)) {
    if (isNonEmptyString(entry)) recorded[key] = entry;
  }
  return {
    schema: PILOT_LEDGER_VERSION,
    pilot: value["pilot"],
    platform,
    revision: value["revision"],
    conditions: recorded,
    journeys,
    reproduction,
    ...(artifactRefs ? { artifacts: artifactRefs } : {})
  };
}

function requiredLayers(journey: PilotLedgerJourney): PilotLedgerLayer[] {
  return [...PILOT_LEDGER_REQUIRED_LAYERS, ...journey.claimed];
}

function summarizeVerified(ledger: PilotLedger): string {
  const layers = [...new Set(ledger.journeys.flatMap((journey) => requiredLayers(journey)))];
  const names = ledger.journeys.map((journey) => `'${journey.id}'`).join(", ");
  return (
    `Pilot '${ledger.pilot}' (${ledger.platform}): verified. ` +
    `${ledger.journeys.length} journey(s) ${names} pass required layers ${layers.join(", ")} ` +
    `and independent reproduction passes (by ${ledger.reproduction.by}).`
  );
}

function summarizeUnverified(
  ledger: PilotLedger | undefined,
  diagnostics: readonly PilotLedgerDiagnostic[]
): string {
  const head = ledger ? `Pilot '${ledger.pilot}' (${ledger.platform}): unverified.` : "Pilot evidence ledger: unverified.";
  const blocking = diagnostics.map((item) => `${item.path}: ${item.message}`).join(" ");
  return `${head} Blocking: ${blocking}`;
}

export function validatePilotLedger(value: unknown): PilotLedgerResult {
  const structural: PilotLedgerDiagnostic[] = [];
  const ledger = checkLedger(value, structural);
  if (ledger === undefined) {
    return { status: "unverified", diagnostics: structural, summary: summarizeUnverified(undefined, structural) };
  }
  const diagnostics: PilotLedgerDiagnostic[] = [...structural];
  for (const journey of ledger.journeys) {
    for (const layer of requiredLayers(journey)) {
      const status = journey.layers[layer];
      if (status !== "pass") {
        diagnostics.push(
          invalid(
            "ILA174",
            `Journey '${journey.id}' needs layer '${layer}' at pass, found '${status ?? "missing"}'.`,
            `journeys.${journey.id}.layers.${layer}`
          )
        );
      }
    }
    if (journey.risky) {
      const evidence = journey.riskEvidence;
      const missing = (["confirmation", "authentication", "ownership"] as const).filter((key) => evidence?.[key] !== true);
      if (missing.length > 0) {
        diagnostics.push(
          invalid(
            "ILA174",
            `Risky journey '${journey.id}' misses risk evidence: ${missing.join(", ")}.`,
            `journeys.${journey.id}.riskEvidence`
          )
        );
      }
    }
  }
  if (ledger.reproduction.status !== "pass") {
    diagnostics.push(
      invalid(
        "ILA175",
        `Independent reproduction by '${ledger.reproduction.by}' is '${ledger.reproduction.status}', expected pass.`,
        "reproduction.status"
      )
    );
  }
  if (diagnostics.length > 0) {
    return { status: "unverified", diagnostics, summary: summarizeUnverified(ledger, diagnostics) };
  }
  return { status: "verified", diagnostics: [], summary: summarizeVerified(ledger) };
}
