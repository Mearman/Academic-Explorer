/**
 * CustomSVG Engine Capabilities Declaration
 * 
 * Defines the specific capabilities and features supported by the
 * CustomSVG engine, including layout algorithms, interactions, 
 * export formats, and performance characteristics.
 */

import type {
  IEngineCapabilities,
  ILayoutCapability,
  IInteractionCapability,
  IExportCapability,
  IPerformanceCapability
} from '../types';

// ============================================================================
// Layout Capabilities
// ============================================================================

/**
 * Force-directed layout algorithm with customizable physics simulation
 */
export const FORCE_DIRECTED_LAYOUT: ILayoutCapability = {
  id: 'force-directed',
  name: 'Force-Directed',
  description: 'Physics-based layout with configurable attraction and repulsion forces',
  defaultConfig: {
    iterations: 150,
    repulsionStrength: 1000,
    attractionStrength: 0.1,
    damping: 0.9,
    nodeSpacing: 50,
    edgeLength: 100,
    centeringForce: 0.1,
    collisionRadius: 30,
  },
  supportsAnimation: true,
  canStop: true,
};

/**
 * Circular layout algorithm with configurable arrangement strategies
 */
export const CIRCULAR_LAYOUT: ILayoutCapability = {
  id: 'circular',
  name: 'Circular',
  description: 'Arranges nodes in circular patterns with optional clustering',
  defaultConfig: {
    radius: 200,
    startAngle: 0,
    strategy: 'uniform' as const, // 'uniform' | 'degree-based' | 'clustered'
    concentricLayers: 1,
    layerSpacing: 80,
    clusterSeparation: Math.PI / 6,
  },
  supportsAnimation: true,
  canStop: false,
};

/**
 * Grid layout for systematic arrangement
 */
export const GRID_LAYOUT: ILayoutCapability = {
  id: 'grid',
  name: 'Grid',
  description: 'Arranges nodes in a regular grid pattern',
  defaultConfig: {
    columns: 0, // Auto-calculate if 0
    rows: 0, // Auto-calculate if 0
    cellWidth: 100,
    cellHeight: 100,
    centerGrid: true,
    sortBy: 'id' as const, // 'id' | 'degree' | 'weight' | 'custom'
  },
  supportsAnimation: true,
  canStop: false,
};

/**
 * Hierarchical layout for tree-like structures
 */
export const HIERARCHICAL_LAYOUT: ILayoutCapability = {
  id: 'hierarchical',
  name: 'Hierarchical',
  description: 'Tree-based layout for hierarchical data structures',
  defaultConfig: {
    direction: 'top-down' as const, // 'top-down' | 'bottom-up' | 'left-right' | 'right-left'
    levelSeparation: 100,
    nodeSeparation: 50,
    treeAlignment: 'center' as const, // 'center' | 'left' | 'right'
    rootSelection: 'auto' as const, // 'auto' | 'degree' | 'specified'
  },
  supportsAnimation: true,
  canStop: false,
};

// ============================================================================
// Interaction Capabilities
// ============================================================================

/**
 * Complete interaction support for SVG-based rendering
 */
export const INTERACTION_CAPABILITIES: IInteractionCapability = {
  panZoom: true,
  vertexSelection: true,
  edgeSelection: true,
  multiSelection: true,
  vertexDragging: true,
  rectangleSelection: true,
  touchGestures: true,
  keyboardShortcuts: true,
};

// ============================================================================
// Export Capabilities
// ============================================================================

/**
 * Export format support optimized for SVG rendering
 */
export const EXPORT_CAPABILITIES: IExportCapability = {
  png: true,  // Via SVG to Canvas conversion
  svg: true,  // Native SVG export
  jpeg: true, // Via SVG to Canvas conversion
  webp: true, // Via SVG to Canvas conversion (if browser supports)
  json: true, // Graph data and positions
  customFormats: ['pdf', 'eps'] as const, // Via SVG conversion libraries
};

// ============================================================================
// Performance Capabilities
// ============================================================================

/**
 * Performance characteristics of SVG-based rendering
 */
export const PERFORMANCE_CAPABILITIES: IPerformanceCapability = {
  levelOfDetail: true,   // Simplify rendering at low zoom levels
  viewportCulling: true, // Hide elements outside viewport
  vertexInstancing: false, // SVG doesn't support true instancing
  edgeBatching: true,    // Group similar edges for rendering
  progressiveRendering: true, // Render incrementally for large graphs
  webWorkers: true,      // Layout calculations in workers
  maxVertices: 2000,     // Recommended maximum for smooth performance
  maxEdges: 5000,        // Recommended maximum for smooth performance
};

