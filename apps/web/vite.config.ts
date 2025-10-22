import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { defineConfig, mergeConfig, type UserConfig } from "vite";
import baseConfig from "../../vite.config.base";
import { buildConfig } from "./config/build";
import { createPlugins } from "./config/plugins";
import { previewConfig, serverConfig } from "./config/server";

// Get __dirname equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Simple build metadata function that works in both dev and production
function getBuildInfo() {
  const isCI = process.env.CI === "true";
  
  try {
    // Read package.json using a static path
    const packageJsonPath = path.resolve(__dirname, "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    const version = packageJson?.version || "0.0.0";
    
    const now = new Date().toISOString();
    
    if (isCI) {
      // CI environment - use environment variables
      return {
        buildTimestamp: now,
        commitHash: process.env.GITHUB_SHA || "unknown",
        shortCommitHash: process.env.GITHUB_SHA?.slice(0, 7) || "unknown", 
        commitTimestamp: now,
        branchName: process.env.GITHUB_REF_NAME || "main",
        version,
        repositoryUrl: "https://github.com/Mearman/Academic-Explorer",
      };
    }
    
    // Local development - skip git commands to avoid issues in CI
    return {
      buildTimestamp: now,
      commitHash: "dev-commit",
      shortCommitHash: "dev", 
      commitTimestamp: now,
      branchName: "dev",
      version,
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

// Web app configuration with all necessary functionality
export default defineConfig(({ mode, command }) => {
  const isProduction = mode === "production";
  const isDevelopment = mode === "development";
  const isTest = mode === "test";

  return mergeConfig(baseConfig, {
    build: buildConfig(isProduction),
    plugins: createPlugins({ command, mode, isDevelopment, isProduction, isTest }),
    server: serverConfig(isDevelopment),
    preview: previewConfig,
    define: {
      __APP_INFO__: JSON.stringify(getBuildInfo()),
    },
  });
});
