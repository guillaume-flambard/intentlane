import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/**/*.test.ts", "apps/*/src/**/*.test.ts", "apps/*/plugins/**/*.test.ts"],
    // The drift tests read every public interface of ten SDK frameworks across
    // four architecture variants. They are the only tests in the suite that touch
    // the SDK, and at the 5 s default they fail on a cold page cache after a
    // build has filled the disk, which reads as "the catalogue stopped resolving"
    // rather than as "the machine is busy". A timeout that produces a wrong
    // diagnosis is worse than a slow suite.
    testTimeout: 30_000
  }
});
