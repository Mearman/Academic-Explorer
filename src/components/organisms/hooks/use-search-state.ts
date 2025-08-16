/**
 * DEPRECATED: Use useSearchState from @/lib/react-query/hooks instead
 * This file is kept for backwards compatibility during migration
 */

import { useSearchState as useReactQuerySearchState } from '@/lib/react-query/hooks';
import type { WorksParams } from '@/lib/openalex/types';

export function useSearchState(initialParams: WorksParams = {}) {
  return useReactQuerySearchState(initialParams);
}