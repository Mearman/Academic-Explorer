/**
 * Entity Resolver - Phase 2 Provider-Based Implementation
 * Uses pluggable provider system for entity resolution and expansion
 */

import type { GraphNode, EntityType, EntityIdentifier } from '../types/core';
import { ProviderRegistry, type GraphDataProvider } from '../providers/base-provider';

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

  constructor(provider?: GraphDataProvider, registry?: ProviderRegistry) {
    if (registry) {
      this.providerRegistry = registry;
    }
    if (provider) {
      this.currentProvider = provider;
    }
  }

  setProvider(provider: GraphDataProvider): void {
    this.currentProvider = provider;
  }

  setProviderRegistry(registry: ProviderRegistry): void {
    this.providerRegistry = registry;
  }

  async resolveEntity(id: EntityIdentifier): Promise<GraphNode> {
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No data provider available for entity resolution');
    }

    return provider.fetchEntity(id);
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

  // Batch operations
  async resolveEntities(ids: EntityIdentifier[]): Promise<GraphNode[]> {
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

  // Cleanup
  destroy(): void {
    this.currentProvider = null;
    this.providerRegistry = null;
  }
}