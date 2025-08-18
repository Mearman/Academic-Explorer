/**
 * Cache Warming Service for OpenAlex API Client
 * 
 * Provides intelligent cache warming functionality including:
 * - Entity prefetching
 * - Batch cache warming
 * - Background warming
 * - Predictive prefetching based on relationships
 * - Configurable strategies
 */

import type { EntityData } from '@/hooks/use-entity-data';

import { cachedOpenAlex } from './client-with-cache';
import type { Work, Author, Source, Institution } from './types';
import { 
  EntityType, 
  detectEntityType, 
  normalizeEntityId 
} from './utils/entity-detection';

/**
 * Type guards for OpenAlex entity types
 */
function isWork(entity: EntityData): entity is Work {
  return 'authorships' in entity || 'primary_location' in entity;
}

function isAuthor(entity: EntityData): entity is Author {
  return 'last_known_institutions' in entity && 'orcid' in entity;
}

function isSource(entity: EntityData): entity is Source {
  return 'publisher' in entity && 'issn_l' in entity;
}

function isInstitution(entity: EntityData): entity is Institution {
  return 'associated_institutions' in entity && 'country_code' in entity;
}

/**
 * Common OpenAlex entity interfaces for type safety
 */
interface AuthorshipInfo {
  author?: { id?: string };
  institutions?: Array<{ id?: string }>;
}

interface EntityReference {
  id?: string;
}

interface ConceptInfo {
  id?: string;
}

interface TopicInfo {
  id?: string;
}

/**
 * Cache warming configuration types
 */
export enum CacheWarmingStrategy {
  OFF = 'off',
  CONSERVATIVE = 'conservative',
  AGGRESSIVE = 'aggressive',
  CUSTOM = 'custom',
}

export interface CacheWarmingConfig {
  strategy: CacheWarmingStrategy;
  maxConcurrentRequests: number;
  relationshipDepth: number;
  enablePredictive: boolean;
  ttl?: number;
  backgroundWarming: boolean;
}

export interface PrefetchOptions {
  priority?: 'low' | 'normal' | 'high';
  skipCache?: boolean;
  timeout?: number;
  strategy?: CacheWarmingStrategy;
}

export interface WarmCacheOptions {
  maxConcurrency?: number;
  batchSize?: number;
  onProgress?: (progress: { completed: number; total: number; errors: string[] }) => void;
  onError?: (error: Error, entityId: string) => void;
  strategy?: CacheWarmingStrategy;
}

export interface CacheWarmingResult {
  successful: string[];
  failed: Array<{ entityId: string; error: Error }>;
  totalTime: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface CacheWarmingStats {
  cacheHits: number;
  cacheMisses: number;
  prefetchQueue: number;
  backgroundQueue: number;
  totalWarmed: number;
  totalErrors: number;
}

/**
 * Background warming queue item
 */
interface BackgroundWarmingItem {
  entityId: string;
  entityType?: EntityType;
  priority: 'low' | 'normal' | 'high';
  timestamp: number;
  retryCount: number;
}

/**
 * Cache warming service implementation
 */
export class CacheWarmingService {
  private config: CacheWarmingConfig = {
    strategy: CacheWarmingStrategy.CONSERVATIVE,
    maxConcurrentRequests: 5,
    relationshipDepth: 1,
    enablePredictive: true,
    backgroundWarming: true,
  };

  private stats: CacheWarmingStats = {
    cacheHits: 0,
    cacheMisses: 0,
    prefetchQueue: 0,
    backgroundQueue: 0,
    totalWarmed: 0,
    totalErrors: 0,
  };

  private prefetchQueue: string[] = [];
  private backgroundQueue: BackgroundWarmingItem[] = [];
  private activeRequests = new Set<string>();
  private backgroundProcessor: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheWarmingConfig>) {
    if (config) {
      this.setConfig(config);
    }
    
    if (this.config.backgroundWarming) {
      this.startBackgroundProcessor();
    }
  }

