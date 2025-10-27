/**
 * Consolidated test utilities index
 * Exports all test utilities for easy importing
 */

// Store mocking utilities
export * from "./store-mocks";

// Router mocking utilities
export * from "./router-mocks";

// Component mocking utilities
export * from "./component-mocks";

// Import specific setup functions for use in setupAllTestMocks
import { setupComponentMocks } from "./component-mocks";
import { setupRouterMocks } from "./router-mocks";

// Re-export React Testing Library utilities with common patterns
export {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from "@testing-library/react";
export { userEvent } from "@testing-library/user-event";

// Re-export Vitest utilities
export {
  vi,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from "vitest";

import React from "react";
import { render, type RenderOptions } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi as _vi } from "vitest";

/**
 * Test wrapper component that provides common providers
 */
const TestProviders: React.FC<{
  children: React.ReactNode;
  queryClient?: QueryClient;
}> = ({ children, queryClient }) => {
  const testQueryClient =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: Infinity,
        },
        mutations: {
          retry: false,
        },
      },
    });

  return React.createElement(
    QueryClientProvider,
    { client: testQueryClient },
    React.createElement(MantineProvider, {}, children),
  );
};

/**
 * Custom render function with providers
 */
export const renderWithProviders = (
  ui: React.ReactElement,
  options: RenderOptions & { queryClient?: QueryClient } = {},
): ReturnType<typeof render> => {
  const { queryClient, ...renderOptions } = options;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(TestProviders, { queryClient, children });

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

/**
 * Helper to create a test QueryClient
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

/**
 * Common test utilities object for easy destructuring
 */
export const testUtils: {
  renderWithProviders: typeof renderWithProviders;
  createTestQueryClient: typeof createTestQueryClient;
  TestProviders: typeof TestProviders;
} = {
  renderWithProviders,
  createTestQueryClient,
  TestProviders,
};

/**
 * Setup function to initialize all test mocks
 * Call this in your test setup files
 */
export function setupAllTestMocks() {
  // Setup all mocks directly
  setupComponentMocks();
  setupRouterMocks();
}

/**
 * Reset function to clean all test mocks
 * Call this in your cleanup functions
 */
// export function resetAllTestMocks() {
//   const { resetComponentMocks } = require('./component-mocks');
//   const { resetRouterMocks } = require('./router-mocks');
//   const { resetMockStores } = require('./store-mocks');

//   resetComponentMocks();
//   resetRouterMocks();
//   vi.clearAllMocks();
// }
