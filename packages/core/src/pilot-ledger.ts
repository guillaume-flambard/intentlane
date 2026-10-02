import type { AuditDiagnosticCode } from "./audit.js";
import { claim, isPilotClaimId, type PilotClaimId } from "./claims.js";
import { isNonEmptyString, isRecord } from "./guards.js";

export const PILOT_LEDGER_VERSION = "pilot-evidence/1.0";

// A ledger that records more than one observation of the same pilot carries them
// as an array, and names the one whose result is current. Layers were always
// optional, so a first observation stays a valid 1.0 ledger; 1.1 is the same
// document with observations around it.
export const PILOT_LEDGER_VERSION_OBSERVATIONS = "pilot-evidence/1.1";

export const PILOT_LEDGER_VERSIONS = [PILOT_LEDGER_VERSION, PILOT_LEDGER_VERSION_OBSERVATIONS] as const;

// The id given to the single observation of a 1.0 ledger, so the internal shape
// is always a list of observations.
const PILOT_LEDGER_IMPLICIT_OBSERVATION = "observation-1";

export type PilotLedgerSchema = (typeof PILOT_LEDGER_VERSIONS)[number];

export const PILOT_LEDGER_PLATFORMS = ["macos", "ios"] as const;

export type PilotLedgerPlatform = (typeof PILOT_LEDGER_PLATFORMS)[number];

export const PILOT_LEDGER_LAYERS = [
  "contract",
  "build",
  "metadata",
  "runtime",
  "query",
  "spotlight",
  "annotations",
  "shortcuts",
  "siri"
] as const;

export type PilotLedgerLayer = (typeof PILOT_LEDGER_LAYERS)[number];

export const PILOT_LEDGER_CLAIMABLE_LAYERS = [
  "metadata",
  "runtime",
  "query",
  "spotlight",
  "annotations",
  "shortcuts",
  "siri"
] as const;

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
  claims?: readonly PilotClaimId[];
  layers: Readonly<Record<PilotLedgerLayer, PilotLedgerLayerStatus>>;
  risky: boolean;
  riskEvidence?: PilotLedgerRiskEvidence;
}>;

export type PilotLedgerReproduction = Readonly<{
  by: string;
  status: PilotLedgerLayerStatus;
}>;

export type PilotLedgerArtifacts = Readonly<{ baseline?: string; delta?: string }>;

/**
 * One observation of a pilot: the environment it ran under and what it saw.
 * A ledger holds one (schema 1.0) or several (schema 1.1); see `current`.
 */
export type PilotLedgerObservation = Readonly<{
  id: string;
  revision: string;
  conditions: Readonly<Record<string, string>>;
  journeys: readonly PilotLedgerJourney[];
  reproduction: PilotLedgerReproduction;
  artifacts?: PilotLedgerArtifacts;
}>;

export type PilotLedger = Readonly<{
  schema: PilotLedgerSchema;
  pilot: string;
  platform: PilotLedgerPlatform;
  /** The observation whose result the ledger reports. */
  current: string;
  /** Every observation, in recorded order. Earlier ones are preserved history. */
  observations: readonly PilotLedgerObservation[];
  // The current observation, flattened, so a single-observation reader keeps
  // reading the same fields it always did.
  revision: string;
  conditions: Readonly<Record<string, string>>;
  journeys: readonly PilotLedgerJourney[];
  reproduction: PilotLedgerReproduction;
  artifacts?: PilotLedgerArtifacts;
}>;

export type PilotLedgerStatus = "verified" | "unverified";

export type PilotLedgerDiagnosticCode = Extract<AuditDiagnosticCode, "ILA173" | "ILA174" | "ILA175" | "ILA181" | "ILA182">;

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

function invalid(code: PilotLedgerDiagnosticCode, message: string, path: string): PilotLedgerDiagnostic {
  return { code, message, path };
}

