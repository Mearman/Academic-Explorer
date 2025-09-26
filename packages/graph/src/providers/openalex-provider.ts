/**
 * OpenAlex-specific implementation of GraphDataProvider
 * Provides graph data from the OpenAlex academic database
 * Integrated with SmartEntityCache for optimized data fetching
 */

import {
  GraphDataProvider,
  type SearchQuery,
  type ProviderExpansionOptions,
  type GraphExpansion
} from './base-provider';
import { logger } from '@academic-explorer/utils';
import type { GraphNode, GraphEdge, EntityType, EntityIdentifier, ExternalIdentifier } from '../types/core';
import { RelationType } from '../types/core';
import { EntityDetectionService } from '../services/entity-detection-service';

// OpenAlex entity interfaces removed - unused after refactoring

// Removed unused interfaces - they were not being used in the implementation

interface OpenAlexSearchResponse {
  results: Record<string, unknown>[];
  meta?: {
    count?: number;
    per_page?: number;
    page?: number;
  };
}

// Smart Entity Cache interfaces (to be implemented)
interface CacheContext {
  operation: 'fetch' | 'search' | 'expand' | 'traverse';
  entityType?: EntityType;
  depth?: number;
  purpose?: 'visualization' | 'analysis' | 'export';
}

interface SmartEntityCache {
  getEntity(id: string, context: CacheContext, fields?: string[]): Promise<Record<string, unknown> | null>;
  batchGetEntities(ids: string[], context: CacheContext, fields?: string[]): Promise<Map<string, Record<string, unknown>>>;
  preloadEntity(id: string, context: CacheContext): Promise<void>;
  batchPreloadEntities(ids: string[], context: CacheContext): Promise<void>;
  getCacheStats(): Promise<CacheStats>;
  invalidateEntity(id: string): Promise<void>;
  clear(): Promise<void>;
}

interface ContextualFieldSelector {
  selectFieldsForContext(entityType: EntityType, context: CacheContext): string[];
  getMinimalFields(entityType: EntityType): string[];
  getExpansionFields(entityType: EntityType, relationType: RelationType): string[];
}

interface CacheStats {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  bandwidthSaved: number;
  fieldLevelHits: number;
  contextOptimizations: number;
}

