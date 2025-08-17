/**
 * React Query Client Instance
 * 
 * Exports the query client instance for direct access
 */

import { createHybridQueryClient } from './hybrid-cache-adapter';

// Create a single instance of the query client
export const queryClient = createHybridQueryClient();