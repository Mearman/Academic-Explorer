/**
 * Example: Provider Registry Management
 *
 * Demonstrates: Provider registration, switching, and management
 * Use cases: Multi-provider applications, provider failover, A/B testing
 * Prerequisites: Understanding of GraphDataProvider interface
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderRegistry, GraphDataProvider } from '../../../providers/base-provider';
import { OpenAlexGraphProvider } from '../../../providers/openalex-provider';
import type { EntityIdentifier, GraphNode } from '../../../types/core';

// Mock client for testing
class MockOpenAlexClient {
  constructor(private name: string) {}

  async getAuthor(id: string): Promise<Record<string, unknown>> {
    return {
      id,
      display_name: `Author from ${this.name}`,
      ids: { openalex: id },
      source: this.name
    };
  }

  async getWork(id: string): Promise<Record<string, unknown>> {
    return {
      id,
      title: `Work from ${this.name}`,
      display_name: `Work from ${this.name}`,
      ids: { openalex: id }
    };
  }

  async getSource(): Promise<Record<string, unknown>> { return {}; }
  async getInstitution(): Promise<Record<string, unknown>> { return {}; }
  async get(): Promise<Record<string, unknown>> { return {}; }
  async works(): Promise<{ results: Record<string, unknown>[] }> { return { results: [] }; }
  async authors(): Promise<{ results: Record<string, unknown>[] }> { return { results: [] }; }
  async sources(): Promise<{ results: Record<string, unknown>[] }> { return { results: [] }; }
  async institutions(): Promise<{ results: Record<string, unknown>[] }> { return { results: [] }; }
}

// Custom provider for testing
class TestProvider extends GraphDataProvider {
  constructor(private testName: string) {
    super({
      name: testName,
      version: '1.0.0'
    });
  }

  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    return {
      id,
      entityType: 'authors',
      entityId: id,
      label: `Test entity from ${this.testName}`,
      x: 0,
      y: 0,
      externalIds: [],
      entityData: { source: this.testName }
    };
  }

  async searchEntities(): Promise<GraphNode[]> {
    return [];
  }

  async expandEntity(): Promise<any> {
    return { nodes: [], edges: [], metadata: {} };
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}

describe('Example: Provider Registry Management', () => {
  let registry: ProviderRegistry;
  let primaryProvider: OpenAlexGraphProvider;
  let secondaryProvider: OpenAlexGraphProvider;
  let testProvider: TestProvider;

  beforeEach(async () => {
    // Setup multiple providers for testing
    registry = new ProviderRegistry();

    // Create primary OpenAlex provider
    const primaryClient = new MockOpenAlexClient('primary');
    primaryProvider = new OpenAlexGraphProvider(primaryClient, {
      name: 'openalex-primary',
      timeout: 5000
    });

    // Create secondary OpenAlex provider (different configuration)
    const secondaryClient = new MockOpenAlexClient('secondary');
    secondaryProvider = new OpenAlexGraphProvider(secondaryClient, {
      name: 'openalex-secondary',
      timeout: 10000,
      retryAttempts: 5
    });

    // Create custom test provider
    testProvider = new TestProvider('test-provider');
  });

  afterEach(() => {
    // Clean up all providers and registry
    registry.destroy();
    primaryProvider.destroy();
    secondaryProvider.destroy();
    testProvider.destroy();
  });

  describe('Provider Registration', () => {
    it('demonstrates basic provider registration', async () => {
      // Given: A fresh registry
      expect(registry.listProviders()).toHaveLength(0);

      // When: Registering a provider
      registry.register(primaryProvider);

      // Then: Provider should be registered and set as default
      const providers = registry.listProviders();
      expect(providers).toHaveLength(1);
      expect(providers).toContain('openalex-primary');

      // Best Practice: First registered provider becomes default
      const defaultProvider = registry.get();
      expect(defaultProvider).toBe(primaryProvider);
      expect(defaultProvider?.getProviderInfo().name).toBe('openalex-primary');
    });

    it('demonstrates multiple provider registration', async () => {
      // Given: Multiple providers to register
      const providersToRegister = [
        { provider: primaryProvider, name: 'openalex-primary' },
        { provider: secondaryProvider, name: 'openalex-secondary' },
        { provider: testProvider, name: 'test-provider' }
      ];

      // When: Registering multiple providers
      providersToRegister.forEach(({ provider }) => {
        registry.register(provider);
      });

      // Then: All providers should be registered
      const providers = registry.listProviders();
      expect(providers).toHaveLength(3);
      expect(providers).toEqual(
        expect.arrayContaining(['openalex-primary', 'openalex-secondary', 'test-provider'])
      );

      // Best Practice: First provider remains default
      const defaultProvider = registry.get();
      expect(defaultProvider?.getProviderInfo().name).toBe('openalex-primary');
    });

    it('demonstrates provider replacement and cleanup', async () => {
      // Given: A registered provider
      registry.register(primaryProvider);
      expect(registry.listProviders()).toContain('openalex-primary');

      // When: Unregistering the provider
      registry.unregister('openalex-primary');

      // Then: Provider should be removed
      expect(registry.listProviders()).toHaveLength(0);
      expect(registry.get()).toBeNull();

      // Best Practice: Can register new provider after cleanup
      registry.register(testProvider);
      expect(registry.listProviders()).toContain('test-provider');
      expect(registry.get()?.getProviderInfo().name).toBe('test-provider');
    });
  });

  describe('Provider Selection and Switching', () => {
    beforeEach(() => {
      // Register multiple providers for switching tests
      registry.register(primaryProvider);
      registry.register(secondaryProvider);
      registry.register(testProvider);
    });

    it('demonstrates default provider usage', async () => {
      // Given: Multiple registered providers
      expect(registry.listProviders()).toHaveLength(3);

      // When: Using default provider
      const defaultProvider = registry.get();

      // Then: Should return first registered provider
      expect(defaultProvider).toBe(primaryProvider);
      expect(defaultProvider?.getProviderInfo().name).toBe('openalex-primary');

      // Best Practice: Default provider works without specifying name
      const entity = await defaultProvider!.fetchEntity('A5017898742');
      expect(entity.entityData?.source).toBe('primary');
    });

    it('demonstrates explicit provider selection', async () => {
      // When: Getting specific providers by name
      const primary = registry.get('openalex-primary');
      const secondary = registry.get('openalex-secondary');
      const test = registry.get('test-provider');

      // Then: Should return correct provider instances
      expect(primary).toBe(primaryProvider);
      expect(secondary).toBe(secondaryProvider);
      expect(test).toBe(testProvider);

      // Best Practice: Verify provider characteristics
      expect(primary?.getProviderInfo().name).toBe('openalex-primary');
      expect(secondary?.getProviderInfo().name).toBe('openalex-secondary');
      expect(test?.getProviderInfo().name).toBe('test-provider');
    });

    it('demonstrates dynamic provider switching', async () => {
      // Given: Default provider is primary
      expect(registry.get()?.getProviderInfo().name).toBe('openalex-primary');

      // When: Switching default provider
      registry.setDefault('test-provider');

      // Then: New provider should be default
      const newDefault = registry.get();
      expect(newDefault).toBe(testProvider);
      expect(newDefault?.getProviderInfo().name).toBe('test-provider');

      // Best Practice: Previous providers still accessible by name
      const stillAccessible = registry.get('openalex-primary');
      expect(stillAccessible).toBe(primaryProvider);
    });

    it('demonstrates provider switching for different entity types', async () => {
      // Given: Different providers optimized for different use cases
      // (In real scenarios, you might have specialized providers)

      // When: Using different providers for different operations
      const authorProvider = registry.get('openalex-primary');
      const workProvider = registry.get('openalex-secondary');

      // Then: Can use different providers for different entity types
      const author = await authorProvider!.fetchEntity('A5017898742');
      const work = await workProvider!.fetchEntity('W2741809807');

      // Best Practice: Verify different provider responses
      expect(author.entityData?.source).toBe('primary');
      expect(work.entityData?.source).toBe('secondary');

      // Best Practice: Both follow same interface contract
      [author, work].forEach(entity => {
        expect(entity).toHaveProperty('id');
        expect(entity).toHaveProperty('entityType');
        expect(entity).toHaveProperty('label');
        expect(entity).toHaveProperty('entityData');
      });
    });
  });

  describe('Provider Health Monitoring', () => {
    beforeEach(() => {
      registry.register(primaryProvider);
      registry.register(secondaryProvider);
      registry.register(testProvider);
    });

    it('demonstrates health check for all providers', async () => {
      // When: Checking health of all registered providers
      const healthStatus = await registry.healthCheck();

      // Then: Should return health status for each provider
      expect(healthStatus).toMatchObject({
        'openalex-primary': true,
        'openalex-secondary': true,
        'test-provider': true
      });

      // Best Practice: Health check should be comprehensive
      expect(Object.keys(healthStatus)).toHaveLength(3);
      Object.values(healthStatus).forEach(status => {
        expect(typeof status).toBe('boolean');
      });
    });

    it('demonstrates provider failover scenario', async () => {
      // Given: A provider that might become unhealthy
      const unhealthyProvider = new TestProvider('unhealthy-provider');
      // Mock health check failure
      unhealthyProvider.isHealthy = async () => false;
      registry.register(unhealthyProvider);

      // When: Checking health status
      const healthStatus = await registry.healthCheck();

      // Then: Should identify unhealthy provider
      expect(healthStatus['unhealthy-provider']).toBe(false);
      expect(healthStatus['openalex-primary']).toBe(true);

      // Best Practice: Application can implement failover logic
      const healthyProviders = Object.entries(healthStatus)
        .filter(([_, isHealthy]) => isHealthy)
        .map(([name]) => name);

      expect(healthyProviders).toContain('openalex-primary');
      expect(healthyProviders).not.toContain('unhealthy-provider');

      // Cleanup
      unhealthyProvider.destroy();
    });
  });

  describe('Provider Statistics and Monitoring', () => {
    beforeEach(() => {
      registry.register(primaryProvider);
      registry.register(secondaryProvider);
    });

    it('demonstrates provider statistics collection', async () => {
      // Given: Providers have been used for some operations
      await primaryProvider.fetchEntity('A5017898742');
      await secondaryProvider.fetchEntity('W2741809807');

      // When: Getting statistics from registry
      const stats = registry.getStats();

      // Then: Should return stats for all providers
      expect(stats).toHaveProperty('openalex-primary');
      expect(stats).toHaveProperty('openalex-secondary');

      // Best Practice: Verify statistics structure
      Object.values(stats).forEach(providerStats => {
        expect(providerStats).toMatchObject({
          totalRequests: expect.any(Number),
          successfulRequests: expect.any(Number),
          failedRequests: expect.any(Number),
          avgResponseTime: expect.any(Number),
          lastRequestTime: expect.any(Number)
        });
      });

      // Best Practice: Statistics should reflect actual usage
      expect(stats['openalex-primary'].totalRequests).toBeGreaterThan(0);
      expect(stats['openalex-secondary'].totalRequests).toBeGreaterThan(0);
    });

    it('demonstrates provider performance comparison', async () => {
      // Given: Multiple operations on different providers
      const operations = [
        () => primaryProvider.fetchEntity('A5017898742'),
        () => primaryProvider.fetchEntity('A9876543210'),
        () => secondaryProvider.fetchEntity('W2741809807'),
        () => secondaryProvider.fetchEntity('W1234567890'),
        () => secondaryProvider.fetchEntity('W5555555555')
      ];

      // When: Performing operations
      await Promise.all(operations.map(op => op()));

      // Then: Can compare provider performance
      const stats = registry.getStats();

      expect(stats['openalex-primary'].totalRequests).toBe(2);
      expect(stats['openalex-secondary'].totalRequests).toBe(3);

      // Best Practice: Can identify performance patterns
      const avgResponseTimes = Object.entries(stats).map(([name, stat]) => ({
        provider: name,
        avgTime: stat.avgResponseTime,
        requestCount: stat.totalRequests
      }));

      avgResponseTimes.forEach(({ provider, avgTime, requestCount }) => {
        expect(avgTime).toBeGreaterThanOrEqual(0);
        expect(requestCount).toBeGreaterThan(0);
        console.log(`Provider ${provider}: ${requestCount} requests, avg ${avgTime}ms`);
      });
    });
  });

  describe('Error Handling and Provider Management', () => {
    it('demonstrates handling unknown provider names', () => {
      // Given: An unknown provider name
      const unknownProvider = 'nonexistent-provider';

      // When: Trying to get unknown provider
      const provider = registry.get(unknownProvider);

      // Then: Should return null
      expect(provider).toBeNull();

      // When: Trying to set unknown provider as default
      expect(() => {
        registry.setDefault(unknownProvider);
      }).toThrow(`Provider '${unknownProvider}' not found`);
    });

    it('demonstrates graceful degradation with empty registry', () => {
      // Given: Empty registry
      const emptyRegistry = new ProviderRegistry();

      // When: Attempting operations on empty registry
      const provider = emptyRegistry.get();
      const providers = emptyRegistry.listProviders();

      // Then: Should handle gracefully
      expect(provider).toBeNull();
      expect(providers).toHaveLength(0);

      // When: Getting stats from empty registry
      const stats = emptyRegistry.getStats();
      expect(stats).toEqual({});

      // Cleanup
      emptyRegistry.destroy();
    });

    it('demonstrates cleanup and resource management', () => {
      // Given: Registry with providers
      registry.register(primaryProvider);
      registry.register(testProvider);

      const providerNames = registry.listProviders();
      expect(providerNames).toHaveLength(2);

      // When: Destroying registry
      registry.destroy();

      // Then: All providers should be cleaned up
      expect(registry.listProviders()).toHaveLength(0);
      expect(registry.get()).toBeNull();

      // Best Practice: Registry should be in clean state
      const stats = registry.getStats();
      expect(stats).toEqual({});
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('demonstrates A/B testing with different providers', async () => {
      // Given: Two providers for A/B testing
      registry.register(primaryProvider);
      registry.register(secondaryProvider);

      // Simulate A/B testing logic
      const userId = 'user123';
      const useProviderA = userId.charCodeAt(0) % 2 === 0;
      const providerName = useProviderA ? 'openalex-primary' : 'openalex-secondary';

      // When: Using provider based on A/B test
      const selectedProvider = registry.get(providerName);
      const entity = await selectedProvider!.fetchEntity('A5017898742');

      // Then: Should use appropriate provider
      if (useProviderA) {
        expect(entity.entityData?.source).toBe('primary');
      } else {
        expect(entity.entityData?.source).toBe('secondary');
      }

      // Best Practice: Track which variant was used
      expect(['primary', 'secondary']).toContain(entity.entityData?.source);
    });

    it('demonstrates provider configuration management', async () => {
      // Given: Providers with different configurations
      const config1 = { name: 'fast-provider', timeout: 1000, retryAttempts: 1 };
      const config2 = { name: 'reliable-provider', timeout: 10000, retryAttempts: 5 };

      const fastProvider = new OpenAlexGraphProvider(new MockOpenAlexClient('fast'), config1);
      const reliableProvider = new OpenAlexGraphProvider(new MockOpenAlexClient('reliable'), config2);

      registry.register(fastProvider);
      registry.register(reliableProvider);

      // When: Checking provider configurations
      const fastInfo = fastProvider.getProviderInfo();
      const reliableInfo = reliableProvider.getProviderInfo();

      // Then: Configurations should be preserved
      expect(fastInfo.name).toBe('fast-provider');
      expect(reliableInfo.name).toBe('reliable-provider');

      // Best Practice: Can select provider based on requirements
      // For time-sensitive operations, use fast provider
      const timeProvider = registry.get('fast-provider');
      // For critical operations, use reliable provider
      const criticalProvider = registry.get('reliable-provider');

      expect(timeProvider).toBe(fastProvider);
      expect(criticalProvider).toBe(reliableProvider);

      // Cleanup
      fastProvider.destroy();
      reliableProvider.destroy();
    });
  });
});