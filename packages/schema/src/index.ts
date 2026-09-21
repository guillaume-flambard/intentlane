import { z } from "zod";

export const identifierPattern = /^[a-z][a-z0-9_]*$/;

const localizedSchema = z.record(z.string().min(1));
const identifierSchema = z.string().regex(identifierPattern);
const parameterTypeSchema = z.enum([
  "string",
  "integer",
  "number",
  "boolean",
  "date",
  "datetime",
  "enum",
  "entity"
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

export const intentLaneConfigSchema = z.object({
  schema: z.literal("0.1"),
  app: z.object({
    id: z.string().regex(/^[A-Za-z0-9.-]+$/),
    name: z.string().min(1),
    url_scheme: z.string().regex(/^[a-z][a-z0-9+.-]*$/),
    min_ios: z.string().regex(/^\d+\.\d+$/),
    locales: z.array(z.string().min(1)).min(1).refine((values) => new Set(values).size === values.length, "Locales must be unique")
  }).strict(),
  entities: z.array(z.object({
    id: identifierSchema,
    title: localizedSchema,
    identifier: identifierSchema,
    display: z.object({ title: z.string(), subtitle: z.string().optional() }).strict(),
    query: z.object({ mode: z.enum(["static", "endpoint"]), endpoint: z.string().optional() }).strict()
  }).strict()).default([]),
  intents: z.array(z.object({
    id: identifierSchema,
    title: localizedSchema,
    description: localizedSchema.optional(),
    parameters: z.array(parameterSchema).default([]),
    execution: executionSchema,
    risk: riskSchema.optional(),
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
