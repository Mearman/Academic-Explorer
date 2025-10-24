/**
 * Vite Plugin for OpenAlex API Request Caching
 * Uses proxy configuration to intercept requests to api.openalex.org and caches responses to disk during development
 */

// Import from new modular structure
import type { OpenAlexCachePluginOptions } from "./types";
import { createLogVerbose, shouldEnablePlugin } from "./utils";
import { PluginState } from "./state";
import { createRedirectMiddleware, createCacheMiddleware } from "./middleware";

/**
 * Vite plugin for intercepting and caching OpenAlex API requests during development
 * Uses proxy configuration to redirect api.openalex.org requests through the dev server
 */
export function openalexCachePlugin(
  options: OpenAlexCachePluginOptions = {},
): Plugin {
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

    configResolved(resolvedConfig) {
      pluginState.setConfig(resolvedConfig, opts);

      logVerbose(`Static data directory: ${pluginState.getStaticDataDir()}`);
      logVerbose(`Plugin enabled: ${shouldEnablePlugin(opts, resolvedConfig)}`);
    },

    configureServer(server) {
      if (!shouldEnablePlugin(opts, pluginState.getConfig()!)) {
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

    config(userConfig, configEnv) {
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
  };
}
