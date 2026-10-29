import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["tests/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.d.ts",
        "src/types/**",
        "**/node_modules/**",
        "**/__tests__/**",
        "**/tests/**",
      ],
      reportsDirectory: "./coverage",
    },
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "src") },
      { find: /^whisper\.rn$/, replacement: path.resolve(__dirname, "tests/stubs/whisper-rn.ts") },
    ],
  },
});
