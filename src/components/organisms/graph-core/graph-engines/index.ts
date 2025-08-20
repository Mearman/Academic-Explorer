/**
 * Graph Engines Module
 * 
 * Provides a plugin architecture for graph rendering engines with standardized
 * interfaces and comprehensive feature support. Each engine can implement
 * different rendering strategies while maintaining consistent lifecycle management.
 * 
 * Available Engines:
 * - CustomSVG: High-performance SVG rendering with existing component integration
 * 
 * Features:
 * - Pluggable architecture with standardized interfaces
 * - Multiple layout algorithms (force-directed, circular, grid, hierarchical)
 * - Comprehensive interaction support (pan, zoom, selection, dragging)
 * - Export capabilities (PNG, SVG, JPEG, WebP, JSON)
 * - Performance monitoring and optimization
 * - Full lifecycle management with proper cleanup
 * - Zero dependencies on existing component modifications
 */

// ============================================================================
// Core Interfaces and Types
// ============================================================================

export type {
  IGraphEngine,
  IEngineCapabilities,
  IEngineConfig,
  IEngineState,
  IEngineEvent,
  IEngineEventHandlers,
  ILayoutCapability,
  IInteractionCapability,
  IExportCapability,
  IPerformanceCapability,
} from './types';

// ============================================================================
// CustomSVG Engine
// ============================================================================

export { CustomSVGEngine } from './custom-svg';
export { 
  CUSTOM_SVG_CAPABILITIES,
  supportsLayout,
  getLayoutDefaults,
  supportsExportFormat,
  getPerformanceRecommendations 
} from './custom-svg/capabilities';

// Re-export adapter utilities for advanced usage
export {
  EventBridge,
  LayoutBridge,
  CoordinateTransform,
  convertGraphToEntityFormat,
  convertEntityFormatToGraph,
  convertPositionedVertexToInterface,
  convertInterfaceToPositionedVertex,
} from './custom-svg/adapter';

// ============================================================================
// Engine Registry and Factory
// ============================================================================

import { CustomSVGEngine } from './custom-svg';
import type { IGraphEngine, IEngineConfig, IEngineEventHandlers } from './types';

/**
 * Available engine types
 */
export type EngineType = 'custom-svg';

/**
 * Engine factory function signature
 */
export type EngineFactory<TVertexData = unknown, TEdgeData = unknown> = () => 
  IGraphEngine<TVertexData, TEdgeData>;

/**
 * Registry of available graph engines
 */
class GraphEngineRegistry {
  private engines = new Map<EngineType, EngineFactory<any, any>>();
  
  constructor() {
    // Register built-in engines
    this.registerEngine('custom-svg', () => new CustomSVGEngine());
  }
  
  /**
   * Register a new engine type
   */
  registerEngine<TVertexData = unknown, TEdgeData = unknown>(
    type: EngineType,
    factory: EngineFactory<TVertexData, TEdgeData>
  ): void {
    this.engines.set(type, factory);
  }
  
  /**
   * Create an engine instance
   */
  createEngine<TVertexData = unknown, TEdgeData = unknown>(
    type: EngineType
  ): IGraphEngine<TVertexData, TEdgeData> {
    const factory = this.engines.get(type);
    if (!factory) {
      throw new Error(`Unknown engine type: ${type}`);
    }
    return factory();
  }
  
  /**
   * Get all available engine types
   */
  getAvailableEngines(): EngineType[] {
    return Array.from(this.engines.keys());
  }
  
  /**
   * Check if an engine type is available
   */
  hasEngine(type: EngineType): boolean {
    return this.engines.has(type);
  }
}

/**
 * Global engine registry instance
 */
export const engineRegistry = new GraphEngineRegistry();

// ============================================================================
// Convenience Factory Functions
// ============================================================================

/**
 * Create a new CustomSVG engine instance
 */
export function createCustomSVGEngine<TVertexData = unknown, TEdgeData = unknown>(): 
  IGraphEngine<TVertexData, TEdgeData> {
  return engineRegistry.createEngine<TVertexData, TEdgeData>('custom-svg');
}