  /**
   * Prefetch a single entity
   */
  async prefetchEntity(
    entityId: string, 
    entityType?: EntityType, 
    options: PrefetchOptions = {}
  ): Promise<EntityData> {
    const startTime = Date.now();
    
    try {
      // Add to prefetch queue for tracking
      if (!this.prefetchQueue.includes(entityId)) {
        this.prefetchQueue.push(entityId);
        this.stats.prefetchQueue = this.prefetchQueue.length;
      }

      // Determine entity type
      let detectedType: EntityType;
      if (entityType) {
        detectedType = entityType;
      } else {
        detectedType = detectEntityType(entityId);
      }

      const normalizedId = normalizeEntityId(entityId, detectedType);
      
      // Check if already being fetched
      if (this.activeRequests.has(normalizedId)) {
        console.log(`[CacheWarming] Skipping duplicate prefetch for ${normalizedId}`);
        throw new Error('Entity already being prefetched');
      }

      this.activeRequests.add(normalizedId);

      try {
        // Fetch the entity based on type
        let result: EntityData;
        
        switch (detectedType) {
          case EntityType.WORK:
            result = await cachedOpenAlex.work(normalizedId, options.skipCache);
            break;
          case EntityType.AUTHOR:
            result = await cachedOpenAlex.author(normalizedId, options.skipCache);
            break;
          case EntityType.SOURCE:
            result = await cachedOpenAlex.source(normalizedId, options.skipCache);
            break;
          case EntityType.INSTITUTION:
            result = await cachedOpenAlex.institution(normalizedId, options.skipCache);
            break;
          case EntityType.PUBLISHER:
            result = await cachedOpenAlex.publisher(normalizedId, options.skipCache);
            break;
          case EntityType.FUNDER:
            result = await cachedOpenAlex.funder(normalizedId, options.skipCache);
            break;
          case EntityType.TOPIC:
            result = await cachedOpenAlex.topic(normalizedId, options.skipCache);
            break;
          case EntityType.CONCEPT:
            result = await cachedOpenAlex.concept(normalizedId, options.skipCache);
            break;
          case EntityType.CONTINENT:
            result = await cachedOpenAlex.request<EntityData>(`/continents/${normalizedId}`);
            break;
          case EntityType.KEYWORD:
            result = await cachedOpenAlex.request<EntityData>(`/keywords/${normalizedId}`);
            break;
          case EntityType.REGION:
            result = await cachedOpenAlex.request<EntityData>(`/regions/${normalizedId}`);
            break;
          default:
            throw new Error(`Unsupported entity type: ${detectedType}`);
        }

        // Update stats
        this.stats.totalWarmed++;
        
        // If predictive prefetching is enabled, queue related entities
        if (this.config.enablePredictive && options.strategy !== CacheWarmingStrategy.OFF) {
          this.queueRelatedEntities(result, detectedType);
        }

        console.log(`[CacheWarming] Successfully prefetched ${detectedType}:${normalizedId} in ${Date.now() - startTime}ms`);
        
        return result;
        
      } finally {
        this.activeRequests.delete(normalizedId);
        
        // Remove from prefetch queue
        const index = this.prefetchQueue.indexOf(entityId);
        if (index > -1) {
          this.prefetchQueue.splice(index, 1);
          this.stats.prefetchQueue = this.prefetchQueue.length;
        }
      }
      
    } catch (error) {
      this.stats.totalErrors++;
      console.error(`[CacheWarming] Failed to prefetch ${entityId}:`, error);
      throw error;
    }
  }

  /**
   * Warm cache for multiple entities in batch
   */
  async warmCache(
    entityIds: string[], 
    options: WarmCacheOptions = {}
  ): Promise<CacheWarmingResult> {
    const startTime = Date.now();
    const {
      maxConcurrency = this.config.maxConcurrentRequests,
      batchSize = 10,
      onProgress,
      onError,
    } = options;

    const result: CacheWarmingResult = {
      successful: [],
      failed: [],
      totalTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    let completed = 0;
    const errors: string[] = [];

    // Process entities in batches
    for (let i = 0; i < entityIds.length; i += batchSize) {
      const batch = entityIds.slice(i, i + batchSize);
      
      // Process batch with concurrency limit
      const batchPromises = batch.map(async (entityId) => {
        try {
          const data = await this.prefetchEntity(entityId);
          result.successful.push(entityId);
          return data;
        } catch (error) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          result.failed.push({ entityId, error: errorObj });
          errors.push(`${entityId}: ${errorObj.message}`);
          
          if (onError) {
            onError(errorObj, entityId);
          }
          
          return null;
        }
      });

      // Limit concurrency within batch
      const semaphore = new Semaphore(maxConcurrency);
      const limitedPromises = batchPromises.map(async (promise) => {
        await semaphore.acquire();
        try {
          return await promise;
        } finally {
          semaphore.release();
        }
      });

      await Promise.all(limitedPromises);
      
      completed += batch.length;
      
      // Report progress
      if (onProgress) {
        onProgress({
          completed,
          total: entityIds.length,
          errors: [...errors],
        });
      }
    }

    result.totalTime = Date.now() - startTime;
    
    console.log(`[CacheWarming] Batch warming completed: ${result.successful.length} successful, ${result.failed.length} failed in ${result.totalTime}ms`);
    
    return result;
  }

