/**
 * Setup and teardown functions for common test scenarios
 * Provides pre-configured test scenarios and reusable patterns
 */

import type { GraphNode, GraphEdge, GraphData } from '../../types/core';
import { TestGraphProvider, getProviderHelper, type ProviderTestHelper } from './provider-helpers';
import { getEventHelper, type EventTestHelper } from './event-helpers';
import { getPerformanceHelper, type PerformanceTestHelper } from './performance-helpers';
import { testIsolation, type TestIsolationConfig } from './isolation-helpers';
import { testScenarios, createNodeFixture, createEdgeFixture } from './test-fixtures';
import { ProviderRegistry } from '../../providers/base-provider';

/**
 * Test scenario configuration
 */
export interface TestScenarioConfig {
  isolation?: TestIsolationConfig;
  fixtures?: {
    nodeCount?: number;
    edgeCount?: number;
    entityTypes?: string[];
    useRealData?: boolean;
  };
  providers?: {
    enableMockProvider?: boolean;
    enablePerformanceTracking?: boolean;
    simulateLatency?: number;
    simulateErrors?: boolean;
  };
  events?: {
    trackProviderEvents?: boolean;
    trackGraphEvents?: boolean;
    trackUserEvents?: boolean;
  };
  performance?: {
    enableMemoryTracking?: boolean;
    enableHealthMonitoring?: boolean;
    benchmarkOperations?: boolean;
  };
}

/**
 * Test scenario result containing all setup resources
 */
export interface TestScenarioResult {
  data: GraphData;
  providers: {
    primary: TestGraphProvider;
    registry: ProviderRegistry;
    helper: ProviderTestHelper;
  };
  events: {
    helper: EventTestHelper;
  };
  performance: {
    helper: PerformanceTestHelper;
  };
  cleanup: () => Promise<void>;
}

/**
 * Academic paper scenario - simulates research paper exploration
 */
export async function setupAcademicPaperScenario(
  config: TestScenarioConfig = {}
): Promise<TestScenarioResult> {
  // Apply isolation
  if (config.isolation) {
    testIsolation.enterIsolation(config.isolation);
  }

  // Get helpers
  const providerHelper = getProviderHelper();
  const eventHelper = getEventHelper();
  const performanceHelper = getPerformanceHelper();

  // Create test data
  const graphData = config.fixtures?.useRealData
    ? await createRealAcademicData(config.fixtures)
    : testScenarios.academicPaper();

  // Setup providers
  const primaryProvider = providerHelper.createProviderWithEntities(
    'academic-provider',
    graphData.nodes,
    [{
      nodeId: graphData.nodes[0]?.id || 'default',
      edges: graphData.edges,
    }],
    {
      simulateLatency: config.providers?.simulateLatency || 0,
      simulateErrors: config.providers?.simulateErrors || false,
    }
  );

  // Create registry and register provider
  const registry = new ProviderRegistry();
  providerHelper.registerProvider(registry, primaryProvider);

  // Setup event tracking
  if (config.events?.trackProviderEvents) {
    eventHelper.track(primaryProvider, ['entityFetched', 'requestSuccess', 'requestError'], 'academic-provider');
  }

  // Setup performance monitoring
  if (config.performance?.enableHealthMonitoring) {
    performanceHelper.startHealthMonitoring(primaryProvider, 'academic-provider');
  }

  return {
    data: graphData,
    providers: {
      primary: primaryProvider,
      registry,
      helper: providerHelper,
    },
    events: {
      helper: eventHelper,
    },
    performance: {
      helper: performanceHelper,
    },
    cleanup: async () => {
      await teardownScenario(config);
    },
  };
}

/**
 * Collaboration network scenario - simulates author collaboration networks
 */
