import type { ReactNode } from 'react';

export interface LayoutContextValue {
  /** Whether we're currently inside a TwoPaneLayout */
  isInTwoPaneLayout: boolean;
  /** The current layout level (0 = root, 1 = first level, etc.) */
  layoutLevel: number;
}

export interface LayoutProviderProps {
  children: ReactNode;
  isInTwoPaneLayout?: boolean;
  layoutLevel?: number;
}