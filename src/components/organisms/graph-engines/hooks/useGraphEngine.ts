 
import { useCallback, useContext, useMemo } from 'react';

import type { IGraphVisualizationEngine, IGraph, IGraphConfig } from '../../graph-core/interfaces';
import type {
  GraphEngineContext as _GraphEngineContext,
  GraphEngineType,
  GraphEngineTransitionOptions,
  GraphEngineCapabilities as _GraphEngineCapabilities,
  GraphEngineSettings,
} from '../provider';
import { GraphEngineContext as Context } from '../provider';

// ============================================================================
// Hook Return Types
// ============================================================================

export interface UseGraphEngineReturn {
  // Current state
  /** Currently active engine type */
  currentEngine: GraphEngineType;
  
  /** Current engine instance (null if not loaded) */
  currentEngineInstance: IGraphVisualizationEngine | null;
  
  /** Engine instance for backward compatibility */
  engineInstance: IGraphVisualizationEngine | null;
  
  /** Available engine types */
  availableEngines: GraphEngineType[];
  
  /** Whether an engine transition is in progress */
  isTransitioning: boolean;
  
  /** Current transition progress (0-100) */
  transitionProgress: number;
  
  /** Current graph data */
  currentGraph: IGraph | null;
  
  /** Engine loading states */
  engineLoadingStates: Record<GraphEngineType, 'idle' | 'loading' | 'loaded' | 'error'>;
  
  /** Engine error states */
  engineErrors: Record<GraphEngineType, string | null>;
  
  /** Current settings */
  settings: GraphEngineSettings;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
  
  // Actions
  /** Switch to a different engine with optional transition settings */
  switchEngine: (
    engineType: GraphEngineType,
    options?: GraphEngineTransitionOptions
  ) => Promise<void>;
  
  /** Switch to the optimal engine for the current graph */
  switchToOptimalEngine: () => Promise<void>;
  
  /** Load graph data into current engine */
  loadGraph: (graph: IGraph) => Promise<void>;
  
  /** Update current engine configuration */
  updateCurrentEngineConfig: (config: Partial<IGraphConfig>) => void;
  
  /** Update engine-specific configuration */
  updateEngineConfig: (
    engineType: GraphEngineType,
    config: Partial<IGraphConfig>
  ) => void;
  
  /** Update provider settings */
  updateSettings: (settings: Partial<GraphEngineSettings>) => void;
  
  /** Reset all settings to defaults */
  resetSettings: () => void;
  
  /** Preload an engine for faster switching */
  preloadEngine: (engineType: GraphEngineType) => Promise<void>;
  
  /** Dispose unused engines to free memory */
  disposeUnusedEngines: () => void;
  
  /** Clear error state for an engine */
  clearEngineError: (engineType: GraphEngineType) => void;
  
  /** Handle engine errors */
  handleEngineError: (engineType: GraphEngineType, error: string) => void;

  /** Clear error for current or specified engine */
  clearError: (engineType?: GraphEngineType) => void;

  /** Retry failed engine by clearing error and re-initializing */
  retryEngine: (engineType?: GraphEngineType) => void;

  /** Check if engine switching is allowed (not transitioning, engine available) */
  canSwitchEngine: (engineType: GraphEngineType) => boolean;
  
  /** Get recommended engine for current graph */
  getRecommendedEngine: () => GraphEngineType | null;
  
  /** Get engine performance score for current graph (0-100) */
  getEnginePerformanceScore: (engineType: GraphEngineType) => number;
  
  /** Get engine instance by ID */
  getEngineById: (engineType: GraphEngineType) => IGraphVisualizationEngine | null;
  