/**
 * Create an engine instance of the specified type
 */
export function createEngine<TVertexData = unknown, TEdgeData = unknown>(
  type: EngineType
): IGraphEngine<TVertexData, TEdgeData> {
  return engineRegistry.createEngine<TVertexData, TEdgeData>(type);
}

// ============================================================================
// High-Level Engine Management
// ============================================================================

/**
 * Complete engine setup and initialization helper
 */
export async function setupGraphEngine<TVertexData = unknown, TEdgeData = unknown>({
  container,
  engineType = 'custom-svg',
  config,
  eventHandlers,
}: {
  container: HTMLElement;
  engineType?: EngineType;
  config: IEngineConfig;
  eventHandlers?: IEngineEventHandlers<TVertexData, TEdgeData>;
}): Promise<IGraphEngine<TVertexData, TEdgeData>> {
  
  const engine = createEngine<TVertexData, TEdgeData>(engineType);
  
  try {
    await engine.initialize(container, config, eventHandlers);
    return engine;
  } catch (error) {
    // Clean up on initialization failure
    engine.dispose();
    throw error;
  }
}

/**
 * Engine capability checker utility
 */
export function checkEngineCapability(
  engineType: EngineType,
  capability: 'layout' | 'export' | 'interaction' | 'performance',
  feature: string
): boolean {
  
  const engine = createEngine(engineType);
  const {capabilities} = engine;
  
  try {
    switch (capability) {
      case 'layout':
        return capabilities.layouts.some(layout => layout.id === feature);
      case 'export':
        return Boolean((capabilities.exports as any)[feature]);
      case 'interaction':
        return Boolean((capabilities.interactions as any)[feature]);
      case 'performance':
        return Boolean((capabilities.performance as any)[feature]);
      default:
        return false;
    }
  } finally {
    engine.dispose();
  }
}

/**
 * Get engine information without creating a full instance
 */
export function getEngineInfo(engineType: EngineType): {
  id: string;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
} {
  const engine = createEngine(engineType);
  
  try {
    return {
      id: engine.engineId,
      name: engine.engineName,
      version: engine.engineVersion,
      description: engine.description,
      capabilities: [
        `${engine.capabilities.layouts.length} layout algorithms`,
        `${Object.keys(engine.capabilities.exports).length} export formats`,
        `Max ${engine.capabilities.performance.maxVertices} vertices`,
        `Max ${engine.capabilities.performance.maxEdges} edges`,
      ],
    };
  } finally {
    engine.dispose();
  }
}

// ============================================================================
// Performance Optimization Utilities
// ============================================================================

/**
 * Performance optimization recommendations
 */
export function getOptimizationRecommendations(
  vertexCount: number,
  edgeCount: number,
  engineType: EngineType = 'custom-svg'
): {
  engine: EngineType;
  recommended: boolean;
  warnings: string[];
  optimizations: string[];
  alternativeEngines?: EngineType[];
} {
  
  const engine = createEngine(engineType);
  const perf = engine.capabilities.performance;
  
  try {
    const warnings: string[] = [];
    const optimizations: string[] = [];
    const alternativeEngines: EngineType[] = [];
    
    // Check vertex count
    if (vertexCount > perf.maxVertices) {
      warnings.push(`Vertex count (${vertexCount}) exceeds recommended maximum (${perf.maxVertices})`);
      
      if (perf.viewportCulling) {
        optimizations.push('Enable viewport culling to hide off-screen elements');
      }
      if (perf.levelOfDetail) {
        optimizations.push('Enable level-of-detail rendering for distant elements');
      }
      if (perf.progressiveRendering) {
        optimizations.push('Enable progressive rendering for large datasets');
      }
    }
    
    // Check edge count
    if (edgeCount > perf.maxEdges) {
      warnings.push(`Edge count (${edgeCount}) exceeds recommended maximum (${perf.maxEdges})`);
      
      if (perf.edgeBatching) {
        optimizations.push('Enable edge batching for similar edges');
      }
      optimizations.push('Consider edge filtering or clustering');
    }
    
    // Performance mode recommendations
    if (vertexCount > perf.maxVertices / 2 || edgeCount > perf.maxEdges / 2) {
      optimizations.push('Set performance mode to "performance" for better FPS');
      
      if (perf.webWorkers) {
        optimizations.push('Enable web workers for layout calculations');
      }
    }
    
    // Memory recommendations
    const estimatedMemoryMB = (vertexCount * 0.1 + edgeCount * 0.05);
    if (estimatedMemoryMB > 100) {
      warnings.push(`Estimated memory usage: ${estimatedMemoryMB.toFixed(1)}MB`);
      optimizations.push('Consider data pagination or virtualization');
    }
    
    return {
      engine: engineType,
      recommended: warnings.length === 0,
      warnings,
      optimizations,
      alternativeEngines: alternativeEngines.length > 0 ? alternativeEngines : undefined,
    };
  } finally {
    engine.dispose();
  }
}