  /**
   * Warm cache for related entities based on entity relationships
   */
  async warmRelatedEntities(
    entityId: string, 
    entityType: EntityType, 
    depth: number = 1
  ): Promise<CacheWarmingResult> {
    if (depth <= 0) {
      return {
        successful: [],
        failed: [],
        totalTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
    }

    try {
      // First fetch the main entity
      const entity = await this.prefetchEntity(entityId, entityType);
      
      // Extract related entity IDs based on entity type
      const relatedIds = this.extractRelatedEntityIds(entity, entityType);
      
      if (relatedIds.length === 0) {
        return {
          successful: [entityId],
          failed: [],
          totalTime: 0,
          cacheHits: 1,
          cacheMisses: 0,
        };
      }

      // Warm related entities
      const result = await this.warmCache(relatedIds);
      
      // If depth > 1, recursively warm related entities of related entities
      if (depth > 1) {
        const secondLevelPromises = relatedIds.map(async (relatedId) => {
          try {
            const relatedType = detectEntityType(relatedId);
            return this.warmRelatedEntities(relatedId, relatedType, depth - 1);
          } catch (error) {
            console.warn(`[CacheWarming] Failed to warm second level for ${relatedId}:`, error);
            return null;
          }
        });

        const secondLevelResults = await Promise.all(secondLevelPromises);
        
        // Merge results
        secondLevelResults.forEach(secondResult => {
          if (secondResult) {
            result.successful.push(...secondResult.successful);
            result.failed.push(...secondResult.failed);
          }
        });
      }

      return result;
      
    } catch (error) {
      console.error(`[CacheWarming] Failed to warm related entities for ${entityId}:`, error);
      return {
        successful: [],
        failed: [{ entityId, error: error instanceof Error ? error : new Error(String(error)) }],
        totalTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
    }
  }

  /**
   * Queue related entities for background warming
   */
  private queueRelatedEntities(entity: EntityData, entityType: EntityType): void {
    const relatedIds = this.extractRelatedEntityIds(entity, entityType);
    
    relatedIds.forEach(relatedId => {
      // Skip if already in queue or being processed
      if (this.backgroundQueue.some(item => item.entityId === relatedId) || 
          this.activeRequests.has(relatedId)) {
        return;
      }

      this.backgroundQueue.push({
        entityId: relatedId,
        priority: 'low',
        timestamp: Date.now(),
        retryCount: 0,
      });
    });

    this.stats.backgroundQueue = this.backgroundQueue.length;
  }

  /**
   * Extract related entity IDs from an entity based on its type
   */
  private extractRelatedEntityIds(entity: EntityData, entityType: EntityType): string[] {
    const relatedIds: string[] = [];

    try {
      switch (entityType) {
        case EntityType.WORK: {
          if (isWork(entity)) {
            // Authors
            if (entity.authorships) {
              entity.authorships.forEach((authorship: AuthorshipInfo) => {
                if (authorship.author?.id) {
                  relatedIds.push(this.extractIdFromUrl(authorship.author.id));
                }
                // Institutions
                if (authorship.institutions) {
                  authorship.institutions.forEach((institution: EntityReference) => {
                    if (institution.id) {
                      relatedIds.push(this.extractIdFromUrl(institution.id));
                    }
                  });
                }
              });
            }
            
            // Source
            if (entity.primary_location?.source?.id) {
              relatedIds.push(this.extractIdFromUrl(entity.primary_location.source.id));
            }
            
            // Concepts/Topics
            if (entity.concepts) {
              entity.concepts.forEach((concept: ConceptInfo) => {
                if (concept.id) {
                  relatedIds.push(this.extractIdFromUrl(concept.id));
                }
              });
            }
            
            if (entity.topics) {
              entity.topics.forEach((topic: TopicInfo) => {
                if (topic.id) {
                  relatedIds.push(this.extractIdFromUrl(topic.id));
                }
              });
            }
          }
          
          break;
        }

        case EntityType.AUTHOR: {
          if (isAuthor(entity)) {
            // Institutions
            if (entity.last_known_institutions) {
              entity.last_known_institutions.forEach((institution: EntityReference) => {
                if (institution.id) {
                  relatedIds.push(this.extractIdFromUrl(institution.id));
                }
              });
            }
            
            // Topics
            if (entity.topics) {
              entity.topics.forEach((topic: TopicInfo) => {
                if (topic.id) {
                  relatedIds.push(this.extractIdFromUrl(topic.id));
                }
              });
            }
          }
          
          break;
        }

        case EntityType.INSTITUTION: {
          if (isInstitution(entity)) {
            // Associated institutions (parent/child)
            if (entity.associated_institutions) {
              entity.associated_institutions.forEach((assocInst: EntityReference) => {
                if (assocInst.id) {
                  relatedIds.push(this.extractIdFromUrl(assocInst.id));
                }
              });
            }
          }
          
          break;
        }

        case EntityType.SOURCE: {
          if (isSource(entity)) {
            // Host organization (publisher/institution)
            if (entity.host_organization) {
              relatedIds.push(this.extractIdFromUrl(entity.host_organization));
            }
          }
          
          break;
        }
      }
    } catch (error) {
      console.warn(`[CacheWarming] Error extracting related IDs from ${entityType}:`, error);
    }

    return relatedIds.filter(id => id && id.length > 0);
  }

  /**
   * Extract OpenAlex ID from full URL
   */
  private extractIdFromUrl(url: string): string {
    if (url.startsWith('https://openalex.org/')) {
      return url.replace('https://openalex.org/', '');
    }
    return url;
  }

  /**
   * Start background processor for low-priority warming
   */
  private startBackgroundProcessor(): void {
    if (this.backgroundProcessor) {
      return;
    }

    this.backgroundProcessor = setInterval(async () => {
      if (this.backgroundQueue.length === 0 || this.activeRequests.size >= this.config.maxConcurrentRequests) {
        return;
      }

      // Get highest priority item
      this.backgroundQueue.sort((a, b) => {
        const priorityOrder = { high: 3, normal: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const item = this.backgroundQueue.shift();
      if (!item) {
        return;
      }

      this.stats.backgroundQueue = this.backgroundQueue.length;

      try {
        await this.prefetchEntity(item.entityId, item.entityType, { priority: item.priority });
      } catch (error) {
        console.warn(`[CacheWarming] Background warming failed for ${item.entityId}:`, error);
        
        // Retry with exponential backoff
        if (item.retryCount < 3) {
          setTimeout(() => {
            this.backgroundQueue.push({
              ...item,
              retryCount: item.retryCount + 1,
              timestamp: Date.now(),
            });
            this.stats.backgroundQueue = this.backgroundQueue.length;
          }, Math.pow(2, item.retryCount) * 1000);
        }
      }
    }, 1000); // Process every second
  }

  /**
   * Stop background processor
   */
  private stopBackgroundProcessor(): void {
    if (this.backgroundProcessor) {
      clearInterval(this.backgroundProcessor);
      this.backgroundProcessor = null;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): CacheWarmingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<CacheWarmingConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart background processor if warming setting changed
    if (config.backgroundWarming !== undefined) {
      this.stopBackgroundProcessor();
      if (this.config.backgroundWarming) {
        this.startBackgroundProcessor();
      }
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CacheWarmingStats {
    return { ...this.stats };
  }

  /**
   * Clear all queues and reset stats
   */
  clear(): void {
    this.prefetchQueue = [];
    this.backgroundQueue = [];
    this.activeRequests.clear();
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      prefetchQueue: 0,
      backgroundQueue: 0,
      totalWarmed: 0,
      totalErrors: 0,
    };
  }

  /**
   * Cleanup and shutdown
   */
  destroy(): void {
    this.stopBackgroundProcessor();
    this.clear();
  }
}

/**
 * Simple semaphore for concurrency control
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      this.permits--;
      resolve();
    }
  }
}

// Export singleton instance
export const cacheWarmingService = new CacheWarmingService();

// Export convenience functions
export async function prefetchEntity(
  entityId: string, 
  entityType?: EntityType, 
  options?: PrefetchOptions
): Promise<EntityData> {
  return cacheWarmingService.prefetchEntity(entityId, entityType, options);
}

export async function warmCache(
  entityIds: string[], 
  options?: WarmCacheOptions
): Promise<CacheWarmingResult> {
  return cacheWarmingService.warmCache(entityIds, options);
}

export async function warmRelatedEntities(
  entityId: string, 
  entityType: EntityType, 
  depth?: number
): Promise<CacheWarmingResult> {
  return cacheWarmingService.warmRelatedEntities(entityId, entityType, depth);
}

export function getCacheWarmingStats(): CacheWarmingStats {
  return cacheWarmingService.getStats();
}

export function setCacheWarmingConfig(config: Partial<CacheWarmingConfig>): void {
  return cacheWarmingService.setConfig(config);
}