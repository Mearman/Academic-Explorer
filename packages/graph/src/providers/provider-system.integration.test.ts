/**
 * Integration Tests for Complete Provider System
 * Tests the full provider lifecycle, registry management, entity resolution,
 * and cross-provider functionality with realistic usage patterns.
 */

import { describe, it, expect, beforeEach, afterEach, _vi, _beforeAll, _afterAll } from 'vitest';
import { _EventEmitter } from 'events';
import {
  GraphDataProvider,
  ProviderRegistry,
  type SearchQuery,
  type ProviderExpansionOptions,
  type GraphExpansion,
  type ProviderOptions,
} from './base-provider';
import { OpenAlexGraphProvider } from './openalex-provider';
import { EntityResolver } from '../services/entity-resolver-interface';
import type { GraphNode, _EntityType, EntityIdentifier, GraphEdge } from '../types/core';
import { RelationType } from '../types/core';

// Mock OpenAlex Client for testing
class MockOpenAlexClient {
  private responses: Map<string, any> = new Map();
  private requestDelay = 0;
  public requestHistory: Array<{ method: string; params: any; timestamp: number }> = [];

  constructor(private shouldFail: boolean = false, delay: number = 0) {
    this.requestDelay = delay;
    this.setupDefaultResponses();
  }

  setRequestDelay(delay: number) {
    this.requestDelay = delay;
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  private setupDefaultResponses() {
    // Default test data
    this.responses.set('works:W2741809807', {
      id: 'W2741809807',
      display_name: 'Test Work',
      title: 'Test Work',
      authorships: [
        { author: { id: 'A5017898742', display_name: 'Test Author' } },
        { author: { id: 'A5023888391', display_name: 'Second Author' } }
      ],
      primary_location: {
        source: { id: 'S4210184550', display_name: 'Test Journal' }
      },
      ids: { doi: '10.1000/test' }
    });

    this.responses.set('authors:A5017898742', {
      id: 'A5017898742',
      display_name: 'Test Author',
      ids: { orcid: 'https://orcid.org/0000-0000-0000-0001' }
    });

    this.responses.set('sources:S4210184550', {
      id: 'S4210184550',
      display_name: 'Test Journal',
      ids: { issn_l: '1234-5678' }
    });

    this.responses.set('institutions:I4210140050', {
      id: 'I4210140050',
      display_name: 'Test University',
      ids: { ror: 'https://ror.org/test' }
    });

    // Search results
    this.responses.set('search:works:test', {
      results: [
        { id: 'W2741809807', display_name: 'Test Work', title: 'Test Work' },
        { id: 'W3126653431', display_name: 'Another Work', title: 'Another Work' }
      ]
    });

    this.responses.set('search:authors:test', {
      results: [
        { id: 'A5017898742', display_name: 'Test Author' },
        { id: 'A5045033332', display_name: 'Test Researcher' }
      ]
    });

    // Additional search results for machine learning
    this.responses.set('search:works:machine learning', {
      results: [
        { id: 'W2963537269', display_name: 'Machine Learning Paper 1', title: 'Machine Learning Paper 1' },
        { id: 'W2741809808', display_name: 'Deep Learning Study', title: 'Deep Learning Study' }
      ]
    });

    this.responses.set('search:authors:machine learning', {
      results: [
        { id: 'A5045033332', display_name: 'ML Researcher' },
        { id: 'A5023888392', display_name: 'AI Expert' }
      ]
    });

    // Add individual entity data for the ML search results
    this.responses.set('works:W2963537269', {
      id: 'W2963537269',
      display_name: 'Machine Learning Paper 1',
      title: 'Machine Learning Paper 1',
      authorships: [
        { author: { id: 'A5045033332', display_name: 'ML Researcher' } }
      ],
      ids: { doi: '10.1000/ml-paper1' }
    });

    this.responses.set('authors:A5045033332', {
      id: 'A5045033332',
      display_name: 'ML Researcher',
      ids: { orcid: 'https://orcid.org/0000-0000-0000-0002' }
    });
  }

  private async makeRequest(key: string, method: string, params: any = {}): Promise<any> {
    this.requestHistory.push({ method, params, timestamp: Date.now() });

    if (this.requestDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.requestDelay));
    }

