/**
 * DEPRECATED: Use useSearchState from @/lib/react-query/hooks instead
 * This file is kept for backwards compatibility during migration
 */

import type { WorksParams } from '@/lib/openalex/types';
import { useSearchState as useReactQuerySearchState } from '@/lib/react-query/hooks';

export function useSearchState(initialParams: WorksParams = {}) {
  return useReactQuerySearchState(initialParams);
}