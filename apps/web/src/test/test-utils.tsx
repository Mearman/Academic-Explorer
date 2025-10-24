/**
 * Test utilities for component tests
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  render,
  renderHook,
  RenderHookOptions,
  RenderOptions,
} from "@testing-library/react";
import React from "react";

// Create a test QueryClient
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Test wrapper component with QueryClient
export const TestWrapper: React.FC<{
  children: React.ReactNode;
  queryClient?: QueryClient;
}> = ({ children, queryClient = createTestQueryClient() }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

// Custom render function that includes QueryClient
export const renderWithQueryClient = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient },
) => {
  const { queryClient, ...renderOptions } = options || {};
  return render(ui, {
    wrapper: (props) => <TestWrapper {...props} queryClient={queryClient} />,
    ...renderOptions,
  });
};

// Custom renderHook function that includes QueryClient
export const renderHookWithQueryClient = <T, P>(
  hook: (props: P) => T,
  options?: Omit<RenderHookOptions<P>, "wrapper"> & {
    queryClient?: QueryClient;
  },
) => {
  const { queryClient, ...renderHookOptions } = options || {};
  return renderHook(hook, {
    wrapper: (props) => <TestWrapper {...props} queryClient={queryClient} />,
    ...renderHookOptions,
  });
};
