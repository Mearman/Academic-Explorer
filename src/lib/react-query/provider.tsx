/**
 * React Query Provider Setup
 * 
 * Configures React Query to work with our existing cache system
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';

import { createHybridQueryClient } from './hybrid-cache-adapter';

// Create a single instance of the query client
const queryClient = createHybridQueryClient();

interface ReactQueryProviderProps {
  children: React.ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </QueryClientProvider>
  );
}

// Export the query client for direct access if needed
export { queryClient };