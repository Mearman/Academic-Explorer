/**
 * Comprehensive Unit Tests for GraphDataProvider Base Class
 * Tests abstract class instantiation, EventEmitter functionality, statistics tracking,
 * provider registry system, request tracking, and health check contracts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import {
  GraphDataProvider,
  ProviderRegistry,
  type SearchQuery,
  type ProviderExpansionOptions,
  type GraphExpansion,
  type ProviderStats,
  type ProviderOptions,
} from "./base-provider";
import type { GraphNode, EntityType, EntityIdentifier } from "../types/core";

// Mock implementation for testing abstract class
class MockGraphDataProvider extends GraphDataProvider {
  private mockHealthy = true;
  private mockDelay = 0;
  private shouldThrowError = false;
  private errorToThrow: Error | null = null;

  constructor(options: ProviderOptions) {
    super(options);
  }

  // Mock implementations of abstract methods
  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    const promise = new Promise<GraphNode>((resolve, reject) => {
      setTimeout(() => {
        if (this.shouldThrowError && this.errorToThrow) {
          reject(this.errorToThrow);
          return;
        }
        resolve({
          id: `node-${id}`,
          entityType: "works",
          label: `Entity ${id}`,
          entityId: id,
          x: 0,
          y: 0,
          externalIds: [],
        });
      }, this.mockDelay);
    });

    return this.trackRequest(promise);
  }

  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    const promise = new Promise<GraphNode[]>((resolve, reject) => {
      setTimeout(() => {
        if (this.shouldThrowError && this.errorToThrow) {
          reject(this.errorToThrow);
          return;
        }
        const results = Array.from({ length: Math.min(query.limit || 10, 5) }, (_, i) => ({
          id: `search-result-${i}`,
          entityType: query.entityTypes[0] || "works",
          label: `Search Result ${i}`,
          entityId: `SR${i}`,
          x: i * 10,
          y: i * 10,
          externalIds: [],
        }));
        resolve(results);
      }, this.mockDelay);
    });

    return this.trackRequest(promise);
  }

  async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    const promise = new Promise<GraphExpansion>((resolve, reject) => {
      setTimeout(() => {
        if (this.shouldThrowError && this.errorToThrow) {
          reject(this.errorToThrow);
          return;
        }
        const depth = options.depth || options.maxDepth || 1;
        const limit = options.limit || 5;

        const nodes = Array.from({ length: Math.min(limit, 3) }, (_, i) => ({
          id: `expanded-${nodeId}-${i}`,
          entityType: "works" as EntityType,
          label: `Expanded Node ${i}`,
          entityId: `EXP${i}`,
          x: i * 15,
          y: i * 15,
          externalIds: [],
        }));

        const edges = nodes.map((node, i) => ({
          id: `edge-${nodeId}-${node.id}`,
          source: nodeId,
          target: node.id,
          type: "related_to",
          metadata: { weight: i + 1 },
        }));

        resolve({
          nodes,
          edges,
          metadata: {
            expandedFrom: nodeId,
            depth,
            totalFound: nodes.length,
            options,
          },
        });
      }, this.mockDelay);
    });

    return this.trackRequest(promise);
  }

  async isHealthy(): Promise<boolean> {
    return this.mockHealthy;
  }

  // Test helper methods
  setMockHealthy(healthy: boolean): void {
    this.mockHealthy = healthy;
  }

  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  setShouldThrowError(shouldThrow: boolean, error?: Error): void {
    this.shouldThrowError = shouldThrow;
    this.errorToThrow = error || new Error("Mock error");
  }

  // Expose protected methods for testing
  public testOnEntityFetched(entity: GraphNode): void {
    this.onEntityFetched(entity);
  }

  public testOnError(error: Error): void {
    this.onError(error);
  }

  public testOnCacheHit(entityId: string): void {
    this.onCacheHit(entityId);
  }

  public testOnCacheMiss(entityId: string): void {
    this.onCacheMiss(entityId);
  }

  // Access to protected stats for testing
  public getStats(): ProviderStats {
    return { ...this.stats };
  }

  public getOptions(): Required<ProviderOptions> {
    return this.options;
  }
}

describe("GraphDataProvider", () => {
  let provider: MockGraphDataProvider;
  let mockOptions: ProviderOptions;

  beforeEach(() => {
    mockOptions = {
      name: "test-provider",
      version: "1.0.0",
      maxConcurrentRequests: 5,
      retryAttempts: 2,
      retryDelay: 500,
      timeout: 5000,
    };
    provider = new MockGraphDataProvider(mockOptions);
  });

  afterEach(() => {
    provider.destroy();
  });

  describe("Constructor and Configuration", () => {
    it("should initialize with provided options", () => {
      const options = provider.getOptions();
      expect(options.name).toBe("test-provider");
      expect(options.version).toBe("1.0.0");
      expect(options.maxConcurrentRequests).toBe(5);
      expect(options.retryAttempts).toBe(2);
      expect(options.retryDelay).toBe(500);
      expect(options.timeout).toBe(5000);
    });

    it("should apply default options when not provided", () => {
      const minimalProvider = new MockGraphDataProvider({ name: "minimal" });
      const options = minimalProvider.getOptions();

      expect(options.name).toBe("minimal");
      expect(options.version).toBe("1.0.0");
      expect(options.maxConcurrentRequests).toBe(10);
      expect(options.retryAttempts).toBe(3);
      expect(options.retryDelay).toBe(1000);
      expect(options.timeout).toBe(30000);

      minimalProvider.destroy();
    });

    it("should merge provided options with defaults", () => {
      const partialProvider = new MockGraphDataProvider({
        name: "partial",
        maxConcurrentRequests: 15,
        // Other options should use defaults
      });
      const options = partialProvider.getOptions();

      expect(options.name).toBe("partial");
      expect(options.maxConcurrentRequests).toBe(15);
      expect(options.version).toBe("1.0.0"); // Default
      expect(options.retryAttempts).toBe(3); // Default

      partialProvider.destroy();
    });

    it("should initialize stats with zero values", () => {
      const stats = provider.getStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.avgResponseTime).toBe(0);
      expect(stats.lastRequestTime).toBe(0);
    });

    it("should be instance of EventEmitter", () => {
      expect(provider).toBeInstanceOf(EventEmitter);
    });
  });

  describe("Provider Info", () => {
    it("should return correct provider info", () => {
      const info = provider.getProviderInfo();
      expect(info.name).toBe("test-provider");
      expect(info.version).toBe("1.0.0");
      expect(info.stats).toEqual({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        avgResponseTime: 0,
        lastRequestTime: 0,
      });
    });

    it("should return a copy of stats, not reference", () => {
      const info = provider.getProviderInfo();
      const stats = provider.getStats();

      expect(info.stats).toEqual(stats);
      expect(info.stats).not.toBe(stats); // Different objects
    });
  });

  describe("EventEmitter Functionality", () => {
    it("should emit and handle custom events", () => {
      const mockListener = vi.fn();
      provider.on("test-event", mockListener);

      provider.emit("test-event", { data: "test" });

      expect(mockListener).toHaveBeenCalledWith({ data: "test" });
    });

    it("should handle multiple listeners for same event", () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      provider.on("multi-listener", listener1);
      provider.on("multi-listener", listener2);

      provider.emit("multi-listener", "data");

      expect(listener1).toHaveBeenCalledWith("data");
      expect(listener2).toHaveBeenCalledWith("data");
    });

    it("should remove listeners correctly", () => {
      const mockListener = vi.fn();
      provider.on("removable-event", mockListener);

      provider.emit("removable-event", "before");
      expect(mockListener).toHaveBeenCalledTimes(1);

      provider.off("removable-event", mockListener);
      provider.emit("removable-event", "after");

      expect(mockListener).toHaveBeenCalledTimes(1); // Still 1, not called again
    });

    it("should remove all listeners on destroy", () => {
      const mockListener = vi.fn();
      provider.on("destroy-test", mockListener);

      provider.destroy();
      provider.emit("destroy-test", "after-destroy");

      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe("Protected Event Hooks", () => {
    it("should emit entityFetched event", () => {
      const mockListener = vi.fn();
      provider.on("entityFetched", mockListener);

      const testEntity: GraphNode = {
        id: "test",
        entityType: "works",
        label: "Test Entity",
        entityId: "T123",
        x: 0,
        y: 0,
        externalIds: [],
      };

      provider.testOnEntityFetched(testEntity);

      expect(mockListener).toHaveBeenCalledWith(testEntity);
    });

    it("should emit error event", () => {
      const mockListener = vi.fn();
      provider.on("error", mockListener);

      const testError = new Error("Test error");
      provider.testOnError(testError);

      expect(mockListener).toHaveBeenCalledWith(testError);
    });

    it("should emit cacheHit event", () => {
      const mockListener = vi.fn();
      provider.on("cacheHit", mockListener);

      provider.testOnCacheHit("entity123");

      expect(mockListener).toHaveBeenCalledWith("entity123");
    });

    it("should emit cacheMiss event", () => {
      const mockListener = vi.fn();
      provider.on("cacheMiss", mockListener);

      provider.testOnCacheMiss("entity456");

      expect(mockListener).toHaveBeenCalledWith("entity456");
    });
  });

  describe("Statistics Tracking", () => {
    it("should track successful requests", async () => {
      const result = await provider.fetchEntity("test123");

      expect(result.id).toBe("node-test123");

      const stats = provider.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(1);
      expect(stats.failedRequests).toBe(0);
      expect(stats.avgResponseTime).toBeGreaterThan(0);
      expect(stats.lastRequestTime).toBeGreaterThan(0);
    });

    it("should track failed requests", async () => {
      const testError = new Error("Test failure");
      provider.setShouldThrowError(true, testError);

      await expect(provider.fetchEntity("fail123")).rejects.toThrow("Test failure");

      const stats = provider.getStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(1);
      // avgResponseTime remains 0 when no successful requests (current implementation behavior)
      expect(stats.avgResponseTime).toBe(0);
      expect(stats.lastRequestTime).toBeGreaterThan(0);
    });

    it("should emit requestSuccess event on success", async () => {
      const successListener = vi.fn();
      provider.on("requestSuccess", successListener);

      await provider.fetchEntity("success123");

      expect(successListener).toHaveBeenCalledWith({
        duration: expect.any(Number),
      });
      expect(successListener.mock.calls[0][0].duration).toBeGreaterThan(0);
    });

    it("should emit requestError event on failure", async () => {
      const errorListener = vi.fn();
      provider.on("requestError", errorListener);

      const testError = new Error("Request failed");
      provider.setShouldThrowError(true, testError);

      await expect(provider.fetchEntity("error123")).rejects.toThrow();

      expect(errorListener).toHaveBeenCalledWith({
        error: testError,
        duration: expect.any(Number),
      });
    });

    it("should calculate average response time correctly", async () => {
      // Set different delays for requests
      provider.setMockDelay(10);
      await provider.fetchEntity("fast");

      provider.setMockDelay(30);
      await provider.fetchEntity("slow");

      const stats = provider.getStats();
      expect(stats.successfulRequests).toBe(2);
      expect(stats.avgResponseTime).toBeGreaterThan(15);
      expect(stats.avgResponseTime).toBeLessThan(25);
    });

    it("should handle multiple concurrent requests", async () => {
      const requests = [
        provider.fetchEntity("concurrent1"),
        provider.fetchEntity("concurrent2"),
        provider.fetchEntity("concurrent3"),
      ];

      const results = await Promise.all(requests);

      expect(results).toHaveLength(3);

      const stats = provider.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(3);
      expect(stats.failedRequests).toBe(0);
    });

    it("should handle mixed success and failure requests", async () => {
      // First request succeeds
      await provider.fetchEntity("success");

      // Second request fails
      provider.setShouldThrowError(true, new Error("Failure"));
      await expect(provider.fetchEntity("failure")).rejects.toThrow();

      // Third request succeeds
      provider.setShouldThrowError(false);
      await provider.fetchEntity("success2");

      const stats = provider.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
    });
  });

  describe("Abstract Method Implementations", () => {
    it("should implement fetchEntity correctly", async () => {
      const result = await provider.fetchEntity("W123456");

      expect(result).toEqual({
        id: "node-W123456",
        entityType: "works",
        label: "Entity W123456",
        entityId: "W123456",
        x: 0,
        y: 0,
        externalIds: [],
      });
    });

    it("should implement searchEntities correctly", async () => {
      const query: SearchQuery = {
        query: "machine learning",
        entityTypes: ["works", "authors"],
        limit: 3,
        offset: 0,
      };

      const results = await provider.searchEntities(query);

      expect(results).toHaveLength(3);
      expect(results[0]).toEqual({
        id: "search-result-0",
        entityType: "works",
        label: "Search Result 0",
        entityId: "SR0",
        x: 0,
        y: 0,
        externalIds: [],
      });
    });

    it("should implement expandEntity correctly", async () => {
      const options: ProviderExpansionOptions = {
        relationshipTypes: ["authored", "references"],
        maxDepth: 2,
        limit: 3,
        includeMetadata: true,
      };

      const result = await provider.expandEntity("W123", options);

      expect(result.nodes).toHaveLength(3);
      expect(result.edges).toHaveLength(3);
      expect(result.metadata).toEqual({
        expandedFrom: "W123",
        depth: 2,
        totalFound: 3,
        options,
      });

      // Check first node and edge
      expect(result.nodes[0].id).toBe("expanded-W123-0");
      expect(result.edges[0]).toEqual({
        id: "edge-W123-expanded-W123-0",
        source: "W123",
        target: "expanded-W123-0",
        type: "related_to",
        metadata: { weight: 1 },
      });
    });

    it("should handle expandEntity with depth alias", async () => {
      const options: ProviderExpansionOptions = {
        depth: 3, // Using depth instead of maxDepth
        limit: 2,
      };

      const result = await provider.expandEntity("A456", options);

      expect(result.metadata.depth).toBe(3);
      expect(result.metadata.options).toEqual(options);
    });

    it("should implement isHealthy correctly", async () => {
      expect(await provider.isHealthy()).toBe(true);

      provider.setMockHealthy(false);
      expect(await provider.isHealthy()).toBe(false);
    });
  });

  describe("Batch Operations", () => {
    it("should implement fetchEntities with sequential calls", async () => {
      const ids = ["W1", "W2", "W3"];
      const results = await provider.fetchEntities(ids);

      expect(results).toHaveLength(3);
      expect(results[0].entityId).toBe("W1");
      expect(results[1].entityId).toBe("W2");
      expect(results[2].entityId).toBe("W3");

      const stats = provider.getStats();
      expect(stats.totalRequests).toBe(3);
    });

    it("should handle empty array in fetchEntities", async () => {
      const results = await provider.fetchEntities([]);

      expect(results).toHaveLength(0);

      const stats = provider.getStats();
      expect(stats.totalRequests).toBe(0);
    });

    it("should handle mixed success/failure in fetchEntities", async () => {
      const ids = ["success", "failure"];

      // Make second request fail
      let callCount = 0;
      const originalFetchEntity = provider.fetchEntity.bind(provider);
      provider.fetchEntity = async (id: EntityIdentifier) => {
        callCount++;
        if (callCount === 2) {
          provider.setShouldThrowError(true, new Error("Second request failed"));
        } else {
          provider.setShouldThrowError(false);
        }
        return originalFetchEntity(id);
      };

      await expect(provider.fetchEntities(ids)).rejects.toThrow("Second request failed");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle different error types in requests", async () => {
      const networkError = new Error("Network connection failed");
      networkError.name = "NetworkError";

      provider.setShouldThrowError(true, networkError);

      await expect(provider.fetchEntity("network-fail")).rejects.toThrow("Network connection failed");

      const stats = provider.getStats();
      expect(stats.failedRequests).toBe(1);
    });

    it("should handle timeout-like errors", async () => {
      const timeoutError = new Error("Request timeout");
      timeoutError.name = "TimeoutError";

      provider.setShouldThrowError(true, timeoutError);

      await expect(provider.searchEntities({
        query: "timeout test",
        entityTypes: ["works"],
      })).rejects.toThrow("Request timeout");
    });

    it("should preserve error stack traces", async () => {
      const originalError = new Error("Original error");
      provider.setShouldThrowError(true, originalError);

      try {
        await provider.expandEntity("fail", { maxDepth: 1 });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBe(originalError);
        expect((error as Error).stack).toBeTruthy();
      }
    });
  });

  describe("Provider Options Validation", () => {
    it("should handle various option combinations", () => {
      const customProvider = new MockGraphDataProvider({
        name: "custom",
        version: "2.0.0",
        maxConcurrentRequests: 1,
        retryAttempts: 0,
        retryDelay: 100,
        timeout: 1000,
      });

      const options = customProvider.getOptions();
      expect(options.maxConcurrentRequests).toBe(1);
      expect(options.retryAttempts).toBe(0);
      expect(options.retryDelay).toBe(100);
      expect(options.timeout).toBe(1000);

      customProvider.destroy();
    });

    it("should handle options with zero values", () => {
      const zeroProvider = new MockGraphDataProvider({
        name: "zero-config",
        retryAttempts: 0,
        retryDelay: 0,
        timeout: 0,
      });

      const options = zeroProvider.getOptions();
      expect(options.retryAttempts).toBe(0);
      expect(options.retryDelay).toBe(0);
      expect(options.timeout).toBe(0);

      zeroProvider.destroy();
    });
  });
});

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;
  let provider1: MockGraphDataProvider;
  let provider2: MockGraphDataProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    provider1 = new MockGraphDataProvider({ name: "provider-1", version: "1.0.0" });
    provider2 = new MockGraphDataProvider({ name: "provider-2", version: "2.0.0" });
  });

  afterEach(() => {
    registry.destroy();
  });

  describe("Provider Registration", () => {
    it("should register a provider", () => {
      registry.register(provider1);

      const retrieved = registry.get("provider-1");
      expect(retrieved).toBe(provider1);
    });

    it("should set first registered provider as default", () => {
      registry.register(provider1);

      const defaultProvider = registry.get();
      expect(defaultProvider).toBe(provider1);
    });

    it("should register multiple providers", () => {
      registry.register(provider1);
      registry.register(provider2);

      expect(registry.get("provider-1")).toBe(provider1);
      expect(registry.get("provider-2")).toBe(provider2);
      expect(registry.listProviders()).toEqual(["provider-1", "provider-2"]);
    });

    it("should not change default when registering additional providers", () => {
      registry.register(provider1);
      registry.register(provider2);

      const defaultProvider = registry.get();
      expect(defaultProvider).toBe(provider1); // Still first registered
    });
  });

  describe("Provider Retrieval", () => {
    beforeEach(() => {
      registry.register(provider1);
      registry.register(provider2);
    });

    it("should get provider by name", () => {
      expect(registry.get("provider-1")).toBe(provider1);
      expect(registry.get("provider-2")).toBe(provider2);
    });

    it("should get default provider when no name specified", () => {
      const defaultProvider = registry.get();
      expect(defaultProvider).toBe(provider1);
    });

    it("should return null for non-existent provider", () => {
      const nonExistent = registry.get("non-existent");
      expect(nonExistent).toBeNull();
    });

    it("should return null when no providers registered", () => {
      const emptyRegistry = new ProviderRegistry();
      expect(emptyRegistry.get()).toBeNull();
      expect(emptyRegistry.get("any-name")).toBeNull();
      emptyRegistry.destroy();
    });
  });

  describe("Default Provider Management", () => {
    beforeEach(() => {
      registry.register(provider1);
      registry.register(provider2);
    });

    it("should set default provider", () => {
      registry.setDefault("provider-2");

      const defaultProvider = registry.get();
      expect(defaultProvider).toBe(provider2);
    });

    it("should throw error when setting non-existent provider as default", () => {
      expect(() => registry.setDefault("non-existent")).toThrow("Provider 'non-existent' not found");
    });

    it("should update default to next available when current default is unregistered", () => {
      // provider-1 is default
      expect(registry.get()).toBe(provider1);

      registry.unregister("provider-1");

      // Should now default to provider-2
      expect(registry.get()).toBe(provider2);
    });

    it("should set default to null when last provider is unregistered", () => {
      registry.unregister("provider-1");
      registry.unregister("provider-2");

      expect(registry.get()).toBeNull();
    });
  });

  describe("Provider Unregistration", () => {
    beforeEach(() => {
      registry.register(provider1);
      registry.register(provider2);
    });

    it("should unregister a provider", () => {
      registry.unregister("provider-1");

      expect(registry.get("provider-1")).toBeNull();
      expect(registry.listProviders()).toEqual(["provider-2"]);
    });

    it("should destroy provider when unregistering", () => {
      const destroySpy = vi.spyOn(provider1, "destroy");

      registry.unregister("provider-1");

      expect(destroySpy).toHaveBeenCalled();
    });

    it("should handle unregistering non-existent provider gracefully", () => {
      expect(() => registry.unregister("non-existent")).not.toThrow();

      // Should not affect existing providers
      expect(registry.listProviders()).toEqual(["provider-1", "provider-2"]);
    });
  });

  describe("Provider Listing", () => {
    it("should return empty array when no providers registered", () => {
      expect(registry.listProviders()).toEqual([]);
    });

    it("should list all registered providers", () => {
      registry.register(provider1);
      registry.register(provider2);

      expect(registry.listProviders()).toEqual(["provider-1", "provider-2"]);
    });

    it("should update list after unregistration", () => {
      registry.register(provider1);
      registry.register(provider2);
      registry.unregister("provider-1");

      expect(registry.listProviders()).toEqual(["provider-2"]);
    });
  });

  describe("Statistics Aggregation", () => {
    beforeEach(async () => {
      registry.register(provider1);
      registry.register(provider2);

      // Generate some stats
      await provider1.fetchEntity("test1");
      await provider2.fetchEntity("test2");
    });

    it("should aggregate stats from all providers", () => {
      const stats = registry.getStats();

      expect(stats).toHaveProperty("provider-1");
      expect(stats).toHaveProperty("provider-2");
      expect(stats["provider-1"].totalRequests).toBe(1);
      expect(stats["provider-2"].totalRequests).toBe(1);
    });

    it("should return empty object when no providers registered", () => {
      const emptyRegistry = new ProviderRegistry();
      expect(emptyRegistry.getStats()).toEqual({});
      emptyRegistry.destroy();
    });
  });

  describe("Health Check", () => {
    beforeEach(() => {
      registry.register(provider1);
      registry.register(provider2);
    });

    it("should check health of all providers", async () => {
      provider1.setMockHealthy(true);
      provider2.setMockHealthy(false);

      const health = await registry.healthCheck();

      expect(health).toEqual({
        "provider-1": true,
        "provider-2": false,
      });
    });

    it("should handle health check errors gracefully", async () => {
      // Make provider1 throw an error during health check
      provider1.isHealthy = async () => {
        throw new Error("Health check failed");
      };

      const health = await registry.healthCheck();

      expect(health["provider-1"]).toBe(false);
      expect(health["provider-2"]).toBe(true);
    });

    it("should return empty object when no providers registered", async () => {
      const emptyRegistry = new ProviderRegistry();
      const health = await emptyRegistry.healthCheck();
      expect(health).toEqual({});
      emptyRegistry.destroy();
    });
  });

  describe("Registry Destruction", () => {
    beforeEach(() => {
      registry.register(provider1);
      registry.register(provider2);
    });

    it("should destroy all providers when registry is destroyed", () => {
      const destroy1Spy = vi.spyOn(provider1, "destroy");
      const destroy2Spy = vi.spyOn(provider2, "destroy");

      registry.destroy();

      expect(destroy1Spy).toHaveBeenCalled();
      expect(destroy2Spy).toHaveBeenCalled();
    });

    it("should clear all providers and default after destruction", () => {
      registry.destroy();

      expect(registry.listProviders()).toEqual([]);
      expect(registry.get()).toBeNull();
    });
  });

  describe("Error Handling in Registry Operations", () => {
    it("should handle provider registration with duplicate names", () => {
      registry.register(provider1);

      const duplicateProvider = new MockGraphDataProvider({
        name: "provider-1", // Same name
        version: "3.0.0",
      });

      // Should replace the first provider
      registry.register(duplicateProvider);

      const retrieved = registry.get("provider-1");
      expect(retrieved).toBe(duplicateProvider);
      expect(retrieved.getProviderInfo().version).toBe("3.0.0");

      duplicateProvider.destroy();
    });
  });
});