function at(prefix: string, suffix: string): string {
  return prefix === "" ? suffix : `${prefix}.${suffix}`;
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
  let claims: PilotClaimId[] | undefined;
  const claimsRaw = value["claims"];
  if (claimsRaw !== undefined) {
    if (!Array.isArray(claimsRaw)) {
      errors.push(invalid("ILA181", "A journey claim list must be a list.", `${path}.claims`));
      valid = false;
    } else {
      const known: PilotClaimId[] = [];
      claimsRaw.forEach((entry, index) => {
        if (typeof entry !== "string" || !isPilotClaimId(entry)) {
          errors.push(
            invalid(
              "ILA181",
              `Journey claim must be a known claim id. A ledger names what it proves, so it may not name a claim that does not exist.`,
              `${path}.claims[${index}]`
            )
          );
          valid = false;
          return;
        }
        if (known.includes(entry)) {
          errors.push(invalid("ILA181", `Journey claim '${entry}' is named twice.`, `${path}.claims[${index}]`));
          valid = false;
          return;
        }
        known.push(entry);
      });
      const held = new Set<string>([...claimed, ...PILOT_LEDGER_REQUIRED_LAYERS]);
      for (const id of known) {
        const uncovered = claim(id).requires.filter((layer) => !held.has(layer));
        if (uncovered.length > 0) {
          errors.push(
            invalid(
              "ILA182",
              `Claim '${id}' requires the layer(s) ${uncovered.join(", ")}, which this journey neither claims nor holds by default. A claim whose proof the journey cannot hold cannot be demonstrated by it.`,
              `${path}.claims[${known.indexOf(id)}]`
            )
          );
          valid = false;
        }
      }
      claims = known;
    }
  }

  if (!valid || layers === undefined || !isNonEmptyString(value["id"])) return undefined;
  const journey: PilotLedgerJourney = {
    id: value["id"],
    claimed,
    ...(claims ? { claims } : {}),
    layers: layers as Readonly<Record<PilotLedgerLayer, PilotLedgerLayerStatus>>,
    risky: risky as boolean,
    ...(riskEvidence ? { riskEvidence } : {})
  };
  return journey;
}

function checkReproduction(value: unknown, path: string, errors: PilotLedgerDiagnostic[]): PilotLedgerReproduction | undefined {
  if (value === undefined) {
    errors.push(invalid("ILA175", "A ledger needs an independent reproduction before it can read verified.", at(path, "reproduction")));
    return undefined;
  }
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "A reproduction must be an object.", at(path, "reproduction")));
    return undefined;
  }
  let valid = true;
  if (!isNonEmptyString(value["by"])) {
    errors.push(invalid("ILA173", "A reproduction must name who reproduced it.", at(path, "reproduction.by")));
    valid = false;
  }
  const status = value["status"];
  if (typeof status !== "string" || !(PILOT_LEDGER_LAYER_STATUSES as readonly string[]).includes(status)) {
    errors.push(invalid("ILA173", `A reproduction status must be one of: ${PILOT_LEDGER_LAYER_STATUSES.join(", ")}.`, at(path, "reproduction.status")));
    valid = false;
  }
  if (!valid || !isNonEmptyString(value["by"])) return undefined;
  return { by: value["by"], status: status as PilotLedgerLayerStatus };
}

function checkArtifacts(value: unknown, path: string, errors: PilotLedgerDiagnostic[]): PilotLedgerArtifacts | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "Artifact references must be an object.", at(path, "artifacts")));
    return undefined;
  }
  const refs: { baseline?: string; delta?: string } = {};
  for (const key of ["baseline", "delta"] as const) {
    const entry = value[key];
    if (entry === undefined) continue;
    if (!isNonEmptyString(entry)) {
      errors.push(invalid("ILA173", `Artifact reference '${key}' must be a non-empty relative path.`, at(path, `artifacts.${key}`)));
      continue;
    }
    if (entry.startsWith("/")) {
      errors.push(invalid("ILA173", `Artifact reference '${key}' must stay relative to the ledger.`, at(path, `artifacts.${key}`)));
      continue;
    }
    refs[key] = entry;
  }
  return refs;
}

type ObservationFields = Omit<PilotLedgerObservation, "id">;

