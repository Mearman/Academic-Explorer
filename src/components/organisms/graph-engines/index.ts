 
/**
 * Graph Engine Management System
 * 
 * A comprehensive React context provider system for managing multiple graph
 * visualization engines with seamless switching, performance monitoring,
 * error recovery, and settings persistence.
 * 
 * @version 1.0.0
 * @author Academic Explorer
 */

// Import types needed for constants
import type { GraphEngineType, GraphEngineSettings } from './types';

// ============================================================================
// Core Provider and Context
// ============================================================================

export {
  GraphEngineProvider,
  GraphEngineContext,
  GraphEngineErrorBoundary,
} from './provider';

export type {
  GraphEngineType,
  GraphEngineCapabilities,
  GraphEngineTransitionOptions,
  GraphEngineState,
  GraphEngineActions,
  GraphEngineContextValue,
  GraphEngineProviderProps,
  GraphEngineSettings,
} from './types';

// ============================================================================
// Hooks
// ============================================================================

export {
  useGraphEngine,
  useCurrentEngine,
  useEngineTransition,
  useEngineRecommendations,
  useEngineCompatibility,
} from './hooks/useGraphEngine';

export type {
  UseGraphEngineReturn,
} from './hooks/useGraphEngine';

export {
  useEngineCapabilities,
  useEnginesWithFeatures,
  useOptimalEngineForSize,
} from './hooks/useEngineCapabilities';

export type {
  UseEngineCapabilitiesReturn,
  EngineComparisonCriteria,
  EngineComparison,
  EngineRequirements,
  EngineRecommendation,
  EngineCompatibilityResult,
} from './hooks/useEngineCapabilities';

// ============================================================================
// Components
// ============================================================================

export {
  TransitionOverlay,
  ReducedMotionTransitionOverlay,
  useTransitionAnimation,
} from './TransitionOverlay';

export type {
  TransitionOverlayProps,
} from './TransitionOverlay';

export {
  GraphEngineSettings as GraphEngineSettingsComponent,
  CompactGraphEngineSettings,
  exportSettings,
  importSettings,
  downloadSettingsFile,
} from './GraphEngineSettings';

export type {
  GraphEngineSettingsProps,
} from './GraphEngineSettings';

export {
  GraphEngineErrorBoundary as DetailedErrorBoundary,
  useGraphEngineErrorHandler,
  classifyEngineError,
  GraphEngineErrorType,
  ENGINE_RECOVERY_STRATEGIES,
} from './GraphEngineErrorBoundary';

export type {
  GraphEngineError,
} from './GraphEngineErrorBoundary';

export {
  PerformanceMonitor,
  usePerformanceMonitor,
  performanceOptimizations,
} from './PerformanceMonitor';

export type {
  PerformanceMonitorProps,
  PerformanceMetrics,
  PerformanceThresholds,
} from './PerformanceMonitor';

// ============================================================================
// CSS Classes and Styles
// ============================================================================

export {
  // Container styles
  graphEngineContainer,
  graphEngineCanvas,
  
  // Transition styles
  transitionOverlay,
  transitionContent,
  transitionTitle,
  transitionDescription,
  progressContainer,
  progressBar,
  
  // Animation classes
  fadeTransitionOut,
  fadeTransitionIn,
  scaleTransitionOut,
  scaleTransitionIn,
  slideTransitionOutLeft,
  slideTransitionInLeft,
  slideTransitionOutRight,
  slideTransitionInRight,
  slideTransitionOutUp,
  slideTransitionInUp,
  slideTransitionOutDown,
  slideTransitionInDown,
  
  // State styles
  engineLoading,
  engineError,
  engineTransitioning,
  performanceWarning,
  
  // Accessibility
  accessibleTransition,
  focusVisible,
  
  // CSS variables
  transitionDurationVar,
  transitionProgressVar,
} from './transitions.css';

// ============================================================================
// Engine Implementations
// ============================================================================

// Engine implementations are dynamically imported to enable code splitting
// Static imports are available in createEngineByType function

export type {
  ICanvasConfig,
  ID3ForceConfig,
  ICytoscapeConfig,
  IWebGLConfig,
  IXyflowConfig,
} from './types';

export type {
  IVisNetworkConfig,
} from './vis-network';

// ============================================================================
// Engine Registry and Factory Functions
// ============================================================================

