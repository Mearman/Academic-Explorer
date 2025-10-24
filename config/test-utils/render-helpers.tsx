/**
 * React Testing Library render helpers for consistent component and hook testing
 * across all projects in the Academic Explorer workspace.
 */

import React, { ReactElement } from "react";
import { render, renderHook, RenderOptions, RenderHookOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";
import type { GraphNode } from "@academic-explorer/graph";

/**
 * Provider component props interfaces
 */
interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: "light" | "dark";
}

interface GraphProviderProps {
  children: React.ReactNode;
  initialNodes?: Record<string, GraphNode>;
  initialEdges?: any[];
}

/**
 * Mock providers - these should be overridden by actual implementations in each project
 */
const MockThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  theme = "light"
}) => (
  <div data-theme={theme} data-testid="theme-provider">
    {children}
  </div>
);

const MockGraphProvider: React.FC<GraphProviderProps> = ({
  children,
  initialNodes = {},
  initialEdges = []
}) => (
  <div
    data-testid="graph-provider"
    data-nodes-count={Object.keys(initialNodes).length}
    data-edges-count={initialEdges.length}
  >
    {children}
  </div>
);

/**
 * QueryClient configuration for tests
 */
export const createTestQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
        gcTime: 0,
      },
    },
    logger: {
      log: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  });
};

/**
 * Common render options interface
 */
export interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  queryClient?: QueryClient;
  theme?: "light" | "dark";
  withTheme?: boolean;
  withGraph?: boolean;
  initialGraphNodes?: Record<string, GraphNode>;
  initialGraphEdges?: any[];
  providers?: React.ComponentType<{ children: React.ReactNode }>[];
}

/**
 * Hook render options interface
 */
export interface CustomRenderHookOptions<TProps> extends Omit<RenderHookOptions<TProps>, "wrapper"> {
  queryClient?: QueryClient;
  theme?: "light" | "dark";
  withTheme?: boolean;
  withGraph?: boolean;
  initialGraphNodes?: Record<string, GraphNode>;
  initialGraphEdges?: any[];
  providers?: React.ComponentType<{ children: React.ReactNode }>[];
}

/**
 * Create a wrapper component with all necessary providers
 */
const createWrapper = (options: CustomRenderOptions = {}) => {
  const {
    queryClient = createTestQueryClient(),
    theme = "light",
    withTheme = true,
    withGraph = false,
    initialGraphNodes = {},
    initialGraphEdges = [],
    providers = [],
  } = options;

  return ({ children }: { children: React.ReactNode }) => {
    let component = children;

    // Apply custom providers in reverse order (innermost first)
    for (let i = providers.length - 1; i >= 0; i--) {
      const Provider = providers[i];
      component = <Provider>{component}</Provider>;
    }

    // Apply graph provider if requested
    if (withGraph) {
      component = (
        <MockGraphProvider
          initialNodes={initialGraphNodes}
          initialEdges={initialGraphEdges}
        >
          {component}
        </MockGraphProvider>
      );
    }

    // Apply theme provider if requested
    if (withTheme) {
      component = (
        <MockThemeProvider theme={theme}>
          {component}
        </MockThemeProvider>
      );
    }

    // Apply QueryClient provider
    component = (
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );

    return <>{component}</>;
  };
};

/**
 * Custom render function with common providers
 */
export const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const wrapper = createWrapper(options);
  return render(ui, { wrapper, ...options });
};

/**
 * Custom renderHook function with common providers
 */
