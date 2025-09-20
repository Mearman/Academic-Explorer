/**
 * Synthetic Response Cache System
 * Entry point for the synthetic cache architecture
 */

export { StorageTier, type EntityType, type QueryParams } from './types';
export type {
  EntityFieldMetadata,
  EntityFieldData,
  EntityFieldAccumulation,
  CollectionMetadata,
  CollectionPage,
  CollectionResultMapping,
  FieldCoverageByTier,
  MultiTierAvailabilityMatrix,
  SurgicalRequest,
  OptimizedRequestPlan,
  StorageTierStats,
  MultiTierCacheStats,
  StorageTierInterface,
  RequestStrategy,
  CachePolicy
} from './types';

export { StorageTierManager } from './storage-tier-manager';
export { EntityFieldAccumulator } from './entity-field-accumulator';
export { CollectionResultMapper } from './collection-result-mapper';
export { SyntheticResponseGenerator } from './synthetic-response-generator';

export {
  type SyntheticCacheLayer,
  SyntheticCacheLayerImpl,
  createDefaultCachePolicy,
  createSyntheticCacheLayer
} from './synthetic-cache-layer';