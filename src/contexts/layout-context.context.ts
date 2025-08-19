import { createContext } from 'react';

import type { LayoutContextValue } from './layout-context.types';

export const LayoutContext = createContext<LayoutContextValue>({
  isInTwoPaneLayout: false,
  layoutLevel: 0,
});