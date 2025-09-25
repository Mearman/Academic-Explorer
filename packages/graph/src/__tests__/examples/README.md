# Graph Provider System Examples

This directory contains example tests that demonstrate proper usage patterns for the Academic Explorer graph provider system. These tests serve as both documentation and verification of intended usage patterns.

## Purpose

These examples demonstrate:

- **Basic provider usage patterns** and best practices
- **Entity resolution workflows** with real-world academic scenarios
- **Provider switching** and configuration examples
- **Error handling and recovery** patterns
- **Performance optimization** techniques
- **Event system usage** and listener patterns
- **Integration patterns** for CLI, SDK, and web applications
- **Common use cases** for different consumer types
- **Testing patterns** for consumers of the provider system
- **Advanced provider customization** examples

## Directory Structure

```
examples/
├── README.md                           # This file
├── 01-basic-usage/                     # Basic provider operations
│   ├── basic-provider-usage.test.ts    # Basic CRUD operations
│   ├── provider-registry.test.ts       # Registry management
│   └── entity-detection.test.ts        # Entity type detection
├── 02-entity-resolution/               # Entity resolution workflows
│   ├── author-workflow.test.ts         # Author-centered workflows
│   ├── work-workflow.test.ts           # Publication-centered workflows
│   ├── institution-workflow.test.ts    # Institution-centered workflows
│   └── cross-entity-workflows.test.ts  # Complex cross-entity scenarios
├── 03-provider-configuration/          # Provider configuration
│   ├── provider-switching.test.ts      # Runtime provider switching
│   ├── custom-configuration.test.ts    # Custom provider configs
│   └── multi-provider.test.ts          # Multiple provider usage
├── 04-error-handling/                  # Error handling patterns
│   ├── network-errors.test.ts          # Network failure scenarios
│   ├── rate-limiting.test.ts           # Rate limit handling
│   ├── data-validation.test.ts         # Invalid data handling
│   └── recovery-patterns.test.ts       # Error recovery strategies
├── 05-performance/                     # Performance optimization
│   ├── batch-operations.test.ts        # Batch entity fetching
│   ├── caching-patterns.test.ts        # Caching strategies
│   ├── pagination.test.ts              # Large dataset handling
│   └── lazy-loading.test.ts            # Lazy loading patterns
├── 06-event-system/                    # Event system usage
│   ├── event-listeners.test.ts         # Basic event handling
│   ├── custom-events.test.ts           # Custom event patterns
│   └── event-propagation.test.ts       # Event bubbling and capture
├── 07-integration/                     # Integration patterns
│   ├── cli-integration.test.ts         # CLI tool integration
│   ├── sdk-integration.test.ts         # SDK consumer patterns
│   ├── web-app-integration.test.ts     # Web application integration
│   └── react-hooks.test.ts             # React hook patterns
├── 08-common-use-cases/                # Common usage scenarios
│   ├── literature-review.test.ts       # Literature review workflow
│   ├── collaboration-mapping.test.ts   # Research collaboration mapping
│   ├── citation-analysis.test.ts       # Citation network analysis
│   └── topic-exploration.test.ts       # Research topic exploration
├── 09-testing-patterns/                # Testing best practices
│   ├── mock-providers.test.ts          # Provider mocking strategies
│   ├── test-data-generation.test.ts    # Test data creation
│   ├── async-testing.test.ts           # Async operation testing
│   └── integration-testing.test.ts     # End-to-end testing
└── 10-advanced-customization/          # Advanced usage
    ├── custom-provider.test.ts         # Custom provider implementation
    ├── provider-extensions.test.ts     # Extending existing providers
    ├── data-transformation.test.ts     # Custom data transformers
    └── plugin-architecture.test.ts     # Plugin system examples
```

## Running the Examples

### Prerequisites

Ensure you have the development dependencies installed:

```bash
cd /Users/joe/Documents/Research/PhD/Academic Explorer
pnpm install
```

### Running All Examples

```bash
# Run all example tests
pnpm --filter @academic-explorer/graph test examples

# Run with verbose output
pnpm --filter @academic-explorer/graph test examples --reporter=verbose

# Run in watch mode for development
pnpm --filter @academic-explorer/graph test examples --watch
```

### Running Specific Example Categories

