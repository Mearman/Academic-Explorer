/**
 * Comprehensive Unit Tests for EntityResolver
 * Tests provider dependency injection, entity resolution, expansion, caching,
 * error handling, and provider management functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from 'events';
import {
  EntityResolver,
  type IEntityResolver,
  type EntityExpansionOptions,
  type ExpansionResult,
} from "./entity-resolver-interface";
import {
  GraphDataProvider,
  ProviderRegistry,
  type ProviderExpansionOptions,
  type GraphExpansion,
  type SearchQuery,
} from "../providers/base-provider";
import type { GraphNode, EntityType, EntityIdentifier } from "../types/core";

// Mock implementations
class MockGraphDataProvider extends GraphDataProvider {
  private entities: Map<string, GraphNode> = new Map();
  private searchResults: Map<string, GraphNode[]> = new Map();
  private expansions: Map<string, GraphExpansion> = new Map();
  private healthStatus = true;
  private shouldFailNextRequest = false;

  constructor(name: string, options = {}) {
    super({ name, ...options });
  }

  // Add mock data
  setEntity(id: string, entity: GraphNode): void {
    this.entities.set(id, entity);
  }

  setSearchResults(query: string, results: GraphNode[]): void {
    this.searchResults.set(query, results);
  }

  setExpansion(nodeId: string, expansion: GraphExpansion): void {
    this.expansions.set(nodeId, expansion);
  }

  setHealthStatus(healthy: boolean): void {
    this.healthStatus = healthy;
  }

  setNextRequestFailure(): void {
    this.shouldFailNextRequest = true;
  }

  // GraphDataProvider implementation
  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    if (this.shouldFailNextRequest) {
      this.shouldFailNextRequest = false;
      throw new Error(`Failed to fetch entity: ${id}`);
    }

    return this.trackRequest(Promise.resolve().then(() => {
      const entity = this.entities.get(id);
      if (!entity) {
        throw new Error(`Entity not found: ${id}`);
      }
      this.onEntityFetched(entity);
      return entity;
    }));
  }

  async fetchEntities(ids: EntityIdentifier[]): Promise<GraphNode[]> {
    if (this.shouldFailNextRequest) {
      this.shouldFailNextRequest = false;
      throw new Error(`Failed to fetch entities: ${ids.join(', ')}`);
    }

    return this.trackRequest(Promise.resolve().then(() => {
      return ids.map(id => {
        const entity = this.entities.get(id);
        if (!entity) {
          throw new Error(`Entity not found: ${id}`);
        }
        this.onEntityFetched(entity);
        return entity;
      });
    }));
  }

  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    if (this.shouldFailNextRequest) {
      this.shouldFailNextRequest = false;
      throw new Error(`Search failed: ${query.query}`);
    }

    return this.trackRequest(Promise.resolve().then(() => {
      const results = this.searchResults.get(query.query) || [];
      return results.slice(0, query.limit || 20);
    }));
  }

  async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    if (this.shouldFailNextRequest) {
      this.shouldFailNextRequest = false;
      throw new Error(`Expansion failed: ${nodeId}`);
    }

    return this.trackRequest(Promise.resolve().then(() => {
      const expansion = this.expansions.get(nodeId);
      if (!expansion) {
        // Return empty expansion if not found
        return {
          nodes: [],
          edges: [],
          metadata: {
            expandedFrom: nodeId,
            depth: options.maxDepth || options.depth || 1,
            totalFound: 0,
            options,
          },
        };
      }
      return expansion;
    }));
  }

  async isHealthy(): Promise<boolean> {
    return this.healthStatus;
  }
}

describe("EntityResolver", () => {
  let resolver: EntityResolver;
  let mockProvider: MockGraphDataProvider;
  let registry: ProviderRegistry;
  let mockProvider2: MockGraphDataProvider;

  // Sample data with proper OpenAlex IDs
  const sampleNode: GraphNode = {
    id: "A5017898742",
    entityType: "authors" as EntityType,
    label: "Test Author",
    entityId: "A5017898742",
    x: 0,
    y: 0,
    externalIds: [{
      type: "orcid",
      value: "0000-0002-1825-0097",
      url: "https://orcid.org/0000-0002-1825-0097"
    }],
    entityData: { display_name: "Test Author" },
    metadata: {}
  };

  const sampleExpansion: GraphExpansion = {
    nodes: [
      {
        id: "W2741809807",
        entityType: "works" as EntityType,
        label: "Test Work",
        entityId: "W2741809807",
        x: 1,
        y: 1,
        externalIds: [],
        entityData: { display_name: "Test Work" }
      }
    ],
    edges: [{
      id: "edge1",
      source: "A5017898742",
      target: "W2741809807",
      type: "authored",
      metadata: {}
    }],
    metadata: {
      expandedFrom: "A5017898742",
      depth: 1,
      totalFound: 1,
      options: { maxDepth: 1, limit: 10 }
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = new MockGraphDataProvider("test-provider");
    mockProvider2 = new MockGraphDataProvider("test-provider-2");
    registry = new ProviderRegistry();
  });

  afterEach(() => {
    resolver?.destroy();
    registry?.destroy();
    mockProvider?.destroy();
    mockProvider2?.destroy();
  });

  describe("Constructor and Initialization", () => {
    it("should initialize with no provider", () => {
      resolver = new EntityResolver();

      expect(resolver).toBeDefined();
      expect(resolver).toBeInstanceOf(EntityResolver);
      expect(resolver.getAvailableProviders()).toEqual([]);
    });

    it("should initialize with provider only", () => {
      resolver = new EntityResolver(mockProvider);

      expect(resolver).toBeDefined();
      expect(resolver.getProviderStats()).toEqual(mockProvider.getProviderInfo());
    });

    it("should initialize with registry only", () => {
      registry.register(mockProvider);
      resolver = new EntityResolver(undefined, registry);

      expect(resolver).toBeDefined();
      expect(resolver.getAvailableProviders()).toEqual(["test-provider"]);
    });

    it("should initialize with both provider and registry", () => {
      registry.register(mockProvider2);
      resolver = new EntityResolver(mockProvider, registry);

      expect(resolver).toBeDefined();
      expect(resolver.getAvailableProviders()).toEqual(["test-provider-2"]);
      // Current provider should take precedence
      expect(resolver.getProviderStats()?.name).toBe("test-provider");
    });

    it("should implement IEntityResolver interface", () => {
      resolver = new EntityResolver(mockProvider);

      expect(typeof resolver.resolveEntity).toBe("function");
      expect(typeof resolver.expandEntity).toBe("function");
      expect(typeof resolver.searchEntities).toBe("function");
      expect(typeof resolver.setProvider).toBe("function");
      expect(typeof resolver.setProviderRegistry).toBe("function");
    });
  });

  describe("Provider Management", () => {
    beforeEach(() => {
      resolver = new EntityResolver();
    });

    it("should set provider", () => {
      resolver.setProvider(mockProvider);

      expect(resolver.getProviderStats()?.name).toBe("test-provider");
    });

    it("should set provider registry", () => {
      registry.register(mockProvider);
      registry.register(mockProvider2);
      resolver.setProviderRegistry(registry);

      expect(resolver.getAvailableProviders()).toEqual(["test-provider", "test-provider-2"]);
    });

    it("should switch provider via registry", () => {
      registry.register(mockProvider);
      registry.register(mockProvider2);
      resolver.setProviderRegistry(registry);

      // Default should be the first registered
      expect(resolver.getProviderStats()?.name).toBe("test-provider");

      resolver.switchProvider("test-provider-2");
      expect(resolver.getProviderStats()?.name).toBe("test-provider-2");
    });

    it("should throw error when switching to non-existent provider", () => {
      registry.register(mockProvider);
      resolver.setProviderRegistry(registry);

      expect(() => resolver.switchProvider("non-existent")).toThrow("Provider 'non-existent' not found in registry");
    });

    it("should throw error when switching provider without registry", () => {
      resolver.setProvider(mockProvider);

      expect(() => resolver.switchProvider("any-provider")).toThrow("No provider registry available");
    });

    it("should fall back to registry default when no current provider", () => {
      // Register a provider
      registry.register(mockProvider);

      // Initialize resolver with registry only (no current provider)
      resolver = new EntityResolver(undefined, registry);

      // Should use registry default (first registered)
      expect(resolver.getProviderStats()?.name).toBe("test-provider");

      // Set a current provider, then clear it to test fallback
      resolver.setProvider(mockProvider2);
      expect(resolver.getProviderStats()?.name).toBe("test-provider-2");

      // Clear current provider to test fallback to registry
      resolver.setProvider(null as any);
      expect(resolver.getProviderStats()?.name).toBe("test-provider");
    });
  });

  describe("Entity Resolution", () => {
    beforeEach(() => {
      mockProvider.setEntity("A5017898742", sampleNode);
      resolver = new EntityResolver(mockProvider);
    });

    it("should resolve entity successfully", async () => {
      const result = await resolver.resolveEntity("A5017898742");

      expect(result).toEqual(sampleNode);
    });

    it("should throw error when no provider available", async () => {
      resolver = new EntityResolver();

      await expect(resolver.resolveEntity("A5017898742")).rejects.toThrow("No data provider available for entity resolution");
    });

    it("should propagate provider errors", async () => {
      mockProvider.setNextRequestFailure();

      await expect(resolver.resolveEntity("A5017898742")).rejects.toThrow("Failed to fetch entity: A5017898742");
    });

    it("should handle entity not found", async () => {
      await expect(resolver.resolveEntity("NOTFOUND")).rejects.toThrow("Entity not found: NOTFOUND");
    });
  });

  describe("Batch Entity Resolution", () => {
    beforeEach(() => {
      const node1 = { ...sampleNode, id: "A5017898742", entityId: "A5017898742" };
      const node2 = { ...sampleNode, id: "A9876543210", entityId: "A9876543210", label: "Test Author 2" };

      mockProvider.setEntity("A5017898742", node1);
      mockProvider.setEntity("A9876543210", node2);
      resolver = new EntityResolver(mockProvider);
    });

    it("should resolve multiple entities", async () => {
      const results = await resolver.resolveEntities(["A5017898742", "A9876543210"]);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe("A5017898742");
      expect(results[1].id).toBe("A9876543210");
    });

    it("should use batch method if available", async () => {
      const batchSpy = vi.spyOn(mockProvider, "fetchEntities");

      await resolver.resolveEntities(["A5017898742", "A9876543210"]);

      expect(batchSpy).toHaveBeenCalledWith(["A5017898742", "A9876543210"]);
    });

    it("should fall back to sequential resolution", async () => {
      // Remove batch method to test fallback
      mockProvider.fetchEntities = undefined as any;
      const fetchSpy = vi.spyOn(mockProvider, "fetchEntity");

      const results = await resolver.resolveEntities(["A5017898742", "A9876543210"]);

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });

    it("should throw error when no provider available for batch", async () => {
      resolver = new EntityResolver();

      await expect(resolver.resolveEntities(["A5017898742", "A9876543210"])).rejects.toThrow("No data provider available for entity resolution");
    });
  });

  describe("Entity Expansion", () => {
    beforeEach(() => {
      mockProvider.setExpansion("A5017898742", sampleExpansion);
      resolver = new EntityResolver(mockProvider);
    });

    it("should expand entity with default options", async () => {
      const result = await resolver.expandEntity("A5017898742");

      expect(result).toMatchObject({
        expandedFrom: "A5017898742",
        nodes: sampleExpansion.nodes,
        edges: sampleExpansion.edges,
        metadata: sampleExpansion.metadata
      });
    });

    it("should expand entity with custom options", async () => {
      const options: EntityExpansionOptions = {
        maxDepth: 2,
        limit: 5,
        relationshipTypes: ["authored"],
        includeMetadata: false
      };

      const result = await resolver.expandEntity("A5017898742", options);

      expect(result.expandedFrom).toBe("A5017898742");
      expect(result.metadata).toBeDefined();
    });

    it("should use default expansion options when partial options provided", async () => {
      const result = await resolver.expandEntity("A5017898742", { maxDepth: 2 });

      expect(result.expandedFrom).toBe("A5017898742");
      // Should merge with defaults
      expect(result.metadata?.depth).toBeDefined();
    });

    it("should handle empty expansion results", async () => {
      const emptyExpansion: GraphExpansion = {
        nodes: [],
        edges: [],
        metadata: {
          expandedFrom: "EMPTY",
          depth: 1,
          totalFound: 0,
          options: { maxDepth: 1 }
        }
      };
      mockProvider.setExpansion("EMPTY", emptyExpansion);

      const result = await resolver.expandEntity("EMPTY");

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.expandedFrom).toBe("EMPTY");
    });

    it("should throw error when no provider available for expansion", async () => {
      resolver = new EntityResolver();

      await expect(resolver.expandEntity("A5017898742")).rejects.toThrow("No data provider available for entity expansion");
    });

    it("should propagate expansion errors", async () => {
      mockProvider.setNextRequestFailure();

      await expect(resolver.expandEntity("A5017898742")).rejects.toThrow("Expansion failed: A5017898742");
    });

    it("should handle expansion of non-existent node", async () => {
      const result = await resolver.expandEntity("NONEXISTENT");

      expect(result.nodes).toEqual([]);
      expect(result.edges).toEqual([]);
      expect(result.expandedFrom).toBe("NONEXISTENT");
    });
  });

  describe("Entity Search", () => {
    beforeEach(() => {
      const searchResults = [
        { ...sampleNode, id: "A5017898742", label: "Machine Learning Author" },
        { ...sampleNode, id: "A9876543210", label: "ML Researcher" }
      ];
      mockProvider.setSearchResults("machine learning", searchResults);
      resolver = new EntityResolver(mockProvider);
    });

    it("should search entities successfully", async () => {
      const results = await resolver.searchEntities("machine learning", ["authors"]);

      expect(results).toHaveLength(2);
      expect(results[0].label).toContain("Machine Learning");
      expect(results[1].label).toContain("ML");
    });

    it("should limit search results", async () => {
      const manyResults = Array.from({ length: 30 }, (_, i) => ({
        ...sampleNode,
        id: `A${i}`,
        label: `Author ${i}`
      }));
      mockProvider.setSearchResults("test", manyResults);

      const results = await resolver.searchEntities("test", ["authors"]);

      expect(results.length).toBeLessThanOrEqual(20); // Default limit
    });

    it("should handle empty search results", async () => {
      mockProvider.setSearchResults("nonexistent query", []);

      const results = await resolver.searchEntities("nonexistent query", ["authors"]);

      expect(results).toEqual([]);
    });

    it("should throw error when no provider available for search", async () => {
      resolver = new EntityResolver();

      await expect(resolver.searchEntities("test", ["authors"])).rejects.toThrow("No data provider available for entity search");
    });

    it("should propagate search errors", async () => {
      mockProvider.setNextRequestFailure();

      await expect(resolver.searchEntities("test", ["authors"])).rejects.toThrow("Search failed: test");
    });
  });

  describe("Provider Health and Statistics", () => {
    beforeEach(() => {
      resolver = new EntityResolver(mockProvider);
    });

    it("should check provider health", async () => {
      const isHealthy = await resolver.isHealthy();

      expect(isHealthy).toBe(true);
    });

    it("should return false for unhealthy provider", async () => {
      mockProvider.setHealthStatus(false);

      const isHealthy = await resolver.isHealthy();

      expect(isHealthy).toBe(false);
    });

    it("should return false when no provider available", async () => {
      resolver = new EntityResolver();

      const isHealthy = await resolver.isHealthy();

      expect(isHealthy).toBe(false);
    });

    it("should get provider statistics", () => {
      const stats = resolver.getProviderStats();

      expect(stats).toBeDefined();
      expect(stats?.name).toBe("test-provider");
      expect(stats?.stats).toBeDefined();
    });

    it("should return null stats when no provider", () => {
      resolver = new EntityResolver();

      const stats = resolver.getProviderStats();

      expect(stats).toBeNull();
    });
  });

  describe("Provider Registry Integration", () => {
    beforeEach(() => {
      registry.register(mockProvider);
      registry.register(mockProvider2);
      resolver = new EntityResolver(undefined, registry);
    });

    it("should list available providers", () => {
      const providers = resolver.getAvailableProviders();

      expect(providers).toEqual(["test-provider", "test-provider-2"]);
    });

    it("should return empty array when no registry", () => {
      resolver = new EntityResolver();

      const providers = resolver.getAvailableProviders();

      expect(providers).toEqual([]);
    });

    it("should update available providers when registry changes", () => {
      const mockProvider3 = new MockGraphDataProvider("test-provider-3");
      registry.register(mockProvider3);

      const providers = resolver.getAvailableProviders();

      expect(providers).toContain("test-provider-3");

      mockProvider3.destroy();
    });
  });

  describe("Provider Fallback Scenarios", () => {
    it("should fall back to registry default when current provider fails", async () => {
      mockProvider.setNextRequestFailure();
      mockProvider2.setEntity("A5017898742", sampleNode);

      registry.register(mockProvider);
      registry.register(mockProvider2);
      registry.setDefault("test-provider-2");

      resolver = new EntityResolver(mockProvider, registry);

      // First request with current provider should fail
      await expect(resolver.resolveEntity("A5017898742")).rejects.toThrow();

      // Switch to working provider
      resolver.switchProvider("test-provider-2");
      const result = await resolver.resolveEntity("A5017898742");

      expect(result).toEqual(sampleNode);
    });

    it("should use current provider over registry default", async () => {
      mockProvider.setEntity("A5017898742", { ...sampleNode, label: "Current Provider" });
      mockProvider2.setEntity("A5017898742", { ...sampleNode, label: "Registry Provider" });

      registry.register(mockProvider2);
      resolver = new EntityResolver(mockProvider, registry);

      const result = await resolver.resolveEntity("A5017898742");

      expect(result.label).toBe("Current Provider");
    });

    it("should use registry provider when no current provider", async () => {
      mockProvider.setEntity("A5017898742", { ...sampleNode, label: "Registry Provider" });

      registry.register(mockProvider);
      resolver = new EntityResolver(undefined, registry);

      const result = await resolver.resolveEntity("A5017898742");

      expect(result.label).toBe("Registry Provider");
    });
  });

  describe("Event Handling and Listeners", () => {
    beforeEach(() => {
      mockProvider.setEntity("A5017898742", sampleNode);
      resolver = new EntityResolver(mockProvider);
    });

    it("should forward provider events", async () => {
      const eventSpy = vi.fn();
      mockProvider.on("entityFetched", eventSpy);

      await resolver.resolveEntity("A5017898742");

      expect(eventSpy).toHaveBeenCalledWith(sampleNode);
    });

    it("should allow provider event listeners to be attached", () => {
      const errorSpy = vi.fn();
      const cacheSpy = vi.fn();

      // Test that we can attach event listeners to the provider
      mockProvider.on("requestError", errorSpy);
      mockProvider.on("cacheHit", cacheSpy);

      // Verify listeners are attached
      expect(mockProvider.listenerCount("requestError")).toBe(1);
      expect(mockProvider.listenerCount("cacheHit")).toBe(1);

      // Test manual event emission
      mockProvider.emit("cacheHit", "test-id");
      expect(cacheSpy).toHaveBeenCalledWith("test-id");
    });

    it("should handle provider request events", async () => {
      const successSpy = vi.fn();
      mockProvider.on("requestSuccess", successSpy);

      await resolver.resolveEntity("A5017898742");

      expect(successSpy).toHaveBeenCalled();
    });
  });

  describe("Async Operation Testing and Promise Handling", () => {
    beforeEach(() => {
      resolver = new EntityResolver(mockProvider);
    });

    it("should handle concurrent entity resolutions", async () => {
      const entities = Array.from({ length: 5 }, (_, i) => ({
        ...sampleNode,
        id: `A${i}`,
        entityId: `A${i}`,
        label: `Author ${i}`
      }));

      entities.forEach(entity => mockProvider.setEntity(entity.id, entity));

      const promises = entities.map(entity => resolver.resolveEntity(entity.id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach((result, i) => {
        expect(result.id).toBe(`A${i}`);
      });
    });

    it("should handle concurrent expansions", async () => {
      const expansions = Array.from({ length: 3 }, (_, i) => ({
        ...sampleExpansion,
        metadata: { ...sampleExpansion.metadata, expandedFrom: `A${i}` }
      }));

      expansions.forEach((expansion, i) =>
        mockProvider.setExpansion(`A${i}`, expansion)
      );

      const promises = expansions.map((_, i) => resolver.expandEntity(`A${i}`));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, i) => {
        expect(result.expandedFrom).toBe(`A${i}`);
      });
    });

    it("should handle promise rejection correctly", async () => {
      mockProvider.setNextRequestFailure();

      const promise = resolver.resolveEntity("A5017898742");

      await expect(promise).rejects.toThrow("Failed to fetch entity: A5017898742");
      expect(promise).toBeInstanceOf(Promise);
    });

    it("should handle timeout scenarios", async () => {
      // Mock a slow provider
      const slowProvider = new MockGraphDataProvider("slow-provider");
      slowProvider.fetchEntity = vi.fn().mockImplementation(() =>
        new Promise((resolve) => setTimeout(() => resolve(sampleNode), 1000))
      );

      resolver = new EntityResolver(slowProvider);

      // Should resolve eventually
      const promise = resolver.resolveEntity("A5017898742");
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toEqual(sampleNode);

      slowProvider.destroy();
    });
  });

  describe("Caching Behavior", () => {
    beforeEach(() => {
      mockProvider.setEntity("A5017898742", sampleNode);
      resolver = new EntityResolver(mockProvider);
    });

    it("should work with provider internal caching", async () => {
      // Test that resolver doesn't interfere with provider caching
      const cacheSpy = vi.fn();
      mockProvider.on("cacheHit", cacheSpy);

      // First request
      await resolver.resolveEntity("A5017898742");
      // Second request (might hit cache depending on provider implementation)
      await resolver.resolveEntity("A5017898742");

      // Verify requests went through
      const stats = mockProvider.getProviderInfo().stats;
      expect(stats.totalRequests).toBeGreaterThan(0);
    });
  });

  describe("Memory Management and Cleanup", () => {
    it("should cleanup resources on destroy", () => {
      resolver = new EntityResolver(mockProvider, registry);

      resolver.destroy();

      expect(resolver.getProviderStats()).toBeNull();
      expect(resolver.getAvailableProviders()).toEqual([]);
    });

    it("should handle multiple destroy calls safely", () => {
      resolver = new EntityResolver(mockProvider);

      resolver.destroy();
      resolver.destroy(); // Should not throw

      expect(resolver.getProviderStats()).toBeNull();
    });
  });

  describe("Interface Compliance", () => {
    it("should implement all IEntityResolver methods", () => {
      resolver = new EntityResolver();

      const requiredMethods: (keyof IEntityResolver)[] = [
        "resolveEntity",
        "expandEntity",
        "searchEntities",
        "setProvider",
        "setProviderRegistry"
      ];

      requiredMethods.forEach(method => {
        expect(typeof resolver[method]).toBe("function");
      });
    });

    it("should return correct types for interface methods", async () => {
      resolver = new EntityResolver(mockProvider);
      mockProvider.setEntity("A5017898742", sampleNode);
      mockProvider.setExpansion("A5017898742", sampleExpansion);
      mockProvider.setSearchResults("test", [sampleNode]);

      const entityResult = await resolver.resolveEntity("A5017898742");
      expect(entityResult).toMatchObject<GraphNode>({
        id: expect.any(String),
        entityType: expect.any(String),
        label: expect.any(String),
        entityId: expect.any(String),
        x: expect.any(Number),
        y: expect.any(Number),
        externalIds: expect.any(Array)
      });

      const expansionResult = await resolver.expandEntity("A5017898742");
      expect(expansionResult).toMatchObject<ExpansionResult>({
        nodes: expect.any(Array),
        edges: expect.any(Array),
        expandedFrom: expect.any(String),
        metadata: expect.any(Object)
      });

      const searchResult = await resolver.searchEntities("test", ["authors"]);
      expect(searchResult).toEqual(expect.arrayContaining([
        expect.objectContaining<Partial<GraphNode>>({
          id: expect.any(String),
          entityType: expect.any(String),
          label: expect.any(String)
        })
      ]));
    });
  });
});