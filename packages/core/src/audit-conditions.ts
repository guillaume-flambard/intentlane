export const AUDIT_CONDITION_NAMES = [
  "operatingSystem",
  "xcode",
  "architecture",
  "locale",
  "region",
  "appleIntelligence",
  "account",
  "permissions",
  "testData"
] as const;

export type AuditConditionName = (typeof AUDIT_CONDITION_NAMES)[number];

export const AUDIT_CONDITION_STATES = ["recorded", "unknown"] as const;

export type AuditConditionState = (typeof AUDIT_CONDITION_STATES)[number];

export type AuditCondition = Readonly<{
  name: AuditConditionName;
  state: AuditConditionState;
  value?: string;
}>;

export type AuditConditionsReport = Readonly<{
  conditions: readonly AuditCondition[];
  nextAction: string;
}>;

export type AuditEnvironment = Readonly<{
  osVersion?: string;
  xcodeVersion?: string;
  architecture?: string;
  locale?: string;
  region?: string;
}>;

const ENVIRONMENT_KEYS: Readonly<Record<AuditConditionName, keyof AuditEnvironment | undefined>> = {
  operatingSystem: "osVersion",
  xcode: "xcodeVersion",
  architecture: "architecture",
  locale: "locale",
  region: "region",
  appleIntelligence: undefined,
  account: undefined,
  permissions: undefined,
  testData: undefined
};

export function describeConditions(environment: AuditEnvironment = {}): AuditConditionsReport {
  const conditions = AUDIT_CONDITION_NAMES.map((name) => {
    const key = ENVIRONMENT_KEYS[name];
    const value = key === undefined ? undefined : environment[key];
    if (value === undefined || value.length === 0) return { name, state: "unknown" as const };
    return { name, state: "recorded" as const, value };
  });
  const missing = conditions
    .filter((condition) => condition.state === "unknown")
    .map((condition) => condition.name);
  const nextAction =
    missing.length > 0
      ? `Record ${missing.join(", ")} before claiming a Siri result.`
      : "Keep the recorded conditions with the evidence ledger.";
  return { conditions, nextAction };
}

export function recordedConditionCount(report: AuditConditionsReport): number {
  return report.conditions.filter((condition) => condition.state === "recorded").length;
}
