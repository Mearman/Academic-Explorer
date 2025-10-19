/**
 * Vite Plugin for OpenAlex API Request Caching
 * Uses proxy configuration to intercept requests to api.openalex.org and caches responses to disk during development
 */

import type { Plugin } from "vite";

// Import from new modular structure
import type { OpenAlexCachePluginOptions } from "./types";
import {
  createLogVerbose,
  shouldEnablePlugin,
  isTest,
  isDevelopment,
} from "./utils";
import { PluginState } from "./state";
import { createRedirectMiddleware, createCacheMiddleware } from "./middleware";
import { fetchFromAPI, saveToCache } from "./cache-operations";
import { getCacheFilePath } from "../../../packages/utils/src/static-data/cache-utilities";
import { performDirectoryIndexUpdates } from "./index-operations";

/**
 * Vite plugin for intercepting and caching OpenAlex API requests during development
 * Uses proxy configuration to redirect api.openalex.org requests through the dev server
 */
export function openalexCachePlugin(
  options: OpenAlexCachePluginOptions = {},
): any {
  const pluginState = new PluginState();

  const opts = {
    staticDataPath: "public/data/openalex",
    verbose: false,
    enabled: true,
    dryRun: false,
    ...options,
  };

  const logVerbose = createLogVerbose(opts.verbose);

  return {
    name: "openalex-cache",

    config(userConfig, configEnv) {
      // Initialize plugin state early
      pluginState.setConfig(configEnv, opts);

      // Check if we're in development mode using configEnv
      if (configEnv.command !== "serve" || opts.enabled === false) {
        return;
      }

      // Configure CORS to allow OpenAlex API requests
      if (!userConfig.server) {
        userConfig.server = {};
      }

      // Set up CORS for development
      userConfig.server.cors = {
        origin: true,
        credentials: true,
      };

      console.log("🌐 OpenAlex cache plugin enabled for development");
    },

    configureServer(server) {
      // Check if plugin should be enabled
      if (opts.enabled === false || server.config.command !== "serve") {
        return;
      }

      // Add redirect middleware for API requests before OpenAlex cache middleware
      server.middlewares.use("/api", createRedirectMiddleware(logVerbose));

      // Add middleware to intercept OpenAlex API requests
      server.middlewares.use(
        "/api/openalex",
        createCacheMiddleware(
          pluginState.getContext(),
          pluginState.getDebounceManager(),
          pluginState.getStaticDataDir()!,
        ),
      );

      console.log("🌐 OpenAlex cache middleware configured for development");
    },

    buildStart() {
      logVerbose(`Static data directory: ${pluginState.getStaticDataDir()}`);
      logVerbose(
        `Plugin enabled: ${shouldEnablePlugin(opts, pluginState.getConfig() || ({} as any))}`,
      );

      // Set up global fetch interception for testing environments
      if (
        isTest() &&
        opts.enabled !== false &&
        process.env.RUNNING_E2E !== "true"
      ) {
        logVerbose(`Setting up cache interception for testing`);
        setupTestCacheInterception(pluginState, opts, logVerbose);
      }
    },
  };
}

/**
 * Set up fetch interception for testing environments to cache real API responses
 */
function setupTestCacheInterception(
  pluginState: PluginState,
  opts: OpenAlexCachePluginOptions,
  logVerbose: (message: string) => void,
) {
  const originalFetch = global.fetch;

  // Store original fetch for restoration
  (global as any)._originalFetch = originalFetch;

  // Override global fetch to intercept OpenAlex API calls
  global.fetch = async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    // Only intercept OpenAlex API calls
    if (!url.includes("api.openalex.org")) {
      return originalFetch(input, init);
    }

    logVerbose(`Intercepting OpenAlex API call in test: ${url}`);

    try {
      // Make the real API call
      const response = await originalFetch(input, init);

      // Only cache successful responses
      if (response.ok) {
        const { data, isMocked } = await fetchFromAPI(url);

        // Only save to cache if response is not mocked
        if (!isMocked) {
          const cachePath = await getCacheFilePath(
            url,
            pluginState.getStaticDataDir()!,
          );
          if (cachePath) {
            // Simple directory index update for testing
            const updateDirectoryIndexes = async (
              cachePath: string,
              url: string,
              fileName: string,
              retrieved_at?: string,
              contentHash?: string,
            ) => {
              try {
                await performDirectoryIndexUpdates(
                  cachePath,
                  url,
                  fileName,
                  pluginState.getStaticDataDir()!,
                  pluginState.getContext(),
                  retrieved_at,
                  contentHash,
                );
              } catch (error) {
                logVerbose(
                  `Failed to update directory indexes in test: ${error}`,
                );
              }
            };

            await saveToCache(
              cachePath,
              url,
              data,
              pluginState.getContext(),
              updateDirectoryIndexes,
            );
            logVerbose(`Cached real API response in test: ${cachePath}`);
          }
        }
      }

      return response;
    } catch (error) {
      logVerbose(`Failed to cache API response in test: ${error}`);
      // If caching fails, still make the original request
      return originalFetch(input, init);
    }
  };

  console.log("🧪 OpenAlex cache interception enabled for testing");
}