function checkObservation(value: unknown, path: string, errors: PilotLedgerDiagnostic[]): ObservationFields | undefined {
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "An observation must be an object.", path));
    return undefined;
  }
  let valid = true;
  if (!isNonEmptyString(value["revision"])) {
    errors.push(invalid("ILA173", "A ledger must name the observed upstream revision.", at(path, "revision")));
    valid = false;
  }
  const conditions = value["conditions"];
  const recorded: Record<string, string> = {};
  if (!isRecord(conditions) || Object.keys(conditions).length === 0) {
    errors.push(invalid("ILA173", "A ledger must record observed conditions.", at(path, "conditions")));
    valid = false;
  } else {
    for (const [key, entry] of Object.entries(conditions)) {
      if (!isNonEmptyString(entry)) {
        errors.push(invalid("ILA173", `Condition '${key}' must record a non-empty observation.`, at(path, `conditions.${key}`)));
        valid = false;
        continue;
      }
      recorded[key] = entry;
    }
  }
  const journeysRaw = value["journeys"];
  const journeys: PilotLedgerJourney[] = [];
  if (!Array.isArray(journeysRaw) || journeysRaw.length === 0) {
    errors.push(invalid("ILA173", "A ledger must describe at least one journey.", at(path, "journeys")));
    valid = false;
  } else if (journeysRaw.length > 3) {
    errors.push(invalid("ILA173", "A ledger holds at most three journeys.", at(path, "journeys")));
    valid = false;
  } else {
    journeysRaw.forEach((entry, index) => {
      const journey = checkJourney(entry, at(path, `journeys[${index}]`), errors);
      if (journey === undefined) {
        valid = false;
        return;
      }
      journeys.push(journey);
    });
    const ids = journeys.map((journey) => journey.id);
    if (new Set(ids).size !== ids.length) {
      errors.push(invalid("ILA173", "Journey ids must be unique.", at(path, "journeys")));
      valid = false;
    }
  }
  const artifacts = checkArtifacts(value["artifacts"], path, errors);
  const reproduction = checkReproduction(value["reproduction"], path, errors);
  if (reproduction === undefined) valid = false;
  if (!valid || !isNonEmptyString(value["revision"]) || reproduction === undefined) return undefined;
  return {
    revision: value["revision"],
    conditions: recorded,
    journeys,
    reproduction,
    ...(artifacts ? { artifacts } : {})
  };
}

function checkLedger(value: unknown, errors: PilotLedgerDiagnostic[]): PilotLedger | undefined {
  if (!isRecord(value)) {
    errors.push(invalid("ILA173", "A pilot evidence ledger must be an object.", "root"));
    return undefined;
  }
  const schema = value["schema"];
  if (typeof schema !== "string" || !(PILOT_LEDGER_VERSIONS as readonly string[]).includes(schema)) {
    errors.push(invalid("ILA173", `A ledger schema must be one of: ${PILOT_LEDGER_VERSIONS.join(", ")}.`, "schema"));
    return undefined;
  }
  let valid = true;
  if (!isNonEmptyString(value["pilot"])) {
    errors.push(invalid("ILA173", "A ledger must name a non-empty pilot.", "pilot"));
    valid = false;
  }
  if (typeof value["platform"] !== "string" || !(PILOT_LEDGER_PLATFORMS as readonly string[]).includes(value["platform"])) {
    errors.push(invalid("ILA173", `A ledger platform must be one of: ${PILOT_LEDGER_PLATFORMS.join(", ")}.`, "platform"));
    valid = false;
  }

  const observations: PilotLedgerObservation[] = [];
  let current = "";
  const FLAT_KEYS = ["revision", "conditions", "journeys", "reproduction", "artifacts"] as const;

  if (schema === PILOT_LEDGER_VERSION_OBSERVATIONS) {
    for (const key of FLAT_KEYS) {
      if (value[key] !== undefined) {
        errors.push(
          invalid(
            "ILA173",
            `A multi-observation ledger records '${key}' inside each observation, not at the root.`,
            key
          )
        );
        valid = false;
      }
    }
    const raw = value["observations"];
    if (!Array.isArray(raw) || raw.length === 0) {
      errors.push(invalid("ILA173", "A multi-observation ledger must hold at least one observation.", "observations"));
      valid = false;
    } else {
      raw.forEach((entry, index) => {
        const path = `observations[${index}]`;
        if (!isRecord(entry) || !isNonEmptyString(entry["id"])) {
          errors.push(invalid("ILA173", "An observation must name a non-empty id.", `${path}.id`));
          valid = false;
          return;
        }
        const fields = checkObservation(entry, path, errors);
        if (fields === undefined) {
          valid = false;
          return;
        }
        observations.push({ id: entry["id"], ...fields });
      });
      const ids = observations.map((observation) => observation.id);
      if (new Set(ids).size !== ids.length) {
        errors.push(invalid("ILA173", "Observation ids must be unique.", "observations"));
        valid = false;
      }
    }
    const currentRaw = value["current"];
    if (currentRaw === undefined) {
      current = observations.length > 0 ? (observations[observations.length - 1] as PilotLedgerObservation).id : "";
    } else if (!isNonEmptyString(currentRaw)) {
      errors.push(invalid("ILA173", "A ledger current observation must be a non-empty id.", "current"));
      valid = false;
    } else if (!observations.some((observation) => observation.id === currentRaw)) {
      errors.push(invalid("ILA173", `The current observation '${currentRaw}' is not recorded.`, "current"));
      valid = false;
    } else {
      current = currentRaw;
    }
  } else {
    const fields = checkObservation(value, "", errors);
    if (fields === undefined) {
      valid = false;
    } else {
      observations.push({ id: PILOT_LEDGER_IMPLICIT_OBSERVATION, ...fields });
      current = PILOT_LEDGER_IMPLICIT_OBSERVATION;
    }
  }

  if (!valid || !isNonEmptyString(value["pilot"]) || observations.length === 0) return undefined;
  const active = observations.find((observation) => observation.id === current);
  if (active === undefined) return undefined;
  return {
    schema: schema as PilotLedgerSchema,
    pilot: value["pilot"],
    platform: value["platform"] as PilotLedgerPlatform,
    current,
    observations,
    revision: active.revision,
    conditions: active.conditions,
    journeys: active.journeys,
    reproduction: active.reproduction,
    ...(active.artifacts ? { artifacts: active.artifacts } : {})
  };
}

