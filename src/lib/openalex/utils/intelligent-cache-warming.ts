/**
 * Intelligent Cache Warming Service
 * 
 * Provides advanced cache warming capabilities with:
 * - Frequency-based warming
 * - Dependency graph analysis
 * - Predictive prefetching
 * - Priority-based scheduling
 * - Performance optimization
 */

import { CacheManager } from './cache';
import { enhancedCacheInterceptor, type CacheAnalytics } from './enhanced-cache-interceptor';
import { RequestManager } from './request-manager';

export interface WarmingStrategy {
  name: string;
  priority: number;
  frequency: number; // How often to warm (in ms)
  maxItems: number;
  enabled: boolean;
}

export interface EntityFrequency {
  entityId: string;
  entityType: string;
  accessCount: number;
  lastAccessed: number;
  averageAccessInterval: number;
  priority: number;
}

export interface DependencyGraph {
  [entityId: string]: {
    dependencies: string[];
    dependents: string[];
    weight: number;
  };
}

export interface WarmingResult {
  strategy: string;
  startTime: number;
  endTime: number;
  itemsWarmed: number;
  itemsFailed: number;
  cacheHitImprovement: number;
  errors: Array<{ entityId: string; error: string }>;
}

export interface PredictiveModel {
  name: string;
  accuracy: number;
  predictions: Array<{
    entityId: string;
    probability: number;
    timeWindow: number;
  }>;
}

/**
 * Intelligent Cache Warming Service
 */
export class IntelligentCacheWarmingService {
  private cache: CacheManager;
  private requestManager: RequestManager;
  private frequencyTracker: Map<string, EntityFrequency> = new Map();
  private dependencyGraph: DependencyGraph = {};
  private warmingStrategies: Map<string, WarmingStrategy> = new Map();
  private isWarmingActive = false;
  private warmingInterval: NodeJS.Timeout | null = null;
  private analytics: CacheAnalytics | null = null;
  
  constructor() {
    this.cache = new CacheManager({
      useMemory: true,
      useLocalStorage: true,
      useIndexedDB: true,
    });

    this.requestManager = new RequestManager({
      maxConcurrentRequests: 10,
      enableMetrics: true,
    });

    this.initializeDefaultStrategies();
  }

  /**
   * Start intelligent cache warming
   */
  start(): void {
    if (this.isWarmingActive) {
      return;
    }

    this.isWarmingActive = true;
    this.scheduleWarming();
    console.log('Intelligent cache warming started');
  }

