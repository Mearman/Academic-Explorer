/**
 * Graph Visualization Context
 * Provides shared visualization state between graph page and sidebar
 *
 * Also integrates auto-population for:
 * - Resolving stub node labels
 * - Discovering relationships between existing nodes
 */

import type { GraphEdge } from '@bibgraph/types';
import type { ReactNode } from 'react';
import { createContext, use, useCallback, useEffect,useState } from 'react';

import { useGraphAutoPopulation } from '@/hooks/use-graph-auto-population';
import type { GraphVisualizationState } from '@/hooks/use-graph-visualization';
import { useGraphVisualization } from '@/hooks/use-graph-visualization';
import type { UseMultiSourceGraphResult } from '@/hooks/use-multi-source-graph';
import { useMultiSourceGraph } from '@/hooks/use-multi-source-graph';
import { type BackgroundStrategy,settingsStoreInstance } from '@/stores/settings-store';

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
 * Also handles auto-population of labels and relationship discovery
 * @param root0
 * @param root0.children
 */
export const GraphVisualizationProvider = ({ children }: { children: ReactNode }) => {
  const graphData = useMultiSourceGraph();
  const visualization = useGraphVisualization();

  // Background processing strategy from settings
  const [backgroundStrategy, setBackgroundStrategy] = useState<BackgroundStrategy>('idle');

  // Load strategy from settings on mount and subscribe to changes
  useEffect(() => {
    const loadStrategy = async () => {
      const settings = await settingsStoreInstance.getSettings();
      setBackgroundStrategy(settings.backgroundStrategy);
    };
    void loadStrategy();

    // Poll for changes every 2 seconds (simple approach without event system)
    const intervalId = setInterval(() => {
      void loadStrategy();
    }, 2000);

    return () => clearInterval(intervalId);
  }, []);

  // Callbacks for auto-population
  const handleLabelsResolved = useCallback((updates: Map<string, string>) => {
    graphData.updateNodeLabels(updates);
  }, [graphData.updateNodeLabels]);

  const handleEdgesDiscovered = useCallback((newEdges: GraphEdge[]) => {
    graphData.addDiscoveredEdges(newEdges);
  }, [graphData.addDiscoveredEdges]);

  // Wire up auto-population - watches graph and resolves labels/discovers relationships
  useGraphAutoPopulation({
    nodes: graphData.nodes,
    edges: graphData.edges,
    onLabelsResolved: handleLabelsResolved,
    onEdgesDiscovered: handleEdgesDiscovered,
    enabled: true,
    strategy: backgroundStrategy,
  });

  return (
    <GraphVisualizationContext value={{ graphData, visualization }}>
      {children}
    </GraphVisualizationContext>
  );
};

/**
 * Hook to access shared graph visualization context
 * Returns null when used outside GraphVisualizationProvider (e.g., non-graph pages)
 * Only throws error in development to help catch misuse
 */
export const useGraphVisualizationContext = () => {
  const context = use(GraphVisualizationContext);
  return context;
};
