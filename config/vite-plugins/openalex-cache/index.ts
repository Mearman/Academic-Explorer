/**
 * OpenAlex Cache Plugin
 *
 * A Vite plugin for intercepting and caching OpenAlex API requests during development.
 * Uses proxy configuration to redirect api.openalex.org requests through the dev server.
 */

export { openalexCachePlugin } from "./plugin";
export type { OpenAlexCachePluginOptions } from "./types";