    if (this.shouldFail) {
      throw new Error(`Mock client failure for ${method}`);
    }

    const response = this.responses.get(key);
    if (!response) {
      throw new Error(`No mock data for ${key}`);
    }

    return response;
  }

  async getWork(id: string) {
    return this.makeRequest(`works:${id}`, 'getWork', { id });
  }

  async getAuthor(id: string) {
    return this.makeRequest(`authors:${id}`, 'getAuthor', { id });
  }

  async getSource(id: string) {
    return this.makeRequest(`sources:${id}`, 'getSource', { id });
  }

  async getInstitution(id: string) {
    return this.makeRequest(`institutions:${id}`, 'getInstitution', { id });
  }

  async get(endpoint: string, id: string) {
    return this.makeRequest(`${endpoint}:${id}`, 'get', { endpoint, id });
  }

  async works(params: any) {
    if (params.search) {
      return this.makeRequest(`search:works:${params.search}`, 'works', params);
    }
    if (params.filter?.author?.id) {
      return {
        results: [
          { id: 'W2963537269', display_name: 'Author Work 1', title: 'Author Work 1' },
          { id: 'W2741809809', display_name: 'Author Work 2', title: 'Author Work 2' }
        ]
      };
    }
    return { results: [] };
  }

  async authors(params: any) {
    if (params.search) {
      return this.makeRequest(`search:authors:${params.search}`, 'authors', params);
    }
    return { results: [] };
  }

  async sources(_params: any) {
    return { results: [] };
  }

  async institutions(_params: any) {
    return { results: [] };
  }
}

// Mock Provider for testing
class MockGraphDataProvider extends GraphDataProvider {
  constructor(
    name: string,
    options: Partial<ProviderOptions> = {},
    private mockData: Map<string, GraphNode> = new Map(),
    private shouldFail: boolean = false
  ) {
    super({ name, ...options });
  }

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  addMockData(id: string, node: GraphNode) {
    this.mockData.set(id, node);
  }

  async fetchEntity(id: EntityIdentifier): Promise<GraphNode> {
    return this.trackRequest((async () => {
      if (this.shouldFail) {
        throw new Error(`Mock provider ${this.options.name} failure`);
      }

      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate network delay

      const node = this.mockData.get(id);
      if (!node) {
        throw new Error(`Entity ${id} not found in mock data`);
      }

      this.onEntityFetched(node);
      return node;
    })());
  }

  async searchEntities(query: SearchQuery): Promise<GraphNode[]> {
    return this.trackRequest((async () => {
      if (this.shouldFail) {
        throw new Error(`Mock provider ${this.options.name} search failure`);
      }

      await new Promise(resolve => setTimeout(resolve, 15)); // Simulate network delay

      // Return filtered mock data based on query
      const results: GraphNode[] = [];
      for (const [, node] of this.mockData.entries()) {
        if (
          query.entityTypes.includes(node.entityType) &&
          node.label.toLowerCase().includes(query.query.toLowerCase())
        ) {
          results.push(node);
        }
        if (results.length >= (query.limit || 20)) break;
      }

      return results;
    })());
  }

  async expandEntity(nodeId: string, options: ProviderExpansionOptions): Promise<GraphExpansion> {
    return this.trackRequest((async () => {
      if (this.shouldFail) {
        throw new Error(`Mock provider ${this.options.name} expansion failure`);
      }

      await new Promise(resolve => setTimeout(resolve, 20)); // Simulate network delay

      // Create mock expansion data
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];

      // Add some related nodes
      for (let i = 0; i < (options.limit || 3); i++) {
        const relatedNode: GraphNode = {
          id: `${nodeId}_related_${i}`,
          entityId: `${nodeId}_related_${i}`,
          entityType: 'works',
          label: `Related Node ${i}`,
          x: Math.random() * 800,
          y: Math.random() * 600,
          externalIds: [],
        };

        nodes.push(relatedNode);
        edges.push({
          id: `${nodeId}_to_${relatedNode.id}`,
          source: nodeId,
          target: relatedNode.id,
          type: RelationType.RELATED_TO,
        });
      }

      return {
        nodes,
        edges,
        metadata: {
          expandedFrom: nodeId,
          depth: 1,
          totalFound: nodes.length,
          options,
        },
      };
    })());
  }

  async isHealthy(): Promise<boolean> {
    if (this.shouldFail) return false;
    return true;
  }
}

