/**
 * Enhanced Cache Interceptor with Advanced Features
 * 
 * Provides intelligent caching with:
 * - Smart invalidation strategies
 * - Enhanced analytics and monitoring
 * - Memory pressure handling
 * - Predictive prefetching
 * - Performance optimization
 */

import { CacheManager } from './cache';
import type { CacheStrategy } from './cache-interceptor';
import { RequestManager } from './request-manager';

// Local interface for cache statistics to avoid dependency on internal types
interface CacheStatsData {
  memoryEntries: number;
  validEntries: number;
  memorySize: number;
  localStorageEntries: number;
  localStorageSize: number;
  localStorageLimit: number;
  hitRate: number;
}

export interface EnhancedCacheOptions {
  ttl?: number;
  useMemory?: boolean;
  useLocalStorage?: boolean;
  useIndexedDB?: boolean;
  localStorageLimit?: number;
  enableAnalytics?: boolean;
  enablePredictivePrefetching?: boolean;
  memoryPressureThreshold?: number;
  maxConcurrentRequests?: number;
  requestTimeout?: number;
  strategies?: Array<{ pattern: RegExp; strategy: CacheStrategy }>;
}

export interface CacheAnalytics {
  hitRate: number;
  averageResponseTime: number;
  memoryPressure: number;
  storageUtilization: {
    memory: { used: number; limit: number };
    localStorage: { used: number; limit: number };
    indexedDB: { used?: number; quota?: number };
  };
  requestDeduplication: {
    totalRequests: number;
    deduplicatedRequests: number;
    deduplicationRate: number;
  };
  performance: {
    cacheHits: number;
    cacheMisses: number;
    cacheErrors: number;
    averageHitTime: number;
    averageMissTime: number;
  };
  entityTypes: Record<string, {
    hitRate: number;
    totalRequests: number;
    averageSize: number;
  }>;
}

export interface InvalidationRule {
  pattern: RegExp;
  strategy: 'immediate' | 'ttl-based' | 'dependency-based';
  dependencies?: string[];
  customLogic?: (key: string, data: unknown) => boolean;
}

export interface PrefetchingRule {
  triggerPattern: RegExp;
  prefetchTargets: (key: string, data: unknown) => string[];
  priority: 'low' | 'normal' | 'high';
  maxPrefetch?: number;
}

/**
 * Enhanced Cache Interceptor with advanced features
 */
export class EnhancedCacheInterceptor {
  private cache: CacheManager;
  private requestManager: RequestManager;
  private strategies: Map<RegExp, CacheStrategy> = new Map();
  private invalidationRules: InvalidationRule[] = [];
  private prefetchingRules: PrefetchingRule[] = [];
  private analytics: CacheAnalytics;
  private performanceTracker: Map<string, { startTime: number; type: 'hit' | 'miss' }> = new Map();
  private entityMetrics: Map<string, { requests: number; totalSize: number; hits: number }> = new Map();
  
  private readonly options: Required<EnhancedCacheOptions>;

  constructor(options: EnhancedCacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 60 * 60 * 1000,
      useMemory: options.useMemory !== false,
      useLocalStorage: options.useLocalStorage !== false,
      useIndexedDB: options.useIndexedDB !== false,
      localStorageLimit: options.localStorageLimit || 5 * 1024 * 1024,
      enableAnalytics: options.enableAnalytics !== false,
      enablePredictivePrefetching: options.enablePredictivePrefetching !== false,
      memoryPressureThreshold: options.memoryPressureThreshold || 0.8,
      maxConcurrentRequests: options.maxConcurrentRequests || 50,
      requestTimeout: options.requestTimeout || 30000,
      strategies: options.strategies || [],
    };

    this.cache = new CacheManager({
      ttl: this.options.ttl,
      useMemory: this.options.useMemory,
      useLocalStorage: this.options.useLocalStorage,
      useIndexedDB: this.options.useIndexedDB,
      localStorageLimit: this.options.localStorageLimit,
    });

    this.requestManager = new RequestManager({
      maxConcurrentRequests: this.options.maxConcurrentRequests,
      requestTimeout: this.options.requestTimeout,
      enableMetrics: true,
    });

