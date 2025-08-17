/**
 * React Query integration exports
 * 
 * All OpenAlex API interactions should go through these React Query hooks
 */

export * from './hooks';
export * from './hybrid-cache-adapter';
export { ReactQueryProvider } from './provider';
export { queryClient } from './client';