/**
 * Automatically configure engine for optimal performance
 */
export function createOptimizedEngineConfig(
  vertexCount: number,
  edgeCount: number,
  dimensions: { width: number; height: number },
  preferences: {
    prioritizeQuality?: boolean;
    prioritizePerformance?: boolean;
    enableAnimations?: boolean;
  } = {}
): IEngineConfig {
  
  const { prioritizeQuality = false, prioritizePerformance = false, enableAnimations = true } = preferences;
  
  // Base configuration
  const config: IEngineConfig = {
    layout: {
      dimensions,
      animated: enableAnimations,
      animationDuration: prioritizePerformance ? 500 : 1000,
    },
    layoutParameters: {
      dimensions,
      animated: enableAnimations,
      animationDuration: prioritizePerformance ? 500 : 1000,
    },
    engineOptions: {
      backgroundColor: '#ffffff',
      enablePan: true,
      enableZoom: true,
      enableVertexSelection: true,
      enableEdgeSelection: true,
      enableMultiSelection: true,
      enableVertexDragging: !prioritizePerformance,
      zoomLimits: { min: 0.1, max: 5.0 },
      maxVertices: prioritizeQuality ? 5000 : 2000,
      maxEdges: prioritizeQuality ? 10000 : 5000,
      enableLOD: vertexCount > 500,
      enableCulling: vertexCount > 200,
    },
  };
  
  // Performance-based optimizations
  let performanceMode: IEngineConfig['performanceMode'];
  let engineOptions: Record<string, unknown> = {};
  
  if (prioritizePerformance || vertexCount > 1000 || edgeCount > 2000) {
    performanceMode = 'performance';
    engineOptions = {
      simplifyAtDistance: true,
      reduceLabelsAtZoom: true,
      batchSimilarElements: true,
    };
  } else if (prioritizeQuality) {
    performanceMode = 'high-quality';
    engineOptions = {
      antiAliasing: true,
      highDPIRendering: true,
      smoothAnimations: true,
    };
  } else {
    performanceMode = 'balanced';
  }
  
  // Layout-specific optimizations
  let activeLayoutId: string;
  let layoutParameters: Record<string, unknown>;
  
  if (vertexCount < 50) {
    activeLayoutId = 'force-directed';
    layoutParameters = {
      iterations: 200,
      repulsionStrength: 1200,
      attractionStrength: 0.08,
    };
  } else if (vertexCount < 200) {
    activeLayoutId = 'force-directed';
    layoutParameters = {
      iterations: 150,
      repulsionStrength: 1000,
      attractionStrength: 0.1,
    };
  } else if (vertexCount < 500) {
    activeLayoutId = 'circular';
    layoutParameters = {
      strategy: 'clustered',
    };
  } else {
    activeLayoutId = 'grid';
    layoutParameters = {
      sortBy: 'degree',
    };
  }
  
  // Return the complete configuration with all readonly properties set
  return {
    ...config,
    performanceMode,
    engineOptions,
    activeLayoutId,
    layoutParameters,
  };
}

