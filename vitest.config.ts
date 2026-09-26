import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
  esbuild: {
    // A JSON string makes Vite use the SDK config without walking into the
    // example's Expo config. Pure evaluator tests need no mobile dependencies.
    tsconfigRaw: readFileSync(new URL("./tsconfig.json", import.meta.url), "utf8"),
  },
});
