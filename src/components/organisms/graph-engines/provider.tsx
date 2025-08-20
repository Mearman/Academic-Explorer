import React, { createContext, useCallback as _useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  IGraphVisualizationEngine as _IGraphVisualizationEngine,
  ILayoutAlgorithm as _ILayoutAlgorithm,
  IRendererRegistry as _IRendererRegistry,
  ILayoutRegistry as _ILayoutRegistry,
  IInteractionRegistry as _IInteractionRegistry,
  IGraphConfig,
  IGraph,
  IVertex as _IVertex,
  IEdge as _IEdge,
} from '../graph-core/interfaces';

import type {
  GraphEngineType,
  GraphEngineCapabilities,
  GraphEngineTransitionOptions,
  GraphEngineSettings,
  GraphEngineState,
  GraphEngineActions,
  GraphEngineContextValue,
  GraphEngineProviderProps,
} from './types';

// ============================================================================
// Types are now imported from ./types.ts - re-exported for backward compatibility
// ============================================================================

export type {
  GraphEngineType,
  GraphEngineCapabilities,
  GraphEngineTransitionOptions,
  GraphEngineSettings,
  GraphEngineState,
  GraphEngineActions,
  GraphEngineContextValue,
  GraphEngineProviderProps,
} from './types';

// ============================================================================
// Default Engine Capabilities
// ============================================================================

const DEFAULT_ENGINE_CAPABILITIES: Record<GraphEngineType, GraphEngineCapabilities> = {
  'canvas-2d': {
    type: 'canvas-2d',
    displayName: 'Canvas 2D',
    description: 'HTML5 Canvas with 2D rendering context - balanced performance and features',
    performance: {
      maxVertices: 5000,
      maxEdges: 10000,
      hardwareAccelerated: false,
      memoryEfficiency: 4,
      renderingSpeed: 4,
    },
    features: {
      animations: true,
      zoomPan: true,
      vertexDragging: true,
      edgeSelection: true,
      multiSelection: true,
      customVertexShapes: true,
      curvedEdges: true,
      edgeLabels: true,
      clustering: false,
      levelOfDetail: true,
      export: {
        png: true,
        svg: false,
        pdf: false,
        json: true,
      },
    },
    supportedLayouts: ['force-directed', 'circular', 'hierarchical', 'grid'],
    supportedRenderingModes: ['immediate'],
  },
  
  'svg': {
    type: 'svg',
    displayName: 'SVG',
    description: 'Scalable Vector Graphics - perfect for high-quality exports and small graphs',
    performance: {
      maxVertices: 1000,
      maxEdges: 2000,
      hardwareAccelerated: false,
      memoryEfficiency: 3,
      renderingSpeed: 2,
    },
    features: {
      animations: true,
      zoomPan: true,
      vertexDragging: true,
      edgeSelection: true,
      multiSelection: true,
      customVertexShapes: true,
      curvedEdges: true,
      edgeLabels: true,
      clustering: false,
      levelOfDetail: false,
      export: {
        png: true,
        svg: true,
        pdf: true,
        json: true,
      },
    },
    supportedLayouts: ['force-directed', 'circular', 'hierarchical'],
    supportedRenderingModes: ['retained'],
  },
  
  'webgl': {
    type: 'webgl',
    displayName: 'WebGL',
    description: 'Hardware-accelerated rendering for massive graphs with high performance',
    performance: {
      maxVertices: 100000,
      maxEdges: 500000,
      hardwareAccelerated: true,
      memoryEfficiency: 3,
      renderingSpeed: 5,
    },
    features: {
      animations: true,
      zoomPan: true,
      vertexDragging: true,
      edgeSelection: false,
      multiSelection: true,
      customVertexShapes: false,
      curvedEdges: false,
      edgeLabels: false,
      clustering: true,
      levelOfDetail: true,
      export: {
        png: true,
        svg: false,
        pdf: false,
        json: true,
      },
    },
    supportedLayouts: ['force-directed', 'circular'],
    supportedRenderingModes: ['immediate'],
  },
  
  'd3-force': {
    type: 'd3-force',
    displayName: 'D3 Force',
    description: 'D3.js force simulation with physics-based layouts and smooth animations',
    performance: {
      maxVertices: 2000,
      maxEdges: 5000,
      hardwareAccelerated: false,
      memoryEfficiency: 3,
      renderingSpeed: 3,
    },
    features: {
      animations: true,
      zoomPan: true,
      vertexDragging: true,
      edgeSelection: true,
      multiSelection: true,
      customVertexShapes: true,
      curvedEdges: true,
      edgeLabels: true,
      clustering: false,
      levelOfDetail: false,
      export: {
        png: true,
        svg: true,
        pdf: false,
        json: true,
      },
    },
    supportedLayouts: ['force-directed', 'radial'],
    supportedRenderingModes: ['hybrid'],
  },
  
  'cytoscape': {
    type: 'cytoscape',
    displayName: 'Cytoscape.js',
    description: 'Professional graph analysis and visualisation with extensive layout algorithms',
    performance: {
      maxVertices: 10000,
      maxEdges: 20000,
      hardwareAccelerated: false,
      memoryEfficiency: 4,
      renderingSpeed: 3,
    },
    features: {
      animations: true,
      zoomPan: true,
      vertexDragging: true,
      edgeSelection: true,
      multiSelection: true,
      customVertexShapes: true,
      curvedEdges: true,
      edgeLabels: true,
      clustering: true,
      levelOfDetail: false,
      export: {
        png: true,
        svg: false,
        pdf: false,
        json: true,
      },
    },
    supportedLayouts: [
      'force-directed',
      'circular',
      'hierarchical',
      'grid',
      'breadthfirst',
      'cose',
      'dagre',
    ],
    supportedRenderingModes: ['retained'],
  },
  
  'vis-network': {
    type: 'vis-network',
    displayName: 'vis-network',
    description: 'Interactive network visualisation with built-in physics and clustering',
    performance: {
      maxVertices: 3000,
      maxEdges: 8000,
      hardwareAccelerated: false,
      memoryEfficiency: 3,
      renderingSpeed: 3,
    },
    features: {
      animations: true,
      zoomPan: true,
      vertexDragging: true,
      edgeSelection: true,
      multiSelection: true,
      customVertexShapes: true,
      curvedEdges: true,
      edgeLabels: true,
      clustering: true,
      levelOfDetail: false,
      export: {
        png: true,
        svg: false,
        pdf: false,
        json: true,
      },
    },
    supportedLayouts: ['force-directed', 'hierarchical'],
    supportedRenderingModes: ['hybrid'],
  },
};

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: GraphEngineSettings = {
  selectedEngine: 'd3-force', // Start with D3 Force as it's fully implemented and interactive
  engineConfigs: {
    'canvas-2d': {},
    'svg': {},
    'webgl': {},
    'd3-force': {},
    'cytoscape': {},
    'vis-network': {},
  },
  transitionSettings: {
    duration: 500,
    easing: 'ease-in-out',
    preservePositions: true,
    preserveSelection: true,
    preserveViewport: true,
    effects: {
      fadeOut: true,
      fadeIn: true,
      scale: false,
    },
  },
  performanceSettings: {
    autoOptimise: true,
    autoOptimiseThreshold: 5000,
    largeGraphEngine: 'webgl',
  },
  userPreferences: {
    rememberPerGraph: true,
    showTransitions: true,
    showPerformanceWarnings: true,
  },
};

