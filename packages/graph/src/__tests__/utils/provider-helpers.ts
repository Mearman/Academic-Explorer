/**
 * Provider registration and deregistration helpers for testing
 * Simplifies setup and teardown of graph data providers in tests
 */

import { EventEmitter } from 'events';
import type { GraphNode, GraphEdge, EntityType, EntityIdentifier } from '../../types/core';
import { GraphDataProvider, ProviderRegistry, type ProviderOptions, type SearchQuery, type ProviderExpansionOptions, type GraphExpansion } from '../../providers/base-provider';

/**
 * Test provider configuration
 */
export interface TestProviderConfig extends Partial<ProviderOptions> {
  entities?: Map<string, GraphNode>;
  relationships?: Map<string, GraphEdge[]>;
  searchResults?: Map<string, GraphNode[]>;
  simulateLatency?: number;
  simulateErrors?: boolean;
  errorRate?: number;
  healthStatus?: boolean;
}

/**
 * Mock provider implementation for testing
 */
export class TestGraphProvider extends GraphDataProvider {
  private entities: Map<string, GraphNode>;
  private relationships: Map<string, GraphEdge[]>;
  private searchResults: Map<string, GraphNode[]>;
  private simulateLatency: number;
  private simulateErrors: boolean;
  private errorRate: number;
  private healthStatus: boolean;

  constructor(config: TestProviderConfig = {}) {
    const options: ProviderOptions = {
      name: config.name || 'test-provider',
      version: config.version || '1.0.0-test',
      maxConcurrentRequests: config.maxConcurrentRequests || 5,
      retryAttempts: config.retryAttempts || 1,
      retryDelay: config.retryDelay || 100,
      timeout: config.timeout || 5000,
    };

    super(options);

    this.entities = config.entities || new Map();
    this.relationships = config.relationships || new Map();
    this.searchResults = config.searchResults || new Map();
    this.simulateLatency = config.simulateLatency || 0;
    this.simulateErrors = config.simulateErrors || false;
    this.errorRate = config.errorRate || 0.1;
    this.healthStatus = config.healthStatus !== false;
  }

  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    return this.trackRequest(this._fetchEntity(id));
  }

  private async _fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    await this.simulateDelay();

    if (this.shouldSimulateError()) {
      throw new Error(`Simulated error fetching entity: ${id}`);
    }

    const entity = this.entities.get(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }

    this.onEntityFetched(entity);
    return { ...entity }; // Return copy to prevent mutations
  }

  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    return this.trackRequest(this._searchEntities(query));
  }

  private async _searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    await this.simulateDelay();

    if (this.shouldSimulateError()) {
      throw new Error(`Simulated error searching entities: ${query.query}`);
    }

    // Check for pre-configured results first
    const preConfigured = this.searchResults.get(query.query);
    if (preConfigured) {
      return preConfigured.slice(0, query.limit || 10);
    }

    // Fallback to simple text matching
    const results: GraphNode[] = [];
    for (const entity of this.entities.values()) {
      if (
        query.entityTypes.includes(entity.entityType) &&
        entity.label.toLowerCase().includes(query.query.toLowerCase())
      ) {
        results.push({ ...entity });
      }

      if (results.length >= (query.limit || 10)) {
        break;
      }
    }

    return results;
  }

  async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    return this.trackRequest(this._expandEntity(nodeId, options));
  }

  private async _expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    await this.simulateDelay();

    if (this.shouldSimulateError()) {
      throw new Error(`Simulated error expanding entity: ${nodeId}`);
    }

    const node = this.entities.get(nodeId);
    if (!node) {
      throw new Error(`Node not found for expansion: ${nodeId}`);
    }

    const edges = this.relationships.get(nodeId) || [];
    const relatedNodes: GraphNode[] = [];

    // Find related nodes based on edges
    for (const edge of edges) {
      const relatedId = edge.source === nodeId ? edge.target : edge.source;
      const relatedNode = this.entities.get(relatedId);
      if (relatedNode) {
        relatedNodes.push({ ...relatedNode });
      }
    }

    // Apply limits
    const limitedEdges = edges.slice(0, options.limit || 50);
    const limitedNodes = relatedNodes.slice(0, options.limit || 50);

    return {
      nodes: limitedNodes,
      edges: limitedEdges.map(edge => ({ ...edge })),
      metadata: {
        expandedFrom: nodeId,
        depth: options.depth || options.maxDepth || 1,
        totalFound: relatedNodes.length,
        options,
      },
    };
  }

  async isHealthy(): Promise<boolean> {
    await this.simulateDelay(50); // Small delay for health check
    return this.healthStatus;
  }

  // Test configuration methods

  setEntity(id: string, entity: GraphNode): void {
    this.entities.set(id, entity);
  }

  setRelationships(nodeId: string, edges: GraphEdge[]): void {
    this.relationships.set(nodeId, edges);
  }

  setSearchResults(query: string, results: GraphNode[]): void {
    this.searchResults.set(query, results);
  }

  setHealthStatus(healthy: boolean): void {
    this.healthStatus = healthy;
  }

  setLatency(milliseconds: number): void {
    this.simulateLatency = milliseconds;
  }

  enableErrorSimulation(enabled: boolean, errorRate = 0.1): void {
    this.simulateErrors = enabled;
    this.errorRate = errorRate;
  }

  // Utility methods

  getEntityCount(): number {
    return this.entities.size;
  }

  getRelationshipCount(): number {
    return Array.from(this.relationships.values()).reduce((sum, edges) => sum + edges.length, 0);
  }

  clear(): void {
    this.entities.clear();
    this.relationships.clear();
    this.searchResults.clear();
  }

  private async simulateDelay(customDelay?: number): Promise<void> {
    const delay = customDelay || this.simulateLatency;
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private shouldSimulateError(): boolean {
    return this.simulateErrors && Math.random() < this.errorRate;
  }

  destroy(): void {
    this.clear();
    super.destroy();
  }
}

