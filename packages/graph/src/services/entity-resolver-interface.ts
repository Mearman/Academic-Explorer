/**
 * Entity Resolver - Phase 2 Provider-Based Implementation with SmartEntityCache Integration
 * Uses pluggable provider system for entity resolution and expansion
 * Enhanced with intelligent caching and context-aware field selection
 */

import type { GraphNode, EntityType, EntityIdentifier } from '../types/core';
import { ProviderRegistry, type GraphDataProvider } from '../providers/base-provider';
import { EntityDetectionService } from './entity-detection-service';

// SmartEntityCache System Type Definitions
export interface CacheContext {
  /** Context identifier for intelligent field selection */
  contextType: 'visualization' | 'search' | 'details' | 'expansion' | 'analysis';
  /** Usage pattern for field optimization */
  usagePattern?: 'frequent' | 'occasional' | 'one-time';
  /** Specific fields required for this context */
  requiredFields?: string[];
  /** Fields that would be beneficial but not required */
  preferredFields?: string[];
}

export interface CacheStats {
  /** Total cache hits */
  hits: number;
  /** Total cache misses */
  misses: number;
  /** Hit rate percentage */
  hitRate: number;
  /** Number of cached entities */
  entityCount: number;
  /** Cache memory usage in bytes */
  memoryUsage: number;
  /** Field coverage statistics per entity type */
  fieldCoverage: Record<EntityType, number>;
}

export interface FieldCoverageInfo {
  /** Available fields in cache */
  cached: string[];
  /** Missing fields that need to be fetched */
  missing: string[];
  /** Coverage percentage */
  coverage: number;
}

export interface SmartEntityCache {
  /** Get entity with intelligent field loading */
  getEntity(id: string, context?: CacheContext): Promise<GraphNode>;

  /** Batch ensure required fields are available */
  batchEnsureFields(
    entities: Array<{ id: string; context?: CacheContext }>,
    globalContext?: CacheContext
  ): Promise<GraphNode[]>;

  /** Preload entities for given contexts */
  preloadForContext(ids: string[], context: CacheContext): Promise<void>;

  /** Get field coverage information for an entity */
  getFieldCoverage(id: string, requiredFields: string[]): FieldCoverageInfo;

  /** Invalidate entity from cache */
  invalidate(id: string): void;

  /** Clear all cache entries */
  clear(): void;

  /** Get cache statistics */
  getStats(): CacheStats;

  /** Update cache configuration */
  updateConfig(config: Partial<CacheConfig>): void;
}

export interface CacheConfig {
  /** Maximum cache size in bytes */
  maxSize: number;
  /** Maximum age for cache entries in milliseconds */
  maxAge: number;
  /** Default stale time in milliseconds */
  defaultStaleTime: number;
  /** Entity-specific cache configuration */
  entityConfig: Record<EntityType, { stale: number; gc: number }>;
  /** Enable intelligent field prediction */
  enableFieldPrediction: boolean;
  /** Enable batch optimization */
  enableBatchOptimization: boolean;
}

export interface ContextualFieldSelector {
  /** Get optimal fields for given context and entity type */
  getFieldsForContext(entityType: EntityType, context: CacheContext): string[];

  /** Predict likely next field requirements */
  predictNextFields(entityType: EntityType, currentFields: string[], context: CacheContext): string[];

  /** Update usage statistics for field selection optimization */
  recordUsage(entityType: EntityType, fields: string[], context: CacheContext): void;
}

export interface EntityExpansionOptions {
  relationshipTypes?: string[];
  maxDepth?: number;
  limit?: number;
  includeMetadata?: boolean;
}

export interface ExpansionResult {
  nodes: GraphNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    metadata?: Record<string, unknown>;
  }>;
  expandedFrom: string;
  metadata?: {
    depth: number;
    totalFound: number;
    options: EntityExpansionOptions;
  };
}

