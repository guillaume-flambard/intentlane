import { z } from "zod";

export const identifierPattern = /^[a-z][a-z0-9_]*$/;

const localizedSchema = z.record(z.string().min(1));
const identifierSchema = z.string().regex(identifierPattern);
const schemaReferenceSchema = z.string().min(1);
const parameterTypeSchema = z.enum([
  "string",
  "integer",
  "number",
  "boolean",
  "date",
  "datetime",
  "enum",
  "entity",
  "entity_list"
]);

const parameterSchema = z.object({
  id: identifierSchema,
  type: parameterTypeSchema,
  required: z.boolean(),
  title: localizedSchema.optional(),
  prompt: localizedSchema.optional(),
  values: z.record(identifierSchema, localizedSchema).optional(),
  entity: identifierSchema.optional()
}).strict();

const executionSchema = z.object({
  mode: z.enum(["open_app", "native", "http"]),
  route: z.string().optional(),
  mapping: z.record(z.string()).optional(),
  handler: z.string().optional()
}).strict();

const riskSchema = z.object({
  level: z.enum(["read", "write", "sensitive", "destructive"]),
  confirmation: z.enum(["never", "optional", "always"]),
  authentication: z.enum(["none", "inherited", "required"]),
  confirmation_prompt: localizedSchema.optional()
}).strict();

export const PILOT_EXPOSURE_RULES = ["source_disabled", "item_missing", "item_not_usable"] as const;

const exposureSchema = z
  .object({ rules: z.array(z.enum(PILOT_EXPOSURE_RULES)).min(1) })
  .strict()
  .refine((value) => new Set(value.rules).size === value.rules.length, {
    message: "An exposure condition names each rule once. A repeated rule reads as a conjunction that means something stronger."
  });

const requiredExposureSchema = exposureSchema.optional().superRefine((value, ctx) => {
  if (value === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message:
        "An entity must declare an exposure condition. A conditional entity and an always-exposed entity are two different offers, and the contract is the document a client reads."
    });
  }
});

const entitySchema = z
  .object({
    id: identifierSchema,
    title: localizedSchema,
    identifier: identifierSchema,
    display: z.object({ title: z.string(), subtitle: z.string().optional() }).strict(),
    query: z.object({ mode: z.enum(["static", "endpoint"]), endpoint: z.string().optional() }).strict(),
    exposure: requiredExposureSchema,
    schema: schemaReferenceSchema.optional()
  })
  .strict();

export const intentLaneConfigSchema = z.object({
  schema: z.literal("0.1"),
  app: z.object({
    id: z.string().regex(/^[A-Za-z0-9.-]+$/),
    name: z.string().min(1),
    url_scheme: z.string().regex(/^[a-z][a-z0-9+.-]*$/),
    min_ios: z.string().regex(/^\d+\.\d+$/).optional(),
    min_macos: z.string().regex(/^\d+\.\d+$/).optional(),
    mac_catalyst: z.boolean().optional(),
    locales: z.array(z.string().min(1)).min(1).refine((values) => new Set(values).size === values.length, "Locales must be unique")
  })
    .strict()
    .refine((app) => app.min_ios !== undefined || app.min_macos !== undefined, {
      message: "An app must declare min_ios or min_macos."
    }),
  entities: z.array(entitySchema).default([]),
  intents: z.array(z.object({
    id: identifierSchema,
    title: localizedSchema,
    description: localizedSchema.optional(),
    parameters: z.array(parameterSchema).default([]),
    execution: executionSchema,
    risk: riskSchema.optional(),
    schema: schemaReferenceSchema.optional(),
    target: identifierSchema.optional(),
    result: z.object({ dialog: localizedSchema.optional(), returns: identifierSchema.optional() }).strict().optional(),
    shortcuts: z.object({ phrases: z.record(z.array(z.string().min(1)).min(1)) }).strict().optional()
  }).strict()).min(1)
}).strict();

export type IntentLaneConfig = z.infer<typeof intentLaneConfigSchema>;
export type ParameterType = z.infer<typeof parameterTypeSchema>;

export const intentLaneJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://intentlane.dev/schema/0.1.json",
  title: "IntentLane 0.1",
  type: "object",
  required: ["schema", "app", "intents"]
} as const;

