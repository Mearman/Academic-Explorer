/**
 * Centralised Test Provider Utilities
 * 
 * This file provides standardised test wrappers and render functions that ensure
 * proper Mantine context is available for all component tests. This prevents
 * "MantineProvider was not found in component tree" errors.
 */

import React from 'react';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { MantineProvider, type MantineTheme, type MantineThemeOverride } from '@mantine/core';
import { createRouter, RouterProvider, createMemoryHistory, type Router } from '@tanstack/react-router';

import { mantineTheme } from '@/lib/mantine-theme';
import { routeTree } from '@/routeTree.gen';
import { ReactQueryProvider } from '@/lib/react-query/provider';

// Types for provider configuration
export interface TestProvidersOptions {
  /** Mantine theme to use, defaults to app theme */
  theme?: MantineThemeOverride | null;
  /** Force color scheme for consistent testing */
  colorScheme?: 'light' | 'dark';
  /** Initial router route for navigation testing */
  initialRoute?: string;
  /** Router configuration for tests that need routing */
  router?: Router<any, any> | null;
  /** Whether to wrap with router (defaults to false for simple component tests) */
  withRouter?: boolean;
}

/**
 * Core test provider wrapper component
 * Provides MantineProvider context with proper theme configuration
 */
export const TestProviders: React.FC<{
  children: React.ReactNode;
  options?: TestProvidersOptions;
}> = ({ children, options = {} }) => {
  const {
    theme = mantineTheme,
    colorScheme = 'light',
    initialRoute = '/',
    router = null,
    withRouter = false,
  } = options;

  // If router is requested, return RouterProvider with full provider stack
  if (withRouter || router) {
    const testRouter = router || createTestRouter(initialRoute);
    return (
      <ReactQueryProvider>
        <MantineProvider theme={theme || undefined} forceColorScheme={colorScheme}>
          <RouterProvider router={testRouter} />
        </MantineProvider>
      </ReactQueryProvider>
    );
  }

  // For non-router tests, wrap children with full provider stack
  return (
    <ReactQueryProvider>
      <MantineProvider theme={theme || undefined} forceColorScheme={colorScheme}>
        {children}
      </MantineProvider>
    </ReactQueryProvider>
  );
};

/**
 * Create a test router with memory history
 * Useful for testing components that depend on routing context
 */
export function createTestRouter(initialRoute: string = '/'): Router<any, any> {
  const memoryHistory = createMemoryHistory({
    initialEntries: [initialRoute],
  });

  return createRouter({
    routeTree,
    history: memoryHistory,
  });
}

/**
 * Enhanced render function that automatically provides MantineProvider context
 * Use this instead of @testing-library/react's render for component tests
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options: RenderOptions & { providerOptions?: TestProvidersOptions } = {}
): RenderResult {
  const { providerOptions = {}, ...renderOptions } = options;

  // Custom render function that wraps with TestProviders
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestProviders options={providerOptions}>
        {children}
      </TestProviders>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render function specifically for components that need router context
 * Automatically includes both MantineProvider and RouterProvider
 */
export function renderWithRouter(
  ui: React.ReactElement,
  options: RenderOptions & { 
    providerOptions?: TestProvidersOptions;
    initialRoute?: string;
  } = {}
): RenderResult {
  const { initialRoute = '/', providerOptions = {}, ...renderOptions } = options;

  const finalProviderOptions: TestProvidersOptions = {
    ...providerOptions,
    withRouter: true,
    initialRoute,
  };

  return renderWithProviders(ui, {
    providerOptions: finalProviderOptions,
    ...renderOptions,
  });
}

/**
 * Create a test wrapper component for use with React Testing Library's render wrapper option
 * Useful when you need a reusable wrapper component in tests
 */
export function createTestWrapper(options: TestProvidersOptions = {}) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestProviders options={options}>
        {children}
      </TestProviders>
    );
  };
}

/**
 * Mock router implementation for tests that need routing but don't need full router functionality
 * Lighter weight alternative to createTestRouter
 */
export function createMockRouter(initialRoute: string = '/'): Router<any, any> {
  const memoryHistory = createMemoryHistory({
    initialEntries: [initialRoute],
  });

  const mockRootRoute = {
    id: '__root__',
    path: '/',
    component: () => React.createElement('div', { 'data-testid': 'mock-router-content' }, 'Mock Router Content'),
  };

  return createRouter({
    routeTree: mockRootRoute as any,
    history: memoryHistory,
  });
}

/**
 * Utility to test components in different color schemes
 * Returns render results for both light and dark modes
 */
export function renderInBothColorSchemes(
  ui: React.ReactElement,
  options: RenderOptions & { providerOptions?: Omit<TestProvidersOptions, 'colorScheme'> } = {}
) {
  const { providerOptions = {}, ...renderOptions } = options;

  const lightRender = renderWithProviders(ui, {
    providerOptions: { ...providerOptions, colorScheme: 'light' },
    ...renderOptions,
  });

  const darkRender = renderWithProviders(ui, {
    providerOptions: { ...providerOptions, colorScheme: 'dark' },
    ...renderOptions,
  });

  return {
    light: lightRender,
    dark: darkRender,
  };
}

/**
 * Test utility to verify MantineProvider context is available
 * Useful for debugging MantineProvider issues
 */
export function TestMantineContext() {
  return (
    <div data-testid="mantine-context-test">
      MantineProvider context is available
    </div>
  );
}

// Export commonly used test configurations
export const TEST_PROVIDER_CONFIGS = {
  /** Basic component test with light theme */
  basic: {
    theme: mantineTheme as MantineThemeOverride,
    colorScheme: 'light' as const,
  },
  /** Component test with dark theme */
  dark: {
    theme: mantineTheme as MantineThemeOverride,
    colorScheme: 'dark' as const,
  },
  /** Component test with router for navigation testing */
  withRouter: {
    theme: mantineTheme as MantineThemeOverride,
    colorScheme: 'light' as const,
    withRouter: true,
  },
  /** Minimal test setup for performance testing */
  minimal: {
    theme: null,
    colorScheme: 'light' as const,
  },
} as const;

// Export types for other test files