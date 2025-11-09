/// <reference types='vitest' />
import { defineConfig } from "vitest/config";

// Base Vitest configuration for the Academic Explorer monorepo
// This provides common testing configuration for all projects
export const baseVitestConfig = defineConfig({
  test: {
    // Global test configuration
    globals: true,
    environment: "node",
    watch: false,

    // Global setup file to handle lru-cache ES module compatibility
    setupFiles: ['./vitest.setup.ts'],

    // Performance and timeout configuration
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,

    // Concurrency configuration - MUST BE SERIAL to prevent OOM
    maxConcurrency: 1,
    maxWorkers: 1,

    // Reporting configuration
    reporters: ["default"],

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "coverage/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/test-setup.{js,ts}",
        "**/__tests__/**",
        "**/*.test.{js,ts}",
        "**/*.spec.{js,ts}",
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },

    // Include/exclude patterns - only run TypeScript source files, not compiled .js
    include: ["src/**/*.{test,spec}.{ts,mts,cts,tsx}"],
    exclude: [
      "node_modules/",
      "dist/",
      "coverage/",
      "**/*.d.ts",
      "**/*.config.{js,ts}",
      "**/*.{test,spec}.{js,mjs,cjs,jsx}", // Exclude compiled JavaScript test files
    ],
  },
});

export default baseVitestConfig;
