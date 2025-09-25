# Graph Package Test Utilities

Comprehensive testing utilities for the `@academic-explorer/graph` package, providing everything needed for robust, isolated, and maintainable testing.

## Quick Start

```typescript
import { testPatterns, testUtils, assertions } from '@academic-explorer/graph/src/__tests__/utils';

// Quick test setup with automatic teardown
describe('My Graph Tests', () => {
  it('should test graph nodes', testPatterns.unit(async () => {
    const node = await testUtils.createNode('works', 'W2741809807');
    await assertions.isValidNode(node);
  }));

  it('should test providers', testPatterns.provider(async () => {
    const provider = await testUtils.createProvider('test-provider');
    const entity = await provider.fetchEntity('W2741809807');
    expect(entity).toBeDefined();
  }));
});
```

## Core Utilities

### 1. Vitest Setup (`vitest-setup.ts`)
- Global test configuration and cleanup
- Custom matchers for graph objects (`toBeValidGraphNode`, `toBeValidGraphEdge`, etc.)
- Memory tracking and cleanup
- Console output suppression

### 2. Test Environment (`test-environment.ts`)
- Environment initialization and cleanup
- Mock providers and registries
- Timer, fetch, and console mocking
- Memory usage tracking

### 3. Test Fixtures (`test-fixtures.ts`)
- Realistic test data generation
- Pre-built test scenarios (academic papers, collaborations, etc.)
- Entity-specific fixtures with proper OpenAlex formatting
- Deterministic test data with custom seeding

### 4. Provider Helpers (`provider-helpers.ts`)
- Mock provider implementations
- Provider registry management
- Relationship and entity management
- Error simulation and latency control

### 5. Event Helpers (`event-helpers.ts`)
- Event tracking and validation
- Event sequence testing
- Mock event emitters
- Event pattern matching

### 6. Async Helpers (`async-helpers.ts`)
- `waitFor` conditions with timeout
- Retry logic with exponential backoff
- Concurrent operation management
- Promise utilities (timeout, cancellation, debounce)

### 7. Assertion Helpers (`assertion-helpers.ts`)
- Graph-specific assertions
- Performance validation
- Deep equality with tolerance
- Complex object validation

### 8. Performance Helpers (`performance-helpers.ts`)
- Performance benchmarking
- Memory leak detection
- Health monitoring
- Performance regression testing

### 9. Isolation Helpers (`isolation-helpers.ts`)
- Test isolation and cleanup
- State management and snapshots
- Mock management
- Global variable isolation

### 10. Setup/Teardown (`setup-teardown.ts`)
- Pre-configured test scenarios
- Automatic resource management
- Common test patterns
- Scenario-based testing

## Test Patterns

### Unit Testing
```typescript
import { testPatterns, testUtils } from './utils';

describe('Node Utilities', () => {
  it('validates node structure', testPatterns.unit(async () => {
    const node = await testUtils.createNode('works');
    expect(node).toBeValidGraphNode();
  }));
});
```

### Integration Testing
```typescript
describe('Provider Integration', () => {
  it('fetches real data', testPatterns.integration(async () => {
    const scenario = await testUtils.setupAcademic({
      fixtures: { useRealData: true },
    });

    const entity = await scenario.providers.primary.fetchEntity('W2741809807');
    expect(entity).toBeDefined();

    await scenario.cleanup();
  }));
});
```

### Performance Testing
```typescript
describe('Performance Tests', () => {
  it('benchmarks large graphs', testPatterns.performance(async () => {
    const scenario = await testUtils.setupPerformance();

    const { summary } = await testUtils.benchmark(
      () => scenario.providers.primary.fetchEntity('W2741809807'),
      'fetch-entity',
      { iterations: 100 }
    );

    expect(summary.avgDuration).toBeLessThan(100); // 100ms
    await scenario.cleanup();
  }));
});
```

### Provider Testing
```typescript
describe('Custom Provider', () => {
  it('handles requests correctly', testPatterns.provider(async () => {
    const provider = await testUtils.createProvider('test-provider', {
      simulateLatency: 50,
      simulateErrors: false,
    });

    // Provider is automatically registered and tracked
    const result = await provider.fetchEntity('W2741809807');
    expect(result).toBeDefined();
  }));
});
```

## Advanced Usage

### Custom Isolation
```typescript
import { testIsolation, isolationPatterns } from './utils';

describe('Custom Isolation', () => {
  const isolation = testIsolation.createSuiteIsolation(
    isolationPatterns.performance()
  );

  beforeEach(isolation.beforeEach);
  afterEach(isolation.afterEach);

  it('maintains state between tests', () => {
    // Custom test logic
  });
});
```