function requiredLayers(journey: PilotLedgerJourney): PilotLedgerLayer[] {
  return [...PILOT_LEDGER_REQUIRED_LAYERS, ...journey.claimed];
}

function summarizeVerified(ledger: PilotLedger): string {
  const layers = [...new Set(ledger.journeys.flatMap((journey) => requiredLayers(journey)))];
  const names = ledger.journeys.map((journey) => `'${journey.id}'`).join(", ");
  const currentNote =
    ledger.observations.length > 1 ? ` Current observation: '${ledger.current}'.` : "";
  const history =
    ledger.observations.length > 1
      ? ` ${ledger.observations.length - 1} earlier observation(s) preserved: ${ledger.observations
          .filter((observation) => observation.id !== ledger.current)
          .map((observation) => `'${observation.id}'`)
          .join(", ")}.`
      : "";
  return (
    `Pilot '${ledger.pilot}' (${ledger.platform}): verified. ` +
    `${ledger.journeys.length} journey(s) ${names} pass required layers ${layers.join(", ")} ` +
    `and independent reproduction passes (by ${ledger.reproduction.by}).` +
    currentNote +
    history
  );
}

function summarizeUnverified(
  ledger: PilotLedger | undefined,
  diagnostics: readonly PilotLedgerDiagnostic[]
): string {
  const head = ledger
    ? `Pilot '${ledger.pilot}' (${ledger.platform}): unverified.` +
      (ledger.observations.length > 1 ? ` Current observation: '${ledger.current}'.` : "")
    : "Pilot evidence ledger: unverified.";
  const blocking = diagnostics.map((item) => `${item.path}: ${item.message}`).join(" ");
  return `${head} Blocking: ${blocking}`;
}

function currentObservationPrefix(ledger: PilotLedger): string {
  if (ledger.schema !== PILOT_LEDGER_VERSION_OBSERVATIONS) return "";
  const index = ledger.observations.findIndex((observation) => observation.id === ledger.current);
  return index < 0 ? "" : `observations[${index}]`;
}

export function validatePilotLedger(value: unknown): PilotLedgerResult {
  const structural: PilotLedgerDiagnostic[] = [];
  const ledger = checkLedger(value, structural);
  if (ledger === undefined) {
    return { status: "unverified", diagnostics: structural, summary: summarizeUnverified(undefined, structural) };
  }
  // Structural problems in any observation make the whole document unusable.
  // Layer and reproduction results are read from the current observation only:
  // an earlier observation is history, kept and checked for shape, not a gate on
  // the present one.
  const diagnostics: PilotLedgerDiagnostic[] = [...structural];
  const prefix = currentObservationPrefix(ledger);
  const active = ledger.observations.find((observation) => observation.id === ledger.current);
  for (const journey of active?.journeys ?? []) {
    for (const layer of requiredLayers(journey)) {
      const status = journey.layers[layer];
      if (status !== "pass") {
        diagnostics.push(
          invalid(
            "ILA174",
            `Journey '${journey.id}' needs layer '${layer}' at pass, found '${status ?? "missing"}'.`,
            at(prefix, `journeys.${journey.id}.layers.${layer}`)
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
            at(prefix, `journeys.${journey.id}.riskEvidence`)
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
        at(prefix, "reproduction.status")
      )
    );
  }
  if (diagnostics.length > 0) {
    return { status: "unverified", diagnostics, summary: summarizeUnverified(ledger, diagnostics) };
  }
  return { status: "verified", diagnostics: [], summary: summarizeVerified(ledger) };
}