```bash
# Basic usage examples
pnpm --filter @academic-explorer/graph test examples/01-basic-usage

# Entity resolution workflows
pnpm --filter @academic-explorer/graph test examples/02-entity-resolution

# Performance examples
pnpm --filter @academic-explorer/graph test examples/05-performance

# Integration examples
pnpm --filter @academic-explorer/graph test examples/07-integration
```

### Running Individual Examples

```bash
# Specific test file
pnpm --filter @academic-explorer/graph test examples/01-basic-usage/basic-provider-usage.test.ts

# Specific test pattern
pnpm --filter @academic-explorer/graph test --testNamePattern="OpenAlex provider"
```

## Example Test Structure

Each example test follows this structure:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OpenAlexGraphProvider, ProviderRegistry } from '../../providers';
import { MockOpenAlexClient } from '../fixtures/mock-client';

describe('Example: Basic Provider Usage', () => {
  let provider: OpenAlexGraphProvider;
  let registry: ProviderRegistry;

  beforeEach(async () => {
    // Setup example with realistic test data
    const mockClient = new MockOpenAlexClient();
    provider = new OpenAlexGraphProvider(mockClient);
    registry = new ProviderRegistry();
  });

  afterEach(() => {
    // Cleanup
    provider.destroy();
    registry.destroy();
  });

  it('demonstrates basic entity fetching', async () => {
    // Example implementation with detailed comments
    // explaining best practices and common patterns
  });

  it('shows error handling patterns', async () => {
    // Error scenarios with recovery strategies
  });
});
```

## Key Testing Principles

### 1. Real-World Scenarios
Examples use realistic academic data and common research workflows:
- Actual author names and research topics
- Realistic publication patterns
- Common institutional relationships

### 2. Best Practice Demonstrations
Each example shows:
- Proper error handling
- Resource cleanup
- Performance considerations
- Type safety patterns

### 3. Progressive Complexity
Examples build from simple to complex:
- Basic operations → Advanced workflows
- Single entities → Multi-entity scenarios
- Synchronous → Asynchronous patterns

### 4. Production-Ready Code
Examples demonstrate production-ready patterns:
- Proper async/await usage
- Memory leak prevention
- Error boundary patterns
- Performance monitoring

## Mock Data and Fixtures

Test fixtures are located in `../fixtures/` and provide:

- **MockOpenAlexClient**: Simulated OpenAlex API responses
- **TestData**: Realistic academic entity data
- **NetworkSimulator**: Network condition simulation
- **PerformanceProfiler**: Performance measurement utilities

## Documentation Links

- [Provider System Architecture](../../providers/README.md)
- [Type Definitions](../../types/README.md)
- [Performance Guidelines](../../docs/performance.md)
- [Integration Guide](../../docs/integration.md)

## Contributing Examples

When adding new examples:

1. **Choose the appropriate category** (01-10 directories)
2. **Follow the naming convention**: `descriptive-name.test.ts`
3. **Include detailed comments** explaining the pattern
4. **Use realistic test data** from the fixtures
5. **Test both success and failure cases**
6. **Document expected behavior** in test descriptions
7. **Update this README** if adding new categories

### Example Template

```typescript
/**
 * Example: [Brief Description]
 *
 * Demonstrates: [What patterns this shows]
 * Use cases: [When to use these patterns]
 * Prerequisites: [What knowledge is assumed]
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Example: [Pattern Name]', () => {
  // Setup and teardown

  it('demonstrates [specific behavior]', async () => {
    // Given: Clear test setup

    // When: Action being demonstrated

    // Then: Expected behavior verification

    // Comments: Why this pattern is useful
  });
});
```

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeout in vitest config for network-heavy tests
2. **Memory issues**: Ensure proper cleanup in `afterEach` hooks
3. **Mock data issues**: Check fixture data matches expected schema
4. **Type errors**: Verify TypeScript strict mode compliance

### Debug Mode

Run tests with debug output:

```bash
# Enable debug logging
DEBUG=academic-explorer:* pnpm --filter @academic-explorer/graph test examples

# Run single test with full output
pnpm --filter @academic-explorer/graph test examples/01-basic-usage/basic-provider-usage.test.ts --reporter=verbose
```

## Support

For questions about these examples:

1. Check the [main documentation](../../README.md)
2. Look at the [type definitions](../../types/) for interface details
3. Review existing [test patterns](../) for similar scenarios
4. Open an issue with the `examples` label for clarification