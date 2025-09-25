/**
 * Example test file demonstrating the test utilities
 * This shows how to use the various test helpers and patterns
 */

import { describe, it, expect } from 'vitest';
import {
  testPatterns,
  testUtils,
  assertions,
  expectValidGraphNode,
  expectValidGraphEdge,
  expectValidGraphData,
  createNodeFixture,
  createEdgeFixture,
  testScenarios,
  setupAcademicPaperScenario,
  type TestScenarioResult,
} from './utils';

describe('Test Utilities Examples', () => {
  describe('Basic Fixture Usage', () => {
    it('creates valid graph nodes', async () => {
      const node = createNodeFixture('works', 'W2741809807', {
        includeExternalIds: true,
        includeEntityData: true,
      });

      expectValidGraphNode(node);
      expect(node.id).toBe('W2741809807');
      expect(node.entityType).toBe('works');
      expect(node.externalIds).toHaveLength(1);
    });

    it('creates valid graph edges', async () => {
      const edge = createEdgeFixture('W2741809807', 'A5017898742', 'authored', {
        weight: 1.5,
        metadata: { confidence: 0.9 },
      });

      expectValidGraphEdge(edge);
      expect(edge.source).toBe('W2741809807');
      expect(edge.target).toBe('A5017898742');
      expect(edge.weight).toBe(1.5);
    });

    it('validates complete graph data', async () => {
      const graphData = testScenarios.academicPaper();

      expectValidGraphData(graphData);
      expect(graphData.nodes.length).toBeGreaterThan(0);
      expect(graphData.edges.length).toBeGreaterThan(0);

      // Verify all nodes are valid
      for (const node of graphData.nodes) {
        expectValidGraphNode(node);
      }

      // Verify all edges are valid
      for (const edge of graphData.edges) {
        expectValidGraphEdge(edge);
      }
    });
  });

  describe('Test Pattern Usage', () => {
    it('uses unit test pattern', testPatterns.unit(async () => {
      // This test runs with full isolation
      const node = createNodeFixture('authors');
      expectValidGraphNode(node);
      expect(node.entityType).toBe('authors');
    }));

    it('uses provider test pattern', testPatterns.provider(async () => {
      // This test has provider and event tracking set up automatically
      const provider = await testUtils.createProvider('test-provider');
      const helper = await testUtils.getProviderHelper();

      expect(provider).toBeDefined();
      expect(helper.getStatistics()).toBeDefined();
    }));

    it('uses graph test pattern', testPatterns.graph(async (graphData) => {
      // This test is provided with pre-configured graph data
      expect(graphData.nodes).toBeDefined();
      expect(graphData.edges).toBeDefined();
      expect(graphData.nodes.length).toBeGreaterThan(0);
    }));
  });

  describe('Scenario Usage', () => {
    let scenario: TestScenarioResult;

    beforeEach(async () => {
      scenario = await setupAcademicPaperScenario({
        fixtures: { nodeCount: 10 },
        providers: { simulateLatency: 10 },
        events: { trackProviderEvents: true },
      });
    });

    afterEach(async () => {
      await scenario.cleanup();
    });

    it('provides complete test environment', async () => {
      // Data is available - should have at least the requested number of nodes
      expect(scenario.data.nodes.length).toBeGreaterThanOrEqual(10);
      expect(scenario.data.edges).toBeDefined();

      // Providers are set up
      expect(scenario.providers.primary).toBeDefined();
      expect(scenario.providers.registry).toBeDefined();

      // Helpers are available
      expect(scenario.events.helper).toBeDefined();
      expect(scenario.performance.helper).toBeDefined();
    });

    it('tracks provider events', async () => {
      const { primary } = scenario.providers;
      const { helper: eventHelper } = scenario.events;

      // Perform an operation that generates events
      const testNode = scenario.data.nodes[0];
      primary.setEntity(testNode.id, testNode);

      await primary.fetchEntity(testNode.id);

      // Verify events were tracked
      const events = eventHelper.getEventsByType('entityFetched');
      expect(events.length).toBeGreaterThan(0);
    });

    it('measures performance', async () => {
      const { helper: perfHelper } = scenario.performance;
      const { primary } = scenario.providers;

      const testNode = scenario.data.nodes[0];
      primary.setEntity(testNode.id, testNode);

      // Measure an operation
      const { metrics } = await perfHelper.measurePerformance(
        () => primary.fetchEntity(testNode.id),
        'fetch-entity-test'
      );

      expect(metrics.duration).toBeGreaterThan(0);
      expect(metrics.operation).toBe('fetch-entity-test');
    });
  });

  describe('Async Utilities', () => {
    it('waits for conditions', async () => {
      let counter = 0;
      const incrementer = setInterval(() => counter++, 10);

      try {
        // Wait for counter to reach 5
        const result = await testUtils.waitFor(
          () => counter >= 5 ? counter : false,
          { timeout: 1000, interval: 20 }
        );

        expect(result).toBeGreaterThanOrEqual(5);
      } finally {
        clearInterval(incrementer);
      }
    });

    it('retries operations', async () => {
      let attempts = 0;

      const result = await testUtils.retry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Not yet');
          }
          return 'success';
        },
        { attempts: 5, baseDelay: 10 }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });
  });

  describe('Assertion Utilities', () => {
    it('validates with custom assertions', async () => {
      const nodes = [
        createNodeFixture('works'),
        createNodeFixture('authors'),
      ];

      // Test array contains subset
      await assertions.isValidNode(nodes[0]);
      await assertions.isValidNode(nodes[1]);

      // All nodes should be valid
      for (const node of nodes) {
        expectValidGraphNode(node);
      }
    });

    it('checks for no error events', async () => {
      const eventHelper = await testUtils.getEventHelper();

      // Simulate some normal events
      eventHelper.createEventSpy('normalEvent', 'test-source');

      // This should not throw
      await assertions.noErrors();
    });
  });
});