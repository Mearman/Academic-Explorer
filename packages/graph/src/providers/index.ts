/**
 * Graph Data Providers
 * Export all provider classes and interfaces
 */

export { GraphDataProvider, ProviderRegistry } from './base-provider';
export { OpenAlexGraphProvider } from './openalex-provider';

export type {
  SearchQuery,
  ProviderExpansionOptions,
  GraphExpansion,
  ProviderStats,
  ProviderOptions,
} from './base-provider';

// Entity detection utilities are exported via main index.ts
// to avoid conflicts with multiple DetectionResult types