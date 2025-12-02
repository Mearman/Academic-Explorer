/**
 * Graph Visualization Context
 * Provides shared visualization state between graph page and sidebar
 */

import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

import type { GraphVisualizationState } from '@/hooks/use-graph-visualization';
import { useGraphVisualization } from '@/hooks/use-graph-visualization';
import type { UseMultiSourceGraphResult } from '@/hooks/use-multi-source-graph';
import { useMultiSourceGraph } from '@/hooks/use-multi-source-graph';

/**
 * Combined context value with both graph data and visualization state
 */
export interface GraphVisualizationContextValue {
  graphData: UseMultiSourceGraphResult;
  visualization: GraphVisualizationState & ReturnType<typeof useGraphVisualization>;
}

export const GraphVisualizationContext = createContext<GraphVisualizationContextValue | null>(null);

/**
 * Provider component that creates and shares graph visualization state
 */
export function GraphVisualizationProvider({ children }: { children: ReactNode }) {
  const graphData = useMultiSourceGraph();
  const visualization = useGraphVisualization();

  return (
    <GraphVisualizationContext.Provider value={{ graphData, visualization }}>
      {children}
    </GraphVisualizationContext.Provider>
  );
}

/**
 * Hook to access shared graph visualization context
 * Returns null when used outside GraphVisualizationProvider (e.g., non-graph pages)
 * Only throws error in development to help catch misuse
 */
export function useGraphVisualizationContext() {
  const context = useContext(GraphVisualizationContext);
  return context;
}
