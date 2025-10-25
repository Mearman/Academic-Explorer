/**
 * Test utilities index - provides convenient access to all testing helpers
 * Central export point for all graph package testing utilities
 */

import type { EntityType, RelationType } from '../../types/core';

// Core setup and configuration
export { testUtils as vitestTestUtils, testEnvironment } from './vitest-setup';
export {
  setupTestEnvironment,
  cleanupTestEnvironment,
  MockProvider,
  createMockProviderRegistry,
  testPresets
} from './test-environment';

// Data and fixtures
export {
  createNodeFixture,
  createEdgeFixture,
  createGraphFixture,
  testScenarios,
  entityFixtures,
  resetFixtureCounter,
  createOpenAlexFixture
} from './test-fixtures';

// Provider testing
export {
  TestGraphProvider,
  ProviderTestHelper,
  getProviderHelper,
  resetProviderHelper
} from './provider-helpers';

// Event testing
export {
  EventTestHelper,
  getEventHelper,
  resetEventHelper,
  eventPatterns,
  createEventAssertions,
  EventTimingMock
} from './event-helpers';

// Async utilities
export {
  waitFor,
  waitForAll,
  waitForEvent,
  sleep,
  retry,
  concurrent,
  withTimeout,
  debounceAsync,
  throttleAsync,
  makeCancelable,
  waitForStable,
  AsyncTestHelper,
  asyncUtils
} from './async-helpers';

// Assertion helpers
export {
  expectDeepEqualWithTolerance,
  expectValidGraphNode,
  expectValidGraphEdge,
  expectValidGraphData,
  expectValidGraphExpansion,
  expectPositionInBounds,
  expectNodesHaveMoved,
  expectGraphConnectivity,
  expectEntityTypeDistribution,
  expectValidExternalIds,
  expectPerformanceMetrics,
  expectArrayContainsSubset,
  expectDeterministicResults,
  assertions as assertionHelpers
} from './assertion-helpers';

// Performance and health monitoring
export {
  PerformanceTestHelper,
  getPerformanceHelper,
  resetPerformanceHelper
} from './performance-helpers';

// Test isolation and cleanup
export {
  TestIsolationHelper,
  testIsolation,
  useTestIsolation,
  isolated,
  createCleanupScope,
  isolationPatterns
} from './isolation-helpers';

// Setup and teardown scenarios
export {
  setupAcademicPaperScenario,
  setupCollaborationScenario,
  setupPerformanceScenario,
  setupErrorHandlingScenario,
  setupMultiProviderScenario,
  setupEmptyScenario,
  teardownScenario,
  scenarioConfigs,
  testPatterns as setupTestPatterns
} from './setup-teardown';

// Convenience re-exports for common patterns
export { expect } from 'vitest';

/**
 * Quick access to commonly used utilities
 */
export const testUtils = {
  // Environment
  setupEnv: () => import('./test-environment').then(m => m.setupTestEnvironment()),
  cleanupEnv: () => import('./test-environment').then(m => { m.cleanupTestEnvironment(); }),

  // Fixtures
  createNode: (entityType: string, id?: string, options?: Record<string, unknown>) =>
    import('./test-fixtures').then(m => m.createNodeFixture(entityType as EntityType, id, options)),
  createEdge: (source: string, target: string, type: string, options?: Record<string, unknown>) =>
    import('./test-fixtures').then(m => m.createEdgeFixture(source, target, type as RelationType, options)),
  scenarios: () => import('./test-fixtures').then(m => m.testScenarios),

  // Providers
  createProvider: (name: string, config?: Record<string, unknown>) =>
    import('./provider-helpers').then(m => m.getProviderHelper().createProvider(name, config)),
  getProviderHelper: () => import('./provider-helpers').then(m => m.getProviderHelper()),

  // Events
  trackEvents: (emitter: any, events?: string[], label?: string) =>
    import('./event-helpers').then(m => { m.getEventHelper().track(emitter, events, label); }),
  getEventHelper: () => import('./event-helpers').then(m => m.getEventHelper()),

  // Performance
  measure: (operation: () => unknown, name: string) =>
    import('./performance-helpers').then(m => m.getPerformanceHelper().measurePerformance(operation, name)),
  benchmark: (operation: () => unknown, name: string, options?: Record<string, unknown>) =>
    import('./performance-helpers').then(m => m.getPerformanceHelper().benchmark(operation, name, options)),
  getPerformanceHelper: () => import('./performance-helpers').then(m => m.getPerformanceHelper()),

  // Async utilities
  waitFor: (condition: () => unknown, options?: Record<string, unknown>) =>
    import('./async-helpers').then(m => m.waitFor(condition, options)),
  retry: (operation: () => Promise<unknown>, options?: Record<string, unknown>) =>
    import('./async-helpers').then(m => m.retry(operation, options)),

  // Isolation
  isolate: (testFn: () => unknown, config?: Record<string, unknown>) =>
    import('./isolation-helpers').then(m => m.testIsolation.withIsolation(testFn, config)),
  createCleanup: () => import('./isolation-helpers').then(m => m.createCleanupScope()),

  // Scenarios
  setupAcademic: (config?: Record<string, unknown>) =>
    import('./setup-teardown').then(m => m.setupAcademicPaperScenario(config)),
  setupPerformance: (config?: Record<string, unknown>) =>
    import('./setup-teardown').then(m => m.setupPerformanceScenario(config)),
  teardown: (config?: Record<string, unknown>) =>
    import('./setup-teardown').then(m => m.teardownScenario(config)),
};

