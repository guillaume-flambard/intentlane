export type MetadataContractComparison = Readonly<{
  status: "pass" | "fail";
  missing: readonly string[];
  unexpected: readonly string[];
  nextAction: string;
}>;

const isKeyedObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function compareMetadataToContract(
  metadata: unknown,
  declaredActions: readonly string[]
): MetadataContractComparison {
  const actions = isKeyedObject(metadata) ? metadata["actions"] : undefined;

  if (actions !== undefined && !isKeyedObject(actions)) {
    return {
      status: "fail",
      missing: [],
      unexpected: [],
      nextAction: "The extracted metadata must carry an `actions` object keyed by action name. A list or any other shape cannot be compared to the contract."
    };
  }

  const advertised = actions === undefined ? [] : Object.keys(actions);
  const declared = [...declaredActions];
  const missing = declared.filter((name) => !advertised.includes(name));
  const unexpected = advertised.filter((name) => !declared.includes(name));

  if (missing.length === 0 && unexpected.length === 0) {
    return {
      status: "pass",
      missing,
      unexpected,
      nextAction: "The extracted metadata advertises exactly the actions the contract declares."
    };
  }

  const reasons: string[] = [];
  if (missing.length > 0) reasons.push(`missing ${missing.join(", ")}`);
  if (unexpected.length > 0) reasons.push(`unexpected ${unexpected.join(", ")}`);

  return {
    status: "fail",
    missing,
    unexpected,
    nextAction: `The extracted metadata does not match the contract: ${reasons.join("; ")}. Rebuild the metadata from the generated code, or remove the action the contract does not declare.`
  };
}