export interface IEntityResolver {
  resolveEntity(id: EntityIdentifier): Promise<GraphNode>;
  expandEntity(nodeId: string, options?: Partial<EntityExpansionOptions>): Promise<ExpansionResult>;
  searchEntities(query: string, entityTypes: EntityType[]): Promise<GraphNode[]>;

  // Enhanced identifier handling
  detectAndResolveEntity(id: string): Promise<GraphNode>;
  detectAndResolveEntities(ids: string[]): Promise<Array<{ id: string; node?: GraphNode; error?: string }>>;
  isValidIdentifier(id: string): boolean;
  normalizeIdentifier(id: string): string | null;
  getSupportedIdentifierTypes(): Array<{ name: string; entityType: EntityType; description: string; examples: string[] }>;

  // Cache-aware resolution methods
  resolveEntityWithContext(id: string, context: CacheContext): Promise<GraphNode>;
  resolveEntitiesWithContext(ids: string[], context: CacheContext): Promise<GraphNode[]>;
  preloadForContext(ids: string[], context: CacheContext): Promise<void>;

  // Enhanced batch operations with context
  resolveEntities(ids: EntityIdentifier[]): Promise<GraphNode[]>;

  // Cache management
  setCacheContext(context: CacheContext): void;
  invalidateEntity(id: string): void;
  refreshEntity(id: string): Promise<GraphNode>;
  getCacheStats(): CacheStats;
  setCache(cache: SmartEntityCache): void;
  setFieldSelector(fieldSelector: ContextualFieldSelector): void;
  getFieldCoverage(id: string, requiredFields: string[]): FieldCoverageInfo | null;
  batchPreloadWithPrediction(ids: string[], context: CacheContext, entityType?: EntityType): Promise<void>;
  clearCache(): void;
  updateCacheConfig(config: Partial<CacheConfig>): void;

  // Provider management
  setProvider(provider: GraphDataProvider): void;
  setProviderRegistry(registry: ProviderRegistry): void;
}

/**
 * Phase 2: Provider-based EntityResolver implementation
 */
export class EntityResolver implements IEntityResolver {
  private providerRegistry: ProviderRegistry | null = null;
  private currentProvider: GraphDataProvider | null = null;
  private cache: SmartEntityCache | null = null;
  private fieldSelector: ContextualFieldSelector | null = null;
  private defaultContext: CacheContext | null = null;

  constructor(
    provider?: GraphDataProvider,
    registry?: ProviderRegistry,
    cache?: SmartEntityCache,
    fieldSelector?: ContextualFieldSelector
  ) {
    if (registry) {
      this.providerRegistry = registry;
    }
    if (provider) {
      this.currentProvider = provider;
    }
    if (cache) {
      this.cache = cache;
    }
    if (fieldSelector) {
      this.fieldSelector = fieldSelector;
    }
  }

  setProvider(provider: GraphDataProvider): void {
    this.currentProvider = provider;
  }

  setProviderRegistry(registry: ProviderRegistry): void {
    this.providerRegistry = registry;
  }

  async resolveEntity(id: EntityIdentifier): Promise<GraphNode> {
    // Try to normalize the identifier first
    const normalizedId = EntityDetectionService.normalizeIdentifier(id);
    const identifierToUse = normalizedId ?? id;

    // Use cache if available, otherwise fall back to provider
    if (this.cache) {
      try {
        return await this.cache.getEntity(identifierToUse, this.defaultContext ?? undefined);
      } catch {
        // If cache fails with normalized ID and it differs from original, try original
        if (normalizedId && normalizedId !== id) {
          try {
            return await this.cache.getEntity(id, this.defaultContext ?? undefined);
          } catch {
            // If cache fails completely, fall back to provider
            return this.resolveEntityWithProvider(id);
          }
        }
        // Fall back to provider for cache failures
        return this.resolveEntityWithProvider(identifierToUse);
      }
    }

    // No cache available, use provider directly
    return this.resolveEntityWithProvider(identifierToUse);
  }