export async function setupCollaborationScenario(
  config: TestScenarioConfig = {}
): Promise<TestScenarioResult> {
  if (config.isolation) {
    testIsolation.enterIsolation(config.isolation);
  }

  const providerHelper = getProviderHelper();
  const eventHelper = getEventHelper();
  const performanceHelper = getPerformanceHelper();

  const graphData = testScenarios.collaboration();

  const primaryProvider = providerHelper.createProviderWithEntities(
    'collaboration-provider',
    graphData.nodes,
    [{
      nodeId: graphData.nodes[0]?.id || 'default',
      edges: graphData.edges,
    }],
    {
      simulateLatency: config.providers?.simulateLatency || 0,
      simulateErrors: config.providers?.simulateErrors || false,
    }
  );

  const registry = new ProviderRegistry();
  providerHelper.registerProvider(registry, primaryProvider);

  if (config.events?.trackProviderEvents) {
    eventHelper.track(primaryProvider, undefined, 'collaboration-provider');
  }

  if (config.performance?.enableHealthMonitoring) {
    performanceHelper.startHealthMonitoring(primaryProvider, 'collaboration-provider');
  }

  return {
    data: graphData,
    providers: {
      primary: primaryProvider,
      registry,
      helper: providerHelper,
    },
    events: {
      helper: eventHelper,
    },
    performance: {
      helper: performanceHelper,
    },
    cleanup: async () => {
      await teardownScenario(config);
    },
  };
}

/**
 * Large scale performance scenario - for stress testing
 */
export async function setupPerformanceScenario(
  config: TestScenarioConfig = {}
): Promise<TestScenarioResult> {
  if (config.isolation) {
    testIsolation.enterIsolation(config.isolation);
  }

  const providerHelper = getProviderHelper();
  const eventHelper = getEventHelper();
  const performanceHelper = getPerformanceHelper();

  // Create large dataset
  const graphData = testScenarios.largeSparse();

  const primaryProvider = providerHelper.createProviderWithEntities(
    'performance-provider',
    graphData.nodes,
    [{
      nodeId: graphData.nodes[0]?.id || 'default',
      edges: graphData.edges,
    }],
    {
      simulateLatency: config.providers?.simulateLatency || 0,
      simulateErrors: config.providers?.simulateErrors || false,
    }
  );

  const registry = new ProviderRegistry();
  providerHelper.registerProvider(registry, primaryProvider);

  if (config.events?.trackProviderEvents) {
    eventHelper.track(primaryProvider, ['requestStart', 'requestSuccess', 'requestError'], 'performance-provider');
  }

  if (config.performance?.enableHealthMonitoring) {
    performanceHelper.startHealthMonitoring(primaryProvider, 'performance-provider', {
      checkInterval: 1000, // More frequent checks for performance testing
    });
  }

  return {
    data: graphData,
    providers: {
      primary: primaryProvider,
      registry,
      helper: providerHelper,
    },
    events: {
      helper: eventHelper,
    },
    performance: {
      helper: performanceHelper,
    },
    cleanup: async () => {
      await teardownScenario(config);
    },
  };
}

/**
 * Error handling scenario - simulates various error conditions
 */
export async function setupErrorHandlingScenario(
  config: TestScenarioConfig = {}
): Promise<TestScenarioResult> {
  if (config.isolation) {
    testIsolation.enterIsolation(config.isolation);
  }

  const providerHelper = getProviderHelper();
  const eventHelper = getEventHelper();
  const performanceHelper = getPerformanceHelper();

  const graphData = testScenarios.single();

  const primaryProvider = providerHelper.createProviderWithEntities(
    'error-provider',
    graphData.nodes,
    [],
    {
      simulateLatency: 100,
      simulateErrors: true,
      errorRate: 0.3, // 30% error rate
      healthStatus: false, // Start unhealthy
    }
  );

  const registry = new ProviderRegistry();
  providerHelper.registerProvider(registry, primaryProvider);

  // Track all events for error analysis
  eventHelper.track(primaryProvider, undefined, 'error-provider');

  // Monitor health with error conditions
  performanceHelper.startHealthMonitoring(primaryProvider, 'error-provider', {
    checkInterval: 500,
    maxRetries: 5,
    expectedHealthy: false, // Expect unhealthy initially
  });

  return {
    data: graphData,
    providers: {
      primary: primaryProvider,
      registry,
      helper: providerHelper,
    },
    events: {
      helper: eventHelper,
    },
    performance: {
      helper: performanceHelper,
    },
    cleanup: async () => {
      await teardownScenario(config);
    },
  };
}

/**
 * Multi-provider scenario - tests provider registry with multiple providers
 */