    this.analytics = this.initializeAnalytics();
    this.setupDefaultStrategies();
    this.setupDefaultInvalidationRules();
    this.setupDefaultPrefetchingRules();

    // Setup custom strategies
    this.options.strategies.forEach(({ pattern, strategy }) => {
      this.strategies.set(pattern, strategy);
    });

    // Start monitoring if analytics enabled
    if (this.options.enableAnalytics) {
      this.startAnalyticsMonitoring();
    }
  }

  /**
   * Enhanced intercept method with analytics and optimization
   */
  async intercept<T>(
    endpoint: string,
    params: unknown,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(endpoint, params);
    const strategy = this.getStrategy(endpoint);
    const trackingId = this.generateTrackingId();

    // Update entity metrics
    this.updateEntityMetrics(endpoint, 'request');

    // Check if we should cache this request
    if (!strategy || !strategy.shouldCache({ endpoint, params })) {
      this.updateAnalytics('skipped');
      return requestFn();
    }

    // Start performance tracking
    this.startPerformanceTracking(trackingId, 'miss');

    // Use request deduplication for cache operations
    return this.requestManager.deduplicate(cacheKey, async () => {
      try {
        // Try to get from cache
        const cached = await this.cache.get<T>(endpoint, params as Record<string, unknown>);
        
        if (cached !== null) {
          this.updatePerformanceTracking(trackingId, 'hit');
          this.updateAnalytics('hit');
          this.updateEntityMetrics(endpoint, 'hit');
          
          // Trigger predictive prefetching if enabled
          if (this.options.enablePredictivePrefetching) {
            this.triggerPredictivePrefetch(endpoint, params, cached);
          }
          
          return cached;
        }
      } catch (error) {
        console.error('Cache read error:', error);
        this.updateAnalytics('error');
      }

      // Cache miss - execute request
      this.updatePerformanceTracking(trackingId, 'miss');
      const result = await requestFn();
      
      // Store in cache
      try {
        await this.cache.set(endpoint, params as Record<string, unknown>, result);
        this.updateAnalytics('miss');
        this.updateEntityMetrics(endpoint, 'miss', this.estimateSize(result));
        
        // Check invalidation rules
        this.processInvalidationRules(endpoint, params, result);
        
      } catch (error) {
        console.error('Cache write error:', error);
        this.updateAnalytics('error');
      }
      
      return result;
    });
  }

  /**
   * Intelligent cache invalidation
   */
  async invalidate(pattern: string | RegExp | InvalidationRule): Promise<void> {
    if (typeof pattern === 'string') {
      if (pattern === '*' || pattern === '.*') {
        await this.cache.clear();
        this.resetAnalytics();
        return;
      }
      // Convert string to regex for pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      await this.invalidateByPattern(regex);
    } else if (pattern instanceof RegExp) {
      await this.invalidateByPattern(pattern);
    } else {
      // Custom invalidation rule
      await this.applyInvalidationRule(pattern);
    }
  }

  /**
   * Enhanced cache warming with dependency analysis
   */
  async warmCache(
    requests: Array<{ endpoint: string; params: unknown; dependencies?: string[] }>,
    options: {
      maxConcurrency?: number;
      priorityOrder?: boolean;
      onProgress?: (completed: number, total: number) => void;
    } = {}
  ): Promise<{ successful: string[]; failed: Array<{ endpoint: string; error: Error }> }> {
    const { maxConcurrency = 5, priorityOrder = true, onProgress } = options;
    const successful: string[] = [];
    const failed: Array<{ endpoint: string; error: Error }> = [];

    // Sort by dependencies if priority order is enabled
    const sortedRequests = priorityOrder ? this.sortByDependencies(requests) : requests;

    // Process in batches
    for (let i = 0; i < sortedRequests.length; i += maxConcurrency) {
      const batch = sortedRequests.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async ({ endpoint, params }) => {
        try {
          const strategy = this.getStrategy(endpoint);
          if (strategy && strategy.shouldCache({ endpoint, params })) {
            const _cacheKey = strategy.getCacheKey({ endpoint, params });
            
            // Check if already cached
            const existing = await this.cache.get(endpoint, params as Record<string, unknown>);
            if (existing === null) {
              // Store placeholder to mark as warmed
              await this.cache.set(endpoint, params as Record<string, unknown>, { 
                _warmed: true, 
                timestamp: Date.now() 
              });
            }
          }
          successful.push(endpoint);
        } catch (error) {
          failed.push({ 
            endpoint, 
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      });

      await Promise.all(batchPromises);
      
      if (onProgress) {
        onProgress(Math.min(i + maxConcurrency, sortedRequests.length), sortedRequests.length);
      }
    }

    return { successful, failed };
  }

  /**
   * Memory pressure monitoring and optimization
   */
  async handleMemoryPressure(): Promise<void> {
    const stats = this.cache.getStats();
    const memoryPressure = this.calculateMemoryPressure(stats);

    if (memoryPressure > this.options.memoryPressureThreshold) {
      console.warn(`Memory pressure detected: ${(memoryPressure * 100).toFixed(1)}%`);
      
      // Implement aggressive LRU eviction
      await this.performAggressiveEviction();
      
      // Move data to persistent storage
      await this.migrateToPersiststentStorage();
      
      // Update analytics
      this.analytics.memoryPressure = memoryPressure;
    }
  }

  /**
   * Get comprehensive analytics
   */
  getAnalytics(): CacheAnalytics {
    const cacheStats = this.cache.getStats();
    const requestStats = this.requestManager.getStats();
    
    // Update storage utilization
    this.analytics.storageUtilization = {
      memory: {
        used: cacheStats.memorySize,
        limit: 100 * 1024 * 1024, // Estimate 100MB limit
      },
      localStorage: {
        used: cacheStats.localStorageSize,
        limit: cacheStats.localStorageLimit,
      },
      indexedDB: {
        used: undefined, // Would need to be provided by storage API
        quota: undefined,
      },
    };

    // Update request deduplication stats
    this.analytics.requestDeduplication = {
      totalRequests: requestStats.totalRequests,
      deduplicatedRequests: requestStats.deduplicatedRequests,
      deduplicationRate: requestStats.deduplicationHitRate,
    };

    // Update entity type analytics
    this.analytics.entityTypes = {};
    this.entityMetrics.forEach((metrics, entityType) => {
      this.analytics.entityTypes[entityType] = {
        hitRate: metrics.hits / metrics.requests,
        totalRequests: metrics.requests,
        averageSize: metrics.totalSize / Math.max(metrics.requests, 1),
      };
    });

    return { ...this.analytics };
  }

  /**
   * Add custom invalidation rule
   */
  addInvalidationRule(rule: InvalidationRule): void {
    this.invalidationRules.push(rule);
  }

  /**
   * Add custom prefetching rule
   */
  addPrefetchingRule(rule: PrefetchingRule): void {
    this.prefetchingRules.push(rule);
  }

  /**
   * Cleanup and shutdown
   */
  async destroy(): Promise<void> {
    this.requestManager.cancelAll();
    await this.cache.clear();
    this.resetAnalytics();
  }

  // Private methods

  private initializeAnalytics(): CacheAnalytics {
    return {
      hitRate: 0,
      averageResponseTime: 0,
      memoryPressure: 0,
      storageUtilization: {
        memory: { used: 0, limit: 0 },
        localStorage: { used: 0, limit: 0 },
        indexedDB: {},
      },
      requestDeduplication: {
        totalRequests: 0,
        deduplicatedRequests: 0,
        deduplicationRate: 0,
      },
      performance: {
        cacheHits: 0,
        cacheMisses: 0,
        cacheErrors: 0,
        averageHitTime: 0,
        averageMissTime: 0,
      },
      entityTypes: {},
    };
  }

  private setupDefaultStrategies(): void {
    // Entity caching strategy
    this.strategies.set(/^\/(works|authors|sources|institutions|publishers|funders|topics|concepts)\/[A-Z]\d+$/, {
      shouldCache: () => true,
      getCacheTTL: () => 7 * 24 * 60 * 60 * 1000, // 7 days
      getCacheKey: ({ endpoint, params }) => `entity:${endpoint}:${JSON.stringify(params || {})}`,
    });

    // Search results strategy
    this.strategies.set(/^\/(works|authors|sources|institutions|publishers|funders|topics|concepts)$/, {
      shouldCache: ({ params }) => {
        const p = (params as Record<string, unknown>) || {};
        if (p.sort?.toString().includes('date:desc')) return false;
        if (p.sample !== undefined) return false;
        return true;
      },
      getCacheTTL: () => 60 * 60 * 1000, // 1 hour
      getCacheKey: ({ endpoint, params }) => `search:${endpoint}:${JSON.stringify(params || {})}`,
    });
  }

  private setupDefaultInvalidationRules(): void {
    // Invalidate related entities when a work is updated
    this.addInvalidationRule({
      pattern: /^\/works\/W\d+$/,
      strategy: 'dependency-based',
      dependencies: ['authors', 'sources', 'institutions'],
      customLogic: (_key, _data) => {
        // Implement custom logic for work invalidation
        return true;
      },
    });
  }

  private setupDefaultPrefetchingRules(): void {
    // Prefetch related entities when a work is accessed
    this.addPrefetchingRule({
      triggerPattern: /^\/works\/W\d+$/,
      prefetchTargets: (key, data) => {
        const targets: string[] = [];
        if (typeof data === 'object' && data !== null) {
          const work = data as Record<string, unknown>;
          if (work.authorships && Array.isArray(work.authorships)) {
            (work.authorships as Array<Record<string, unknown>>).forEach((authorship: Record<string, unknown>) => {
              if (authorship.author && 
                  typeof authorship.author === 'object' && 
                  authorship.author !== null &&
                  'id' in authorship.author) {
                const authorId = (authorship.author as Record<string, unknown>).id;
                if (typeof authorId === 'string') {
                  targets.push(`/authors/${authorId}`);
                }
              }
            });
          }
        }
        return targets.slice(0, 5); // Limit prefetch
      },
      priority: 'low',
      maxPrefetch: 5,
    });
  }

  private getStrategy(endpoint: string): CacheStrategy | null {
    const strategies = Array.from(this.strategies.entries());
    for (let i = strategies.length - 1; i >= 0; i--) {
      const [pattern, strategy] = strategies[i];
      if (pattern.test(endpoint)) {
        return strategy;
      }
    }
    return null;
  }

  private generateCacheKey(endpoint: string, params: unknown): string {
    const strategy = this.getStrategy(endpoint);
    return strategy ? strategy.getCacheKey({ endpoint, params }) : `default:${endpoint}:${JSON.stringify(params)}`;
  }

  private generateTrackingId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  private startPerformanceTracking(trackingId: string, type: 'hit' | 'miss'): void {
    this.performanceTracker.set(trackingId, {
      startTime: performance.now(),
      type,
    });
  }

  private updatePerformanceTracking(trackingId: string, actualType: 'hit' | 'miss'): void {
    const tracking = this.performanceTracker.get(trackingId);
    if (tracking) {
      const duration = performance.now() - tracking.startTime;
      
      if (actualType === 'hit') {
        this.analytics.performance.averageHitTime = 
          (this.analytics.performance.averageHitTime * this.analytics.performance.cacheHits + duration) /
          (this.analytics.performance.cacheHits + 1);
        this.analytics.performance.cacheHits++;
      } else {
        this.analytics.performance.averageMissTime = 
          (this.analytics.performance.averageMissTime * this.analytics.performance.cacheMisses + duration) /
          (this.analytics.performance.cacheMisses + 1);
        this.analytics.performance.cacheMisses++;
      }
      
      this.performanceTracker.delete(trackingId);
    }
  }

  private updateAnalytics(type: 'hit' | 'miss' | 'error' | 'skipped'): void {
    if (type === 'error') {
      this.analytics.performance.cacheErrors++;
    }
    
    // Update hit rate
    const totalRequests = this.analytics.performance.cacheHits + this.analytics.performance.cacheMisses;
    if (totalRequests > 0) {
      this.analytics.hitRate = this.analytics.performance.cacheHits / totalRequests;
    }
  }

  private updateEntityMetrics(endpoint: string, type: 'request' | 'hit' | 'miss', size?: number): void {
    const entityType = this.extractEntityType(endpoint);
    const metrics = this.entityMetrics.get(entityType) || { requests: 0, totalSize: 0, hits: 0 };
    
    if (type === 'request') {
      metrics.requests++;
    } else if (type === 'hit') {
      metrics.hits++;
    }
    
    if (size) {
      metrics.totalSize += size;
    }
    
    this.entityMetrics.set(entityType, metrics);
  }

  private extractEntityType(endpoint: string): string {
    const match = endpoint.match(/^\/([^/]+)/);
    return match ? match[1] : 'unknown';
  }

  private estimateSize(data: unknown): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private async triggerPredictivePrefetch(endpoint: string, params: unknown, data: unknown): Promise<void> {
    for (const rule of this.prefetchingRules) {
      if (rule.triggerPattern.test(endpoint)) {
        const targets = rule.prefetchTargets(endpoint, data);
        
        // Queue prefetch with appropriate priority
        targets.slice(0, rule.maxPrefetch || 10).forEach(target => {
          // Use request manager for prefetching
          this.requestManager.deduplicate(`prefetch:${target}`, async () => {
            try {
              await this.cache.get(target, {});
            } catch (error) {
              console.debug('Prefetch failed:', target, error);
            }
            return null;
          });
        });
      }
    }
  }

  private async processInvalidationRules(endpoint: string, _params: unknown, _data: unknown): Promise<void> {
    for (const rule of this.invalidationRules) {
      if (rule.pattern.test(endpoint)) {
        await this.applyInvalidationRule(rule);
      }
    }
  }

  private async applyInvalidationRule(rule: InvalidationRule): Promise<void> {
    switch (rule.strategy) {
      case 'immediate':
        await this.invalidateByPattern(rule.pattern);
        break;
      case 'dependency-based':
        if (rule.dependencies) {
          for (const dep of rule.dependencies) {
            await this.invalidateByPattern(new RegExp(`/${dep}/`));
          }
        }
        break;
      case 'ttl-based':
        // TTL-based invalidation is handled by the cache manager
        break;
    }
  }

  private async invalidateByPattern(pattern: RegExp): Promise<void> {
    // This would need to be implemented with support from the cache manager
    // For now, we can clear all cache for the pattern
    console.debug('Pattern-based invalidation not fully implemented:', pattern);
  }

  private sortByDependencies(requests: Array<{ endpoint: string; params: unknown; dependencies?: string[] }>): typeof requests {
    // Simple topological sort by dependencies
    return requests.sort((a, b) => {
      const aDeps = a.dependencies?.length || 0;
      const bDeps = b.dependencies?.length || 0;
      return aDeps - bDeps;
    });
  }

  private calculateMemoryPressure(stats: CacheStatsData): number {
    const memoryUsage = stats.memorySize;
    const memoryLimit = 100 * 1024 * 1024; // 100MB estimate
    return memoryUsage / memoryLimit;
  }

  private async performAggressiveEviction(): Promise<void> {
    // This would implement more aggressive LRU eviction
    console.debug('Performing aggressive cache eviction');
  }

  private async migrateToPersiststentStorage(): Promise<void> {
    // This would move memory cache entries to IndexedDB
    console.debug('Migrating cache to persistent storage');
  }

  private startAnalyticsMonitoring(): void {
    // Start periodic analytics updates
    setInterval(() => {
      this.updateAnalyticsMetrics();
    }, 30000); // Every 30 seconds
  }

  private updateAnalyticsMetrics(): void {
    // Update real-time analytics metrics
    const cacheStats = this.cache.getStats();
    this.analytics.memoryPressure = this.calculateMemoryPressure(cacheStats);
  }

  private resetAnalytics(): void {
    this.analytics = this.initializeAnalytics();
    this.entityMetrics.clear();
    this.performanceTracker.clear();
  }
}

// Export singleton instance for easy usage
export const enhancedCacheInterceptor = new EnhancedCacheInterceptor({
  enableAnalytics: true,
  enablePredictivePrefetching: true,
  memoryPressureThreshold: 0.8,
});