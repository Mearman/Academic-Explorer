/**
 * Entity Resolver - Phase 2 Provider-Based Implementation
 * Uses pluggable provider system for entity resolution and expansion
 */

import type { GraphNode, EntityType, EntityIdentifier } from '../types/core';
import { ProviderRegistry, type GraphDataProvider } from '../providers/base-provider';
import { EntityDetectionService } from './entity-detection-service';

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

    // Try to normalize the identifier first
    const normalizedId = EntityDetectionService.normalizeIdentifier(id);
    const identifierToUse = normalizedId || id;

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

    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No data provider available for entity resolution');
    }

    try {
      // Use the normalized identifier for resolution
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
    const provider = this.getProvider();
    if (!provider) {
      throw new Error('No data provider available for entity resolution');
    }

    // Normalize all identifiers first
    const normalizedIds = ids.map(id => {
      const normalized = EntityDetectionService.normalizeIdentifier(id);
      return normalized || id;
    });

    // Use batch operation if available, otherwise fall back to sequential
    if (typeof provider.fetchEntities === 'function') {
      return provider.fetchEntities(normalizedIds);
    }

    return Promise.all(normalizedIds.map(id => provider.fetchEntity(id)));
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