  /** Current performance metrics */
  performanceMetrics: {
    fps: number;
    renderTime: number;
    memoryUsage: number;
  } | null;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for accessing and managing graph engines.
 * 
 * Provides access to the current engine instance, switching capabilities,
 * and engine management functions with optimised performance.
 * 
 * @returns Graph engine management interface
 * 
 * @example
 * ```tsx
 * function GraphComponent() {
 *   const {
 *     currentEngine,
 *     currentEngineInstance,
 *     switchEngine,
 *     switchToOptimalEngine,
 *     getRecommendedEngine,
 *   } = useGraphEngine();
 *   
 *   const handleEngineSwitch = async () => {
 *     await switchEngine('webgl', {
 *       duration: 300,
 *       preservePositions: true,
 *     });
 *   };
 *   
 *   const handleOptimalSwitch = async () => {
 *     await switchToOptimalEngine();
 *   };
 *   
 *   return (
 *     <div>
 *       <p>Current engine: {currentEngine}</p>
 *       <button onClick={handleEngineSwitch}>
 *         Switch to WebGL
 *       </button>
 *       <button onClick={handleOptimalSwitch}>
 *         Use Optimal Engine
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 * 
 * @throws Error if used outside of GraphEngineProvider
 */
export function useGraphEngine(): UseGraphEngineReturn {
  const context = useContext(Context);
  
  if (!context) {
    throw new Error(
      'useGraphEngine must be used within a GraphEngineProvider. ' +
      'Make sure to wrap your component tree with <GraphEngineProvider>.'
    );
  }
  
  const {
    availableEngines,
    currentEngine,
    engineInstances,
    currentGraph,
    isTransitioning,
    transitionProgress,
    engineLoadingStates,
    engineErrors,
    settings,
    switchEngine,
    loadGraph,
    updateEngineConfig,
    updateSettings,
    resetSettings,
    preloadEngine,
    disposeUnusedEngines,
    clearEngineError,
    getEngineCapabilities,
  } = context;
  
  // Memoised derived state
  const currentEngineInstance = useMemo(() => {
    return engineInstances.get(currentEngine) || null;
  }, [engineInstances, currentEngine]);
  
  const availableEnginesList = useMemo(() => {
    return Array.from(availableEngines.keys());
  }, [availableEngines]);
  
  const engineLoadingStatesRecord = useMemo(() => {
    const record: Record<GraphEngineType, 'idle' | 'loading' | 'loaded' | 'error'> = {} as any;
    for (const engineType of availableEnginesList) {
      record[engineType] = engineLoadingStates.get(engineType) || 'idle';
    }
    return record;
  }, [engineLoadingStates, availableEnginesList]);
  
  const engineErrorsRecord = useMemo(() => {
    const record: Record<GraphEngineType, string | null> = {} as any;
    for (const engineType of availableEnginesList) {
      record[engineType] = engineErrors.get(engineType) || null;
    }
    return record;
  }, [engineErrors, availableEnginesList]);
  
  // Memoised helper functions
  const canSwitchEngine = useCallback((engineType: GraphEngineType): boolean => {
    if (isTransitioning) return false;
    if (currentEngine === engineType) return false;
    if (!availableEngines.has(engineType)) return false;
    
    const errorState = engineErrors.get(engineType);
    return errorState === null;
  }, [isTransitioning, currentEngine, availableEngines, engineErrors]);
  
  const getEnginePerformanceScore = useCallback((engineType: GraphEngineType): number => {
    const capabilities = getEngineCapabilities(engineType);
    if (!capabilities || !currentGraph) return 0;
    
    const vertexCount = currentGraph.vertices.length;
    const edgeCount = currentGraph.edges.length;
    
    // Calculate performance score based on graph size vs engine capabilities
    const vertexScore = Math.min(100, (capabilities.performance.maxVertices / Math.max(vertexCount, 1)) * 100);
    const edgeScore = Math.min(100, (capabilities.performance.maxEdges / Math.max(edgeCount, 1)) * 100);
    
    // Weight by engine's raw performance characteristics
    const rawPerformanceWeight = (
      capabilities.performance.renderingSpeed * 0.4 +
      capabilities.performance.memoryEfficiency * 0.3 +
      (capabilities.performance.hardwareAccelerated ? 5 : 0) * 0.3
    ) * 20; // Scale to 0-100
    
    // Combined score (graph size compatibility: 60%, raw performance: 40%)
    return Math.round(
      (vertexScore * 0.3 + edgeScore * 0.3 + rawPerformanceWeight * 0.4)
    );
  }, [getEngineCapabilities, currentGraph]);
  
  const getRecommendedEngine = useCallback((): GraphEngineType | null => {
    if (!currentGraph) return null;
    
    let bestEngine: GraphEngineType | null = null;
    let bestScore = 0;
    
    for (const engineType of availableEnginesList) {
      const score = getEnginePerformanceScore(engineType);
      if (score > bestScore) {
        bestScore = score;
        bestEngine = engineType;
      }
    }
    
    return bestEngine;
  }, [availableEnginesList, getEnginePerformanceScore, currentGraph]);
  
  // Action wrappers with error handling
  const handleSwitchEngine = useCallback(async (
    engineType: GraphEngineType,
    options?: GraphEngineTransitionOptions
  ): Promise<void> => {
    if (!canSwitchEngine(engineType)) {
      throw new Error(`Cannot switch to engine ${engineType}: engine not available or transitioning`);
    }
    
    try {
      await switchEngine(engineType, options);
    } catch (error) {
      console.error(`Failed to switch to engine ${engineType}:`, error);
      throw error;
    }
  }, [canSwitchEngine, switchEngine]);
  
  const switchToOptimalEngine = useCallback(async (): Promise<void> => {
    const recommendedEngine = getRecommendedEngine();
    
    if (!recommendedEngine) {
      throw new Error('No optimal engine could be determined');
    }
    
    if (recommendedEngine === currentEngine) {
      console.log('Already using optimal engine:', currentEngine);
      return;
    }
    
    console.log(`Switching to optimal engine: ${recommendedEngine} (score: ${getEnginePerformanceScore(recommendedEngine)})`);
    await handleSwitchEngine(recommendedEngine);
  }, [getRecommendedEngine, currentEngine, getEnginePerformanceScore, handleSwitchEngine]);
  
  const updateCurrentEngineConfig = useCallback((config: Partial<IGraphConfig>): void => {
    updateEngineConfig(currentEngine, config);
  }, [currentEngine, updateEngineConfig]);
  
  const handleLoadGraph = useCallback(async (graph: IGraph): Promise<void> => {
    try {
      await loadGraph(graph);
    } catch (error) {
      console.error('Failed to load graph:', error);
      throw error;
    }
  }, [loadGraph]);
  
  const handlePreloadEngine = useCallback(async (engineType: GraphEngineType): Promise<void> => {
    if (!availableEngines.has(engineType)) {
      throw new Error(`Engine ${engineType} is not available`);
    }
    
    try {
      await preloadEngine(engineType);
    } catch (error) {
      console.error(`Failed to preload engine ${engineType}:`, error);
      throw error;
    }
  }, [availableEngines, preloadEngine]);
  
  const handleEngineError = useCallback((engineType: GraphEngineType, error: string) => {
    console.error(`Engine ${engineType} error:`, error);
    // Error is automatically stored in engineErrors state from the provider context
    // Optionally clear the error after some time to allow retry
    setTimeout(() => {
      clearEngineError(engineType);
    }, 10000); // Clear error after 10 seconds to allow retry
  }, [clearEngineError]);
  
  // Return memoised interface
  return useMemo<UseGraphEngineReturn>(() => ({
    // State
    currentEngine,
    currentEngineInstance,
    engineInstance: currentEngineInstance, // Backward compatibility
    availableEngines: availableEnginesList,
    isTransitioning,
    transitionProgress,
    currentGraph,
    engineLoadingStates: engineLoadingStatesRecord,
    engineErrors: engineErrorsRecord,
    settings,
    isLoading: isTransitioning,
    error: engineErrorsRecord[currentEngine] || null, // Current engine's error state
    
    // Actions
    switchEngine: handleSwitchEngine,
    switchToOptimalEngine,
    loadGraph: handleLoadGraph,
    updateCurrentEngineConfig,
    updateEngineConfig,
    updateSettings,
    resetSettings,
    preloadEngine: handlePreloadEngine,
    disposeUnusedEngines,
    clearEngineError,
    handleEngineError,
    
    // Error handling
    clearError: (engineType?: GraphEngineType) => {
      clearEngineError(engineType || currentEngine);
    },
    retryEngine: (engineType?: GraphEngineType) => {
      const targetEngine = engineType || currentEngine;
      clearEngineError(targetEngine);
      // If it's the current engine, trigger a re-initialization by switching away and back
      if (targetEngine === currentEngine) {
        handleSwitchEngine(targetEngine, { preservePositions: true });
      }
    },

    // Helpers
    canSwitchEngine,
    getRecommendedEngine,
    getEnginePerformanceScore,
    getEngineById: (engineType: GraphEngineType) => {
      // Return the engine instance if it matches the requested type
      return currentEngine === engineType ? currentEngineInstance : null;
    },
    performanceMetrics: {
      fps: 60, // Mock value
      renderTime: 16, // Mock value
      memoryUsage: 100, // Mock value
    },
  }), [
    // State dependencies
    currentEngine,
    currentEngineInstance,
    availableEnginesList,
    isTransitioning,
    transitionProgress,
    currentGraph,
    engineLoadingStatesRecord,
    engineErrorsRecord,
    settings,
    
    // Action dependencies
    handleSwitchEngine,
    switchToOptimalEngine,
    handleLoadGraph,
    updateCurrentEngineConfig,
    updateEngineConfig,
    updateSettings,
    resetSettings,
    handlePreloadEngine,
    disposeUnusedEngines,
    clearEngineError,
    handleEngineError,
    
    // Helper dependencies
    canSwitchEngine,
    getRecommendedEngine,
    getEnginePerformanceScore,
  ]);
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for accessing current engine instance directly.
 * Returns null if no engine is loaded.
 * 
 * @example
 * ```tsx
 * function GraphCanvas() {
 *   const engine = useCurrentEngine();
 *   
 *   useEffect(() => {
 *     if (engine) {
 *       engine.fitToCanvas();
 *     }
 *   }, [engine]);
 *   
 *   return <canvas ref={canvasRef} />;
 * }
 * ```
 */
export function useCurrentEngine(): IGraphVisualizationEngine | null {
  const { currentEngineInstance } = useGraphEngine();
  return currentEngineInstance;
}

/**
 * Hook for engine transition state.
 * 
 * @example
 * ```tsx
 * function TransitionIndicator() {
 *   const { isTransitioning, transitionProgress } = useEngineTransition();
 *   
 *   if (!isTransitioning) return null;
 *   
 *   return (
 *     <div className="transition-progress">
 *       <div style={{ width: `${transitionProgress}%` }} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useEngineTransition(): {
  isTransitioning: boolean;
  transitionProgress: number;
} {
  const { isTransitioning, transitionProgress } = useGraphEngine();
  return { isTransitioning, transitionProgress };
}

/**
 * Hook for engine recommendations and performance analysis.
 * 
 * @example
 * ```tsx
 * function EngineRecommendations() {
 *   const {
 *     recommendedEngine,
 *     currentEngineScore,
 *     engineScores,
 *   } = useEngineRecommendations();
 *   
 *   return (
 *     <div>
 *       <p>Recommended: {recommendedEngine}</p>
 *       <p>Current score: {currentEngineScore}</p>
 *       {engineScores.map(({ engine, score }) => (
 *         <div key={engine}>{engine}: {score}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEngineRecommendations(): {
  recommendedEngine: GraphEngineType | null;
  currentEngineScore: number;
  engineScores: Array<{ engine: GraphEngineType; score: number }>;
} {
  const {
    currentEngine,
    availableEngines,
    getRecommendedEngine,
    getEnginePerformanceScore,
  } = useGraphEngine();
  
  const recommendedEngine = useMemo(() => {
    return getRecommendedEngine();
  }, [getRecommendedEngine]);
  
  const currentEngineScore = useMemo(() => {
    return getEnginePerformanceScore(currentEngine);
  }, [getEnginePerformanceScore, currentEngine]);
  
  const engineScores = useMemo(() => {
    return availableEngines
      .map((engine) => ({
        engine,
        score: getEnginePerformanceScore(engine),
      }))
      .sort((a, b) => b.score - a.score);
  }, [availableEngines, getEnginePerformanceScore]);
  
  return {
    recommendedEngine,
    currentEngineScore,
    engineScores,
  };
}

/**
 * Hook for checking engine compatibility with current graph.
 * 
 * @example
 * ```tsx
 * function EngineCompatibility({ engineType }: { engineType: GraphEngineType }) {
 *   const {
 *     isCompatible,
 *     compatibilityIssues,
 *     performanceScore,
 *   } = useEngineCompatibility(engineType);
 *   
 *   return (
 *     <div>
 *       <div>Compatible: {isCompatible ? 'Yes' : 'No'}</div>
 *       <div>Score: {performanceScore}</div>
 *       {compatibilityIssues.map(issue => (
 *         <div key={issue} className="warning">{issue}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useEngineCompatibility(engineType: GraphEngineType): {
  isCompatible: boolean;
  compatibilityIssues: string[];
  performanceScore: number;
} {
  const context = useContext(Context);
  
  if (!context) {
    throw new Error('useEngineCompatibility must be used within a GraphEngineProvider');
  }
  
  const { currentGraph, getEngineCapabilities } = context;
  
  return useMemo(() => {
    const capabilities = getEngineCapabilities(engineType);
    if (!capabilities || !currentGraph) {
      return {
        isCompatible: false,
        compatibilityIssues: ['Engine not available or no graph loaded'],
        performanceScore: 0,
      };
    }
    
    const vertexCount = currentGraph.vertices.length;
    const edgeCount = currentGraph.edges.length;
    const issues: string[] = [];
    
    // Check vertex limit
    if (vertexCount > capabilities.performance.maxVertices) {
      issues.push(
        `Graph has ${vertexCount} vertices, exceeds engine limit of ${capabilities.performance.maxVertices}`
      );
    }
    
    // Check edge limit
    if (edgeCount > capabilities.performance.maxEdges) {
      issues.push(
        `Graph has ${edgeCount} edges, exceeds engine limit of ${capabilities.performance.maxEdges}`
      );
    }
    
    // Performance warnings
    const vertexRatio = vertexCount / capabilities.performance.maxVertices;
    const edgeRatio = edgeCount / capabilities.performance.maxEdges;
    
    if (vertexRatio > 0.8 || edgeRatio > 0.8) {
      issues.push('Graph size is near engine limits, performance may be affected');
    }
    
    // Calculate performance score
    const vertexScore = Math.min(100, (capabilities.performance.maxVertices / Math.max(vertexCount, 1)) * 100);
    const edgeScore = Math.min(100, (capabilities.performance.maxEdges / Math.max(edgeCount, 1)) * 100);
    const rawPerformance = (
      capabilities.performance.renderingSpeed * 0.4 +
      capabilities.performance.memoryEfficiency * 0.3 +
      (capabilities.performance.hardwareAccelerated ? 5 : 0) * 0.3
    ) * 20;
    
    const performanceScore = Math.round(
      (vertexScore * 0.3 + edgeScore * 0.3 + rawPerformance * 0.4)
    );
    
    return {
      isCompatible: issues.length === 0 || !issues.some(issue => issue.includes('exceeds')),
      compatibilityIssues: issues,
      performanceScore,
    };
  }, [currentGraph, getEngineCapabilities, engineType]);
}