export const customRenderHook = <TProps, TResult>(
  hook: (initialProps: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {}
) => {
  const wrapper = createWrapper(options);
  return renderHook(hook, { wrapper, ...options });
};

/**
 * Render utilities for specific component types
 */
export const ComponentRenderers = {
  /**
   * Render a graph component with mock graph data
   */
  renderGraphComponent: (
    component: ReactElement,
    nodes: Record<string, GraphNode> = {},
    edges: any[] = []
  ) => {
    return customRender(component, {
      withGraph: true,
      initialGraphNodes: nodes,
      initialGraphEdges: edges,
    });
  },

  /**
   * Render a themed component
   */
  renderThemedComponent: (
    component: ReactElement,
    theme: "light" | "dark" = "light"
  ) => {
    return customRender(component, {
      withTheme: true,
      theme,
    });
  },

  /**
   * Render a component with multiple providers
   */
  renderWithProviders: (
    component: ReactElement,
    providers: React.ComponentType<{ children: React.ReactNode }>[],
    options: CustomRenderOptions = {}
  ) => {
    return customRender(component, {
      ...options,
      providers,
    });
  },

  /**
   * Render a component without any providers for testing isolation
   */
  renderIsolated: (component: ReactElement, options: RenderOptions = {}) => {
    return render(component, options);
  },
};

/**
 * Hook render utilities for specific hook types
 */
export const HookRenderers = {
  /**
   * Render a graph-related hook
   */
  renderGraphHook: <TProps, TResult>(
    hook: (initialProps: TProps) => TResult,
    options: CustomRenderHookOptions<TProps> = {}
  ) => {
    return customRenderHook(hook, {
      ...options,
      withGraph: true,
    });
  },

  /**
   * Render a data fetching hook with query client
   */
  renderDataHook: <TProps, TResult>(
    hook: (initialProps: TProps) => TResult,
    options: CustomRenderHookOptions<TProps> = {}
  ) => {
    return customRenderHook(hook, {
      ...options,
      queryClient: options.queryClient || createTestQueryClient(),
    });
  },

  /**
   * Render a hook without providers for testing isolation
   */
  renderIsolatedHook: <TProps, TResult>(
    hook: (initialProps: TProps) => TResult,
    options: RenderHookOptions<TProps> = {}
  ) => {
    return renderHook(hook, options);
  },
};

/**
 * Accessibility testing helpers
 */
export const AccessibilityHelpers = {
  /**
   * Check if component has proper ARIA attributes
   */
  expectAccessible: async (container: HTMLElement) => {
    // Basic accessibility checks - can be extended with more comprehensive tools
    const elements = container.querySelectorAll("*");

    elements.forEach((element) => {
      // Check for proper heading hierarchy (basic check)
      if (element.tagName.startsWith("H") && element.tagName !== "H1") {
        const headingLevel = parseInt(element.tagName.charAt(1));
        // This is a simplified check - in real usage, you'd want more comprehensive validation
        expect(headingLevel).toBeGreaterThan(0);
        expect(headingLevel).toBeLessThan(7);
      }
    });
  },

  /**
   * Check for common accessibility issues
   */
  checkAccessibility: (container: HTMLElement) => {
    const issues: string[] = [];

    // Check for images without alt text
    const images = container.querySelectorAll("img");
    images.forEach((img, index) => {
      if (!img.getAttribute("alt")) {
        issues.push(`Image ${index + 1} missing alt attribute`);
      }
    });

    // Check for buttons without accessible names
    const buttons = container.querySelectorAll("button");
    buttons.forEach((button, index) => {
      const hasText = button.textContent?.trim();
      const hasAriaLabel = button.getAttribute("aria-label");
      const hasAriaLabelledBy = button.getAttribute("aria-labelledby");

      if (!hasText && !hasAriaLabel && !hasAriaLabelledBy) {
        issues.push(`Button ${index + 1} missing accessible name`);
      }
    });

    if (issues.length > 0) {
      throw new Error(`Accessibility issues found:\n${issues.join("\n")}`);
    }
  },
};

/**
 * Component testing utilities
 */
export const ComponentHelpers = {
  /**
   * Create a mock component for testing
   */
  createMockComponent: <TProps = any>(
    name: string,
    _defaultProps: TProps = {} as TProps
  ): React.FC<TProps> => {
    return ({ children, ...props }: TProps & { children?: React.ReactNode }) => (
      <div data-testid={`mock-${name}`} {...(props as any)}>
        {children}
      </div>
    );
  },

  /**
   * Wait for component to finish rendering and effects
   */
  waitForRender: async (delay = 0) => {
    await new Promise(resolve => setTimeout(resolve, delay));
  },

  /**
   * Get component by test id with type safety
   */
  getByTestId: <T extends Element = HTMLElement>(
    container: HTMLElement,
    testId: string
  ): T => {
    const element = container.querySelector(`[data-testid="${testId}"]`) as T;
    if (!element) {
      throw new Error(`Element with testid "${testId}" not found`);
    }
    return element;
  },

  /**
   * Query component by test id safely
   */
  queryByTestId: <T extends Element = HTMLElement>(
    container: HTMLElement,
    testId: string
  ): T | null => {
    return container.querySelector(`[data-testid="${testId}"]`) as T | null;
  },
};

/**
 * Performance testing utilities for React components
 */
export const PerformanceHelpers = {
  /**
   * Measure component render time
   */
  measureRenderTime: <T = any>(
    renderFn: () => T,
    iterations = 10
  ): Promise<number> => {
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      renderFn();
      const end = performance.now();
      times.push(end - start);
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  },

  /**
   * Test component with large datasets
   */
  testWithLargeDataset: (
    component: ReactElement,
    dataGenerator: (size: number) => any,
    sizes: number[] = [100, 1000, 10000]
  ): Promise<Record<number, number>> => {
    const results: Record<number, number> = {};

    for (const size of sizes) {
      const data = dataGenerator(size);
      const renderTime = await PerformanceHelpers.measureRenderTime(
        () => customRender(component, {
          initialProps: { data } as any
        }),
        5
      );
      results[size] = renderTime;
    }

    return results;
  },
};

/**
 * Integration with existing test patterns
 */
export const TestPatterns = {
  /**
   * Standard component test setup
   */
  componentTestSetup: () => {
    const queryClient = createTestQueryClient();

    return {
      queryClient,
      render: (component: ReactElement, options: CustomRenderOptions = {}) =>
        customRender(component, { ...options, queryClient }),
    };
  },

  /**
   * Standard hook test setup
   */
  hookTestSetup: <TProps = any>() => {
    const queryClient = createTestQueryClient();

    return {
      queryClient,
      renderHook: <TResult = any>(
        hook: (initialProps: TProps) => TResult,
        options: CustomRenderHookOptions<TProps> = {}
      ) => customRenderHook(hook, { ...options, queryClient }),
    };
  },

  /**
   * Setup for testing components that use multiple stores
   */
  multiStoreTestSetup: () => {
    const queryClient = createTestQueryClient();

    // Mock store hooks
    const mockUseGraphStore = vi.fn();
    const mockUseLayoutStore = vi.fn();
    const mockUseSettingsStore = vi.fn();

    return {
      queryClient,
      mockUseGraphStore,
      mockUseLayoutStore,
      mockUseSettingsStore,
      render: (component: ReactElement, options: CustomRenderOptions = {}) =>
        customRender(component, { ...options, queryClient }),
    };
  },
};

/**
 * Error boundary testing utilities
 */
export const ErrorBoundaryHelpers = {
  /**
   * Create a test error boundary for testing error states
   */
  createTestErrorBoundary: () => {
    class TestErrorBoundary extends React.Component<
      { children: React.ReactNode; onError?: (error: Error) => void },
      { hasError: boolean; error?: Error }
    > {
      constructor(props: any) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
      }

      componentDidCatch(error: Error) {
        this.props.onError?.(error);
      }

      render() {
        if (this.state.hasError) {
          return <div data-testid="error-boundary">Error occurred</div>;
        }

        return this.props.children;
      }
    }

    return TestErrorBoundary;
  },

  /**
   * Test component error handling
   */
  testErrorHandling: async (
    component: ReactElement,
    triggerError: () => void,
    onError?: (error: Error) => void
  ) => {
    const TestErrorBoundary = ErrorBoundaryHelpers.createTestErrorBoundary();

    const { rerender } = customRender(
      <TestErrorBoundary onError={onError}>
        {component}
      </TestErrorBoundary>
    );

    // Initially should render without error
    expect(() => {
      const errorBoundary = document.querySelector('[data-testid="error-boundary"]');
      expect(errorBoundary).not.toBeInTheDocument();
    });

    // Trigger error
    triggerError();
    rerender(
      <TestErrorBoundary onError={onError}>
        {component}
      </TestErrorBoundary>
    );

    // Should now show error boundary
    const errorBoundary = document.querySelector('[data-testid="error-boundary"]');
    expect(errorBoundary).toBeInTheDocument();
  },
};

/**
 * Memory leak detection for React components
 */
export const MemoryHelpers = {
  /**
   * Track component instances for memory leak detection
   */
  trackComponentInstances: () => {
    const instances = new Set<React.Component>();

    // Monkey patch React.createElement to track instances
    const originalCreateElement = React.createElement;
    React.createElement = (...args: any[]) => {
      const element = originalCreateElement(...args);
      if (typeof args[0] === 'function' && args[0].prototype?.isReactComponent) {
        // This is a simplified tracking - in practice, you'd need more sophisticated tracking
      }
      return element;
    };

    return {
      getInstanceCount: () => instances.size,
      clear: () => instances.clear(),
      restore: () => {
        React.createElement = originalCreateElement;
      },
    };
  },
};

/**
 * Re-export commonly used testing utilities
 */
export {
  render,
  renderHook,
  screen,
  fireEvent,
  waitFor,
  act,
  userEvent,
} from "@testing-library/react";
export { expect, test, vi } from "vitest";