// ============================================================================
// Engine-Specific Features
// ============================================================================

/**
 * CustomSVG-specific features and configuration options
 */
export const CUSTOM_SVG_FEATURES = {
  // Rendering features
  antiAliasing: true,
  subPixelRendering: true,
  vectorScaling: true,
  cssAnimations: true,
  
  // SVG-specific capabilities
  gradients: true,
  patterns: true,
  filters: true,
  masks: true,
  clipPaths: true,
  
  // Text rendering
  advancedTypography: true,
  textOnPaths: true,
  multilineText: true,
  textMeasurement: true,
  
  // Interactivity
  hoverEffects: true,
  focusIndicators: true,
  tooltipIntegration: true,
  contextMenus: true,
  
  // Accessibility
  ariaLabels: true,
  keyboardNavigation: true,
  screenReaderSupport: true,
  highContrastMode: true,
  
  // Performance optimizations
  elementPooling: true,
  incrementalUpdates: true,
  dirtyRectTracking: true,
  requestAnimationFrame: true,
  
  // Developer features
  debugOverlays: true,
  performanceMetrics: true,
  renderingStats: true,
  memoryProfiling: true,
} as const;

// ============================================================================
// Complete Capabilities Object
// ============================================================================

/**
 * Complete capability declaration for the CustomSVG engine
 */
export const CUSTOM_SVG_CAPABILITIES: IEngineCapabilities = {
  layouts: [
    FORCE_DIRECTED_LAYOUT,
    CIRCULAR_LAYOUT,
    GRID_LAYOUT,
    HIERARCHICAL_LAYOUT,
  ],
  interactions: INTERACTION_CAPABILITIES,
  exports: EXPORT_CAPABILITIES,
  performance: PERFORMANCE_CAPABILITIES,
  customFeatures: CUSTOM_SVG_FEATURES,
};

// ============================================================================
// Capability Query Utilities
// ============================================================================

/**
 * Check if a specific layout algorithm is supported
 */
export function supportsLayout(layoutId: string): boolean {
  return CUSTOM_SVG_CAPABILITIES.layouts.some(layout => layout.id === layoutId);
}

/**
 * Get default configuration for a layout algorithm
 */
export function getLayoutDefaults(layoutId: string): Record<string, unknown> {
  const layout = CUSTOM_SVG_CAPABILITIES.layouts.find(l => l.id === layoutId);
  return layout?.defaultConfig ?? {};
}

/**
 * Check if a specific export format is supported
 */
export function supportsExportFormat(format: string): boolean {
  const {exports} = CUSTOM_SVG_CAPABILITIES;
  return (
    format === 'png' && exports.png ||
    format === 'svg' && exports.svg ||
    format === 'jpeg' && exports.jpeg ||
    format === 'webp' && exports.webp ||
    format === 'json' && exports.json ||
    exports.customFormats.includes(format)
  );
}

/**
 * Get performance recommendations for a given graph size
 */
export function getPerformanceRecommendations(vertexCount: number, edgeCount: number): {
  recommended: boolean;
  warnings: string[];
  optimizations: string[];
} {
  const perf = PERFORMANCE_CAPABILITIES;
  const warnings: string[] = [];
  const optimizations: string[] = [];
  
  if (vertexCount > perf.maxVertices) {
    warnings.push(`Vertex count (${vertexCount}) exceeds recommended maximum (${perf.maxVertices})`);
    optimizations.push('Enable viewport culling');
    optimizations.push('Use level-of-detail rendering');
  }
  
  if (edgeCount > perf.maxEdges) {
    warnings.push(`Edge count (${edgeCount}) exceeds recommended maximum (${perf.maxEdges})`);
    optimizations.push('Enable edge batching');
    optimizations.push('Consider edge filtering');
  }
  
  if (vertexCount > perf.maxVertices / 2 || edgeCount > perf.maxEdges / 2) {
    optimizations.push('Enable progressive rendering');
    optimizations.push('Use web workers for layout calculations');
  }
  
  return {
    recommended: warnings.length === 0,
    warnings,
    optimizations,
  };
}