/**
 * Create an engine instance by type
 */
export async function createEngineByType(
  engineType: GraphEngineType
): Promise<any> {
  switch (engineType) {
    case 'canvas-2d': {
      const { createCanvasEngine } = await import('./canvas');
      return createCanvasEngine();
    }
    case 'd3-force': {
      const { createD3ForceEngine } = await import('./d3-force');
      return createD3ForceEngine();
    }
    case 'cytoscape': {
      const { createCytoscapeEngine } = await import('./cytoscape');
      return createCytoscapeEngine();
    }
    case 'webgl': {
      const { createWebGLEngine } = await import('./webgl');
      return createWebGLEngine();
    }
    case 'xyflow': {
      const { createXyflowEngine } = await import('./xyflow');
      return createXyflowEngine();
    }
    case 'vis-network': {
      const { createVisNetworkEngine } = await import('./vis-network');
      return createVisNetworkEngine();
    }
    case 'svg':
    default:
      throw new Error(`Engine ${engineType} is not yet implemented`);
  }
}

/**
 * Get all available engine types
 */
export function getAvailableEngineTypes(): GraphEngineType[] {
  return ['canvas-2d', 'd3-force', 'cytoscape', 'webgl', 'xyflow', 'vis-network'];
}

/**
 * Check if an engine type is implemented
 */
export function isEngineImplemented(engineType: GraphEngineType): boolean {
  return getAvailableEngineTypes().includes(engineType);
}

// ============================================================================
// Utility Functions and Constants
// ============================================================================

/**
 * Default engine display names for UI purposes
 */
export const ENGINE_DISPLAY_NAMES: Record<GraphEngineType, string> = {
  'canvas-2d': 'Canvas 2D',
  'svg': 'SVG Renderer',
  'webgl': 'WebGL Accelerated',
  'd3-force': 'D3 Force Simulation',
  'cytoscape': 'Cytoscape.js',
  'vis-network': 'vis-network',
  'xyflow': 'xyflow (React Flow)',
};

/**
 * Recommended engines for different use cases
 * Updated to prioritize implemented engines
 */
export const ENGINE_RECOMMENDATIONS = {
  SMALL_GRAPHS: ['xyflow', 'd3-force', 'vis-network'] as GraphEngineType[],
  MEDIUM_GRAPHS: ['xyflow', 'vis-network', 'cytoscape'] as GraphEngineType[],
  LARGE_GRAPHS: ['webgl', 'xyflow', 'canvas-2d'] as GraphEngineType[],
  INTERACTIVE: ['xyflow', 'vis-network', 'd3-force'] as GraphEngineType[],
  ANALYTICAL: ['cytoscape', 'vis-network', 'xyflow'] as GraphEngineType[],
  PRESENTATION: ['xyflow', 'd3-force', 'vis-network'] as GraphEngineType[],
  HIGH_PERFORMANCE: ['webgl', 'xyflow', 'canvas-2d'] as GraphEngineType[],
  EXPORT_QUALITY: ['xyflow', 'canvas-2d', 'd3-force'] as GraphEngineType[],
} as const;

/**
 * Performance categories for engine selection
 * Updated to reflect implemented engines
 */
export const PERFORMANCE_CATEGORIES = {
  MEMORY_EFFICIENT: ['xyflow', 'canvas-2d', 'd3-force'] as GraphEngineType[],
  CPU_EFFICIENT: ['webgl', 'xyflow'] as GraphEngineType[],
  BALANCED: ['xyflow', 'vis-network', 'd3-force'] as GraphEngineType[],
  FEATURE_RICH: ['cytoscape', 'vis-network', 'xyflow'] as GraphEngineType[],
} as const;

// ============================================================================
// Example Usage and Integration Patterns
// ============================================================================

