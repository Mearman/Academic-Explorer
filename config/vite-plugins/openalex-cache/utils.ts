import type { ResolvedConfig } from "vite";
import type { OpenAlexCachePluginOptions } from "./types";

/**
 * Create a verbose logging function
 */
export const createLogVerbose = (verbose: boolean) => (message: string) => {
  if (verbose) {
    console.log(`[openalex-cache] ${message}`);
  }
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (config: ResolvedConfig): boolean => {
  return config.command === "serve";
};

/**
 * Check if the plugin should be enabled
 */
export const shouldEnablePlugin = (
  options: OpenAlexCachePluginOptions,
  config: ResolvedConfig,
): boolean => {
  return options.enabled !== false && isDevelopment(config);
};
