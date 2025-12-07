/// <reference types='vitest' />
import { defineConfig } from "vitest/config";

// Base Vitest configuration for the BibGraph monorepo
// This provides common testing configuration for all projects
export const baseVitestConfig = defineConfig({
  test: {
    // Global test configuration
    globals: true,
    environment: "node",
    watch: false,

    // Global setup file to handle lru-cache ES module compatibility
    // Note: Packages can override this by setting setupFiles: [] in their config
    setupFiles: [],

    // Optimized timeout configuration for CI performance
    testTimeout: 5000,
    hookTimeout: 5000,
    teardownTimeout: 2000,

    // Reporting configuration
    reporters: ["default"],

    // Optimized coverage configuration for CI performance
    coverage: {
      provider: "v8",
      reporter: ["text", "json"], // Remove HTML reporter to save time
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
        "**/*.performance.test.{ts,tsx}", // Exclude performance tests
        "**/*.e2e.test.{ts,tsx}", // Exclude E2E tests from coverage
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
    // Optimized for CI performance - exclude performance and scaling tests
    include: [
      "src/**/*.test.{ts,mts,cts,tsx}",
      "src/**/*.spec.{ts,mts,cts,tsx}",
      "src/**/*.unit.test.{ts,mts,cts,tsx}",
      "src/**/*.component.test.{ts,mts,cts,tsx}",
      "src/**/*.integration.test.{ts,mts,cts,tsx}",
      // Performance tests excluded from main CI run to prevent timeouts
    ],
    exclude: [
      "node_modules/",
      "dist/",
      "coverage/",
      "**/*.d.ts",
      "**/*.config.{js,ts}",
      "**/*.{test,spec}.{js,mjs,cjs,jsx}", // Exclude compiled JavaScript test files
      "**/*.performance.test.{ts,tsx}", // Exclude performance tests from CI
      "**/test-performance/**", // Exclude performance test directories
      "**/*scaling*.test.{ts,tsx}", // Exclude scaling tests
    ],
  },
});

export default baseVitestConfig;
