import type { AuditDiagnosticCode } from "./audit.js";

import { CAPABILITY_CATALOGUE, findCapability } from "./audit-catalogue.js";
import { isNonEmptyString, isRecord } from "./guards.js";

export const CAPABILITY_OVERLAY_VERSION = "capability-overlay/1.0";

export const OVERLAY_CONSUMPTION = ["used", "planned", "declined"] as const;

export type OverlayConsumption = (typeof OVERLAY_CONSUMPTION)[number];

export const OVERLAY_PRIORITIES = ["now", "next", "later"] as const;

export type OverlayPriority = (typeof OVERLAY_PRIORITIES)[number];

export type CapabilityOverlayEntry = Readonly<{
  /** A catalogue capability id. The overlay annotates, it never creates. */
  capability: string;
  consumption: OverlayConsumption;
  priority: OverlayPriority;
}>;

export type CapabilityOverlay = Readonly<{
  entries: readonly CapabilityOverlayEntry[];
  /** Catalogue ids the overlay names that the catalogue does not describe. */
  unknown: readonly string[];
}>;

export type AuditOverlayReport = Readonly<{
  version: string;
  consumption: readonly CapabilityOverlayEntry[];
  unknown: readonly string[];
  nextAction: string;
}>;

export type OverlayDiagnostic = Readonly<{
  code: AuditDiagnosticCode;
  message: string;
  path: string;
}>;

export type OverlayResult = Readonly<{
  overlay?: CapabilityOverlay;
  diagnostics: readonly OverlayDiagnostic[];
  summary: string;
}>;

function invalid(code: AuditDiagnosticCode, message: string, path: string): OverlayDiagnostic {
  return { code, message, path };
}

/**
 * The overlay states which capabilities a project consumes and in what order. It
 * is a fact about the consumer, not an Apple fact, so it is a separate document:
 * the catalogue stays a description of what Apple ships, and the report stays
 * valid and complete when no overlay is supplied at all.
 */
export function validateCapabilityOverlay(value: unknown): OverlayResult {
  const errors: OverlayDiagnostic[] = [];
  if (!isRecord(value)) {
    errors.push(invalid("ILA190", "The overlay must be an object.", ""));
    return { diagnostics: errors, summary: "The overlay is not an object, so it annotates nothing." };
  }
  const version = value["version"];
  if (version !== undefined && version !== CAPABILITY_OVERLAY_VERSION) {
    errors.push(
      invalid(
        "ILA190",
        `Overlay version must be '${CAPABILITY_OVERLAY_VERSION}' when it is present, and the document declared '${String(version)}'.`,
        "version"
      )
    );
  }
  const raw = value["entries"];
  if (raw !== undefined && !Array.isArray(raw)) {
    errors.push(invalid("ILA190", "Overlay entries must be a list.", "entries"));
    return { diagnostics: errors, summary: "The overlay entries are not a list, so it annotates nothing." };
  }
  const entries: CapabilityOverlayEntry[] = [];
  const seen = new Set<string>();
  for (const [index, item] of (raw ?? []).entries()) {
    const path = `entries[${index}]`;
    if (!isRecord(item)) {
      errors.push(invalid("ILA190", "An overlay entry must be an object.", path));
      continue;
    }
    const capability = item["capability"];
    if (!isNonEmptyString(capability)) {
      errors.push(invalid("ILA190", "An overlay entry must name a capability id.", `${path}.capability`));
      continue;
    }
    const consumption = item["consumption"];
    if (typeof consumption !== "string" || !(OVERLAY_CONSUMPTION as readonly string[]).includes(consumption)) {
      errors.push(
        invalid("ILA190", `Consumption must be one of: ${OVERLAY_CONSUMPTION.join(", ")}.`, `${path}.consumption`)
      );
      continue;
    }
    const priority = item["priority"];
    if (typeof priority !== "string" || !(OVERLAY_PRIORITIES as readonly string[]).includes(priority)) {
      errors.push(invalid("ILA190", `Priority must be one of: ${OVERLAY_PRIORITIES.join(", ")}.`, `${path}.priority`));
      continue;
    }
    // An id the catalogue does not describe is refused rather than ignored. An
    // overlay that names a capability IntentLane cannot see is a claim about a
    // catalogue that does not exist yet, and dropping it would make the report
    // look complete while quietly asserting nothing.
    if (findCapability(capability) === undefined) {
      errors.push(
        invalid(
          "ILA191",
          `'${capability}' is not a capability the catalogue describes, and an overlay annotates a catalogue rather than creating one.`,
          `${path}.capability`
        )
      );
      continue;
    }
    if (seen.has(capability)) {
      errors.push(invalid("ILA190", `'${capability}' is named twice in the overlay.`, `${path}.capability`));
      continue;
    }
    seen.add(capability);
    entries.push({ capability, consumption: consumption as OverlayConsumption, priority: priority as OverlayPriority });
  }
  if (errors.length > 0) {
    return {
      diagnostics: errors,
      summary: `The overlay annotates nothing: ${errors.length} problem(s) must be fixed before its entries can be read.`
    };
  }
  return {
    overlay: { entries, unknown: [] },
    diagnostics: [],
    summary: `The overlay annotates ${entries.length} of the ${CAPABILITY_CATALOGUE.length} capabilities the catalogue describes.`
  };
}

export function describeOverlay(overlay?: CapabilityOverlay): AuditOverlayReport {
  if (overlay === undefined) {
    return {
      version: CAPABILITY_OVERLAY_VERSION,
      consumption: [],
      unknown: [],
      nextAction: "No overlay was supplied, so no capability is marked as consumed. The catalogue facts are unaffected."
    };
  }
  const unused = CAPABILITY_CATALOGUE.filter(
    (record) => !overlay.entries.some((entry) => entry.capability === record.id)
  ).length;
  return {
    version: CAPABILITY_OVERLAY_VERSION,
    consumption: [...overlay.entries].sort((left, right) => (left.capability < right.capability ? -1 : 1)),
    unknown: [...overlay.unknown],
    nextAction:
      overlay.entries.length === 0
        ? "The overlay is empty, so it says the project consumes nothing yet. The catalogue facts are unaffected."
        : `The overlay marks ${overlay.entries.length} capabilities as consumed and leaves ${unused} undescribed by it.`
  };
}
