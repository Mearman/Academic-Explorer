/// <reference types="vitest" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Workspace-level Vite configuration
// Individual apps have their own vite.config.ts files for app-specific overrides
const getEnvironmentConfig = () => {
  const isCI = process.env.CI === "true";
  const isWatchMode = process.env.VITEST_WATCH === "true";
  const isDebug = process.env.VITEST_DEBUG === "true";
  const nodeEnv = process.env.NODE_ENV;
  const availableMemory = process.env.AVAILABLE_MEMORY_GB
    ? parseInt(process.env.AVAILABLE_MEMORY_GB)
    : 8;

  const isResourceConstrained = availableMemory < 4 || isCI;
  const isPerformanceOptimized = !isDebug && !isWatchMode;

  return {
    isCI,
    isWatchMode,
    isDebug,
    isResourceConstrained,
    isPerformanceOptimized,
    availableMemory,
    maxWorkers: isResourceConstrained ? 2 : Math.min(availableMemory, 8),
  };
};

const envConfig = getEnvironmentConfig();

const poolConfig =
  envConfig.isWatchMode || envConfig.isCI || envConfig.isResourceConstrained
    ? {
        pool: "threads" as const,
        poolOptions: {
          threads: {
            singleThread: false,
            maxThreads: envConfig.maxWorkers,
            minThreads: 1,
            useAtomics: true,
          },
          forks: {
            singleFork: false,
          },
        },
      }
    : {
        pool: "forks" as const,
        poolOptions: {
          forks: { singleFork: false, isolate: false },
          threads: { singleThread: false },
        },
      };

const timeoutConfig = {
  testTimeout: Math.round(
    envConfig.isResourceConstrained
      ? (envConfig.isCI ? 30000 : envConfig.isWatchMode ? 5000 : 10000) * 1.5
      : envConfig.isCI
        ? 30000
        : envConfig.isWatchMode
          ? 5000
          : 10000,
  ),
  hookTimeout: Math.round(
    envConfig.isResourceConstrained
      ? (envConfig.isCI ? 30000 : envConfig.isWatchMode ? 5000 : 10000) * 1.5
      : envConfig.isCI
        ? 30000
        : envConfig.isWatchMode
          ? 5000
          : 10000,
  ),
  teardownTimeout: envConfig.isCI ? 10000 : 5000,
};

const concurrencyConfig = {
  maxConcurrency: envConfig.isResourceConstrained ? 2 : envConfig.maxWorkers,
  disableConsoleIntercept: envConfig.isDebug,
};

export default defineConfig({
  // Basic workspace-level configuration
  plugins: [],
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== "production"),
  },
  // Vitest reads the `test` field from the Vite config
  test: {
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "node_modules/**",
      "**/node_modules/**",
      "dist",
      "coverage",
      ".nx",
      "**/*.d.ts",
      "**/routeTree.gen.ts",
      "**/*.e2e.test.ts", // Exclude E2E tests from Vitest
      "**/*.integration.test.ts", // Exclude integration tests that make real API calls
      "**/disk-writer.unit.test.ts", // Exclude problematic disk writer test
    ],

    globals: true,
    // coverage is a root-level concern; configure defaults here
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "**/*.d.ts",
        "**/*.stories.*",
        "**/*.config.*",
        "dist/",
        "coverage/",
        "**/*.test.*",
        "**/*.spec.*",
      ],
      thresholds: {
        global: { branches: 80, functions: 80, lines: 80, statements: 80 },
      },
    },

    // Pool, timeouts and concurrency
    ...poolConfig,
    ...timeoutConfig,
    ...concurrencyConfig,

    silent: envConfig.isCI,
    reporters: envConfig.isCI ? ["default", "github-actions"] : ["verbose"],
    retry: envConfig.isCI ? 0 : envConfig.isPerformanceOptimized ? 1 : 2,
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,

    projects: [
      // Workspace projects - use absolute paths to avoid resolution issues
      path.resolve(__dirname, "apps/cli"),
      path.resolve(__dirname, "packages/client"),
      path.resolve(__dirname, "packages/graph"),
      path.resolve(__dirname, "packages/simulation"),
      path.resolve(__dirname, "packages/ui"),
      path.resolve(__dirname, "packages/utils"),
    ],
  },
});