/**
 * Provider registration helper
 */
export class ProviderTestHelper {
  private providers: Map<string, TestGraphProvider> = new Map();
  private registries: Set<ProviderRegistry> = new Set();

  /**
   * Create and register a test provider
   */
  createProvider(name: string, config: TestProviderConfig = {}): TestGraphProvider {
    const provider = new TestGraphProvider({
      name,
      ...config,
    });

    this.providers.set(name, provider);
    return provider;
  }

  /**
   * Register a provider with a registry
   */
  registerProvider(registry: ProviderRegistry, provider: TestGraphProvider): void {
    (registry as any).register(provider);
    this.registries.add(registry);
  }

  /**
   * Create provider with entities pre-loaded
   */
  createProviderWithEntities(
    name: string,
    entities: GraphNode[],
    relationships: Array<{ nodeId: string; edges: GraphEdge[] }> = [],
    config: TestProviderConfig = {}
  ): TestGraphProvider {
    const entityMap = new Map(entities.map(entity => [entity.id, entity]));
    const relationshipMap = new Map(
      relationships.map(rel => [rel.nodeId, rel.edges])
    );

    return this.createProvider(name, {
      ...config,
      entities: entityMap,
      relationships: relationshipMap,
    });
  }

  /**
   * Get a registered provider
   */
  getProvider(name: string): TestGraphProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Unregister a provider from all registries
   */
  unregisterProvider(name: string): void {
    this.registries.forEach(registry => {
      try {
        (registry as any).unregister(name);
      } catch {
        // Ignore errors during cleanup
      }
    });
  }

  /**
   * Clean up all providers and registries
   */
  cleanup(): void {
    // Unregister all providers from all registries
    for (const providerName of this.providers.keys()) {
      this.unregisterProvider(providerName);
    }

    // Destroy all providers
    for (const provider of this.providers.values()) {
      provider.destroy();
    }

    // Destroy all registries
    for (const registry of this.registries) {
      (registry as any).destroy();
    }

    // Clear collections
    this.providers.clear();
    this.registries.clear();
  }

  /**
   * Wait for all providers to be healthy
   */
  async waitForHealthy(timeout = 5000): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const allHealthy = await Promise.all(
        Array.from(this.providers.values()).map(provider => provider.isHealthy())
      );

      if (allHealthy.every(healthy => healthy)) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error('Timeout waiting for providers to become healthy');
  }

  /**
   * Simulate network issues across all providers
   */
  simulateNetworkIssues(latency = 1000, errorRate = 0.5): void {
    for (const provider of this.providers.values()) {
      provider.setLatency(latency);
      provider.enableErrorSimulation(true, errorRate);
    }
  }

  /**
   * Restore normal network conditions
   */
  restoreNetworkConditions(): void {
    for (const provider of this.providers.values()) {
      provider.setLatency(0);
      provider.enableErrorSimulation(false);
      provider.setHealthStatus(true);
    }
  }

  /**
   * Get statistics for all providers
   */
  getStatistics(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, provider] of this.providers) {
      stats[name] = {
        ...provider.getProviderInfo(),
        entityCount: provider.getEntityCount(),
        relationshipCount: provider.getRelationshipCount(),
      };
    }

    return stats;
  }
}

/**
 * Create a singleton helper instance for tests
 */
let globalHelper: ProviderTestHelper | null = null;

export function getProviderHelper(): ProviderTestHelper {
  if (!globalHelper) {
    globalHelper = new ProviderTestHelper();
  }
  return globalHelper;
}

export function resetProviderHelper(): void {
  if (globalHelper) {
    globalHelper.cleanup();
    globalHelper = null;
  }
}

// Cleanup helper on process exit (for Node.js environments)
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    resetProviderHelper();
  });
}