export async function setupMultiProviderScenario(
  config: TestScenarioConfig = {}
): Promise<TestScenarioResult & { providers: TestScenarioResult['providers'] & { secondary: TestGraphProvider[] } }> {
  if (config.isolation) {
    testIsolation.enterIsolation(config.isolation);
  }

  const providerHelper = getProviderHelper();
  const eventHelper = getEventHelper();
  const performanceHelper = getPerformanceHelper();

  const graphData = testScenarios.academicPaper();

  // Create multiple providers with different specializations
  const primaryProvider = providerHelper.createProviderWithEntities(
    'primary-provider',
    graphData.nodes.filter(n => n.entityType === 'works'),
    [{
      nodeId: graphData.nodes.filter(n => n.entityType === 'works')[0]?.id || 'works-default',
      edges: graphData.edges.filter(e => e.type === 'references'),
    }],
    { simulateLatency: 50 }
  );

  const authorProvider = providerHelper.createProviderWithEntities(
    'author-provider',
    graphData.nodes.filter(n => n.entityType === 'authors'),
    [{
      nodeId: graphData.nodes.filter(n => n.entityType === 'authors')[0]?.id || 'authors-default',
      edges: graphData.edges.filter(e => e.type === 'authored'),
    }],
    { simulateLatency: 30 }
  );

  const institutionProvider = providerHelper.createProviderWithEntities(
    'institution-provider',
    graphData.nodes.filter(n => n.entityType === 'institutions'),
    [{
      nodeId: graphData.nodes.filter(n => n.entityType === 'institutions')[0]?.id || 'institutions-default',
      edges: graphData.edges.filter(e => e.type === 'affiliated'),
    }],
    { simulateLatency: 20 }
  );

  const registry = new ProviderRegistry();
  providerHelper.registerProvider(registry, primaryProvider);
  providerHelper.registerProvider(registry, authorProvider);
  providerHelper.registerProvider(registry, institutionProvider);

  // Track events from all providers
  if (config.events?.trackProviderEvents) {
    eventHelper.track(primaryProvider, undefined, 'primary-provider');
    eventHelper.track(authorProvider, undefined, 'author-provider');
    eventHelper.track(institutionProvider, undefined, 'institution-provider');
  }

  // Monitor health of all providers
  if (config.performance?.enableHealthMonitoring) {
    performanceHelper.startHealthMonitoring(primaryProvider, 'primary-provider');
    performanceHelper.startHealthMonitoring(authorProvider, 'author-provider');
    performanceHelper.startHealthMonitoring(institutionProvider, 'institution-provider');
  }

  return {
    data: graphData,
    providers: {
      primary: primaryProvider,
      secondary: [authorProvider, institutionProvider],
      registry,
      helper: providerHelper,
    },
    events: {
      helper: eventHelper,
    },
    performance: {
      helper: performanceHelper,
    },
    cleanup: async () => {
      await teardownScenario(config);
    },
  };
}

/**
 * Empty scenario - minimal setup for custom tests
 */
export async function setupEmptyScenario(
  config: TestScenarioConfig = {}
): Promise<TestScenarioResult> {
  if (config.isolation) {
    testIsolation.enterIsolation(config.isolation);
  }

  const providerHelper = getProviderHelper();
  const eventHelper = getEventHelper();
  const performanceHelper = getPerformanceHelper();

  const graphData = testScenarios.empty();

  const primaryProvider = providerHelper.createProvider('empty-provider');
  const registry = new ProviderRegistry();
  providerHelper.registerProvider(registry, primaryProvider);

  return {
    data: graphData,
    providers: {
      primary: primaryProvider,
      registry,
      helper: providerHelper,
    },
    events: {
      helper: eventHelper,
    },
    performance: {
      helper: performanceHelper,
    },
    cleanup: async () => {
      await teardownScenario(config);
    },
  };
}

/**
 * Teardown function for all scenarios
 */
export async function teardownScenario(config: TestScenarioConfig = {}): Promise<void> {
  try {
    // Stop performance monitoring
    getPerformanceHelper().cleanup();

    // Clear event tracking
    getEventHelper().cleanup();

    // Clean up providers
    getProviderHelper().cleanup();

    // Exit isolation if it was entered
    if (config.isolation) {
      await testIsolation.exitIsolation();
    }
  } catch (error) {
    console.error('Error during test scenario teardown:', error);
  }
}

/**
 * Create real academic data (simulated - would connect to real APIs in full implementation)
 */