/**
 * Test pattern shortcuts for common testing scenarios
 */
export const testPatterns = {
  // Basic unit test with standard isolation
  unit: (testFn: () => void | Promise<void>) => {
    return () => import('./isolation-helpers').then(async m => {
      await m.testIsolation.withIsolation(testFn, {
        resetProviders: true,
        resetEvents: true,
        resetMocks: true,
      });
    });
  },

  // Integration test with minimal isolation
  integration: (testFn: () => void | Promise<void>) => {
    return () => import('./isolation-helpers').then(async m => {
      await m.testIsolation.withIsolation(testFn, {
        resetProviders: false,
        resetEvents: false,
        resetMocks: false,
      });
    });
  },

  // Performance test with memory tracking
  performance: (testFn: () => void | Promise<void>) => {
    return () => import('./isolation-helpers').then(async m => {
      await m.testIsolation.withIsolation(testFn, {
        resetProviders: true,
        resetPerformance: false,
        resetMocks: true,
      });
    });
  },

  // Provider test with event tracking
  provider: (testFn: () => void | Promise<void>) => {
    return () => import('./setup-teardown').then(async m => {
      const scenario = await m.setupEmptyScenario({
        isolation: { resetProviders: true, resetEvents: true, resetMocks: true },
        events: { trackProviderEvents: true },
        performance: { enableHealthMonitoring: true },
      });

      try {
        await testFn();
      } finally {
        await scenario.cleanup();
      }
    });
  },

  // Graph data test with fixtures
  graph: (testFn: (data: Record<string, unknown>) => void | Promise<void>) => {
    return () => import('./setup-teardown').then(async m => {
      const scenario = await m.setupAcademicPaperScenario();

      try {
        await testFn(scenario.data as any);
      } finally {
        await scenario.cleanup();
      }
    });
  },
};

/**
 * Common assertion shortcuts
 */
export const assertions = {
  isValidNode: (node: any) => import('./assertion-helpers').then(m => m.expectValidGraphNode(node)),
  isValidEdge: (edge: any) => import('./assertion-helpers').then(m => m.expectValidGraphEdge(edge)),
  isValidGraph: (data: any) => import('./assertion-helpers').then(m => m.expectValidGraphData(data)),
  hasPosition: (node: any) => import('./assertion-helpers').then(m => { m.expectPositionInBounds(node, { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity }); }),
  hasMoved: (before: any[], after: any[]) => import('./assertion-helpers').then(m => { m.expectNodesHaveMoved(before, after); }),
  noErrors: () => import('./event-helpers').then(m => {
    const events = m.getEventHelper().getEvents().filter(e => e.type.includes('error'));
    if (events.length > 0) {
      throw new Error(`Unexpected error events: ${events.map(e => e.type).join(', ')}`);
    }
  }),
};

/**
 * Development utilities for debugging tests
 */
export const devUtils = {
  logState: () => {
    console.log('Test State:', {
      providers: import('./provider-helpers').then(m => m.getProviderHelper().getStatistics()),
      events: import('./event-helpers').then(m => m.getEventHelper().getStatistics()),
      performance: import('./performance-helpers').then(m => m.getPerformanceHelper().generateReport()),
    });
  },

  dumpEvents: () => {
    import('./event-helpers').then(m => {
      const events = m.getEventHelper().getEvents();
      console.table(events.map(e => ({
        type: e.type,
        source: e.source,
        timestamp: new Date(e.timestamp).toISOString(),
        data: typeof e.data === 'object' ? JSON.stringify(e.data).slice(0, 50) + '...' : e.data,
      })));
    });
  },

  dumpPerformance: () => {
    import('./performance-helpers').then(m => {
      const report = m.getPerformanceHelper().generateReport();
      console.table(report.operations);
      console.log('Summary:', report.summary);
    });
  },

  memorySnapshot: (label: string) => {
    import('./vitest-setup').then(m => { m.takeMemorySnapshot(label); });
  },
};

/**
 * Type exports for external usage
 */
export type {
  TestEnvironmentConfig,
  TestEnvironmentState
} from './test-environment';

export type {
  TestProviderConfig
} from './provider-helpers';

export type {
  EventTrackingState
} from './event-helpers';

export type {
  PerformanceMetrics,
  BenchmarkOptions,
  HealthMonitorConfig
} from './performance-helpers';

export type {
  TestIsolationConfig
} from './isolation-helpers';

export type {
  TestScenarioConfig,
  TestScenarioResult
} from './setup-teardown';

export type {
  FixtureOptions
} from './test-fixtures';

/**
 * Default export with most commonly used utilities
 */
export default {
  utils: testUtils,
  patterns: testPatterns,
  assertions,
  devUtils,
};