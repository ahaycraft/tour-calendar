import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests only for now (Phase 1): pure functions under `src/lib`, run in a
 * plain Node environment. `TZ=UTC` is pinned because several helpers format
 * dates with local getters — fixing the zone keeps their output deterministic
 * across machines and CI.
 *
 * The `@/` alias mirrors tsconfig's `paths` so test files can import the same
 * way app code does. (`.mts` so Vite loads its ESM Node API, not the
 * deprecated CJS one.)
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: { TZ: "UTC" },
  },
});