async function createRealAcademicData(config: TestScenarioConfig['fixtures'] = {}): Promise<GraphData> {
  // For now, return enhanced fixtures that simulate real data
  const { nodeCount = 15, entityTypes = ['works', 'authors', 'institutions'] } = config;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // Create realistic academic entities
  for (let i = 0; i < nodeCount; i++) {
    const entityType = entityTypes[i % entityTypes.length] as any;
    const node = createNodeFixture(entityType, undefined, {
      includeExternalIds: true,
      includeEntityData: true,
      includeMetadata: true,
    });

    // Add realistic data based on entity type
    if (entityType === 'works' && node.entityData) {
      node.entityData = {
        ...node.entityData,
        title: `Machine Learning Applications in ${['Biology', 'Chemistry', 'Physics', 'Medicine'][i % 4]}`,
        publication_year: 2020 + (i % 4),
        cited_by_count: Math.floor(Math.random() * 1000),
        open_access: { is_oa: i % 2 === 0 },
      };
    } else if (entityType === 'authors' && node.entityData) {
      node.entityData = {
        ...node.entityData,
        display_name: `Dr. ${['Alice', 'Bob', 'Carol', 'David', 'Eve'][i % 5]} ${['Smith', 'Jones', 'Brown', 'Davis'][i % 4]}`,
        works_count: Math.floor(Math.random() * 100) + 10,
        cited_by_count: Math.floor(Math.random() * 10000),
      };
    }

    nodes.push(node);
  }

  // Create realistic relationships
  for (let i = 0; i < nodes.length - 1; i++) {
    const source = nodes[i];
    const target = nodes[i + 1];

    const relationType = source.entityType === 'authors' && target.entityType === 'works'
      ? 'authored'
      : source.entityType === 'works' && target.entityType === 'works'
      ? 'references'
      : 'related_to';

    const edge = createEdgeFixture(source.id, target.id, relationType as any, {
      weight: Math.random() * 2 + 0.5,
      metadata: { confidence: Math.random() * 0.5 + 0.5 },
    });

    edges.push(edge);
  }

  return { nodes, edges };
}

/**
 * Predefined scenario configurations
 */
export const scenarioConfigs = {
  standard: (): TestScenarioConfig => ({
    isolation: { resetProviders: true, resetEvents: true, resetMocks: true },
    providers: { enableMockProvider: true, enablePerformanceTracking: true },
    events: { trackProviderEvents: true },
    performance: { enableMemoryTracking: true },
  }),

  performance: (): TestScenarioConfig => ({
    isolation: { resetProviders: true, resetPerformance: false },
    fixtures: { nodeCount: 100, edgeCount: 300 },
    providers: { enablePerformanceTracking: true, simulateLatency: 10 },
    performance: { enableMemoryTracking: true, enableHealthMonitoring: true, benchmarkOperations: true },
  }),

  errorHandling: (): TestScenarioConfig => ({
    isolation: { resetProviders: true, resetEvents: true, resetMocks: true },
    providers: { simulateErrors: true, simulateLatency: 50 },
    events: { trackProviderEvents: true },
    performance: { enableHealthMonitoring: true },
  }),

  minimal: (): TestScenarioConfig => ({
    isolation: { resetMocks: true },
    providers: { enableMockProvider: true },
  }),

  integration: (): TestScenarioConfig => ({
    isolation: { resetProviders: false, resetEvents: false },
    fixtures: { useRealData: true },
    providers: { enablePerformanceTracking: false },
  }),
};

/**
 * Convenience functions for common test patterns
 */
export const testPatterns = {
  academicPaper: (config?: TestScenarioConfig) => setupAcademicPaperScenario({ ...scenarioConfigs.standard(), ...config }),
  collaboration: (config?: TestScenarioConfig) => setupCollaborationScenario({ ...scenarioConfigs.standard(), ...config }),
  performance: (config?: TestScenarioConfig) => setupPerformanceScenario({ ...scenarioConfigs.performance(), ...config }),
  errorHandling: (config?: TestScenarioConfig) => setupErrorHandlingScenario({ ...scenarioConfigs.errorHandling(), ...config }),
  multiProvider: (config?: TestScenarioConfig) => setupMultiProviderScenario({ ...scenarioConfigs.standard(), ...config }),
  minimal: (config?: TestScenarioConfig) => setupEmptyScenario({ ...scenarioConfigs.minimal(), ...config }),
};