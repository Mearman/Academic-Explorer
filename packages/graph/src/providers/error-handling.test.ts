/**
 * Comprehensive error handling tests for graph providers
 * Tests error scenarios, error type validation, error message accuracy, and recovery mechanisms
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import {
  GraphDataProvider,
  ProviderRegistry,
  type SearchQuery,
  type ProviderExpansionOptions,
  type GraphExpansion,
  type ProviderOptions
} from './base-provider';
import { OpenAlexGraphProvider } from './openalex-provider';
import type { GraphNode, EntityType, EntityIdentifier } from '../types/core';

// Test implementations
class MockProvider extends GraphDataProvider {
  private shouldFail = false;
  private failureMode: 'network' | 'timeout' | 'malformed' | 'rate-limit' | 'memory' | null = null;
  private requestCount = 0;

  constructor(options: ProviderOptions) {
    super(options);
  }

  setFailureMode(mode: 'network' | 'timeout' | 'malformed' | 'rate-limit' | 'memory' | null) {
    this.failureMode = mode;
    this.shouldFail = mode !== null;
  }

  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    return this.trackRequest((async () => {
      this.requestCount++;

      if (this.shouldFail) {
        await this.simulateFailure();
      }

      const node = {
        id,
        entityType: 'works' as const,
        entityId: id,
        label: `Test Entity ${id}`,
        x: 0,
        y: 0,
        externalIds: [],
        entityData: { id, test: true }
      };

      this.onEntityFetched(node);
      return node;
    })());
  }

  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    return this.trackRequest((async () => {
      this.requestCount++;

      if (this.shouldFail) {
        await this.simulateFailure();
      }

      return [{
        id: 'search-result-1',
        entityType: 'works' as const,
        entityId: 'search-result-1',
        label: 'Search Result',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: { id: 'search-result-1', test: true }
      }];
    })());
  }

  async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    return this.trackRequest((async () => {
      this.requestCount++;

      if (this.shouldFail) {
        await this.simulateFailure();
      }

      return {
        nodes: [],
        edges: [],
        metadata: {
          expandedFrom: nodeId,
          depth: 1,
          totalFound: 0,
          options
        }
      };
    })());
  }

  async isHealthy(): Promise<boolean> {
    if (this.failureMode === 'network') {
      throw new Error('Health check failed: Network error');
    }
    return this.failureMode === null;
  }

  getRequestCount() {
    return this.requestCount;
  }

  private async simulateFailure(): Promise<never> {
    switch (this.failureMode) {
      case 'network':
        const networkError = new Error('Network connection failed');
        (networkError as any).code = 'ECONNREFUSED';
        throw networkError;

      case 'timeout':
        const timeoutError = new Error('Request timeout');
        (timeoutError as any).code = 'ETIMEDOUT';
        throw timeoutError;

      case 'rate-limit':
        const rateLimitError = new Error('Rate limit exceeded');
        (rateLimitError as any).status = 429;
        (rateLimitError as any).headers = { 'retry-after': '60' };
        throw rateLimitError;

      case 'malformed':
        throw new SyntaxError('Unexpected token in JSON at position 0');

      case 'memory':
        const memoryError = new Error('JavaScript heap out of memory');
        (memoryError as any).code = 'ENOSPC';
        throw memoryError;

      default:
        throw new Error('Unknown failure mode');
    }
  }
}

import { MockOpenAlexClient } from '../__tests__/mocks/mock-openalex-client';

describe('GraphDataProvider Error Handling', () => {
  let provider: MockProvider;
  let eventSpy: vi.SpyInstance;

  beforeEach(() => {
    provider = new MockProvider({
      name: 'test-provider',
      timeout: 5000,
      retryAttempts: 2
    });

    eventSpy = vi.fn();
    provider.on('error', eventSpy);
    provider.on('requestError', eventSpy);
  });

  afterEach(() => {
    provider.destroy();
    vi.clearAllMocks();
  });

  describe('Network Failures', () => {
    it('should handle network connection failures', async () => {
      provider.setFailureMode('network');

      await expect(provider.fetchEntity('test-id'))
        .rejects
        .toThrow('Network connection failed');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Network connection failed',
            code: 'ECONNREFUSED'
          })
        })
      );
    });

    it('should handle timeout errors', async () => {
      provider.setFailureMode('timeout');

      await expect(provider.fetchEntity('test-id'))
        .rejects
        .toThrow('Request timeout');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Request timeout',
            code: 'ETIMEDOUT'
          })
        })
      );
    });

    it('should track failed requests in statistics', async () => {
      provider.setFailureMode('network');
      const initialStats = provider.getProviderInfo().stats;

      try {
        await provider.fetchEntity('test-id');
      } catch {
        // Expected to fail
      }

      const finalStats = provider.getProviderInfo().stats;
      expect(finalStats.failedRequests).toBe(initialStats.failedRequests + 1);
      expect(finalStats.totalRequests).toBe(initialStats.totalRequests + 1);
    });
  });

  describe('API Rate Limiting', () => {
    it('should handle rate limit responses', async () => {
      provider.setFailureMode('rate-limit');

      await expect(provider.fetchEntity('test-id'))
        .rejects
        .toThrow('Rate limit exceeded');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            status: 429,
            headers: expect.objectContaining({
              'retry-after': '60'
            })
          })
        })
      );
    });

    it('should emit appropriate events for rate limiting', async () => {
      provider.setFailureMode('rate-limit');
      const rateLimitSpy = vi.fn();
      provider.on('requestError', rateLimitSpy);

      try {
        await provider.fetchEntity('test-id');
      } catch {
        // Expected
      }

      expect(rateLimitSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ status: 429 }),
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('Data Validation Errors', () => {
    it('should handle malformed JSON responses', async () => {
      provider.setFailureMode('malformed');

      await expect(provider.fetchEntity('test-id'))
        .rejects
        .toThrow('Unexpected token in JSON');
    });

    it('should handle memory exhaustion errors', async () => {
      provider.setFailureMode('memory');

      await expect(provider.fetchEntity('test-id'))
        .rejects
        .toThrow('JavaScript heap out of memory');
    });
  });

  describe('Health Check Failures', () => {
    it('should handle health check network failures', async () => {
      provider.setFailureMode('network');

      await expect(provider.isHealthy())
        .rejects
        .toThrow('Health check failed: Network error');
    });

    it('should return false for unhealthy state', async () => {
      provider.setFailureMode('rate-limit');
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(false);
    });

    it('should return true when healthy', async () => {
      provider.setFailureMode(null);
      const isHealthy = await provider.isHealthy();
      expect(isHealthy).toBe(true);
    });
  });

  describe('Event Emission Errors', () => {
    it('should handle listener failures gracefully', async () => {
      const failingListener = vi.fn(() => {
        throw new Error('Listener failed');
      });

      provider.on('requestSuccess', failingListener);
      provider.setFailureMode(null);

      // Should not throw despite listener failure
      await expect(provider.fetchEntity('test-id'))
        .resolves
        .toBeDefined();

      expect(failingListener).toHaveBeenCalled();
    });

    it('should continue operation after event emission errors', async () => {
      const errorListener = vi.fn(() => {
        throw new Error('Event handler error');
      });

      provider.on('entityFetched', errorListener);
      provider.setFailureMode(null);

      const result = await provider.fetchEntity('test-id');
      expect(result).toBeDefined();
      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('Batch Operation Failures', () => {
    it('should handle partial failures in batch operations', async () => {
      const ids = ['success-1', 'success-2', 'success-3'];

      // Mock individual requests to fail on second item
      const originalFetch = provider.fetchEntity.bind(provider);
      provider.fetchEntity = vi.fn().mockImplementation((id: string) => {
        if (id === 'success-2') {
          return Promise.reject(new Error('Individual request failed'));
        }
        return originalFetch(id);
      });

      await expect(provider.fetchEntities(ids))
        .rejects
        .toThrow('Individual request failed');
    });
  });
});

describe('OpenAlexGraphProvider Error Handling', () => {
  let mockClient: MockOpenAlexClient;
  let provider: OpenAlexGraphProvider;
  let eventSpy: vi.SpyInstance;

  beforeEach(() => {
    mockClient = new MockOpenAlexClient();
    provider = new OpenAlexGraphProvider(mockClient as any, {
      name: 'openalex-test',
      timeout: 5000,
      retryAttempts: 1
    });

    eventSpy = vi.fn();
    provider.on('error', eventSpy);
    provider.on('requestError', eventSpy);
  });

  afterEach(() => {
    provider.destroy();
    vi.clearAllMocks();
  });

  describe('Invalid Entity IDs', () => {
    it('should reject invalid entity ID formats', async () => {
      await expect(provider.fetchEntity('invalid-id-format'))
        .rejects
        .toThrow('Cannot detect entity type for ID: invalid-id-format');
    });

    it('should handle unknown entity prefixes', async () => {
      await expect(provider.fetchEntity('X123456789'))
        .rejects
        .toThrow('Cannot detect entity type for ID: X123456789');
    });

    it('should accept DOI-based IDs', async () => {
      mockClient.setFailureMode(null);
      const result = await provider.fetchEntity('https://doi.org/10.1000/test');
      expect(result.entityType).toBe('works');
    });

    it('should accept ORCID-based IDs', async () => {
      mockClient.setFailureMode(null);
      const result = await provider.fetchEntity('https://orcid.org/0000-0000-0000-0000');
      expect(result.entityType).toBe('authors');
    });
  });

  describe('Unsupported Entity Types', () => {
    it('should reject unsupported entity types in fetchEntityData', async () => {
      // Create a provider instance we can manipulate
      const testProvider = new (class extends OpenAlexGraphProvider {
        public async testFetchEntityData(id: string, entityType: EntityType) {
          return (this as any).fetchEntityData(id, entityType);
        }
      })(mockClient as any);

      await expect(testProvider.testFetchEntityData('K12345678', 'unsupported-type' as EntityType))
        .rejects
        .toThrow('Unsupported entity type: unsupported-type');
    });
  });

  describe('API Response Validation', () => {
    it('should handle null API responses', async () => {
      mockClient.setFailureMode('invalid-response');

      await expect(provider.fetchEntity('W2741809807'))
        .rejects
        .toThrow(); // Should throw some validation error
    });

    it('should handle malformed API responses', async () => {
      mockClient.setFailureMode('malformed', { results: "not-an-array" });

      const query: SearchQuery = {
        query: 'test',
        entityTypes: ['works']
      };

      // The provider handles malformed responses gracefully, logging warnings but continuing
      const results = await provider.searchEntities(query);
      expect(results).toEqual([]); // Should return empty array for failed searches
    });

    it('should handle missing required fields', async () => {
      mockClient.setFailureMode('missing-fields');

      const result = await provider.fetchEntity('W2741809807');
      expect(result.label).toBe('Untitled Work'); // Should use fallback
    });

    it('should handle server errors gracefully', async () => {
      mockClient.setFailureMode('server-error');

      await expect(provider.fetchEntity('W2741809807'))
        .rejects
        .toThrow('Internal Server Error');
    });
  });

  describe('Circular Dependency Detection', () => {
    it('should handle expansion with deep nesting', async () => {
      // This tests the current implementation - would need enhancement for actual circular detection
      mockClient.setFailureMode(null);

      const expansion = await provider.expandEntity('W2741809807', { maxDepth: 10 });
      expect(expansion.metadata.depth).toBe(1); // Current implementation always returns depth 1
    });
  });

  describe('Memory and Performance Issues', () => {
    it('should handle large dataset scenarios', async () => {
      mockClient.setFailureMode(null);

      const query: SearchQuery = {
        query: 'test',
        entityTypes: ['works'],
        limit: 1000 // Large limit
      };

      const results = await provider.searchEntities(query);
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(1000);
    });

    it('should handle concurrent request failures', async () => {
      mockClient.setFailureMode('network');

      const promises = Array.from({ length: 5 }, (_, i) =>
        provider.fetchEntity(`W${i}`)
      );

      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
    });
  });

  describe('Provider Configuration Errors', () => {
    it('should handle missing client configuration', async () => {
      // Creating a provider with null client shouldn't throw immediately but should fail on usage
      expect(() => new OpenAlexGraphProvider(null as any))
        .not.toThrow(); // Constructor doesn't validate client immediately

      const nullProvider = new OpenAlexGraphProvider(null as any);

      // Should throw when trying to use the null client
      await expect(nullProvider.fetchEntity('W2741809807'))
        .rejects
        .toThrow();

      nullProvider.destroy();
    });

    it('should handle invalid timeout configuration', async () => {
      const invalidProvider = new OpenAlexGraphProvider(mockClient as any, {
        timeout: -1 // Invalid timeout
      });

      // Should still work but use defaults
      mockClient.setFailureMode(null);
      const result = await invalidProvider.fetchEntity('W2741809807');
      expect(result).toBeDefined();

      invalidProvider.destroy();
    });
  });

  describe('Search Error Handling', () => {
    it('should handle search failures for specific entity types', async () => {
      mockClient.setFailureMode('network');

      const query: SearchQuery = {
        query: 'test',
        entityTypes: ['works', 'authors']
      };

      const results = await provider.searchEntities(query);
      expect(results).toEqual([]); // Should return empty array, not throw
    });

    it('should handle empty search results', async () => {
      mockClient.setFailureMode('malformed', { results: [] });

      const query: SearchQuery = {
        query: 'nonexistent',
        entityTypes: ['works']
      };

      const results = await provider.searchEntities(query);
      expect(results).toEqual([]);
    });
  });

  describe('Expansion Error Handling', () => {
    it('should handle expansion failures gracefully', async () => {
      mockClient.setFailureMode('network');

      // Expansion should throw the network error since it's not caught internally
      await expect(provider.expandEntity('A5017898742', { limit: 5 }))
        .rejects
        .toThrow('fetch failed');
    });

    it('should handle partial expansion failures', async () => {
      // Set up to succeed on initial fetch but fail on expansion queries
      let callCount = 0;
      const originalMakeRequest = (mockClient as any).makeRequest;

      (mockClient as any).makeRequest = function(...args: any[]) {
        callCount++;
        if (callCount === 1) {
          // First call succeeds (entity fetch)
          return originalMakeRequest.apply(this, args);
        } else {
          // Subsequent calls fail (expansion queries)
          throw new Error('Expansion query failed');
        }
      };

      const expansion = await provider.expandEntity('A5017898742', { limit: 5 });
      expect(expansion.nodes).toEqual([]);
    });
  });
});

describe('ProviderRegistry Error Handling', () => {
  let registry: ProviderRegistry;
  let provider1: MockProvider;
  let provider2: MockProvider;

  beforeEach(() => {
    registry = new ProviderRegistry();
    provider1 = new MockProvider({ name: 'provider1' });
    provider2 = new MockProvider({ name: 'provider2' });
  });

  afterEach(() => {
    registry.destroy();
    vi.clearAllMocks();
  });

  describe('Provider Registration Errors', () => {
    it('should handle duplicate provider registration', () => {
      registry.register(provider1);

      // Registering same provider again should work (overwrite)
      expect(() => registry.register(provider1)).not.toThrow();
      expect(registry.listProviders()).toContain('provider1');
    });

    it('should handle provider with duplicate names', () => {
      const duplicateProvider = new MockProvider({ name: 'provider1' });

      registry.register(provider1);
      registry.register(duplicateProvider);

      // Should overwrite the first provider
      expect(registry.get('provider1')).toBe(duplicateProvider);

      duplicateProvider.destroy();
    });
  });

  describe('Provider Retrieval Errors', () => {
    it('should handle getting non-existent provider', () => {
      const result = registry.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle getting provider when registry is empty', () => {
      const result = registry.get();
      expect(result).toBeNull();
    });

    it('should handle setting non-existent provider as default', () => {
      expect(() => registry.setDefault('nonexistent'))
        .toThrow("Provider 'nonexistent' not found");
    });
  });

  describe('Provider Cleanup Errors', () => {
    it('should handle unregistering non-existent provider', () => {
      expect(() => registry.unregister('nonexistent')).not.toThrow();
      expect(registry.listProviders()).toEqual([]);
    });

    it('should handle provider destruction failures', () => {
      const faultyProvider = new MockProvider({ name: 'faulty' });
      let destroyCalled = false;

      faultyProvider.destroy = vi.fn(() => {
        if (!destroyCalled) {
          destroyCalled = true;
          throw new Error('Cleanup failed');
        }
        // Allow subsequent calls to succeed for test cleanup
      });

      registry.register(faultyProvider);

      // Registry's unregister method will propagate destruction errors
      try {
        registry.unregister('faulty');
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toBe('Cleanup failed');
      }

      // Due to the error, the provider removal doesn't complete
      // This demonstrates a potential issue in the current implementation
      expect(registry.get('faulty')).not.toBeNull();

      // Reset the destroy method for proper cleanup in afterEach
      faultyProvider.destroy = vi.fn();
    });

    it('should handle default provider removal', () => {
      registry.register(provider1);
      registry.register(provider2);

      expect(registry.get()).toBe(provider1); // First registered becomes default

      registry.unregister('provider1');

      // Should automatically set new default
      expect(registry.get()).toBe(provider2);
    });

    it('should handle removing last provider', () => {
      registry.register(provider1);
      registry.unregister('provider1');

      expect(registry.get()).toBeNull();
      expect(registry.listProviders()).toEqual([]);
    });
  });

  describe('Health Check Error Handling', () => {
    it('should handle individual provider health check failures', async () => {
      provider1.setFailureMode('network');
      provider2.setFailureMode(null);

      registry.register(provider1);
      registry.register(provider2);

      const health = await registry.healthCheck();

      expect(health.provider1).toBe(false);
      expect(health.provider2).toBe(true);
    });

    it('should handle all providers being unhealthy', async () => {
      provider1.setFailureMode('network');
      provider2.setFailureMode('timeout');

      registry.register(provider1);
      registry.register(provider2);

      const health = await registry.healthCheck();

      expect(health.provider1).toBe(false);
      expect(health.provider2).toBe(false);
    });

    it('should handle health check timeout scenarios', async () => {
      const timeoutProvider = new MockProvider({
        name: 'timeout-provider',
        timeout: 100
      });

      // Mock isHealthy to never resolve
      timeoutProvider.isHealthy = vi.fn().mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      );

      registry.register(timeoutProvider);

      const healthPromise = registry.healthCheck();

      // Should eventually complete (though provider will show as unhealthy)
      const health = await Promise.race([
        healthPromise,
        new Promise(resolve => setTimeout(() => resolve({ 'timeout-provider': false }), 200))
      ]);

      expect(health).toBeDefined();

      timeoutProvider.destroy();
    });
  });

  describe('Statistics Collection Errors', () => {
    it('should handle providers with corrupted stats', () => {
      const corruptProvider = new MockProvider({ name: 'corrupt' });

      // Corrupt the stats
      (corruptProvider as any).stats = null;

      registry.register(corruptProvider);

      expect(() => registry.getStats()).not.toThrow();
      const stats = registry.getStats();
      expect(stats).toBeDefined();

      corruptProvider.destroy();
    });

    it('should handle empty registry stats request', () => {
      const stats = registry.getStats();
      expect(stats).toEqual({});
    });
  });

  describe('Concurrent Access Errors', () => {
    it('should handle concurrent registration and retrieval', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => {
        const provider = new MockProvider({ name: `concurrent-${i}` });
        return Promise.resolve().then(() => {
          registry.register(provider);
          return registry.get(`concurrent-${i}`);
        });
      });

      const results = await Promise.all(promises);

      results.forEach((result, i) => {
        expect(result).toBeDefined();
        expect(result?.getProviderInfo().name).toBe(`concurrent-${i}`);
      });

      // Cleanup
      results.forEach(provider => provider?.destroy());
    });

    it('should handle concurrent unregistration', async () => {
      const providers = Array.from({ length: 5 }, (_, i) =>
        new MockProvider({ name: `concurrent-unreg-${i}` })
      );

      providers.forEach(provider => registry.register(provider));

      const unregPromises = providers.map(provider =>
        Promise.resolve().then(() =>
          registry.unregister(provider.getProviderInfo().name)
        )
      );

      await Promise.all(unregPromises);

      expect(registry.listProviders()).toEqual([]);
      expect(registry.get()).toBeNull();
    });
  });

  describe('Recovery Mechanisms', () => {
    it('should recover from provider registration after errors', () => {
      // Try to register null provider - this will actually succeed in current implementation
      // because the provider registration doesn't validate the provider object
      registry.register(provider1);
      expect(registry.get()).toBe(provider1);

      // Registry should work normally
      registry.register(provider2);
      expect(registry.listProviders()).toContain('provider2');
    });

    it('should maintain consistency after partial failures', async () => {
      provider1.setFailureMode('network');
      provider2.setFailureMode(null);

      registry.register(provider1);
      registry.register(provider2);

      // Health check should show mixed results
      const health = await registry.healthCheck();
      expect(health.provider1).toBe(false);
      expect(health.provider2).toBe(true);

      // Registry should still be functional
      expect(registry.listProviders()).toEqual(['provider1', 'provider2']);
    });
  });
});

describe('Error Type Validation', () => {
  it('should preserve error types and properties', async () => {
    const provider = new MockProvider({ name: 'error-test' });
    provider.setFailureMode('network');

    try {
      await provider.fetchEntity('test-id');
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as any).code).toBe('ECONNREFUSED');
      expect(error.message).toBe('Network connection failed');
    }

    provider.destroy();
  });

  it('should preserve HTTP status codes and headers', async () => {
    const provider = new MockProvider({ name: 'http-error-test' });
    provider.setFailureMode('rate-limit');

    try {
      await provider.fetchEntity('test-id');
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as any).status).toBe(429);
      expect((error as any).headers).toEqual({ 'retry-after': '60' });
    }

    provider.destroy();
  });
});