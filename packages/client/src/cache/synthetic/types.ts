/**
 * Synthetic cache types - minimal stub implementation
 * This is a simplified version to satisfy TypeScript compilation
 */

export type EntityType = "works" | "authors" | "sources" | "institutions" | "topics" | "publishers" | "funders";

export type StorageTier = "memory" | "localStorage" | "indexedDB" | "static";

export interface QueryParams {
  filter?: string;
  select?: string[];
  sort?: string;
  per_page?: number;
  page?: number;
  [key: string]: unknown;
}

export interface OptimizedRequestPlan {
  cacheHits: Array<{
    entityId: string;
    fields: string[];
    tier: StorageTier;
  }>;
  missingEntities: Array<{
    entityId: string;
    missingFields: string[];
  }>;
  apiRequests: Array<{
    entityIds: string[];
    fields: string[];
    params: QueryParams;
  }>;
  requiredApiCalls: Array<{
    entityIds: string[];
    fields: string[];
    params: QueryParams;
  }>;
  estimatedCost: {
    cacheTime: number;
    apiTime: number;
    bandwidth: number;
  };
  estimatedSavings: {
    time: number;
    bandwidth: number;
    requests: number;
  };
  canSynthesize: boolean;
}