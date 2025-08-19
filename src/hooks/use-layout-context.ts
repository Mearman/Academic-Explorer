import { useContext } from 'react';

import { LayoutContext } from '@/contexts/layout-context.context';
import type { LayoutContextValue } from '@/contexts/layout-context.types';

export function useLayoutContext(): LayoutContextValue {
  return useContext(LayoutContext);
}

/**
 * Hook to determine if a component should render its own TwoPaneLayout
 * Returns false if we're already inside a TwoPaneLayout (prevents nesting)
 */
export function useShouldRenderTwoPaneLayout(): boolean {
  const { isInTwoPaneLayout } = useLayoutContext();
  return !isInTwoPaneLayout;
}