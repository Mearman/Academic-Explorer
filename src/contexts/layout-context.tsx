import React, { createContext, useContext, ReactNode } from 'react';

interface LayoutContextValue {
  /** Whether we're currently inside a TwoPaneLayout */
  isInTwoPaneLayout: boolean;
  /** The current layout level (0 = root, 1 = first level, etc.) */
  layoutLevel: number;
}

const LayoutContext = createContext<LayoutContextValue>({
  isInTwoPaneLayout: false,
  layoutLevel: 0,
});

export function useLayoutContext(): LayoutContextValue {
  return useContext(LayoutContext);
}

interface LayoutProviderProps {
  children: ReactNode;
  isInTwoPaneLayout?: boolean;
  layoutLevel?: number;
}

/**
 * Provides layout context to child components to prevent nested TwoPaneLayouts
 */
export function LayoutProvider({ 
  children, 
  isInTwoPaneLayout = false, 
  layoutLevel = 0 
}: LayoutProviderProps) {
  const parentContext = useLayoutContext();
  
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

/**
 * Hook to determine if a component should render its own TwoPaneLayout
 * Returns false if we're already inside a TwoPaneLayout (prevents nesting)
 */
export function useShouldRenderTwoPaneLayout(): boolean {
  const { isInTwoPaneLayout } = useLayoutContext();
  return !isInTwoPaneLayout;
}