/// <reference types="vitest" />
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { defineConfig, mergeConfig, type UserConfig } from "vite";
import { workspaceRoot } from "../../config/shared";
import baseConfig from "../../vite.config.base";
import { buildConfig } from "./config/build";
import { createPlugins } from "./config/plugins";
import { previewConfig, serverConfig } from "./config/server";

/**
 * Type guard for package.json objects
 */
function isPackageJson(obj: unknown): obj is { version: string } {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "version" in obj &&
    typeof (obj as Record<string, unknown>).version === "string"
  );
}

/**
 * Build metadata generation for the web app
 * Provides version, commit, and build information
 */
function getBuildInfo() {
  try {
    // Read version from package.json instead of relying on npm_package_version
    const packageJson = JSON.parse(
      readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
    );
    if (!isPackageJson(packageJson)) {
      throw new Error("Invalid package.json: missing version field");
    }
    const version = packageJson.version;

    const now = new Date();
    
    // Check if we're in CI environment
    const isCI = process.env.CI === "true";
    
    const shortCommitHash = isCI
      ? (process.env.GITHUB_SHA?.slice(0, 7) || "unknown")
      : execSync("git rev-parse --short HEAD", {
          encoding: "utf8",
        }).trim();

    const commitHash = isCI
      ? (process.env.GITHUB_SHA || "unknown")
      : execSync("git rev-parse HEAD", {
          encoding: "utf8",
        }).trim();
    const commitTimestamp = execSync("git log -1 --format=%ct", {
      encoding: "utf8",
    }).trim();
    const commitDate = new Date(parseInt(commitTimestamp) * 1000);
    
    const branchName = isCI 
      ? process.env.GITHUB_REF_NAME || "main"
      : execSync("git rev-parse --abbrev-ref HEAD", {
          encoding: "utf8",
        }).trim();

    return {
      buildTimestamp: now.toISOString(),
      commitHash,
      shortCommitHash,
      commitTimestamp: commitDate.toISOString(),
      branchName,
      version: packageJson.version,
      repositoryUrl: "https://github.com/Mearman/Academic-Explorer",
    };
  } catch (error) {
    console.warn("Failed to get build metadata:", error);
    return {
      buildTimestamp: new Date().toISOString(),
      commitHash: "unknown",
      shortCommitHash: "unknown",
      commitTimestamp: new Date().toISOString(),
      branchName: "unknown",
      version: "0.0.0",
      repositoryUrl: "https://github.com/Mearman/Academic-Explorer",
    };
  }
}

// App-specific overrides: merge the workspace base config with app overrides
export default defineConfig(({ mode, command }) =>
  mergeConfig(baseConfig, {
    // Path resolution aliases for monorepo packages
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
        "@/ui": path.resolve(workspaceRoot, "packages/ui/src"),
        "@academic-explorer/utils": path.resolve(
          workspaceRoot,
          "packages/utils/src",
        ),
        "@academic-explorer/client": path.resolve(
          workspaceRoot,
          "packages/client/src",
        ),
        "@academic-explorer/ui": path.resolve(workspaceRoot, "packages/ui/src"),
        "@academic-explorer/graph": path.resolve(
          workspaceRoot,
          "packages/graph/src",
        ),
        "@academic-explorer/simulation": path.resolve(
          workspaceRoot,
          "packages/simulation/src",
        ),
        "@academic-explorer/types": path.resolve(
          workspaceRoot,
          "packages/types/src",
        ),
      },
    },

    // Modular plugin configuration
    plugins: createPlugins({ command, mode }),

    // Server configuration
    server: serverConfig,

    // Preview server configuration
    preview: previewConfig,

    // Global constants available in the app
    define: {
      __DEV__: JSON.stringify(true),
      __BUILD_INFO__: JSON.stringify(getBuildInfo()),
    },

    // Web worker configuration
    worker: {
      format: "es", // Enable ES module format for workers
    },

    // Build configuration (rollup options, chunk splitting, etc.)
    ...buildConfig,
  }),
);