// Interface to avoid circular dependency with client package
interface OpenAlexClient {
  getWork(id: string): Promise<Record<string, unknown>>;
  getAuthor(id: string): Promise<Record<string, unknown>>;
  getSource(id: string): Promise<Record<string, unknown>>;
  getInstitution(id: string): Promise<Record<string, unknown>>;
  get(endpoint: string, id: string): Promise<Record<string, unknown>>;
  works(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
  authors(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
  sources(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
  institutions(params: Record<string, unknown>): Promise<{ results: Record<string, unknown>[] }>;
}

interface OpenAlexProviderOptions {
  client: OpenAlexClient;
  cache?: SmartEntityCache;
  fieldSelector?: ContextualFieldSelector;
  name?: string;
  version?: string;
  maxConcurrentRequests?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * OpenAlex provider for graph data with SmartEntityCache integration
 */
export class OpenAlexGraphProvider extends GraphDataProvider {
  private cache?: SmartEntityCache;
  private fieldSelector?: ContextualFieldSelector;
  private currentContext: CacheContext = { operation: 'fetch' };
  private cacheStats = {
    hits: 0,
    misses: 0,
    fallbacks: 0,
    contextOptimizations: 0
  };

  constructor(private client: OpenAlexClient, options: Omit<OpenAlexProviderOptions, 'client'> = {}) {
    super({
      name: 'openalex',
      version: '1.0.0',
      ...options,
    });

    this.cache = options.cache;
    this.fieldSelector = options.fieldSelector || this.createDefaultFieldSelector();
  }

  /**
   * Fetch a single entity by ID with cache integration
   */
  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    return this.trackRequest((async () => {
      const entityType = this.detectEntityType(id);
      const normalizedId = this.normalizeIdentifier(id);

      // Set context for single entity fetch
      const context: CacheContext = {
        operation: 'fetch',
        entityType,
        purpose: 'visualization'
      };

      const entityData = await this.fetchEntityDataWithCache(normalizedId, entityType, context);

      const node: GraphNode = {
        id: normalizedId,
        entityType,
        entityId: normalizedId,
        label: this.extractLabel(entityData, entityType),
        x: Math.random() * 800,
        y: Math.random() * 600,
        externalIds: this.extractExternalIds(entityData, entityType),
        entityData,
      };

      this.onEntityFetched(node);
      return node;
    })());
  }

  /**
   * Search for entities based on query with cache-aware enrichment
   */
  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    return this.trackRequest((async () => {
      const results: GraphNode[] = [];

      // Set search context
      const context: CacheContext = {
        operation: 'search',
        purpose: 'visualization'
      };

      // Search each entity type requested
      for (const entityType of query.entityTypes) {
        try {
          const contextWithType = { ...context, entityType };
          const searchResults = await this.searchByEntityTypeWithCache(
            query.query,
            entityType,
            contextWithType,
            {
              limit: Math.floor((query.limit || 20) / query.entityTypes.length),
              offset: query.offset,
            }
          );

          results.push(...searchResults);
        } catch (error) {
          logger.warn('provider', `Search failed for entity type ${entityType}`, { error }, 'OpenAlexProvider');
        }
      }

      return results.slice(0, query.limit || 20);
    })());
  }

  /**
   * Expand an entity to show its relationships with cache-aware preloading
   */
  async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    return this.trackRequest((async () => {
      const entityType = this.detectEntityType(nodeId);
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      // Set expansion context
      const context: CacheContext = {
        operation: 'expand',
        entityType,
        depth: 1,
        purpose: 'visualization'
      };

      // Get the base entity data with expansion-specific fields
      const baseEntity = await this.fetchEntityDataWithCache(nodeId, entityType, context);

      // Expand based on entity type and available relationships
      switch (entityType) {
        case 'works':
          await this.expandWorkWithCache(nodeId, baseEntity, nodes, edges, options, context);
          break;
        case 'authors':
          await this.expandAuthorWithCache(nodeId, baseEntity, nodes, edges, options, context);
          break;
        case 'sources':
          await this.expandSourceWithCache(nodeId, baseEntity, nodes, edges, options, context);
          break;
        case 'institutions':
          await this.expandInstitutionWithCache(nodeId, baseEntity, nodes, edges, options, context);
          break;
        case 'topics':
          await this.expandTopicWithCache(nodeId, baseEntity, nodes, edges, options, context);
          break;
        default:
          // Basic expansion for other entity types
          break;
      }

      return {
        nodes,
        edges,
        metadata: {
          expandedFrom: nodeId,
          depth: 1,
          totalFound: nodes.length,
          options,
          cacheStats: this.cacheStats
        },
      };
    })());
  }

  /**
   * Health check - test if OpenAlex API is accessible
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Simple test request to verify API accessibility
      await this.client.works({
        filter: { has_doi: true },
        select: ['id'],
        per_page: 1
      });
      return true;
    } catch {
      return false;
    }
  }

  // Private helper methods

  private detectEntityType(id: string): EntityType {
    const entityType = EntityDetectionService.detectEntityType(id);
    if (!entityType) {
      throw new Error(`Cannot detect entity type for ID: ${id}`);
    }
    return entityType;
  }

  private normalizeIdentifier(id: string): string {
    const normalizedId = EntityDetectionService.normalizeIdentifier(id);
    if (!normalizedId) {
      throw new Error(`Cannot normalize identifier: ${id}`);
    }
    return normalizedId;
  }

  /**
   * Fetch entity data with cache integration and fallback
   */
  private async fetchEntityDataWithCache(
    id: string,
    entityType: EntityType,
    context: CacheContext
  ): Promise<Record<string, unknown>> {
    // Try cache first if available
    if (this.cache && this.fieldSelector) {
      try {
        const contextFields = this.fieldSelector.selectFieldsForContext(entityType, context);
        const cachedData = await this.cache.getEntity(id, context, contextFields);

        if (cachedData) {
          this.cacheStats.hits++;
          return cachedData;
        }
      } catch (error) {
        logger.warn('provider', `Cache lookup failed for ${id}`, { error }, 'OpenAlexProvider');
      }
    }

    // Fallback to direct API call
    this.cacheStats.misses++;
    this.cacheStats.fallbacks++;

    return this.fetchEntityData(id, entityType);
  }

  private async fetchEntityData(id: string, entityType: EntityType): Promise<Record<string, unknown>> {
    switch (entityType) {
      case 'works':
        return this.client.getWork(id);
      case 'authors':
        return this.client.getAuthor(id);
      case 'sources':
        return this.client.getSource(id);
      case 'institutions':
        return this.client.getInstitution(id);
      case 'topics':
        return this.client.get('topics', id);
      case 'publishers':
        return this.client.get('publishers', id);
      case 'funders':
        return this.client.get('funders', id);
      case 'concepts':
        return this.client.get('concepts', id);
      case 'keywords':
        return this.client.get('keywords', id);
      default:
        throw new Error(`Unsupported entity type: ${entityType}`);
    }
  }

  private extractLabel(data: Record<string, unknown>, entityType: EntityType): string {
    // Extract appropriate label based on entity type
    switch (entityType) {
      case 'works':
        return (data.title as string) || (data.display_name as string) || 'Untitled Work';
      case 'authors':
        return (data.display_name as string) || 'Unknown Author';
      case 'sources':
        return (data.display_name as string) || 'Unknown Source';
      case 'institutions':
        return (data.display_name as string) || 'Unknown Institution';
      default:
        return (data.display_name as string) || (data.name as string) || 'Unknown';
    }
  }

  private extractExternalIds(data: Record<string, unknown>, _entityType: EntityType): ExternalIdentifier[] {
    const externalIds: ExternalIdentifier[] = [];

    // Extract IDs based on entity type
    const ids = data.ids as Record<string, string> || {};

    if (ids.doi) {
      externalIds.push({
        type: 'doi' as const,
        value: ids.doi,
        url: `https://doi.org/${ids.doi}`,
      });
    }

    if (ids.orcid) {
      externalIds.push({
        type: 'orcid' as const,
        value: ids.orcid,
        url: ids.orcid,
      });
    }

    if (ids.ror) {
      externalIds.push({
        type: 'ror' as const,
        value: ids.ror,
        url: `https://ror.org/${ids.ror}`,
      });
    }

    return externalIds;
  }

  private async searchByEntityTypeWithCache(
    query: string,
    entityType: EntityType,
    context: CacheContext,
    options: { limit?: number; offset?: number }
  ): Promise<GraphNode[]> {
    const searchResults = await this.searchByEntityType(query, entityType, options);

    // Batch preload search results into cache for future access
    if (this.cache && searchResults.length > 0) {
      try {
        const entityIds = searchResults.map(node => node.id);
        await this.cache.batchPreloadEntities(entityIds, context);
      } catch (error) {
        logger.warn('provider', 'Failed to preload search results', { error }, 'OpenAlexProvider');
      }
    }

    return searchResults;
  }

  private async searchByEntityType(query: string, entityType: EntityType, options: { limit?: number; offset?: number }): Promise<GraphNode[]> {
    let searchResults: OpenAlexSearchResponse;

    switch (entityType) {
      case 'works':
        searchResults = await this.client.works({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      case 'authors':
        searchResults = await this.client.authors({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      case 'sources':
        searchResults = await this.client.sources({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      case 'institutions':
        searchResults = await this.client.institutions({
          search: query,
          per_page: options.limit || 10,
        });
        break;
      default:
        return [];
    }

    // Convert results to GraphNode format with defensive checks
    const results = searchResults.results;
    if (!Array.isArray(results)) {
      logger.warn('provider', 'Search results is not an array', { results, entityType }, 'OpenAlexProvider');
      return [];
    }

    return results.map((item) => {
      const itemRecord = item as Record<string, unknown>;
      return {
        id: String(itemRecord.id),
        entityType,
        entityId: String(itemRecord.id),
        label: this.extractLabel(itemRecord, entityType),
        x: Math.random() * 800,
        y: Math.random() * 600,
        externalIds: this.extractExternalIds(itemRecord, entityType),
        entityData: itemRecord,
      };
    });
  }

  private async expandWorkWithCache(
    workId: string,
    workData: Record<string, unknown>,
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: ProviderExpansionOptions,
    context: CacheContext
  ): Promise<void> {
    const relatedIds: string[] = [];

    // Collect related entity IDs for batch preloading
    const authorships = workData.authorships as Array<{author?: {id?: string}}>|| [];
    for (const authorship of authorships.slice(0, options.limit || 10)) {
      if (authorship.author?.id) {
        relatedIds.push(authorship.author.id);
      }
    }

    const primaryLocation = workData.primary_location as {source?: {id?: string}} || {};
    if (primaryLocation.source?.id) {
      relatedIds.push(primaryLocation.source.id);
    }

    // Batch preload related entities
    if (this.cache && relatedIds.length > 0) {
      try {
        const expansionContext = { ...context, operation: 'expand' as const, depth: (context.depth || 0) + 1 };
        await this.cache.batchPreloadEntities(relatedIds, expansionContext);
      } catch (error) {
        logger.warn('provider', 'Failed to preload related entities', { error }, 'OpenAlexProvider');
      }
    }

    // Add authors
    for (const authorship of authorships.slice(0, options.limit || 10)) {
      if (authorship.author?.id) {
        const author = authorship.author as Record<string, unknown>;
        const authorNode: GraphNode = {
          id: authorship.author.id,
          entityType: 'authors',
          entityId: authorship.author.id,
          label: String(author.display_name) || 'Unknown Author',
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(author, 'authors'),
          entityData: author,
        };

        nodes.push(authorNode);
        edges.push({
          id: `${workId}-authored-${authorship.author.id}`,
          source: authorship.author.id,
          target: workId,
          type: RelationType.AUTHORED,
        });
      }
    }

    // Add source (journal/venue)
    if (primaryLocation.source?.id) {
      const source = primaryLocation.source as Record<string, unknown>;
      const sourceNode: GraphNode = {
        id: primaryLocation.source.id,
        entityType: 'sources',
        entityId: primaryLocation.source.id,
        label: String(source.display_name) || 'Unknown Source',
        x: Math.random() * 800,
        y: Math.random() * 600,
        externalIds: this.extractExternalIds(source, 'sources'),
        entityData: source,
      };

      nodes.push(sourceNode);
      edges.push({
        id: `${workId}-published-in-${primaryLocation.source.id}`,
        source: workId,
        target: primaryLocation.source.id,
        type: RelationType.PUBLISHED_IN,
      });
    }
  }

  private async expandAuthorWithCache(
    authorId: string,
    authorData: Record<string, unknown>,
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: ProviderExpansionOptions,
    context: CacheContext
  ): Promise<void> {
    // Add recent works
    try {
      const works = await this.client.works({
        filter: { author: { id: authorId } },
        per_page: options.limit || 10,
        sort: 'publication_year:desc',
      });

      const workResults = Array.isArray(works.results) ? works.results : [];
      const workIds = workResults.map((work) => String((work as Record<string, unknown>).id));

      // Batch preload works into cache
      if (this.cache && workIds.length > 0) {
        try {
          const expansionContext = { ...context, entityType: 'works' as const, depth: (context.depth || 0) + 1 };
          await this.cache.batchPreloadEntities(workIds, expansionContext);
        } catch (error) {
          logger.warn('provider', 'Failed to preload author works', { error }, 'OpenAlexProvider');
        }
      }

      for (const work of workResults) {
        const workRecord = work as Record<string, unknown>;
        const workNode: GraphNode = {
          id: String(workRecord.id),
          entityType: 'works',
          entityId: String(workRecord.id),
          label: this.extractLabel(workRecord, 'works'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(workRecord, 'works'),
          entityData: workRecord,
        };

        nodes.push(workNode);
        edges.push({
          id: `${authorId}-authored-${workRecord.id}`,
          source: authorId,
          target: String(workRecord.id),
          type: RelationType.AUTHORED,
        });
      }
    } catch (error) {
      logger.warn('provider', `Failed to expand author ${authorId}`, { error }, 'OpenAlexProvider');
    }
  }

  private async expandSourceWithCache(
    sourceId: string,
    sourceData: Record<string, unknown>,
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: ProviderExpansionOptions,
    context: CacheContext
  ): Promise<void> {
    // Add recent works published in this source
    try {
      const works = await this.client.works({
        filter: { primary_location: { source: { id: sourceId } } },
        per_page: options.limit || 10,
        sort: 'publication_year:desc',
      });

      const workResults = Array.isArray(works.results) ? works.results : [];
      const workIds = workResults.map((work) => String((work as Record<string, unknown>).id));

      // Batch preload works into cache
      if (this.cache && workIds.length > 0) {
        try {
          const expansionContext = { ...context, entityType: 'works' as const, depth: (context.depth || 0) + 1 };
          await this.cache.batchPreloadEntities(workIds, expansionContext);
        } catch (error) {
          logger.warn('provider', 'Failed to preload source works', { error }, 'OpenAlexProvider');
        }
      }

      for (const work of workResults) {
        const workRecord = work as Record<string, unknown>;
        const workNode: GraphNode = {
          id: String(workRecord.id),
          entityType: 'works',
          entityId: String(workRecord.id),
          label: this.extractLabel(workRecord, 'works'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(workRecord, 'works'),
          entityData: workRecord,
        };

        nodes.push(workNode);
        edges.push({
          id: `${workRecord.id}-published-in-${sourceId}`,
          source: String(workRecord.id),
          target: sourceId,
          type: RelationType.PUBLISHED_IN,
        });
      }
    } catch (error) {
      logger.warn('provider', `Failed to expand source ${sourceId}`, { error }, 'OpenAlexProvider');
    }
  }

  private async expandInstitutionWithCache(
    institutionId: string,
    institutionData: Record<string, unknown>,
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: ProviderExpansionOptions,
    context: CacheContext
  ): Promise<void> {
    // Add authors affiliated with this institution
    try {
      const authors = await this.client.authors({
        filter: { last_known_institutions: { id: institutionId } },
        per_page: options.limit || 10,
      });

      const authorResults = Array.isArray(authors.results) ? authors.results : [];
      const authorIds = authorResults.map((author) => String((author as Record<string, unknown>).id));

      // Batch preload authors into cache
      if (this.cache && authorIds.length > 0) {
        try {
          const expansionContext = { ...context, entityType: 'authors' as const, depth: (context.depth || 0) + 1 };
          await this.cache.batchPreloadEntities(authorIds, expansionContext);
        } catch (error) {
          logger.warn('provider', 'Failed to preload institution authors', { error }, 'OpenAlexProvider');
        }
      }

      for (const author of authorResults) {
        const authorRecord = author as Record<string, unknown>;
        const authorNode: GraphNode = {
          id: String(authorRecord.id),
          entityType: 'authors',
          entityId: String(authorRecord.id),
          label: this.extractLabel(authorRecord, 'authors'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(authorRecord, 'authors'),
          entityData: authorRecord,
        };

        nodes.push(authorNode);
        edges.push({
          id: `${authorRecord.id}-affiliated-${institutionId}`,
          source: String(authorRecord.id),
          target: institutionId,
          type: RelationType.AFFILIATED,
        });
      }
    } catch (error) {
      logger.warn('provider', `Failed to expand institution ${institutionId}`, { error }, 'OpenAlexProvider');
    }
  }

  private async expandTopicWithCache(
    topicId: string,
    topicData: Record<string, unknown>,
    nodes: GraphNode[],
    edges: GraphEdge[],
    options: ProviderExpansionOptions,
    context: CacheContext
  ): Promise<void> {
    // Add recent works in this topic
    try {
      const works = await this.client.works({
        filter: { topics: { id: topicId } },
        per_page: options.limit || 10,
        sort: 'publication_year:desc',
      });

      const workResults = Array.isArray(works.results) ? works.results : [];
      const workIds = workResults.map((work) => String((work as Record<string, unknown>).id));

      // Batch preload works into cache
      if (this.cache && workIds.length > 0) {
        try {
          const expansionContext = { ...context, entityType: 'works' as const, depth: (context.depth || 0) + 1 };
          await this.cache.batchPreloadEntities(workIds, expansionContext);
        } catch (error) {
          logger.warn('provider', 'Failed to preload topic works', { error }, 'OpenAlexProvider');
        }
      }

      for (const work of workResults) {
        const workRecord = work as Record<string, unknown>;
        const workNode: GraphNode = {
          id: String(workRecord.id),
          entityType: 'works',
          entityId: String(workRecord.id),
          label: this.extractLabel(workRecord, 'works'),
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: this.extractExternalIds(workRecord, 'works'),
          entityData: workRecord,
        };

        nodes.push(workNode);
        edges.push({
          id: `${workRecord.id}-has-topic-${topicId}`,
          source: String(workRecord.id),
          target: topicId,
          type: RelationType.WORK_HAS_TOPIC,
        });
      }
    } catch (error) {
      logger.warn('provider', `Failed to expand topic ${topicId}`, { error }, 'OpenAlexProvider');
    }
  }

  // ==================== CACHE INTEGRATION METHODS ====================

  /**
   * Set the current cache context for subsequent operations
   */
  setCacheContext(context: CacheContext): void {
    this.currentContext = context;
  }

  /**
   * Preload a single entity into the cache
   */
  async preloadEntity(id: string, context: CacheContext): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.preloadEntity(id, context);
    } catch (error) {
      logger.warn('provider', `Failed to preload entity ${id}`, { error }, 'OpenAlexProvider');
    }
  }

  /**
   * Batch preload multiple entities into the cache
   */
  async batchPreloadEntities(ids: string[], context: CacheContext): Promise<void> {
    if (!this.cache || ids.length === 0) return;

    try {
      await this.cache.batchPreloadEntities(ids, context);
    } catch (error) {
      logger.warn('provider', 'Failed to batch preload entities', { error }, 'OpenAlexProvider');
    }
  }

  /**
   * Get cache performance statistics
   */
  async getCacheStats(): Promise<CacheStats | null> {
    if (!this.cache) return null;

    try {
      return await this.cache.getCacheStats();
    } catch (error) {
      logger.warn('provider', 'Failed to get cache stats', { error }, 'OpenAlexProvider');
      return null;
    }
  }

  /**
   * Get provider-level cache statistics
   */
  getProviderCacheStats(): {
    hits: number;
    misses: number;
    fallbacks: number;
    contextOptimizations: number;
    hitRate: number;
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    return {
      ...this.cacheStats,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0
    };
  }

  /**
   * Invalidate cached entity data
   */
  async invalidateEntity(id: string): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.invalidateEntity(id);
    } catch (error) {
      logger.warn('provider', `Failed to invalidate entity ${id}`, { error }, 'OpenAlexProvider');
    }
  }

  /**
   * Clear all cache data
   */
  async clearCache(): Promise<void> {
    if (!this.cache) return;

    try {
      await this.cache.clear();
      // Reset provider-level stats
      this.cacheStats = {
        hits: 0,
        misses: 0,
        fallbacks: 0,
        contextOptimizations: 0
      };
    } catch (error) {
      logger.warn('provider', 'Failed to clear cache', { error }, 'OpenAlexProvider');
    }
  }

  // ==================== FIELD SELECTOR HELPERS ====================

  /**
   * Create default field selector if none provided
   */
  private createDefaultFieldSelector(): ContextualFieldSelector {
    return {
      selectFieldsForContext: (entityType: EntityType, context: CacheContext): string[] => {
        const baseFields = this.getMinimalFields(entityType);

        switch (context.operation) {
          case 'fetch':
            return [...baseFields, 'authorships', 'primary_location', 'topics'];
          case 'search':
            return baseFields;
          case 'expand':
            return [...baseFields, ...this.getExpansionFields(entityType, RelationType.AUTHORED)];
          case 'traverse':
            return baseFields;
          default:
            return baseFields;
        }
      },

      getMinimalFields: (entityType: EntityType): string[] => {
        return this.getMinimalFields(entityType);
      },

      getExpansionFields: (entityType: EntityType, relationType: RelationType): string[] => {
        return this.getExpansionFields(entityType, relationType);
      }
    };
  }

  private getMinimalFields(entityType: EntityType): string[] {
    switch (entityType) {
      case 'works':
        return ['id', 'display_name', 'publication_year', 'type'];
      case 'authors':
        return ['id', 'display_name', 'orcid'];
      case 'sources':
        return ['id', 'display_name', 'type'];
      case 'institutions':
        return ['id', 'display_name', 'country_code'];
      case 'topics':
        return ['id', 'display_name', 'level'];
      default:
        return ['id', 'display_name'];
    }
  }

  private getExpansionFields(entityType: EntityType, relationType: RelationType): string[] {
    switch (entityType) {
      case 'works':
        if (relationType === RelationType.AUTHORED) {
          return ['authorships.author.id', 'authorships.author.display_name'];
        }
        return ['primary_location.source.id', 'topics.id'];
      case 'authors':
        return ['last_known_institutions.id', 'works_count'];
      default:
        return [];
    }
  }
}