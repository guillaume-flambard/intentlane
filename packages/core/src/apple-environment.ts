export const ENHANCED_SIRI_FEATURE = "ai.enhanced-siri";

export const APPLE_ROUTING_FEATURE = "schema-backed-siri-routing";

export type EnhancedSiriState = "granted" | "blocked" | "unknown";

/**
 * A waitlist read older than this is not a current fact. Presence in a list ages
 * and has to be rechecked, so a stale listing is reported as unknown rather than
 * as a block, and the reader is told to refresh. Absence from a stale list is
 * weaker evidence but not wrong, so it is kept.
 */
export const STALE_WAITLIST_DAYS = 7;

const CF_EPOCH_OFFSET_SECONDS = 978_307_200;

export type EnhancedSiriReading = Readonly<{
  state: EnhancedSiriState;
  detail: string;
  fetchedAt?: Date;
  ageDays?: number;
  stale: boolean;
}>;

export type OnDeviceModelState = "available" | "unavailable" | "not-probed";

export type AppleEnvironment = Readonly<{
  enhancedSiri: EnhancedSiriState;
  enhancedSiriDetail: string;
  enhancedSiriAgeDays?: number;
  onDeviceModel: OnDeviceModelState;
  osVersion?: string;
  sdkVersion?: string;
  siriLanguages: readonly string[];
}>;

export type AppleRoutingVerdict = Readonly<{
  testable: boolean;
  reason: string;
  misleadingSignal: boolean;
}>;

type WaitlistValue = Readonly<{ featureIDs?: unknown; status?: unknown }>;
type WaitlistEntry = Readonly<{ value?: WaitlistValue; fetched?: unknown }>;

/**
 * The enhanced Siri is released in waves. A machine that is not served cannot
 * route a request to any App Intent, so a Siri experiment on it measures the
 * enrollment state and nothing else.
 *
 * Absence from the waitlist is the reliable signal that the feature is served,
 * so absence is treated as granted and any listed status other than an explicit
 * grant is treated as blocked with the raw status echoed. An unreadable payload
 * is unknown and concludes nothing.
 */
function fetchedAt(entries: readonly WaitlistEntry[]): Date | undefined {
  const times = entries
    .map((entry) => (typeof entry.fetched === "number" ? entry.fetched : undefined))
    .filter((value): value is number => value !== undefined);
  if (times.length === 0) return undefined;
  return new Date((Math.max(...times) + CF_EPOCH_OFFSET_SECONDS) * 1000);
}

function ageInDays(at: Date | undefined, now: Date): number | undefined {
  if (at === undefined) return undefined;
  return Math.floor((now.getTime() - at.getTime()) / 86_400_000);
}

function reading(
  state: EnhancedSiriState,
  detail: string,
  at: Date | undefined,
  now: Date
): EnhancedSiriReading {
  const ageDays = ageInDays(at, now);
  const stale = ageDays !== undefined && ageDays > STALE_WAITLIST_DAYS;
  if (stale && state === "blocked") {
    return {
      state: "unknown",
      detail: `waitlist reported ${detail.replace(/^waitlist reports /, "")} ${ageDays} day(s) ago, which is too old to read as a current block`,
      stale: true,
      ...(at ? { fetchedAt: at } : {}),
      ...(ageDays === undefined ? {} : { ageDays })
    };
  }
  return { state, detail, stale, ...(at ? { fetchedAt: at } : {}), ...(ageDays === undefined ? {} : { ageDays }) };
}

export function readEnhancedSiriState(payload: string | undefined, now: Date = new Date()): EnhancedSiriReading {
  if (payload === undefined) {
    return { state: "unknown", detail: "no waitlist state on this machine", stale: false };
  }
  let entries: WaitlistEntry[];
  try {
    const parsed: unknown = JSON.parse(payload);
    if (!Array.isArray(parsed)) return { state: "unknown", detail: "waitlist state is not a list", stale: false };
    entries = parsed as WaitlistEntry[];
  } catch {
    return { state: "unknown", detail: "waitlist state is not readable JSON", stale: false };
  }

  const at = fetchedAt(entries);
  const listed = entries.filter((entry) => {
    const features = entry.value?.featureIDs;
    return Array.isArray(features) && features.includes(ENHANCED_SIRI_FEATURE);
  });
  if (listed.length === 0) {
    return reading("granted", "not listed in any waitlist entry", at, now);
  }

  const statuses = listed
    .map((entry) => entry.value?.status)
    .filter((status): status is string => typeof status === "string");
  if (statuses.length === 0) {
    return reading("unknown", "listed with no status", at, now);
  }
  if (statuses.every((status) => status === "granted")) {
    return reading("granted", "waitlist reports granted", at, now);
  }
  const distinct = [...new Set(statuses)].join(", ");
  return reading("blocked", `waitlist reports ${distinct}`, at, now);
}

/**
 * A model that runs does not imply that Siri routes actions. When the two states
 * disagree the disagreement is the finding, and any failing intent observation is
 * explained by it.
 */
export function appleRoutingVerdict(environment: AppleEnvironment): AppleRoutingVerdict {
  if (environment.enhancedSiri === "granted") {
    return { testable: true, reason: "the enhanced Siri is served on this machine", misleadingSignal: false };
  }
  if (environment.enhancedSiri === "unknown") {
    return {
      testable: false,
      reason: `the enhanced Siri state could not be established: ${environment.enhancedSiriDetail}`,
      misleadingSignal: environment.onDeviceModel === "available"
    };
  }
  const reason = `the enhanced Siri is not served on this machine: ${environment.enhancedSiriDetail}`;
  return {
    testable: false,
    reason,
    misleadingSignal: environment.onDeviceModel === "available"
  };
}