export const PILOT_RUN_STEPS = ["prepare", "analyse", "implement", "test", "repair", "demonstrate", "deliver"] as const;

export const PILOT_RUN_STEP_STATUSES = ["pending", "pass", "fail", "blocked", "skipped"] as const;

export const PILOT_RUN_EVIDENCE_KINDS = ["command", "build", "capture", "app-event"] as const;

export const PILOT_RUN_REPAIR_BUDGET = 3;

const revisionSchema = z.string().regex(/^[0-9a-f]{7,40}$/);

const evidenceEntrySchema = z.object({
  kind: z.enum(PILOT_RUN_EVIDENCE_KINDS),
  command: z.string().min(1).optional(),
  exitCode: z.number().int().optional(),
  artifact: z.string().min(1).optional(),
  note: z.string().min(1).optional()
}).strict();

const runStepSchema = z.object({
  id: z.enum(PILOT_RUN_STEPS),
  status: z.enum(PILOT_RUN_STEP_STATUSES),
  commit: revisionSchema,
  attempts: z.number().int().min(1).max(PILOT_RUN_REPAIR_BUDGET),
  evidence: z.array(evidenceEntrySchema),
  diagnostic: z.string().min(1).optional(),
  diff: z.string().min(1).optional(),
  durationMs: z.number().int().min(0).optional()
}).strict().superRefine((value, ctx) => {
  if (value.status === "pass" && value.evidence.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["evidence"], message: "A passed step must carry evidence." });
  }
  if (value.status === "blocked" && value.diagnostic === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["diagnostic"], message: "A blocked step must carry a diagnostic." });
  }
});

export const pilotRunJournalSchema = z.object({
  schema: z.literal("pilot-run/1.0"),
  pilot: identifierSchema,
  branch: z.string().min(1),
  commit: revisionSchema,
  steps: z.array(runStepSchema).max(PILOT_RUN_STEPS.length).superRefine((steps, ctx) => {
    const seen = new Set<string>();
    steps.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["steps", index, "id"], message: `Step '${entry.id}' appears twice.` });
      }
      seen.add(entry.id);
    });
  })
}).strict();

export type PilotRunJournal = z.infer<typeof pilotRunJournalSchema>;
export type PilotRunStepId = (typeof PILOT_RUN_STEPS)[number];
export type PilotRunStepStatus = (typeof PILOT_RUN_STEP_STATUSES)[number];
export type PilotRunEvidenceKind = (typeof PILOT_RUN_EVIDENCE_KINDS)[number];
export type PilotRunEvidenceEntry = z.infer<typeof evidenceEntrySchema>;
export type PilotRunStep = z.infer<typeof runStepSchema>;

const claimConfidenceDistributionSchema = z
  .record(z.number().min(0).max(1))
  .refine((distribution) => Object.keys(distribution).length > 0, {
    message:
      "A confidence must carry the distribution that produced it. A confidence a reader cannot inspect is indistinguishable from an invented one."
  });

export const claimConfidenceSchema = z
  .object({
    confidence: z.number().min(0).max(1),
    distribution: claimConfidenceDistributionSchema
  })
  .strict();

export type ClaimConfidence = z.infer<typeof claimConfidenceSchema>;

export const OBSERVATION_PROBE_FORMATS = ["text", "json"] as const;

const observationProbeSchema = z
  .object({
    id: identifierSchema,
    question: z.string().min(1),
    command: z.string().min(1),
    format: z.enum(OBSERVATION_PROBE_FORMATS),
    subject: z.string().min(1).optional()
  })
  .strict();

export const observationProbeManifestSchema = z
  .object({
    schema: z.literal("observation-probes/1.0"),
    probes: z.array(observationProbeSchema).min(1)
  })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.probes.forEach((probe, index) => {
      if (seen.has(probe.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["probes", index, "id"],
          message: `Probe '${probe.id}' appears twice. Running the same question twice records the same thing twice.`
        });
      }
      seen.add(probe.id);
    });
  });

export type ObservationProbeManifest = z.infer<typeof observationProbeManifestSchema>;
export type ObservationProbe = z.infer<typeof observationProbeSchema>;
export type ObservationProbeFormat = (typeof OBSERVATION_PROBE_FORMATS)[number];
