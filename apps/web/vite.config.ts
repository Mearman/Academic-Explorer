/// <reference types="vitest" />
import { execSync } from "child_process";
import { readFileSync } from "fs";
import path from "path";
import { defineConfig, mergeConfig } from "vite";
import { workspaceRoot } from "../../config/shared";
import baseConfig from "../../vite.config.base";
import { buildConfig } from "./config/build";
import { createPlugins } from "./config/plugins";
import { previewConfig, serverConfig } from "./config/server";

/**
 * Build metadata generation for the web app
 * Provides version, commit, and build information
 */
function getBuildInfo() {
  try {
    // Read version from package.json instead of relying on npm_package_version
    const packageJson = JSON.parse(
      readFileSync(path.resolve(__dirname, "package.json"), "utf-8"),
    ) as { version: string };

    const now = new Date();
    const commitHash = execSync("git rev-parse HEAD", {
      encoding: "utf8",
    }).trim();
    const shortCommitHash = execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
    }).trim();
    const commitTimestamp = execSync("git log -1 --format=%ct", {
      encoding: "utf8",
    }).trim();
    const commitDate = new Date(parseInt(commitTimestamp) * 1000);
    const branchName = execSync("git rev-parse --abbrev-ref HEAD", {
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
  mergeConfig(baseConfig as any, {
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
