/**
 * Debug utilities and type definitions for graph engines
 */

/**
 * Extended Window interface for graph engine debugging
 */
declare global {
  interface Window {
    __GRAPH_ENGINE_DEBUG__?: boolean;
    __CANVAS_ENGINE_DEBUG__?: boolean;
  }
}

/**
 * Debug flags interface for graph engines
 */
export interface GraphEngineDebugFlags {
  /** Global graph engine debug mode */
  graphEngine: boolean;
  /** Canvas-specific debug mode */
  canvasEngine: boolean;
}

/**
 * Get current debug flags from window
 */
export function getDebugFlags(): GraphEngineDebugFlags {
  return {
    graphEngine: typeof window !== 'undefined' && Boolean(window.__GRAPH_ENGINE_DEBUG__),
    canvasEngine: typeof window !== 'undefined' && Boolean(window.__CANVAS_ENGINE_DEBUG__),
  };
}

/**
 * Set global graph engine debug flag
 */
export function setGraphEngineDebug(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    window.__GRAPH_ENGINE_DEBUG__ = enabled;
  }
}

/**
 * Set canvas engine debug flag
 */
export function setCanvasEngineDebug(enabled: boolean): void {
  if (typeof window !== 'undefined') {
    window.__CANVAS_ENGINE_DEBUG__ = enabled;
  }
}

/**
 * Check if any debug mode is enabled
 */
export function isAnyDebugModeEnabled(): boolean {
  const flags = getDebugFlags();
  return flags.graphEngine || flags.canvasEngine;
}

/**
 * Performance memory interface for type-safe access
 */
export interface PerformanceMemory {
  readonly usedJSHeapSize: number;
  readonly totalJSHeapSize: number;
  readonly jsHeapSizeLimit: number;
}

/**
 * Extended Performance interface with memory support
 */
declare global {
  interface Performance {
    memory?: PerformanceMemory;
  }
}

/**
 * Get memory usage in MB if available
 */
export function getMemoryUsageMB(): number | null {
  if (typeof window === 'undefined' || !window.performance?.memory) {
    return null;
  }

  return Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024);
}

// Ensure this file is treated as a module
export {};