### Event Sequence Testing
```typescript
import { testUtils } from './utils';

it('tracks event sequences', async () => {
  const eventHelper = await testUtils.getEventHelper();
  const provider = await testUtils.createProvider('test');

  eventHelper.track(provider, ['requestStart', 'entityFetched', 'requestSuccess']);

  await provider.fetchEntity('W2741809807');

  await eventHelper.waitForSequence([
    'requestStart',
    'entityFetched',
    'requestSuccess'
  ]);

  expect(eventHelper.getEventsByType('requestSuccess')).toHaveLength(1);
});
```

### Memory Leak Detection
```typescript
import { testUtils } from './utils';

it('detects memory leaks', async () => {
  const perfHelper = await testUtils.getPerformanceHelper();

  const { hasLeak, memoryGrowth } = await perfHelper.detectMemoryLeaks(
    () => createLargeGraph(),
    'large-graph-creation',
    { iterations: 10, memoryThreshold: 50 } // 50MB threshold
  );

  expect(hasLeak).toBe(false);
  expect(memoryGrowth).toBeLessThan(50);
});
```

### Performance Regression Testing
```typescript
import { testUtils } from './utils';

it('prevents performance regressions', async () => {
  const perfHelper = await testUtils.getPerformanceHelper();

  // Baseline from previous run
  const baseline = { duration: 100, memoryDelta: 1024 };

  const { hasRegression } = await perfHelper.performanceRegression(
    () => myExpensiveOperation(),
    'expensive-operation',
    baseline,
    { tolerancePercent: 20 } // Allow 20% regression
  );

  expect(hasRegression).toBe(false);
});
```

## Configuration

### Test Scenarios
```typescript
import { scenarioConfigs, testPatterns } from './utils';

// Use predefined configurations
const scenario = await testPatterns.academicPaper(
  scenarioConfigs.performance()
);

// Or create custom configuration
const customScenario = await testPatterns.academicPaper({
  isolation: { resetProviders: true, resetEvents: false },
  fixtures: { nodeCount: 50, useRealData: true },
  providers: { simulateLatency: 100, enablePerformanceTracking: true },
  events: { trackProviderEvents: true, trackGraphEvents: true },
  performance: { enableMemoryTracking: true, benchmarkOperations: true },
});
```

### Provider Configuration
```typescript
const provider = await testUtils.createProvider('custom-provider', {
  simulateLatency: 200,        // 200ms delay
  simulateErrors: true,        // Enable error simulation
  errorRate: 0.1,             // 10% error rate
  healthStatus: true,         // Start healthy
  maxConcurrentRequests: 5,   // Limit concurrent requests
  retryAttempts: 3,           // Retry failed requests
});
```

## Best Practices

1. **Use Isolation**: Always use test isolation to prevent state leakage
2. **Clean Up**: Use the provided cleanup functions or scenario teardown
3. **Memory Aware**: Enable memory tracking for performance-sensitive tests
4. **Event Driven**: Track events to verify behavior, not just outcomes
5. **Deterministic**: Use seeded fixtures for consistent test results
6. **Performance**: Set realistic performance expectations and thresholds
7. **Error Handling**: Test both success and failure scenarios
8. **Concurrent**: Be aware of concurrency issues and use serial execution when needed

## Troubleshooting

### Memory Issues
- Use `maxConcurrency: 1` in Vitest config
- Enable memory tracking to identify leaks
- Clean up resources properly in teardown

### Flaky Tests
- Use retry configuration (up to 2 retries recommended)
- Add proper wait conditions with `waitFor`
- Ensure proper isolation between tests

### Performance Issues
- Use fake timers for time-dependent tests
- Mock expensive operations
- Set appropriate timeouts

### Event Timing
- Use event helpers instead of manual event handling
- Wait for event sequences with proper timeouts
- Track events from the beginning of operations

## API Reference

See individual utility files for detailed API documentation:
- [vitest-setup.ts](./vitest-setup.ts) - Global setup and matchers
- [test-environment.ts](./test-environment.ts) - Environment management
- [test-fixtures.ts](./test-fixtures.ts) - Data fixtures
- [provider-helpers.ts](./provider-helpers.ts) - Provider testing
- [event-helpers.ts](./event-helpers.ts) - Event testing
- [async-helpers.ts](./async-helpers.ts) - Async utilities
- [assertion-helpers.ts](./assertion-helpers.ts) - Custom assertions
- [performance-helpers.ts](./performance-helpers.ts) - Performance testing
- [isolation-helpers.ts](./isolation-helpers.ts) - Test isolation
- [setup-teardown.ts](./setup-teardown.ts) - Test scenarios