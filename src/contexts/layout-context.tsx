import React, { useContext } from 'react';

import { LayoutContext } from './layout-context.context';
import type { LayoutContextValue, LayoutProviderProps } from './layout-context.types';

// Internal hook for use within this file only
function useLayoutContextInternal(): LayoutContextValue {
  return useContext(LayoutContext);
}

/**
 * Provides layout context to child components to prevent nested TwoPaneLayouts
 */
export function LayoutProvider({ 
  children, 
  isInTwoPaneLayout = false, 
  layoutLevel = 0 
}: LayoutProviderProps) {
  const parentContext = useLayoutContextInternal();
  
  const contextValue: LayoutContextValue = {
    isInTwoPaneLayout: isInTwoPaneLayout || parentContext.isInTwoPaneLayout,
    layoutLevel: Math.max(layoutLevel, parentContext.layoutLevel + (isInTwoPaneLayout ? 1 : 0)),
  };

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
}

