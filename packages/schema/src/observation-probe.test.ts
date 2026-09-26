import { describe, expect, it } from "vitest";
import { observationProbeManifestSchema } from "./index.js";

const probe = (overrides: Record<string, unknown> = {}) => ({
  id: "registration",
  question: "Does the system list our app as an App Intent provider?",
  command: "bash pilots/iina/tests/probe-registration.sh",
  format: "text",
  ...overrides
});

const manifest = (probes: unknown[] = [probe()]) => ({ schema: "observation-probes/1.0", probes });

describe("observation probe manifest", () => {
  it("accepts a probe that says what it is trying to learn", () => {
    expect(observationProbeManifestSchema.safeParse(manifest()).success).toBe(true);
  });

  it("rejects a probe naming no question and points at the probe", () => {
    const result = observationProbeManifestSchema.safeParse(manifest([probe({ question: undefined })]));
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected a rejection");
    expect(result.error.issues[0]?.path).toEqual(["probes", 0, "question"]);
  });

  it("rejects a manifest declaring no probe", () => {
    const result = observationProbeManifestSchema.safeParse(manifest([]));
    expect(result.success).toBe(false);
  });

  it("rejects a manifest that is not the declared version", () => {
    expect(observationProbeManifestSchema.safeParse({ ...manifest(), schema: "observation-probes/0.9" }).success).toBe(false);
  });

  it("rejects an unknown probe field rather than ignoring it", () => {
    expect(observationProbeManifestSchema.safeParse(manifest([probe({ verdict: "pass" })])).success).toBe(false);
  });

  it("rejects an unknown output format", () => {
    expect(observationProbeManifestSchema.safeParse(manifest([probe({ format: "siri" })])).success).toBe(false);
  });

  it("rejects the same probe declared twice and names the second one", () => {
    const result = observationProbeManifestSchema.safeParse(manifest([probe(), probe()]));
    expect(result.success).toBe(false);
    if (result.success) throw new Error("expected a rejection");
    expect(result.error.issues[0]?.path).toEqual(["probes", 1, "id"]);
    expect(result.error.issues[0]?.message).toMatch(/twice/);
  });

  it("accepts a probe that declares no subject, because the question is what is read", () => {
    expect(observationProbeManifestSchema.safeParse(manifest([probe({ subject: undefined })])).success).toBe(true);
  });
});