/**
 * Example: Complete graph engine integration
 * 
 * ```tsx
 * import {
 *   GraphEngineProvider,
 *   useGraphEngine,
 *   PerformanceMonitor,
 *   GraphEngineSettingsComponent,
 *   TransitionOverlay
 * } from './graph-engines';
 * 
 * function App() {
 *   return (
 *     <GraphEngineProvider preloadDefault customEngines={{}}>
 *       <GraphVisualization />
 *       <PerformanceMonitor position="top-right" showDetails />
 *     </GraphEngineProvider>
 *   );
 * }
 * 
 * function GraphVisualization() {
 *   const {
 *     currentEngine,
 *     switchEngine,
 *     loadGraph,
 *     isTransitioning,
 *     transitionProgress,
 *   } = useGraphEngine();
 *   
 *   return (
 *     <div className="graph-container">
 *       {isTransitioning && (
 *         <TransitionOverlay
 *           isTransitioning={isTransitioning}
 *           progress={transitionProgress}
 *           fromEngine={currentEngine}
 *           toEngine={targetEngine}
 *           options={{ duration: 500, preservePositions: true }}
 *         />
 *       )}
 *       
 *       <canvas ref={canvasRef} />
 *       
 *       <div className="controls">
 *         <button onClick={() => switchEngine('webgl')}>
 *           Switch to WebGL
 *         </button>
 *         <GraphEngineSettingsComponent showAdvanced />
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * Example: Performance-aware engine switching
 * 
 * ```tsx
 * import { useGraphEngine, usePerformanceMonitor } from './graph-engines';
 * 
 * function AutoOptimizingGraph() {
 *   const { switchToOptimalEngine, getRecommendedEngine } = useGraphEngine();
 *   const { metrics, isPerformanceGood } = usePerformanceMonitor();
 *   
 *   useEffect(() => {
 *     if (!isPerformanceGood && metrics?.fps && metrics.fps < 20) {
 *       switchToOptimalEngine();
 *     }
 *   }, [isPerformanceGood, metrics, switchToOptimalEngine]);
 *   
 *   return <GraphComponent />;
 * }
 * ```
 */

/**
 * Example: Custom error handling
 * 
 * ```tsx
 * import { 
 *   GraphEngineErrorBoundary, 
 *   useGraphEngineErrorHandler 
 * } from './graph-engines';
 * 
 * function ErrorHandlingExample() {
 *   return (
 *     <GraphEngineErrorBoundary
 *       autoRecover
 *       maxRecoveryAttempts={3}
 *       onError={(error) => console.log('Engine error:', error)}
 *       onRecovery={(engine) => console.log('Recovered with:', engine)}
 *     >
 *       <GraphComponent />
 *     </GraphEngineErrorBoundary>
 *   );
 * }
 * ```
 */

// ============================================================================
// Version and Compatibility
// ============================================================================

export const GRAPH_ENGINE_SYSTEM_VERSION = '1.0.0';

export const SUPPORTED_REACT_VERSIONS = '^18.0.0 || ^19.0.0';

export const BROWSER_COMPATIBILITY = {
  chrome: '>=88',
  firefox: '>=85',
  safari: '>=14',
  edge: '>=88',
} as const;

// ============================================================================
// Migration and Upgrade Utilities
// ============================================================================

/**
 * Migrate settings from an older version
 * @param oldSettings - Settings object from previous version
 * @param fromVersion - Version to migrate from
 * @returns Migrated settings compatible with current version
 */
export function migrateSettings(
  oldSettings: any, 
  fromVersion: string
): GraphEngineSettings {
  // Migration logic would go here based on version
  console.warn('Settings migration not yet implemented for version:', fromVersion);
  return oldSettings as GraphEngineSettings;
}

/**
 * Validate settings structure
 * @param settings - Settings object to validate
 * @returns True if settings are valid
 */
export function validateSettings(settings: unknown): settings is GraphEngineSettings {
  if (!settings || typeof settings !== 'object') return false;
  
  const s = settings as any;
  
  return (
    typeof s.selectedEngine === 'string' &&
    typeof s.engineConfigs === 'object' &&
    typeof s.transitionSettings === 'object' &&
    typeof s.performanceSettings === 'object' &&
    typeof s.userPreferences === 'object'
  );
}

// ============================================================================
// Development and Debugging
// ============================================================================

/**
 * Enable debug mode for additional logging
 */
export function enableDebugMode() {
  if (typeof window !== 'undefined') {
    (window as any).__GRAPH_ENGINE_DEBUG__ = true;
    console.log('Graph engine debug mode enabled');
  }
}

/**
 * Disable debug mode
 */
export function disableDebugMode() {
  if (typeof window !== 'undefined') {
    (window as any).__GRAPH_ENGINE_DEBUG__ = false;
    console.log('Graph engine debug mode disabled');
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return typeof window !== 'undefined' && !!(window as any).__GRAPH_ENGINE_DEBUG__;
}