// ============================================================================
// Zustand Store
// ============================================================================

const useGraphEngineStore = create<GraphEngineState & GraphEngineActions>()(
  persist(
    immer((set, get) => ({
      // Initial state
      availableEngines: new Map(Object.entries(DEFAULT_ENGINE_CAPABILITIES) as Array<[GraphEngineType, GraphEngineCapabilities]>),
      currentEngine: 'd3-force', // Start with D3 Force as it's fully implemented
      engineInstances: new Map(),
      currentGraph: null,
      isTransitioning: false,
      transitionProgress: 0,
      engineLoadingStates: new Map(),
      engineErrors: new Map(),
      settings: DEFAULT_SETTINGS,
      
      // Actions
      switchEngine: async (engineType: GraphEngineType, options?: GraphEngineTransitionOptions) => {
        const state = get();
        if (state.currentEngine === engineType || state.isTransitioning) {
          return;
        }
        
        const capabilities = state.availableEngines.get(engineType);
        if (!capabilities) {
          throw new Error(`Engine ${engineType} is not available`);
        }
        
        // Check if current graph size exceeds engine capabilities
        if (state.currentGraph) {
          const vertexCount = state.currentGraph.vertices.length;
          const edgeCount = state.currentGraph.edges.length;
          
          if (vertexCount > capabilities.performance.maxVertices || 
              edgeCount > capabilities.performance.maxEdges) {
            if (state.settings.userPreferences.showPerformanceWarnings) {
              console.warn(
                `Graph size (${vertexCount} vertices, ${edgeCount} edges) exceeds ` +
                `recommended limits for ${engineType} engine ` +
                `(${capabilities.performance.maxVertices} vertices, ${capabilities.performance.maxEdges} edges)`
              );
            }
          }
        }
        
        const transitionOptions = { ...state.settings.transitionSettings, ...options };
        
        set((draft) => {
          draft.isTransitioning = true;
          draft.transitionProgress = 0;
        });
        
        try {
          // Simulate transition animation
          if (transitionOptions.duration && transitionOptions.duration > 0) {
            const steps = 20;
            const stepDuration = transitionOptions.duration / steps;
            
            for (let i = 0; i <= steps; i++) {
              await new Promise(resolve => setTimeout(resolve, stepDuration));
              set((draft) => {
                draft.transitionProgress = (i / steps) * 100;
              });
            }
          }
          
          // Preload new engine if not already loaded
          await get().preloadEngine(engineType);
          
          // Switch engine
          set((draft) => {
            draft.currentEngine = engineType;
            draft.settings.selectedEngine = engineType;
            draft.isTransitioning = false;
            draft.transitionProgress = 0;
          });
          
          // Load current graph into new engine if available
          if (state.currentGraph) {
            await get().loadGraph(state.currentGraph);
          }
          
        } catch (error) {
          set((draft) => {
            draft.isTransitioning = false;
            draft.transitionProgress = 0;
          });
          
          const errorMessage = error instanceof Error ? error.message : 'Unknown error during engine switch';
          get().handleEngineError(engineType, errorMessage);
          throw error;
        }
      },
      
      getEngineCapabilities: (engineType: GraphEngineType) => {
        return get().availableEngines.get(engineType) || null;
      },
      
      getCurrentEngine: () => {
        const state = get();
        return state.engineInstances.get(state.currentEngine) || null;
      },
      
      loadGraph: async (graph: IGraph) => {
        set((draft) => {
          // Use cast to avoid WritableDraft issues with readonly arrays
          draft.currentGraph = graph as any;
        });
        
        const state = get();
        const currentEngineInstance = state.engineInstances.get(state.currentEngine);
        
        if (currentEngineInstance) {
          try {
            await currentEngineInstance.loadGraph(graph);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error loading graph';
            get().handleEngineError(state.currentEngine, errorMessage);
            throw error;
          }
        }
        
        // Auto-optimise if enabled and graph is large
        if (state.settings.performanceSettings.autoOptimise) {
          const vertexCount = graph.vertices.length;
          if (vertexCount > state.settings.performanceSettings.autoOptimiseThreshold) {
            const {largeGraphEngine} = state.settings.performanceSettings;
            if (state.currentEngine !== largeGraphEngine) {
              console.log(`Auto-optimising: switching to ${largeGraphEngine} for large graph (${vertexCount} vertices)`);
              await get().switchEngine(largeGraphEngine);
            }
          }
        }
      },
      
      updateEngineConfig: (engineType: GraphEngineType, config: Partial<IGraphConfig>) => {
        set((draft) => {
          if (!draft.settings.engineConfigs[engineType]) {
            draft.settings.engineConfigs[engineType] = {};
          }
          Object.assign(draft.settings.engineConfigs[engineType], config);
        });
        
        // Apply config to engine instance if loaded
        const state = get();
        const engineInstance = state.engineInstances.get(engineType);
        if (engineInstance) {
          engineInstance.updateConfig(config);
        }
      },
      
      updateSettings: (settings: Partial<GraphEngineSettings>) => {
        set((draft) => {
          Object.assign(draft.settings, settings);
        });
      },
      
      resetSettings: () => {
        set((draft) => {
          draft.settings = { ...DEFAULT_SETTINGS };
        });
      },
      
      handleEngineError: (engineType: GraphEngineType, error: string) => {
        set((draft) => {
          draft.engineErrors.set(engineType, error);
          draft.engineLoadingStates.set(engineType, 'error');
        });
        
        console.error(`Graph engine ${engineType} error:`, error);
      },
      
      clearEngineError: (engineType: GraphEngineType) => {
        set((draft) => {
          draft.engineErrors.set(engineType, null);
          if (draft.engineLoadingStates.get(engineType) === 'error') {
            draft.engineLoadingStates.set(engineType, 'idle');
          }
        });
      },
      
      preloadEngine: async (engineType: GraphEngineType) => {
        const state = get();
        
        // Skip if already loaded or loading
        const loadingState = state.engineLoadingStates.get(engineType);
        if (loadingState === 'loaded' || loadingState === 'loading') {
          return;
        }
        
        set((draft) => {
          draft.engineLoadingStates.set(engineType, 'loading');
        });
        
        try {
          // Import the createEngineByType function to actually instantiate engines
          const { createEngineByType } = await import('./index');
          
          // Check if this engine type is implemented
          const availableTypes = ['canvas-2d', 'd3-force', 'cytoscape', 'webgl'];
          if (!availableTypes.includes(engineType)) {
            throw new Error(`Engine type ${engineType} is not yet implemented`);
          }
          
          // Create the actual engine instance
          const engineInstance = await createEngineByType(engineType);
          
          set((draft) => {
            draft.engineInstances.set(engineType, engineInstance);
            draft.engineLoadingStates.set(engineType, 'loaded');
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to load engine';
          get().handleEngineError(engineType, errorMessage);
          throw error;
        }
      },
      
      disposeUnusedEngines: () => {
        const state = get();
        
        set((draft) => {
          for (const [engineType, instance] of draft.engineInstances.entries()) {
            if (engineType !== state.currentEngine && instance) {
              // Dispose of engine instance
              if (instance.dispose) {
                instance.dispose();
              }
              draft.engineInstances.set(engineType, null);
              draft.engineLoadingStates.set(engineType, 'idle');
            }
          }
        });
      },
    })),
    {
      name: 'academic-explorer-graph-engines',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        settings: state.settings,
        currentEngine: state.currentEngine,
      }),
      // Skip serialization of Map objects - they'll be regenerated on load
    }
  )
);