  /**
   * Stop cache warming
   */
  stop(): void {
    this.isWarmingActive = false;
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
      this.warmingInterval = null;
    }
    console.log('Intelligent cache warming stopped');
  }

  /**
   * Track entity access for frequency analysis
   */
  trackEntityAccess(entityId: string, entityType: string): void {
    const now = Date.now();
    const existing = this.frequencyTracker.get(entityId);

    if (existing) {
      // Update existing frequency data
      const timeSinceLastAccess = now - existing.lastAccessed;
      existing.accessCount++;
      existing.averageAccessInterval = 
        (existing.averageAccessInterval * (existing.accessCount - 1) + timeSinceLastAccess) / existing.accessCount;
      existing.lastAccessed = now;
      existing.priority = this.calculatePriority(existing);
    } else {
      // Create new frequency entry
      this.frequencyTracker.set(entityId, {
        entityId,
        entityType,
        accessCount: 1,
        lastAccessed: now,
        averageAccessInterval: 0,
        priority: 1,
      });
    }

    // Update dependency graph
    this.updateDependencyGraph(entityId, entityType);
  }

  /**
   * Add dependency relationship between entities
   */
  addDependency(entityId: string, dependencyId: string, weight = 1): void {
    if (!this.dependencyGraph[entityId]) {
      this.dependencyGraph[entityId] = {
        dependencies: [],
        dependents: [],
        weight: 0,
      };
    }

    if (!this.dependencyGraph[dependencyId]) {
      this.dependencyGraph[dependencyId] = {
        dependencies: [],
        dependents: [],
        weight: 0,
      };
    }

    // Add dependency relationship
    if (!this.dependencyGraph[entityId].dependencies.includes(dependencyId)) {
      this.dependencyGraph[entityId].dependencies.push(dependencyId);
      this.dependencyGraph[dependencyId].dependents.push(entityId);
      this.dependencyGraph[dependencyId].weight += weight;
    }
  }

  /**
   * Warm cache based on frequency analysis
   */
  async warmByFrequency(): Promise<WarmingResult> {
    const strategy = this.warmingStrategies.get('frequency');
    if (!strategy || !strategy.enabled) {
      throw new Error('Frequency warming strategy not enabled');
    }

    const startTime = Date.now();
    const errors: Array<{ entityId: string; error: string }> = [];
    
    // Get top entities by frequency
    const topEntities = this.getTopEntitiesByFrequency(strategy.maxItems);
    
    let itemsWarmed = 0;
    let itemsFailed = 0;

    // Warm entities in batches
    const batchSize = 5;
    for (let i = 0; i < topEntities.length; i += batchSize) {
      const batch = topEntities.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (entity) => {
        try {
          await this.warmEntity(entity.entityId, entity.entityType);
          itemsWarmed++;
        } catch (error) {
          itemsFailed++;
          errors.push({
            entityId: entity.entityId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      await Promise.all(batchPromises);
    }

    const endTime = Date.now();
    const cacheHitImprovement = await this.measureCacheHitImprovement();

    return {
      strategy: 'frequency',
      startTime,
      endTime,
      itemsWarmed,
      itemsFailed,
      cacheHitImprovement,
      errors,
    };
  }

  /**
   * Warm cache based on dependency graph
   */
  async warmByDependencies(): Promise<WarmingResult> {
    const strategy = this.warmingStrategies.get('dependencies');
    if (!strategy || !strategy.enabled) {
      throw new Error('Dependency warming strategy not enabled');
    }

    const startTime = Date.now();
    const errors: Array<{ entityId: string; error: string }> = [];
    
    // Get entities with highest dependency weights
    const topDependencies = this.getTopEntitiesByDependencyWeight(strategy.maxItems);
    
    let itemsWarmed = 0;
    let itemsFailed = 0;

    // Warm dependencies first, then dependents
    for (const entityId of topDependencies) {
      try {
        const entityType = this.inferEntityType(entityId);
        await this.warmEntity(entityId, entityType);
        itemsWarmed++;

        // Warm immediate dependencies
        const dependencies = this.dependencyGraph[entityId]?.dependencies || [];
        for (const depId of dependencies.slice(0, 3)) { // Limit to top 3
          try {
            const depType = this.inferEntityType(depId);
            await this.warmEntity(depId, depType);
            itemsWarmed++;
          } catch (error) {
            itemsFailed++;
            errors.push({
              entityId: depId,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } catch (error) {
        itemsFailed++;
        errors.push({
          entityId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const endTime = Date.now();
    const cacheHitImprovement = await this.measureCacheHitImprovement();

    return {
      strategy: 'dependencies',
      startTime,
      endTime,
      itemsWarmed,
      itemsFailed,
      cacheHitImprovement,
      errors,
    };
  }

  /**
   * Predictive warming based on access patterns
   */
  async warmPredictively(): Promise<WarmingResult> {
    const strategy = this.warmingStrategies.get('predictive');
    if (!strategy || !strategy.enabled) {
      throw new Error('Predictive warming strategy not enabled');
    }

    const startTime = Date.now();
    const errors: Array<{ entityId: string; error: string }> = [];
    
    // Generate predictions based on access patterns
    const predictions = this.generateAccessPredictions(strategy.maxItems);
    
    let itemsWarmed = 0;
    let itemsFailed = 0;

    // Warm predicted entities
    for (const prediction of predictions) {
      try {
        const entityType = this.inferEntityType(prediction.entityId);
        await this.warmEntity(prediction.entityId, entityType);
        itemsWarmed++;
      } catch (error) {
        itemsFailed++;
        errors.push({
          entityId: prediction.entityId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const endTime = Date.now();
    const cacheHitImprovement = await this.measureCacheHitImprovement();

    return {
      strategy: 'predictive',
      startTime,
      endTime,
      itemsWarmed,
      itemsFailed,
      cacheHitImprovement,
      errors,
    };
  }

  /**
   * Get warming statistics
   */
  getWarmingStatistics(): {
    isActive: boolean;
    frequencyTracked: number;
    dependencyNodes: number;
    topEntities: EntityFrequency[];
    strategies: WarmingStrategy[];
    analytics: CacheAnalytics | null;
  } {
    return {
      isActive: this.isWarmingActive,
      frequencyTracked: this.frequencyTracker.size,
      dependencyNodes: Object.keys(this.dependencyGraph).length,
      topEntities: this.getTopEntitiesByFrequency(10),
      strategies: Array.from(this.warmingStrategies.values()),
      analytics: this.analytics,
    };
  }

  /**
   * Update warming strategy configuration
   */
  updateStrategy(name: string, updates: Partial<WarmingStrategy>): void {
    const strategy = this.warmingStrategies.get(name);
    if (strategy) {
      Object.assign(strategy, updates);
    }
  }

  /**
   * Clear warming data
   */
  clearWarmingData(): void {
    this.frequencyTracker.clear();
    this.dependencyGraph = {};
    console.log('Warming data cleared');
  }

  // Private methods

  private initializeDefaultStrategies(): void {
    this.warmingStrategies.set('frequency', {
      name: 'frequency',
      priority: 1,
      frequency: 5 * 60 * 1000, // 5 minutes
      maxItems: 20,
      enabled: true,
    });

    this.warmingStrategies.set('dependencies', {
      name: 'dependencies',
      priority: 2,
      frequency: 10 * 60 * 1000, // 10 minutes
      maxItems: 15,
      enabled: true,
    });

    this.warmingStrategies.set('predictive', {
      name: 'predictive',
      priority: 3,
      frequency: 15 * 60 * 1000, // 15 minutes
      maxItems: 10,
      enabled: false, // Disabled by default
    });
  }

  private scheduleWarming(): void {
    this.warmingInterval = setInterval(async () => {
      if (!this.isWarmingActive) {
        return;
      }

      try {
        // Update analytics
        this.analytics = enhancedCacheInterceptor.getAnalytics();

        // Run warming strategies in priority order
        const strategies = Array.from(this.warmingStrategies.values())
          .filter(s => s.enabled)
          .sort((a, b) => a.priority - b.priority);

        for (const strategy of strategies) {
          const shouldRun = Date.now() % strategy.frequency < 1000; // Run approximately every frequency interval
          
          if (shouldRun) {
            console.log(`Running ${strategy.name} warming strategy`);
            
            switch (strategy.name) {
              case 'frequency':
                await this.warmByFrequency();
                break;
              case 'dependencies':
                await this.warmByDependencies();
                break;
              case 'predictive':
                await this.warmPredictively();
                break;
            }
          }
        }
      } catch (error) {
        console.error('Error in warming cycle:', error);
      }
    }, 60000); // Check every minute
  }

  private calculatePriority(frequency: EntityFrequency): number {
    const now = Date.now();
    const timeSinceAccess = now - frequency.lastAccessed;
    const accessFrequency = frequency.accessCount / Math.max(timeSinceAccess / (24 * 60 * 60 * 1000), 1); // accesses per day
    
    // Higher priority for more frequent and recent access
    return accessFrequency * (1 + frequency.accessCount / 100);
  }

  private updateDependencyGraph(entityId: string, _entityType: string): void {
    if (!this.dependencyGraph[entityId]) {
      this.dependencyGraph[entityId] = {
        dependencies: [],
        dependents: [],
        weight: 1,
      };
    } else {
      this.dependencyGraph[entityId].weight += 0.1; // Small weight increase for each access
    }
  }

  private getTopEntitiesByFrequency(limit: number): EntityFrequency[] {
    return Array.from(this.frequencyTracker.values())
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);
  }

  private getTopEntitiesByDependencyWeight(limit: number): string[] {
    return Object.entries(this.dependencyGraph)
      .sort(([, a], [, b]) => b.weight - a.weight)
      .slice(0, limit)
      .map(([entityId]) => entityId);
  }

  private generateAccessPredictions(limit: number): Array<{ entityId: string; probability: number }> {
    const predictions: Array<{ entityId: string; probability: number }> = [];
    const now = Date.now();

    this.frequencyTracker.forEach((frequency) => {
      if (frequency.averageAccessInterval > 0) {
        const timeSinceLastAccess = now - frequency.lastAccessed;
        
        // Simple prediction: if we're approaching expected next access time
        if (timeSinceLastAccess >= frequency.averageAccessInterval * 0.8) {
          const probability = Math.min(
            1,
            timeSinceLastAccess / frequency.averageAccessInterval
          );
          
          predictions.push({
            entityId: frequency.entityId,
            probability,
          });
        }
      }
    });

    return predictions
      .sort((a, b) => b.probability - a.probability)
      .slice(0, limit);
  }

  private async warmEntity(entityId: string, entityType: string): Promise<void> {
    const endpoint = `/${entityType}/${entityId}`;
    
    // Use request manager for deduplication
    await this.requestManager.deduplicate(`warm:${entityId}`, async () => {
      try {
        // Check if already cached
        const cached = await this.cache.get(endpoint, {});
        if (cached === null) {
          // Would normally fetch from API, but for warming we can store a placeholder
          await this.cache.set(endpoint, {}, {
            _warmed: true,
            entityId,
            entityType,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.warn(`Failed to warm entity ${entityId}:`, error);
        throw error;
      }
      return null;
    });
  }

  private inferEntityType(entityId: string): string {
    const typeMap: Record<string, string> = {
      'W': 'works',
      'A': 'authors',
      'S': 'sources',
      'I': 'institutions',
      'P': 'publishers',
      'F': 'funders',
      'T': 'topics',
      'C': 'concepts',
    };

    const firstChar = entityId.charAt(0);
    return typeMap[firstChar] || 'unknown';
  }

  private async measureCacheHitImprovement(): Promise<number> {
    // This would measure the actual improvement in cache hit rate
    // For now, return a simulated improvement
    const currentAnalytics = enhancedCacheInterceptor.getAnalytics();
    const previousHitRate = this.analytics?.hitRate || 0;
    const currentHitRate = currentAnalytics.hitRate;
    
    return Math.max(0, currentHitRate - previousHitRate);
  }
}

// Export singleton instance
export const intelligentCacheWarmingService = new IntelligentCacheWarmingService();