/**
 * Cache Browser - UI-agnostic service for browsing cached OpenAlex entities
 */

export { CacheBrowserService, cacheBrowserService } from './cache-browser-service.js';
export type {
  EntityType,
  CachedEntityMetadata,
  CacheBrowserStats,
  CacheBrowserFilters,
  CacheBrowserOptions,
  CacheBrowserResult,
} from './types.js';