describe('Provider System Integration Tests', () => {
  let registry: ProviderRegistry;
  let mockClient: MockOpenAlexClient;
  let openAlexProvider: OpenAlexGraphProvider;
  let mockProvider1: MockGraphDataProvider;
  let mockProvider2: MockGraphDataProvider;
  let entityResolver: EntityResolver;

  beforeEach(() => {
    // Clean setup for each test
    registry = new ProviderRegistry();
    mockClient = new MockOpenAlexClient();
    openAlexProvider = new OpenAlexGraphProvider(mockClient, { name: 'openalex' });

    // Create mock providers with test data
    mockProvider1 = new MockGraphDataProvider('mock1');
    mockProvider2 = new MockGraphDataProvider('mock2');

    // Add test data to mock providers
    mockProvider1.addMockData('M001', {
      id: 'M001',
      entityId: 'M001',
      entityType: 'works',
      label: 'Mock Work 1',
      x: 100,
      y: 100,
      externalIds: [],
    });

    mockProvider2.addMockData('M002', {
      id: 'M002',
      entityId: 'M002',
      entityType: 'authors',
      label: 'Mock Author 2',
      x: 200,
      y: 200,
      externalIds: [],
    });

    entityResolver = new EntityResolver();
  });

  afterEach(() => {
    // Cleanup
    registry.destroy();
    openAlexProvider.destroy();
    mockProvider1.destroy();
    mockProvider2.destroy();
    entityResolver.destroy();
  });

  describe('Provider Registry Management', () => {
    it('should register multiple providers successfully', () => {
      // Register all providers
      registry.register(openAlexProvider);
      registry.register(mockProvider1);
      registry.register(mockProvider2);

      const providers = registry.listProviders();
      expect(providers).toContain('openalex');
      expect(providers).toContain('mock1');
      expect(providers).toContain('mock2');
      expect(providers).toHaveLength(3);
    });

    it('should set first registered provider as default', () => {
      registry.register(mockProvider1);
      registry.register(mockProvider2);

      const defaultProvider = registry.get();
      expect(defaultProvider).toBe(mockProvider1);
    });

    it('should allow switching default provider', () => {
      registry.register(mockProvider1);
      registry.register(mockProvider2);

      registry.setDefault('mock2');
      const defaultProvider = registry.get();
      expect(defaultProvider).toBe(mockProvider2);
    });

    it('should handle provider unregistration correctly', () => {
      registry.register(mockProvider1);
      registry.register(mockProvider2);

      expect(registry.listProviders()).toHaveLength(2);

      registry.unregister('mock1');
      expect(registry.listProviders()).toHaveLength(1);
      expect(registry.listProviders()).toContain('mock2');
    });

    it('should update default when current default is unregistered', () => {
      registry.register(mockProvider1);
      registry.register(mockProvider2);

      // mock1 is default
      expect(registry.get()).toBe(mockProvider1);

      registry.unregister('mock1');
      expect(registry.get()).toBe(mockProvider2);
    });
  });

  describe('Provider Switching and Failover', () => {
    beforeEach(() => {
      registry.register(openAlexProvider);
      registry.register(mockProvider1);
      registry.register(mockProvider2);
      entityResolver.setProviderRegistry(registry);
    });

    it('should switch between providers seamlessly', async () => {
      // Start with OpenAlex provider (default)
      const openAlexNode = await entityResolver.resolveEntity('W2741809807');
      expect(openAlexNode.label).toBe('Test Work');

      // Switch to mock provider
      entityResolver.switchProvider('mock1');
      const mockNode = await entityResolver.resolveEntity('M001');
      expect(mockNode.label).toBe('Mock Work 1');
    });

    it('should maintain provider state after switching', async () => {
      // Make requests to build up stats
      await entityResolver.resolveEntity('W2741809807');
      await entityResolver.resolveEntity('A5017898742');

      const initialStats = entityResolver.getProviderStats();
      expect(initialStats?.stats.totalRequests).toBe(2);

      // Switch provider
      entityResolver.switchProvider('mock1');
      await entityResolver.resolveEntity('M001');

      // Original provider stats should be preserved
      entityResolver.switchProvider('openalex');
      const afterSwitchStats = entityResolver.getProviderStats();
      expect(afterSwitchStats?.stats.totalRequests).toBe(2); // Unchanged
    });

    it('should handle provider health monitoring', async () => {
      const healthStatus = await registry.healthCheck();

      expect(healthStatus.openalex).toBe(true);
      expect(healthStatus.mock1).toBe(true);
      expect(healthStatus.mock2).toBe(true);

      // Simulate failure
      mockProvider1.setShouldFail(true);
      const healthAfterFailure = await registry.healthCheck();

      expect(healthAfterFailure.openalex).toBe(true);
      expect(healthAfterFailure.mock1).toBe(false);
      expect(healthAfterFailure.mock2).toBe(true);
    });

    it('should implement automatic failover logic', async () => {
      entityResolver.switchProvider('mock1');

      // Normal operation
      const successNode = await entityResolver.resolveEntity('M001');
      expect(successNode).toBeTruthy();

      // Simulate provider failure
      mockProvider1.setShouldFail(true);

      await expect(entityResolver.resolveEntity('M001')).rejects.toThrow();

      // Manual failover to working provider
      entityResolver.switchProvider('mock2');
      const failoverNode = await entityResolver.resolveEntity('M002');
      expect(failoverNode.label).toBe('Mock Author 2');
    });
  });

  describe('Cross-Provider Data Consistency', () => {
    beforeEach(() => {
      registry.register(openAlexProvider);
      registry.register(mockProvider1);
      entityResolver.setProviderRegistry(registry);
    });

    it('should maintain consistent data format across providers', async () => {
      // Test OpenAlex provider
      const openAlexNode = await entityResolver.resolveEntity('W2741809807');
      expect(openAlexNode).toMatchObject({
        id: expect.any(String),
        entityId: expect.any(String),
        entityType: expect.any(String),
        label: expect.any(String),
        x: expect.any(Number),
        y: expect.any(Number),
        externalIds: expect.any(Array),
      });

      // Test mock provider
      entityResolver.switchProvider('mock1');
      const mockNode = await entityResolver.resolveEntity('M001');
      expect(mockNode).toMatchObject({
        id: expect.any(String),
        entityId: expect.any(String),
        entityType: expect.any(String),
        label: expect.any(String),
        x: expect.any(Number),
        y: expect.any(Number),
        externalIds: expect.any(Array),
      });

      // Same structure, different data
      expect(openAlexNode).not.toEqual(mockNode);
    });

    it('should handle external identifiers consistently', async () => {
      const node = await entityResolver.resolveEntity('W2741809807');

      expect(node.externalIds).toBeInstanceOf(Array);
      if (node.externalIds.length > 0) {
        const externalId = node.externalIds[0];
        expect(externalId).toMatchObject({
          type: expect.stringMatching(/^(doi|orcid|issn_l|ror|wikidata)$/),
          value: expect.any(String),
          url: expect.any(String),
        });
      }
    });

    it('should maintain relationship type consistency', async () => {
      const expansion = await entityResolver.expandEntity('W2741809807');

      expect(expansion.edges).toBeInstanceOf(Array);
      expansion.edges.forEach(edge => {
        expect(Object.values(RelationType)).toContain(edge.type);
        expect(edge).toMatchObject({
          id: expect.any(String),
          source: expect.any(String),
          target: expect.any(String),
          type: expect.any(String),
        });
      });
    });
  });

  describe('Event Propagation System', () => {
    let eventLog: Array<{ provider: string; event: string; data: any; timestamp: number }>;

    beforeEach(() => {
      eventLog = [];

      registry.register(openAlexProvider);
      registry.register(mockProvider1);

      // Set up event listeners
      [openAlexProvider, mockProvider1].forEach(provider => {
        const providerName = provider.getProviderInfo().name;

        provider.on('entityFetched', (data) => {
          eventLog.push({ provider: providerName, event: 'entityFetched', data, timestamp: Date.now() });
        });

        provider.on('requestSuccess', (data) => {
          eventLog.push({ provider: providerName, event: 'requestSuccess', data, timestamp: Date.now() });
        });

        provider.on('requestError', (data) => {
          eventLog.push({ provider: providerName, event: 'requestError', data, timestamp: Date.now() });
        });
      });

      entityResolver.setProviderRegistry(registry);
    });

    it('should propagate events from active provider', async () => {
      await entityResolver.resolveEntity('W2741809807');

      const entityEvents = eventLog.filter(e => e.event === 'entityFetched');
      const successEvents = eventLog.filter(e => e.event === 'requestSuccess');

      expect(entityEvents).toHaveLength(1);
      expect(successEvents).toHaveLength(1);
      expect(entityEvents[0].provider).toBe('openalex');
    });

    it('should switch event sources when switching providers', async () => {
      await entityResolver.resolveEntity('W2741809807');

      entityResolver.switchProvider('mock1');
      await entityResolver.resolveEntity('M001');

      const openAlexEvents = eventLog.filter(e => e.provider === 'openalex');
      const mockEvents = eventLog.filter(e => e.provider === 'mock1');

      expect(openAlexEvents.length).toBeGreaterThan(0);
      expect(mockEvents.length).toBeGreaterThan(0);
    });

    it('should track error events during failures', async () => {
      mockProvider1.setShouldFail(true);
      entityResolver.switchProvider('mock1');

      try {
        await entityResolver.resolveEntity('M001');
      } catch (_error) {
        // Expected failure
      }

      const errorEvents = eventLog.filter(e => e.event === 'requestError');
      expect(errorEvents).toHaveLength(1);
      expect(errorEvents[0].provider).toBe('mock1');
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('should clean up provider resources on unregister', () => {
      const provider = new MockGraphDataProvider('cleanup-test');
      const destroySpy = vi.spyOn(provider, 'destroy');

      registry.register(provider);
      expect(registry.listProviders()).toContain('cleanup-test');

      registry.unregister('cleanup-test');
      expect(destroySpy).toHaveBeenCalled();
      expect(registry.listProviders()).not.toContain('cleanup-test');
    });

    it('should handle registry destruction', () => {
      const provider1 = new MockGraphDataProvider('cleanup-1');
      const provider2 = new MockGraphDataProvider('cleanup-2');
      const destroy1Spy = vi.spyOn(provider1, 'destroy');
      const destroy2Spy = vi.spyOn(provider2, 'destroy');

      registry.register(provider1);
      registry.register(provider2);

      registry.destroy();

      expect(destroy1Spy).toHaveBeenCalled();
      expect(destroy2Spy).toHaveBeenCalled();
      expect(registry.listProviders()).toHaveLength(0);
    });

    it('should clean up entity resolver references', () => {
      registry.register(mockProvider1);
      entityResolver.setProviderRegistry(registry);
      entityResolver.setProvider(mockProvider1);

      expect(entityResolver.getAvailableProviders()).toHaveLength(1);

      entityResolver.destroy();

      // Should not throw after destruction
      expect(() => entityResolver.getAvailableProviders()).not.toThrow();
    });

    it('should remove event listeners on provider destruction', () => {
      const provider = new MockGraphDataProvider('event-test');
      let eventCalled = false;

      provider.on('entityFetched', () => {
        eventCalled = true;
      });

      provider.destroy();

      // Try to emit event after destruction
      provider.emit('entityFetched', {});

      expect(eventCalled).toBe(false);
    });
  });

  describe('Concurrent Requests and Load Testing', () => {
    beforeEach(() => {
      registry.register(openAlexProvider);
      registry.register(mockProvider1);
      entityResolver.setProviderRegistry(registry);
    });

    it('should handle concurrent requests from multiple providers', async () => {
      const startTime = Date.now();

      // Make concurrent requests to different providers
      const promises = [
        entityResolver.resolveEntity('W2741809807'), // OpenAlex
        ...Array.from({ length: 5 }, () => {
          entityResolver.switchProvider('mock1');
          return entityResolver.resolveEntity('M001');
        }),
      ];

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(6);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second

      // Check that all requests succeeded
      results.forEach(result => {
        expect(result).toBeTruthy();
        expect(result.id).toBeTruthy();
      });
    });

    it('should handle batch operations efficiently', async () => {
      const ids = ['W2741809807', 'A5017898742', 'S4210184550'];

      const startTime = Date.now();
      const results = await entityResolver.resolveEntities(ids);
      const endTime = Date.now();

      expect(results).toHaveLength(3);
      expect(endTime - startTime).toBeLessThan(500); // Should be fast for small batch

      // Verify each result
      expect(results[0].entityType).toBe('works');
      expect(results[1].entityType).toBe('authors');
      expect(results[2].entityType).toBe('sources');
    });

    it('should maintain performance under load', async () => {
      mockClient.setRequestDelay(10); // Add small delay to simulate network

      const operationCount = 20;
      const startTime = Date.now();

      // Mix of different operations
      const promises = Array.from({ length: operationCount }, (_, i) => {
        const operation = i % 3;
        switch (operation) {
          case 0:
            return entityResolver.resolveEntity('W2741809807');
          case 1:
            return entityResolver.searchEntities('test', ['works', 'authors']);
          case 2:
            return entityResolver.expandEntity('W2741809807', { limit: 2 });
          default:
            return entityResolver.resolveEntity('W2741809807');
        }
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(operationCount);
      expect(endTime - startTime).toBeLessThan(1000); // Should handle load efficiently

      // Verify provider stats were updated
      const stats = entityResolver.getProviderStats();
      expect(stats?.stats.totalRequests).toBeGreaterThanOrEqual(operationCount);
    });

    it('should handle mixed success/failure scenarios gracefully', async () => {
      // Start with working provider
      const successPromise = entityResolver.resolveEntity('W2741809807');

      // Switch to failing provider for some requests
      mockProvider1.setShouldFail(true);
      entityResolver.switchProvider('mock1');

      const failurePromises = [
        entityResolver.resolveEntity('M001').catch(e => ({ error: e.message })),
        entityResolver.resolveEntity('M002').catch(e => ({ error: e.message })),
      ];

      // Switch back to working provider
      entityResolver.switchProvider('openalex');
      const anotherSuccessPromise = entityResolver.resolveEntity('A5017898742');

      const results = await Promise.all([
        successPromise,
        ...failurePromises,
        anotherSuccessPromise,
      ]);

      // Check mixed results
      expect(results[0]).toHaveProperty('id'); // Success
      expect(results[1]).toHaveProperty('error'); // Failure
      expect(results[2]).toHaveProperty('error'); // Failure
      expect(results[3]).toHaveProperty('id'); // Success
    });
  });

  describe('Performance Assertions and Timing', () => {
    beforeEach(() => {
      registry.register(openAlexProvider);
      entityResolver.setProviderRegistry(registry);
    });

    it('should meet response time requirements', async () => {
      const startTime = Date.now();
      await entityResolver.resolveEntity('W2741809807');
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(100); // Should be fast with mock data
    });

    it('should track accurate performance metrics', async () => {
      // Make several requests with small delays to ensure measurable response times
      mockClient.setRequestDelay(1); // 1ms delay to ensure measurable time

      await entityResolver.resolveEntity('W2741809807');
      await entityResolver.resolveEntity('A5017898742');
      await entityResolver.searchEntities('test', ['works']);

      const stats = entityResolver.getProviderStats();
      expect(stats?.stats.totalRequests).toBe(3);
      expect(stats?.stats.successfulRequests).toBe(3);
      expect(stats?.stats.failedRequests).toBe(0);
      expect(stats?.stats.avgResponseTime).toBeGreaterThan(0);
      expect(stats?.stats.lastRequestTime).toBeGreaterThan(0);
    });

    it('should handle timeout scenarios', async () => {
      // Create a provider with very short timeout
      const quickTimeoutProvider = new OpenAlexGraphProvider(mockClient, {
        name: 'timeout-test',
        timeout: 1, // 1ms timeout
      });

      registry.register(quickTimeoutProvider);
      entityResolver.switchProvider('timeout-test');

      mockClient.setRequestDelay(100); // Longer than timeout

      const startTime = Date.now();
      try {
        await entityResolver.resolveEntity('W2741809807');
      } catch (error) {
        const elapsed = Date.now() - startTime;
        expect(elapsed).toBeLessThan(50); // Should fail quickly
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('Real-world Usage Patterns', () => {
    beforeEach(() => {
      registry.register(openAlexProvider);
      registry.register(mockProvider1);
      registry.register(mockProvider2);
      entityResolver.setProviderRegistry(registry);
    });

    it('should simulate typical research workflow', async () => {
      // 1. Search for papers on a topic
      const searchResults = await entityResolver.searchEntities('machine learning', ['works', 'authors']);
      expect(searchResults.length).toBeGreaterThan(0);

      // 2. Get detailed information about first result
      const firstWork = searchResults.find(r => r.entityType === 'works');
      if (firstWork) {
        const detailedWork = await entityResolver.resolveEntity(firstWork.id);
        expect(detailedWork.entityData).toBeTruthy();

        // 3. Expand to see related entities
        const expansion = await entityResolver.expandEntity(firstWork.id, {
          limit: 5,
          includeMetadata: true,
        });

        expect(expansion.nodes.length).toBeGreaterThan(0);
        expect(expansion.edges.length).toBeGreaterThan(0);
        expect(expansion.metadata?.totalFound).toBeGreaterThan(0);
      }
    });

    it('should handle provider discovery and selection workflow', async () => {
      // 1. Check available providers
      const availableProviders = entityResolver.getAvailableProviders();
      expect(availableProviders).toContain('openalex');
      expect(availableProviders).toContain('mock1');
      expect(availableProviders).toContain('mock2');

      // 2. Check health status
      const healthStatus = await registry.healthCheck();
      const healthyProviders = Object.entries(healthStatus)
        .filter(([_, healthy]) => healthy)
        .map(([name]) => name);

      expect(healthyProviders.length).toBeGreaterThan(0);

      // 3. Switch to best available provider (based on health)
      if (healthyProviders.includes('openalex')) {
        entityResolver.switchProvider('openalex');
      } else {
        entityResolver.switchProvider(healthyProviders[0]);
      }

      // 4. Verify functionality
      const testEntity = await entityResolver.resolveEntity('W2741809807');
      expect(testEntity).toBeTruthy();
    });

    it('should demonstrate multi-provider federation', async () => {
      // Get statistics from all providers
      const allStats = registry.getStats();
      const providerNames = Object.keys(allStats);

      expect(providerNames.length).toBe(3);
      expect(providerNames).toContain('openalex');
      expect(providerNames).toContain('mock1');
      expect(providerNames).toContain('mock2');

      // Make requests to different providers and aggregate results
      const aggregatedData = [];

      for (const providerName of providerNames) {
        try {
          entityResolver.switchProvider(providerName);

          if (providerName === 'openalex') {
            aggregatedData.push(await entityResolver.resolveEntity('W2741809807'));
          } else if (providerName === 'mock1') {
            aggregatedData.push(await entityResolver.resolveEntity('M001'));
          } else if (providerName === 'mock2') {
            aggregatedData.push(await entityResolver.resolveEntity('M002'));
          }
        } catch (_error) {
          // Note: This would use logger.warn in real implementation
          // logger.warn('provider', `Provider ${providerName} failed`, { error: _error });
        }
      }

      expect(aggregatedData.length).toBeGreaterThan(0);

      // Each provider should contribute unique data
      const uniqueIds = new Set(aggregatedData.map(d => d.id));
      expect(uniqueIds.size).toBe(aggregatedData.length);
    });

    it('should handle complete provider lifecycle', async () => {
      // 1. Initial setup verification
      expect(registry.listProviders()).toHaveLength(3);
      expect(await registry.healthCheck()).toMatchObject({
        openalex: true,
        mock1: true,
        mock2: true,
      });

      // 2. Normal operation period
      for (let i = 0; i < 10; i++) {
        const providerName = ['openalex', 'mock1', 'mock2'][i % 3];
        entityResolver.switchProvider(providerName);

        if (providerName === 'openalex') {
          await entityResolver.resolveEntity(['W2741809807', 'A5017898742'][i % 2]);
        } else {
          const id = providerName === 'mock1' ? 'M001' : 'M002';
          await entityResolver.resolveEntity(id);
        }
      }

      // 3. Provider maintenance (simulate removing a provider)
      const initialCount = registry.listProviders().length;
      registry.unregister('mock2');
      expect(registry.listProviders()).toHaveLength(initialCount - 1);

      // 4. Add new provider
      const newMockProvider = new MockGraphDataProvider('mock3');
      registry.register(newMockProvider);
      expect(registry.listProviders()).toHaveLength(initialCount);

      // 5. Final cleanup
      registry.destroy();
      expect(registry.listProviders()).toHaveLength(0);
    });
  });
});