  private async resolveEntityWithProvider(id: EntityIdentifier): Promise<GraphNode> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No data provider available for entity resolution');
    }

    // Try to normalize the identifier first
    const normalizedId = EntityDetectionService.normalizeIdentifier(id);
    const identifierToUse = normalizedId ?? id;

    try {
      return await provider.fetchEntity(identifierToUse);
    } catch (error) {
      // If normalization failed, try original identifier as fallback
      if (normalizedId && normalizedId !== id) {
        return await provider.fetchEntity(id);
      }
      throw error;
    }
  }

  async expandEntity(nodeId: string, options: Partial<EntityExpansionOptions> = {}): Promise<ExpansionResult> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No data provider available for entity expansion');
    }

    const fullOptions: EntityExpansionOptions = {
      maxDepth: 1,
      limit: 10,
      includeMetadata: true,
      ...options,
    };

    const expansion = await provider.expandEntity(nodeId, fullOptions);

    return {
      nodes: expansion.nodes,
      edges: expansion.edges,
      expandedFrom: nodeId,
      metadata: expansion.metadata,
    };
  }

  async searchEntities(query: string, entityTypes: EntityType[]): Promise<GraphNode[]> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No data provider available for entity search');
    }

    return provider.searchEntities({
      query,
      entityTypes,
      limit: 20,
    });
  }

  /**
   * Enhanced entity resolution with automatic identifier detection and normalization
   */
  async detectAndResolveEntity(id: string): Promise<GraphNode> {
    if (!id || typeof id !== 'string') {
      throw new Error('Invalid identifier: must be a non-empty string');
    }

    const detectionResult = EntityDetectionService.detectEntity(id.trim());
    if (!detectionResult) {
      throw new Error(`Unrecognized identifier format: "${id}". Supported formats include DOI, ORCID, ROR, ISSN, OpenAlex IDs, and OpenAlex URLs.`);
    }

    // Create appropriate context based on detected entity type
    const context: CacheContext = {
      contextType: 'details',
      usagePattern: 'occasional',
      requiredFields: this.fieldSelector?.getFieldsForContext(detectionResult.entityType, {
        contextType: 'details',
        usagePattern: 'occasional'
      }) || []
    };

    try {
      // Use cache-aware resolution if available
      if (this.cache) {
        // Pre-warm cache with detected entity basic info if needed
        return await this.cache.getEntity(detectionResult.normalizedId, context);
      }

      // Fall back to provider resolution
      const provider = this.getProvider();
      if (!provider) {
        throw new Error('No data provider available for entity resolution');
      }

      return await provider.fetchEntity(detectionResult.normalizedId);
    } catch (error) {
      // Enhanced error message with detection context
      throw new Error(
        `Failed to resolve ${detectionResult.detectionMethod} identifier "${detectionResult.originalInput}". ` +
        `Detected as ${detectionResult.entityType} entity with normalized ID "${detectionResult.normalizedId}". ` +
        `Original error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if an identifier is valid and can be detected
   */
  isValidIdentifier(id: string): boolean {
    return EntityDetectionService.isValidIdentifier(id);
  }

  /**
   * Normalize an identifier to standard format
   */
  normalizeIdentifier(id: string): string | null {
    return EntityDetectionService.normalizeIdentifier(id);
  }

  /**
   * Get supported identifier types and their patterns
   */
  getSupportedIdentifierTypes(): Array<{ name: string; entityType: EntityType; description: string; examples: string[] }> {
    return EntityDetectionService.getSupportedTypes();
  }

  // Batch operations
  async resolveEntities(ids: EntityIdentifier[]): Promise<GraphNode[]> {
    // Normalize all identifiers first
    const normalizedIds = ids.map(id => {
      const normalized = EntityDetectionService.normalizeIdentifier(id);
      return normalized ?? id;
    });

    // Use cache batch operation if available
    if (this.cache) {
      try {
        const entities = normalizedIds.map(id => ({
          id,
          context: this.defaultContext ?? undefined
        }));

        return await this.cache.batchEnsureFields(entities, this.defaultContext ?? undefined);
      } catch {
        // Fall back to provider on cache failure
        return this.resolveEntitiesWithProvider(normalizedIds);
      }
    }

    // No cache available, use provider directly
    return this.resolveEntitiesWithProvider(normalizedIds);
  }

  private async resolveEntitiesWithProvider(ids: EntityIdentifier[]): Promise<GraphNode[]> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No data provider available for entity resolution');
    }

    // Use batch operation if available, otherwise fall back to sequential
    if (typeof provider.fetchEntities === 'function') {
      return provider.fetchEntities(ids);
    }

    return Promise.all(ids.map(id => provider.fetchEntity(id)));
  }

  /**
   * Batch detection and resolution with detailed error handling
   */
  async detectAndResolveEntities(ids: string[]): Promise<Array<{ id: string; node?: GraphNode; error?: string }>> {
    const results: Array<{ id: string; node?: GraphNode; error?: string }> = [];

    for (const id of ids) {
      try {
        const node = await this.detectAndResolveEntity(id);
        results.push({ id, node });
      } catch (error) {
        results.push({
          id,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  /**
   * Cache-aware entity resolution with context
   */
  async resolveEntityWithContext(id: string, context: CacheContext): Promise<GraphNode> {
    // Try to normalize the identifier first
    const normalizedId = EntityDetectionService.normalizeIdentifier(id);
    const identifierToUse = normalizedId ?? id;

    // Use cache if available
    if (this.cache) {
      try {
        return await this.cache.getEntity(identifierToUse, context);
      } catch (error) {
        // If cache fails with normalized ID and it differs from original, try original
        if (normalizedId && normalizedId !== id) {
          try {
            return await this.cache.getEntity(id, context);
          } catch (fallbackError) {
            // If cache fails completely, fall back to provider
            return this.resolveEntityWithProvider(id);
          }
        }
        // Fall back to provider for cache failures
        return this.resolveEntityWithProvider(identifierToUse);
      }
    }

    // No cache available, use provider directly
    return this.resolveEntityWithProvider(identifierToUse);
  }

  /**
   * Cache-aware batch entity resolution with context
   */
  async resolveEntitiesWithContext(ids: string[], context: CacheContext): Promise<GraphNode[]> {
    // Normalize all identifiers first
    const normalizedIds = ids.map(id => {
      const normalized = EntityDetectionService.normalizeIdentifier(id);
      return normalized ?? id;
    });

    // Use cache batch operation if available
    if (this.cache) {
      try {
        const entities = normalizedIds.map(id => ({ id, context }));
        return await this.cache.batchEnsureFields(entities, context);
      } catch (error) {
        // Fall back to provider on cache failure
        return this.resolveEntitiesWithProvider(normalizedIds);
      }
    }

    // No cache available, use provider directly
    return this.resolveEntitiesWithProvider(normalizedIds);
  }

  /**
   * Preload entities for a specific context
   */
  async preloadForContext(ids: string[], context: CacheContext): Promise<void> {
    if (!this.cache) {
      // No cache available, silently skip preloading
      return;
    }

    // Normalize all identifiers first
    const normalizedIds = ids.map(id => {
      const normalized = EntityDetectionService.normalizeIdentifier(id);
      return normalized ?? id;
    });

    try {
      await this.cache.preloadForContext(normalizedIds, context);
    } catch (error) {
      // Preloading failures should not block execution
      // Preloading failures should not block execution
      // Error is logged in production via application layer
    }
  }

  /**
   * Set default cache context for all operations
   */
  setCacheContext(context: CacheContext): void {
    this.defaultContext = context;
  }

  /**
   * Invalidate entity from cache
   */
  invalidateEntity(id: string): void {
    if (this.cache) {
      const normalizedId = EntityDetectionService.normalizeIdentifier(id) ?? id;
      this.cache.invalidate(normalizedId);

      // Also invalidate original ID if different from normalized
      if (normalizedId !== id) {
        this.cache.invalidate(id);
      }
    }
  }

  /**
   * Force refresh entity from API, bypassing cache
   */
  async refreshEntity(id: string): Promise<GraphNode> {
    // Invalidate cache first
    this.invalidateEntity(id);

    // Resolve fresh from provider
    const normalizedId = EntityDetectionService.normalizeIdentifier(id) ?? id;
    const freshEntity = await this.resolveEntityWithProvider(normalizedId);

    // If we have a cache, populate it with the fresh data
    if (this.cache && this.defaultContext) {
      try {
        // This will populate the cache with fresh data
        await this.cache.getEntity(normalizedId, this.defaultContext);
      } catch (error) {
        // Cache population failure shouldn't affect the result
        // Cache population failure shouldn't affect the result
        // Error is logged in production via application layer
      }
    }

    return freshEntity;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    if (!this.cache) {
      // Return empty stats if no cache
      return {
        hits: 0,
        misses: 0,
        hitRate: 0,
        entityCount: 0,
        memoryUsage: 0,
        fieldCoverage: {} as Record<EntityType, number>
      };
    }

    return this.cache.getStats();
  }

  // Provider health check
  async isHealthy(): Promise<boolean> {
    const provider = this.getProvider();
    if (!provider) {
      return false;
    }

    return provider.isHealthy();
  }

  // Get statistics from current provider
  getProviderStats() {
    const provider = this.getProvider();
    return provider?.getProviderInfo() || null;
  }

  // Get all available providers from registry
  getAvailableProviders(): string[] {
    return this.providerRegistry?.listProviders() || [];
  }

  // Switch to a different provider from registry
  switchProvider(providerName: string): void {
    if (!this.providerRegistry) {
      throw new Error('No provider registry available');
    }

    const provider = this.providerRegistry.get(providerName);
    if (!provider) {
      throw new Error(`Provider '${providerName}' not found in registry`);
    }

    this.currentProvider = provider;
  }

  private getProvider(): GraphDataProvider | null {
    // Try current provider first
    if (this.currentProvider) {
      return this.currentProvider;
    }

    // Fall back to registry default
    if (this.providerRegistry) {
      return this.providerRegistry.get();
    }

    return null;
  }

  /**
   * Set cache instance
   */
  setCache(cache: SmartEntityCache): void {
    this.cache = cache;
  }

  /**
   * Set field selector for intelligent field optimization
   */
  setFieldSelector(fieldSelector: ContextualFieldSelector): void {
    this.fieldSelector = fieldSelector;
  }

  /**
   * Get field coverage information for an entity
   */
  getFieldCoverage(id: string, requiredFields: string[]): FieldCoverageInfo | null {
    if (!this.cache) {
      return null;
    }

    const normalizedId = EntityDetectionService.normalizeIdentifier(id) ?? id;
    return this.cache.getFieldCoverage(normalizedId, requiredFields);
  }

  /**
   * Batch preload with intelligent field prediction
   */
  async batchPreloadWithPrediction(
    ids: string[],
    context: CacheContext,
    entityType?: EntityType
  ): Promise<void> {
    if (!this.cache || !this.fieldSelector) {
      return;
    }

    // Normalize identifiers
    const normalizedIds = ids.map(id => {
      const normalized = EntityDetectionService.normalizeIdentifier(id);
      return normalized ?? id;
    });

    // Enhance context with predicted fields if entity type is known
    let enhancedContext = context;
    if (entityType && this.fieldSelector) {
      const predictedFields = this.fieldSelector.predictNextFields(
        entityType,
        context.requiredFields || [],
        context
      );

      enhancedContext = {
        ...context,
        preferredFields: [...(context.preferredFields || []), ...predictedFields]
      };
    }

    try {
      await this.cache.preloadForContext(normalizedIds, enhancedContext);
    } catch (error) {
      // Batch preload failures should not block execution
      // Error is logged in production via application layer
    }
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(config: Partial<CacheConfig>): void {
    if (this.cache) {
      this.cache.updateConfig(config);
    }
  }

  // Cleanup
  destroy(): void {
    this.currentProvider = null;
    this.providerRegistry = null;
    this.cache = null;
    this.fieldSelector = null;
    this.defaultContext = null;
  }
}