# Test Utilities

This directory contains shared test utilities for consistent and reliable testing across the Academic Explorer web application.

## Overview

The test utilities provide standardized mocking patterns and test helpers to address common testing challenges in the monorepo environment.

## Available Utilities

### Store Mocking (`store-mocks.ts`)

Provides utilities for mocking Zustand stores consistently across tests:

```typescript
import { createMockGraphStore, createMockLayoutStore } from '../test/utils';

// Create mock stores with default state
const mockGraphStore = createMockGraphStore();
const mockLayoutStore = createMockLayoutStore();

// Update store state during tests
mockGraphStore.__mockUpdate({ selectedNodeId: 'test-node' });

// Reset store to initial state
mockGraphStore.__mockReset();
```

**Available Store Mocks:**
- `createMockGraphStore()` - Graph nodes, edges, and selection state
- `createMockLayoutStore()` - Layout animation and configuration
- `createMockSettingsStore()` - Application settings
- `createMockExpansionSettingsStore()` - Graph expansion configuration

### Router Mocking (`router-mocks.ts`)

Handles TanStack Router mocking for component tests:

```typescript
import { withMockRouter, setupRouterMocks, mockRouterHooks } from '../test/utils';

// Setup router mocks globally
setupRouterMocks();

// Wrap components with mock router context
const MockedComponent = withMockRouter(MyComponent, {
  pathname: '/authors/A123',
  params: { id: 'A123' }
});

// Use individual router hooks
const mockNavigate = mockRouterHooks.useNavigate();
```

### Component Mocking (`component-mocks.ts`)

Provides mocks for complex external components and APIs:

```typescript
import { setupComponentMocks, mockXYFlow, mockWebWorker } from '../test/utils';

// Setup all component mocks
setupComponentMocks();

// Or setup individual mocks
mockXYFlow();
mockWebWorker();
```

**Available Component Mocks:**
- **XYFlow/React Flow** - Graph visualization components
- **D3 Force Simulation** - Physics simulation utilities
- **Web Workers** - Background processing
- **Canvas API** - Canvas rendering contexts
- **IndexedDB** - Client-side storage

### Consolidated Utilities (`index.ts`)

Provides easy access to all utilities and common testing patterns:

```typescript
import {
  renderWithProviders,
  createTestQueryClient,
  setupAllTestMocks,
  resetAllTestMocks
} from '../test/utils';

// Render components with providers
renderWithProviders(<MyComponent />, {
  queryClient: createTestQueryClient()
});

// Setup/reset all mocks
setupAllTestMocks();
resetAllTestMocks();
```

## Usage in Tests

### Component Tests

```typescript
import {
  describe,
  it,
  expect,
  beforeEach,
  renderWithProviders,
  createMockGraphStore,
  withMockRouter
} from '../test/utils';

describe('MyComponent', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = createMockGraphStore();
  });

  it('should render with mocked dependencies', () => {
    const MockedComponent = withMockRouter(MyComponent);

    renderWithProviders(<MockedComponent />);

    expect(screen.getByText('Component content')).toBeInTheDocument();
  });
});
```

### Integration Tests

```typescript
import {
  createTestQueryClient,
  setupAllTestMocks,
  resetAllTestMocks
} from '../test/utils';

describe('Integration Tests', () => {
  let queryClient;

  beforeAll(() => {
    setupAllTestMocks();
  });

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    resetAllTestMocks();
  });
});
```

## Setup Files

### `setup.ts` (Main Setup)
- MSW server configuration
- Global mocks (ResizeObserver, IntersectionObserver)
- Environment-specific setup
- Jest-DOM matchers

### `component-setup.ts` (Component-Specific)
- Component mocking setup
- Additional Jest-DOM configuration
- Component-specific global mocks

## Best Practices

1. **Consistent Mocking**: Use the provided mock factories instead of manual mocks
2. **Store Isolation**: Reset store mocks between tests using `__mockReset()`
3. **Provider Wrapping**: Use `renderWithProviders` for components that need providers
4. **Mock Cleanup**: Call `resetAllTestMocks()` in cleanup functions
5. **Selective Mocking**: Import only the mocks you need for performance

## Common Patterns

### Testing Store-Connected Components
```typescript
const mockStore = createMockGraphStore();
mockStore.__mockUpdate({ nodes: new Map([['test', testNode]]) });

// Mock the store hook
vi.doMock('@/stores/graph-store', () => ({
  useGraphStore: () => mockStore
}));
```

### Testing Router-Dependent Components
```typescript
const MockedComponent = withMockRouter(MyComponent, {
  pathname: '/test-route',
  params: { id: 'test-id' }
});
```

### Testing with External APIs
MSW handlers are automatically configured in the setup files. API calls will be intercepted and return mock data.

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**: Ensure you're importing from the correct path
2. **Store state not updating**: Use `__mockUpdate()` method on mock stores
3. **Router navigation not working**: Verify router mocks are properly setup
4. **Component rendering fails**: Check if required providers are included

### Debug Tips

- Use `console.log(mockStore)` to inspect mock store state
- Check if mocks are properly reset between tests
- Verify mock setup is called before component rendering
- Ensure proper cleanup in `afterEach` hooks

## Migration from Old Patterns

If you're updating existing tests:

1. Replace manual store mocking with `createMockStore()` utilities
2. Use `renderWithProviders()` instead of plain `render()`
3. Replace manual router mocking with `withMockRouter()`
4. Update component mocks to use provided utilities
5. Add proper cleanup with `resetAllTestMocks()`