// ============================================================================
// React Context
// ============================================================================

export const GraphEngineContext = createContext<GraphEngineContextValue | null>(null);

// ============================================================================
// Provider Component
// ============================================================================

// GraphEngineProviderProps is now imported from ./types.ts

export function GraphEngineProvider({ 
  children, 
  customEngines = {},
  preloadDefault = true 
}: GraphEngineProviderProps) {
  const storeState = useGraphEngineStore();
  const [isInitialised, setIsInitialised] = useState(false);
  const initialisedRef = useRef(false);
  
  // Merge custom engines with defaults
  const mergedEngines = useMemo(() => {
    const merged = new Map(storeState.availableEngines);
    
    for (const [engineType, capabilities] of Object.entries(customEngines)) {
      if (capabilities) {
        merged.set(engineType as GraphEngineType, capabilities);
      }
    }
    
    return merged;
  }, [customEngines, storeState.availableEngines]);
  
  // Update available engines when custom engines change
  useEffect(() => {
    useGraphEngineStore.setState((draft) => {
      // Clear and repopulate the Map to work with Immer
      draft.availableEngines.clear();
      for (const [engineType, capabilities] of mergedEngines.entries()) {
        // Use cast to work around WritableDraft readonly issues
        draft.availableEngines.set(engineType, capabilities as any);
      }
    });
  }, [mergedEngines]);
  
  // Initialise provider
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;
    
    const initialise = async () => {
      try {
        // Preload default engine if requested
        if (preloadDefault) {
          await storeState.preloadEngine(storeState.currentEngine);
        }
        
        setIsInitialised(true);
      } catch (error) {
        console.error('Failed to initialise graph engine provider:', error);
        setIsInitialised(true); // Continue anyway
      }
    };
    
    initialise();
  }, [preloadDefault, storeState]);
  
  // Context value with performance optimisation
  const contextValue = useMemo<GraphEngineContextValue>(() => ({
    ...storeState,
    availableEngines: mergedEngines,
  }), [storeState, mergedEngines]);
  
  // Don't render children until initialised to prevent hydration mismatches
  if (!isInitialised) {
    return (
      <div className="graph-engine-provider-loading">
        <div>Initialising graph engines...</div>
      </div>
    );
  }
  
  return (
    <GraphEngineContext.Provider value={contextValue}>
      {children}
    </GraphEngineContext.Provider>
  );
}

// ============================================================================
// Error Boundary for Engine Failures
// ============================================================================

interface GraphEngineErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class GraphEngineErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> },
  GraphEngineErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType<{ error: Error; retry: () => void }> }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  
  static getDerivedStateFromError(error: Error): Partial<GraphEngineErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('Graph engine error boundary caught error:', error, errorInfo);
  }
  
  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
  
  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }
      
      return (
        <div className="graph-engine-error-boundary">
          <h2>Graph Engine Error</h2>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error.message}</pre>
            {this.state.errorInfo && (
              <pre>{this.state.errorInfo.componentStack}</pre>
            )}
          </details>
          <button onClick={this.handleRetry}>Retry</button>
        </div>
      );
    }
    
    return this.props.children;
  }
}