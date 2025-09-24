/**
 * Synthetic cache - minimal stub implementation
 * This is a simplified version to satisfy TypeScript compilation
 */

export type {
  EntityType,
  StorageTier,
  QueryParams,
  OptimizedRequestPlan
} from "./types";

export {
  SyntheticCacheLayer,
  type SyntheticCacheConfig
} from "./synthetic-cache-layer";

import { SyntheticCacheLayer, type SyntheticCacheConfig } from "./synthetic-cache-layer";

export function createSyntheticCacheLayer(_config?: SyntheticCacheConfig): SyntheticCacheLayer {
  return new SyntheticCacheLayer();
}