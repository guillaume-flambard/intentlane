import type { AuditDiagnosticCode } from "./audit.js";
import { claim, isPilotClaimId, unknownClaimIds, type PilotClaimId } from "./claims.js";
import { isNonEmptyString, isRecord } from "./guards.js";

export type PilotManifestDiagnostic = Readonly<{ code: AuditDiagnosticCode; message: string; path: string }>;

export const PILOT_MANIFEST_VERSION = "intentlane-pilot/1.0";

export const BUILTIN_GATE_CLAIMS: readonly string[] = ["contract", "generated", "metadata"];

export type PilotManifest = Readonly<{
  version: typeof PILOT_MANIFEST_VERSION;
  contract: string;
  claims: readonly PilotClaimId[];
  gates: Readonly<Record<string, string>>;
  generated: string;
  metadata: string;
  ledger?: string;
  probe?: string;
}>;

export type PilotManifestResult = Readonly<{
  manifest: PilotManifest | undefined;
  diagnostics: readonly PilotManifestDiagnostic[];
}>;

const ALLOWED_KEYS = ["version", "contract", "claims", "gates", "generated", "metadata", "ledger", "probe"] as const;

export function parsePilotManifest(value: unknown): PilotManifestResult {
  const diagnostics: PilotManifestDiagnostic[] = [];
  const invalid = (code: AuditDiagnosticCode, message: string, path: string): void => {
    diagnostics.push({ code, message, path });
  };

  if (!isRecord(value)) {
    invalid("ILA176", "A pilot manifest must be an object.", "root");
    return { manifest: undefined, diagnostics };
  }
  if (value["version"] !== PILOT_MANIFEST_VERSION) {
    invalid("ILA176", `A pilot manifest version must be '${PILOT_MANIFEST_VERSION}'.`, "version");
  }
  for (const key of Object.keys(value)) {
    if (!(ALLOWED_KEYS as readonly string[]).includes(key)) {
      invalid(
        "ILA176",
        `Unknown pilot manifest key '${key}'. A manifest cannot declare 'evidence': the evidence kind belongs to the claim catalogue.`,
        key
      );
    }
  }
  for (const key of ["contract", "generated", "metadata"] as const) {
    if (!isNonEmptyString(value[key])) {
      invalid("ILA176", `A pilot manifest needs a non-empty '${key}' path.`, key);
    }
  }
  for (const key of ["ledger", "probe"] as const) {
    if (value[key] !== undefined && !isNonEmptyString(value[key])) {
      invalid("ILA176", `A pilot manifest '${key}' must be a non-empty path when present.`, key);
    }
  }

  const rawGates = value["gates"] ?? {};
  if (!isRecord(rawGates)) {
    invalid("ILA176", "Pilot manifest gates must be an object of claim id to command.", "gates");
  }
  const gates: Record<string, string> = {};
  if (isRecord(rawGates)) {
    for (const [id, command] of Object.entries(rawGates)) {
      if (!isNonEmptyString(command)) {
        invalid("ILA178", `Gate '${id}' has no command, so nothing can settle that claim.`, `gates.${id}`);
        continue;
      }
      gates[id] = command;
    }
  }

  const rawClaims = value["claims"];
  if (!Array.isArray(rawClaims) || rawClaims.length === 0) {
    invalid("ILA176", "A pilot manifest must declare a non-empty claim set.", "claims");
    return { manifest: undefined, diagnostics };
  }
  const unknown = unknownClaimIds(rawClaims.filter((id): id is string => typeof id === "string"));
  for (const id of unknown) {
    invalid("ILA177", `Unknown claim '${id}'. Certification refuses to run on a claim it cannot resolve.`, `claims.${id}`);
  }
  for (const id of rawClaims) {
    if (typeof id !== "string") {
      invalid("ILA177", `A claim must be a string, found ${typeof id}.`, "claims");
    }
  }

  const claims = rawClaims.filter((id): id is PilotClaimId => typeof id === "string" && isPilotClaimId(id));
  for (const id of claims) {
    const entry = claim(id);
    if (entry.evidence !== "deterministic") continue;
    if (BUILTIN_GATE_CLAIMS.includes(id)) continue;
    if (gates[id] === undefined) {
      invalid("ILA178", `Claim '${id}' is deterministic and has no command, so nothing can settle it.`, `claims.${id}`);
    }
  }

  if (diagnostics.length > 0) return { manifest: undefined, diagnostics };

  return {
    manifest: {
      version: PILOT_MANIFEST_VERSION,
      contract: value["contract"] as string,
      claims,
      gates,
      generated: value["generated"] as string,
      metadata: value["metadata"] as string,
      ...(value["ledger"] === undefined ? {} : { ledger: value["ledger"] as string }),
      ...(value["probe"] === undefined ? {} : { probe: value["probe"] as string })
    },
    diagnostics
  };
}
