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
});
