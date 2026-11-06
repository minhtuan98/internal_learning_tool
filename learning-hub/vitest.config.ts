import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
    setupFiles: ["./tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts", "src/server/**/*.ts", "src/prompts/**/*.ts"],
      exclude: ["src/lib/db.ts", "src/lib/brand.ts", "src/lib/shell.ts"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: ".qa/coverage",
      reportOnFailure: true,
    },
  },
});