// ============================================================================
// Development and Debugging Utilities
// ============================================================================

/**
 * Engine performance benchmarking
 */
export async function benchmarkEngine(
  engineType: EngineType,
  testSizes: Array<{ vertices: number; edges: number }>,
  duration: number = 5000
): Promise<Array<{
  size: { vertices: number; edges: number };
  averageFPS: number;
  averageRenderTime: number;
  memoryUsage: number;
}>> {
  
  const results = [];
  
  for (const size of testSizes) {
    // Create test container
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);
    
    const engine = createEngine(engineType);
    
    try {
      // Initialize engine
      await engine.initialize(container, createOptimizedEngineConfig(
        size.vertices,
        size.edges,
        { width: 800, height: 600 },
        { prioritizePerformance: true }
      ));
      
      // Generate test graph
      const vertices = Array.from({ length: size.vertices }, (_, i) => ({
        id: `v${i}`,
        label: `Vertex ${i}`,
        data: { type: 'test' },
      }));
      
      const edges = Array.from({ length: size.edges }, (_, i) => ({
        id: `e${i}`,
        sourceId: `v${Math.floor(Math.random() * size.vertices)}`,
        targetId: `v${Math.floor(Math.random() * size.vertices)}`,
        data: { weight: Math.random() },
      }));
      
      await engine.loadGraph({ vertices, edges });
      
      // Benchmark for specified duration
      const startTime = Date.now();
      const samples: number[] = [];
      const renderTimes: number[] = [];
      
      while (Date.now() - startTime < duration) {
        const renderStart = performance.now();
        engine.render();
        const renderEnd = performance.now();
        
        renderTimes.push(renderEnd - renderStart);
        
        const metrics = engine.getMetrics();
        samples.push(metrics.fps);
        
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      
      const averageFPS = samples.reduce((a, b) => a + b, 0) / samples.length;
      const averageRenderTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      
      // Estimate memory usage (rough approximation)
      const memoryUsage = (size.vertices * 100 + size.edges * 50) / 1024; // KB
      
      results.push({
        size,
        averageFPS,
        averageRenderTime,
        memoryUsage,
      });
      
    } finally {
      engine.dispose();
      document.body.removeChild(container);
    }
  }
  
  return results;
}

/**
 * Validate engine implementation
 */
export function validateEngine(engineType: EngineType): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    const engine = createEngine(engineType);
    
    // Check required properties
    if (!engine.engineId) errors.push('Missing engineId');
    if (!engine.engineName) errors.push('Missing engineName');
    if (!engine.engineVersion) errors.push('Missing engineVersion');
    if (!engine.capabilities) errors.push('Missing capabilities');
    
    // Check capabilities structure
    const caps = engine.capabilities;
    if (!caps.layouts || caps.layouts.length === 0) {
      errors.push('No layout algorithms available');
    }
    
    if (!caps.interactions) {
      errors.push('Missing interaction capabilities');
    }
    
    if (!caps.exports) {
      errors.push('Missing export capabilities');
    }
    
    if (!caps.performance) {
      warnings.push('Missing performance information');
    }
    
    // Check method implementation
    const requiredMethods = [
      'initialize', 'loadGraph', 'updateConfig', 'dispose',
      'render', 'resize', 'setViewport', 'fitToViewport',
      'setLayout', 'stopLayout', 'getPositions', 'setPositions',
      'selectVertices', 'selectEdges', 'clearSelection', 'getSelection',
      'hitTest', 'export', 'getMetrics', 'setProfilingEnabled',
      'getDebugInfo', 'screenToGraph', 'graphToScreen'
    ];
    
    for (const method of requiredMethods) {
      if (typeof (engine as any)[method] !== 'function') {
        errors.push(`Missing required method: ${method}`);
      }
    }
    
    engine.dispose();
    
  } catch (error) {
    errors.push(`Engine creation failed: ${error}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}