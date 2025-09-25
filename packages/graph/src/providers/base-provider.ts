/**
 * Abstract base class for graph data providers
 * Defines the interface for fetching and expanding graph entities from various data sources
 */

import { EventEmitter } from 'events';
import type { GraphNode, EntityType, EntityIdentifier } from '../types/core';

export interface SearchQuery {
  query: string;
  entityTypes: EntityType[];
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}

export interface ProviderExpansionOptions {
  relationshipTypes?: string[];
  maxDepth?: number;
  limit?: number;
  includeMetadata?: boolean;
}

export interface GraphExpansion {
  nodes: GraphNode[];
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type: string;
    metadata?: Record<string, unknown>;
  }>;
  metadata: {
    expandedFrom: string;
    depth: number;
    totalFound: number;
    options: ProviderExpansionOptions;
  };
}

export interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  lastRequestTime: number;
}

export interface ProviderOptions {
  name: string;
  version?: string;
  maxConcurrentRequests?: number;
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Abstract base class for graph data providers
 */
export abstract class GraphDataProvider extends EventEmitter {
  protected stats: ProviderStats;
  protected readonly options: Required<ProviderOptions>;

  constructor(options: ProviderOptions) {
    super();

    this.options = {
      version: '1.0.0',
      maxConcurrentRequests: 10,
      retryAttempts: 3,
      retryDelay: 1000,
      timeout: 30000,
      ...options,
    };

    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      lastRequestTime: 0,
    };
  }

  // Abstract methods to be implemented by concrete providers
  abstract fetchEntity(id: EntityIdentifier): Promise<GraphNode>;
  abstract searchEntities(query: SearchQuery): Promise<GraphNode[]>;
  abstract expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion>;

  // Optional: Batch operations (can be overridden for efficiency)
  async fetchEntities(ids: EntityIdentifier[]): Promise<GraphNode[]> {
    return Promise.all(ids.map(id => this.fetchEntity(id)));
  }

  // Provider metadata
  getProviderInfo() {
    return {
      name: this.options.name,
      version: this.options.version,
      stats: { ...this.stats },
    };
  }

  // Statistics tracking
  protected trackRequest<T>(promise: Promise<T>): Promise<T> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    return promise
      .then(result => {
        this.stats.successfulRequests++;
        this.updateResponseTime(startTime, true);
        this.safeEmit('requestSuccess', { duration: Date.now() - startTime });
        return result;
      })
      .catch(error => {
        this.stats.failedRequests++;
        this.updateResponseTime(startTime, false);
        this.safeEmit('requestError', { error, duration: Date.now() - startTime });
        throw error;
      });
  }

  private updateResponseTime(startTime: number, isSuccess: boolean) {
    const duration = Date.now() - startTime;
    this.stats.lastRequestTime = Date.now();

    // Update average response time only for successful requests
    if (isSuccess && this.stats.successfulRequests > 0) {
      const totalDuration = this.stats.avgResponseTime * (this.stats.successfulRequests - 1) + duration;
      this.stats.avgResponseTime = totalDuration / this.stats.successfulRequests;
    }
  }

  // Safe event emission that catches listener errors
  protected safeEmit(event: string | symbol, ...args: any[]): boolean {
    try {
      return this.emit(event, ...args);
    } catch (error) {
      // Log the error but don't let it interrupt the main flow
      console.warn(`Event listener error for ${String(event)}:`, error);
      return false;
    }
  }

  // Event hooks (can be overridden)
  protected onEntityFetched(entity: GraphNode): void {
    this.safeEmit('entityFetched', entity);
  }

  protected onError(error: Error): void {
    this.safeEmit('error', error);
  }

  protected onCacheHit(entityId: string): void {
    this.safeEmit('cacheHit', entityId);
  }

  protected onCacheMiss(entityId: string): void {
    this.safeEmit('cacheMiss', entityId);
  }

  // Health check
  abstract isHealthy(): Promise<boolean>;

  // Cleanup resources
  destroy(): void {
    this.removeAllListeners();
  }
}

/**
 * Provider registry for managing multiple data providers
 */
export class ProviderRegistry {
  private providers = new Map<string, GraphDataProvider>();
  private defaultProvider: string | null = null;

  register(provider: GraphDataProvider): void {
    const info = provider.getProviderInfo();
    this.providers.set(info.name, provider);

    if (!this.defaultProvider) {
      this.defaultProvider = info.name;
    }
  }

  unregister(providerName: string): void {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.destroy();
      this.providers.delete(providerName);

      if (this.defaultProvider === providerName) {
        this.defaultProvider = this.providers.keys().next().value || null;
      }
    }
  }

  get(providerName?: string): GraphDataProvider | null {
    const name = providerName || this.defaultProvider;
    return name ? this.providers.get(name) || null : null;
  }

  setDefault(providerName: string): void {
    if (this.providers.has(providerName)) {
      this.defaultProvider = providerName;
    } else {
      throw new Error(`Provider '${providerName}' not found`);
    }
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  getStats(): Record<string, ProviderStats> {
    const stats: Record<string, ProviderStats> = {};

    for (const [name, provider] of this.providers) {
      stats[name] = provider.getProviderInfo().stats;
    }

    return stats;
  }

  async healthCheck(): Promise<Record<string, boolean>> {
    const health: Record<string, boolean> = {};

    for (const [name, provider] of this.providers) {
      try {
        health[name] = await provider.isHealthy();
      } catch {
        health[name] = false;
      }
    }

    return health;
  }

  destroy(): void {
    for (const provider of this.providers.values()) {
      provider.destroy();
    }
    this.providers.clear();
    this.defaultProvider = null;
  }
}