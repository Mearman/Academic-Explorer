import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';

import { useEngineCapabilities } from './hooks/useEngineCapabilities';
import { useGraphEngine } from './hooks/useGraphEngine';
import type { GraphEngineType } from './provider';

// ============================================================================
// Performance Metrics Types
// ============================================================================

export interface PerformanceMetrics {
  /** Frame rate (FPS) */
  fps: number;
  
  /** Frame render time in milliseconds */
  frameTime: number;
  
  /** Memory usage estimation */
  memoryUsage: {
    /** Estimated vertices in memory */
    vertexCount: number;
    /** Estimated edges in memory */
    edgeCount: number;
    /** Estimated total memory usage in MB */
    estimatedMB: number;
  };
  
  /** Rendering performance */
  rendering: {
    /** Time spent rendering vertices (ms) */
    vertexRenderTime: number;
    /** Time spent rendering edges (ms) */
    edgeRenderTime: number;
    /** Time spent on layout calculations (ms) */
    layoutTime: number;
    /** Time spent on interaction handling (ms) */
    interactionTime: number;
  };
  
  /** Engine-specific metrics */
  engineMetrics: {
    /** Current engine type */
    engine: GraphEngineType;
    /** Engine load percentage (0-100) */
    engineLoad: number;
    /** Whether hardware acceleration is active */
    hardwareAccelerated: boolean;
    /** Canvas/WebGL context status */
    contextStatus: 'ok' | 'lost' | 'error';
  };
  
  /** User experience metrics */
  userExperience: {
    /** Responsiveness score (0-100) */
    responsiveness: number;
    /** Smoothness score (0-100) */
    smoothness: number;
    /** Overall performance score (0-100) */
    overall: number;
  };
  
  /** Timestamp of metrics */
  timestamp: number;
}

export interface PerformanceThresholds {
  /** Minimum acceptable FPS */
  minFPS: number;
  /** Maximum acceptable frame time (ms) */
  maxFrameTime: number;
  /** Maximum acceptable memory usage (MB) */
  maxMemoryMB: number;
  /** Maximum acceptable render time (ms) */
  maxRenderTime: number;
}

// ============================================================================
// Performance Store
// ============================================================================

interface PerformanceStore {
  metrics: PerformanceMetrics | null;
  history: PerformanceMetrics[];
  thresholds: PerformanceThresholds;
  isMonitoring: boolean;
  
  updateMetrics: (metrics: PerformanceMetrics) => void;
  setThresholds: (thresholds: Partial<PerformanceThresholds>) => void;
  startMonitoring: () => void;
  stopMonitoring: () => void;
  clearHistory: () => void;
  getAverageMetrics: (duration: number) => Partial<PerformanceMetrics> | null;
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  minFPS: 30,
  maxFrameTime: 33, // ~30 FPS
  maxMemoryMB: 500,
  maxRenderTime: 16, // ~60 FPS
};

const usePerformanceStore = create<PerformanceStore>((set, get) => ({
  metrics: null,
  history: [],
  thresholds: DEFAULT_THRESHOLDS,
  isMonitoring: false,
  
  updateMetrics: (metrics) => set((state) => ({
    metrics,
    history: [...state.history.slice(-99), metrics], // Keep last 100 entries
  })),
  
  setThresholds: (thresholds) => set((state) => ({
    thresholds: { ...state.thresholds, ...thresholds },
  })),
  
  startMonitoring: () => set({ isMonitoring: true }),
  stopMonitoring: () => set({ isMonitoring: false }),
  clearHistory: () => set({ history: [] }),
  
  getAverageMetrics: (duration) => {
    const state = get();
    const cutoff = Date.now() - duration;
    const recentMetrics = state.history.filter(m => m.timestamp >= cutoff);
    
    if (recentMetrics.length === 0) return null;
    
    // Calculate averages
    const avg = recentMetrics.reduce(
      (acc, metrics) => ({
        fps: acc.fps + metrics.fps,
        frameTime: acc.frameTime + metrics.frameTime,
        memoryUsage: {
          vertexCount: acc.memoryUsage.vertexCount + metrics.memoryUsage.vertexCount,
          edgeCount: acc.memoryUsage.edgeCount + metrics.memoryUsage.edgeCount,
          estimatedMB: acc.memoryUsage.estimatedMB + metrics.memoryUsage.estimatedMB,
        },
        userExperience: {
          responsiveness: acc.userExperience.responsiveness + metrics.userExperience.responsiveness,
          smoothness: acc.userExperience.smoothness + metrics.userExperience.smoothness,
          overall: acc.userExperience.overall + metrics.userExperience.overall,
        },
      }),
      {
        fps: 0,
        frameTime: 0,
        memoryUsage: { vertexCount: 0, edgeCount: 0, estimatedMB: 0 },
        userExperience: { responsiveness: 0, smoothness: 0, overall: 0 },
      }
    );
    
    const count = recentMetrics.length;
    return {
      fps: avg.fps / count,
      frameTime: avg.frameTime / count,
      memoryUsage: {
        vertexCount: avg.memoryUsage.vertexCount / count,
        edgeCount: avg.memoryUsage.edgeCount / count,
        estimatedMB: avg.memoryUsage.estimatedMB / count,
      },
      userExperience: {
        responsiveness: avg.userExperience.responsiveness / count,
        smoothness: avg.userExperience.smoothness / count,
        overall: avg.userExperience.overall / count,
      },
    };
  },
}));

// ============================================================================
// Performance Monitor Hook
// ============================================================================

export function usePerformanceMonitor() {
  const { currentEngine, currentGraph } = useGraphEngine();
  const performanceStore = usePerformanceStore();
  const frameRequestRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameTimesRef = useRef<number[]>([]);
  
  // Calculate performance metrics
  const calculateMetrics = useCallback((frameTime: number): PerformanceMetrics => {
    // Update frame times history (keep last 60 frames for 1-second average)
    frameTimesRef.current.push(frameTime);
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }
    
    const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
    const fps = 1000 / avgFrameTime;
    
    // Estimate memory usage
    const vertexCount = currentGraph?.vertices.length || 0;
    const edgeCount = currentGraph?.edges.length || 0;
    const estimatedMB = (vertexCount * 0.5 + edgeCount * 0.2) / 1024; // Rough estimation
    
    // Calculate UX scores
    const responsiveness = Math.min(100, Math.max(0, 100 - (avgFrameTime - 16) * 2));
    const smoothness = Math.min(100, Math.max(0, fps * 1.67)); // Scale to 0-100
    const overall = (responsiveness + smoothness) / 2;
    
    return {
      fps: Math.round(fps),
      frameTime: Math.round(avgFrameTime * 100) / 100,
      memoryUsage: {
        vertexCount,
        edgeCount,
        estimatedMB: Math.round(estimatedMB * 100) / 100,
      },
      rendering: {
        vertexRenderTime: frameTime * 0.4, // Rough estimation
        edgeRenderTime: frameTime * 0.3,
        layoutTime: frameTime * 0.2,
        interactionTime: frameTime * 0.1,
      },
      engineMetrics: {
        engine: currentEngine,
        engineLoad: Math.min(100, (avgFrameTime / 16.67) * 100),
        hardwareAccelerated: currentEngine === 'webgl',
        contextStatus: 'ok', // Simplified
      },
      userExperience: {
        responsiveness: Math.round(responsiveness),
        smoothness: Math.round(smoothness),
        overall: Math.round(overall),
      },
      timestamp: Date.now(),
    };
  }, [currentEngine, currentGraph]);
  
  // Monitor frame rate
  const monitorFrame = useCallback((timestamp: number) => {
    if (lastFrameTimeRef.current) {
      const frameTime = timestamp - lastFrameTimeRef.current;
      const metrics = calculateMetrics(frameTime);
      performanceStore.updateMetrics(metrics);
    }
    lastFrameTimeRef.current = timestamp;
    
    if (performanceStore.isMonitoring) {
      frameRequestRef.current = requestAnimationFrame(monitorFrame);
    }
  }, [calculateMetrics, performanceStore]);
  
  // Start/stop monitoring
  useEffect(() => {
    if (performanceStore.isMonitoring) {
      frameRequestRef.current = requestAnimationFrame(monitorFrame);
    } else {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    }
    
    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [performanceStore.isMonitoring, monitorFrame]);
  
  return {
    ...performanceStore,
    isPerformanceGood: useMemo(() => {
      const { metrics, thresholds } = performanceStore;
      if (!metrics) return true;
      
      return (
        metrics.fps >= thresholds.minFPS &&
        metrics.frameTime <= thresholds.maxFrameTime &&
        metrics.memoryUsage.estimatedMB <= thresholds.maxMemoryMB &&
        metrics.rendering.vertexRenderTime + metrics.rendering.edgeRenderTime <= thresholds.maxRenderTime
      );
    }, [performanceStore.metrics, performanceStore.thresholds]),
  };
}

// ============================================================================
// Performance Monitor Component
// ============================================================================

export interface PerformanceMonitorProps {
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  /** Whether to auto-start monitoring */
  autoStart?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Position of the monitor */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether to show warning when performance is poor */
  showWarnings?: boolean;
}

export function PerformanceMonitor({
  showDetails = false,
  autoStart = true,
  className,
  position = 'top-right',
  showWarnings = true,
}: PerformanceMonitorProps) {
  const {
    metrics,
    isMonitoring,
    isPerformanceGood,
    thresholds,
    startMonitoring,
    stopMonitoring,
    getAverageMetrics,
  } = usePerformanceMonitor();
  
  const { switchToOptimalEngine, getRecommendedEngine } = useGraphEngine();
  const [showOptimizationSuggestion, setShowOptimizationSuggestion] = useState(false);
  
  // Auto-start monitoring
  useEffect(() => {
    if (autoStart && !isMonitoring) {
      startMonitoring();
    }
  }, [autoStart, isMonitoring, startMonitoring]);
  
  // Check for performance issues
  useEffect(() => {
    if (metrics && showWarnings && !isPerformanceGood) {
      const avgMetrics = getAverageMetrics(5000); // 5 second average
      if (avgMetrics && avgMetrics.fps && avgMetrics.fps < thresholds.minFPS) {
        setShowOptimizationSuggestion(true);
      }
    }
  }, [metrics, showWarnings, isPerformanceGood, getAverageMetrics, thresholds]);
  
  const positionStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1000,
    ...(position === 'top-left' && { top: '1rem', left: '1rem' }),
    ...(position === 'top-right' && { top: '1rem', right: '1rem' }),
    ...(position === 'bottom-left' && { bottom: '1rem', left: '1rem' }),
    ...(position === 'bottom-right' && { bottom: '1rem', right: '1rem' }),
  };
  
  const containerStyle: React.CSSProperties = {
    ...positionStyle,
    padding: showDetails ? '1rem' : '0.5rem',
    backgroundColor: 'var(--color-cardBackground)',
    border: '1px solid var(--color-border)',
    borderRadius: '6px',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    minWidth: showDetails ? '200px' : 'auto',
    backdropFilter: 'blur(8px)',
    boxShadow: '0 4px 12px var(--color-shadowColor)',
  };
  
  if (!isMonitoring && !metrics) {
    return (
      <div className={className} style={containerStyle}>
        <button
          onClick={startMonitoring}
          style={{
            padding: '0.25rem 0.5rem',
            fontSize: '0.7rem',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: 'var(--color-text)',
            cursor: 'pointer',
          }}
        >
          Start Performance Monitor
        </button>
      </div>
    );
  }
  
  if (!metrics) return null;
  
  const getStatusColor = (value: number, threshold: number, inverted = false) => {
    const isGood = inverted ? value <= threshold : value >= threshold;
    return isGood ? 'var(--color-success)' : 'var(--color-error)';
  };
  
  return (
    <>
      <div className={className} style={containerStyle}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: showDetails ? '0.5rem' : 0,
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--color-text)' }}>
            Performance
          </div>
          <button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            style={{
              padding: '0.125rem 0.25rem',
              fontSize: '0.6rem',
              border: 'none',
              borderRadius: '2px',
              backgroundColor: isMonitoring ? 'var(--color-error)' : 'var(--color-success)',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            {isMonitoring ? 'Stop' : 'Start'}
          </button>
        </div>
        
        {/* Basic metrics */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div>
            <span style={{ color: getStatusColor(metrics.fps, thresholds.minFPS) }}>
              {metrics.fps} FPS
            </span>
          </div>
          <div>
            <span style={{ color: getStatusColor(metrics.frameTime, thresholds.maxFrameTime, true) }}>
              {metrics.frameTime}ms
            </span>
          </div>
          {showDetails && (
            <div>
              <span style={{ color: getStatusColor(metrics.memoryUsage.estimatedMB, thresholds.maxMemoryMB, true) }}>
                {metrics.memoryUsage.estimatedMB}MB
              </span>
            </div>
          )}
        </div>
        
        {/* Detailed metrics */}
        {showDetails && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.65rem' }}>
            <div style={{ color: 'var(--color-muted)' }}>
              Engine: {metrics.engineMetrics.engine} ({metrics.engineMetrics.engineLoad}% load)
            </div>
            <div style={{ color: 'var(--color-muted)' }}>
              UX Score: {metrics.userExperience.overall}/100
            </div>
            <div style={{ color: 'var(--color-muted)' }}>
              V: {metrics.memoryUsage.vertexCount}, E: {metrics.memoryUsage.edgeCount}
            </div>
          </div>
        )}
        
        {/* Performance status indicator */}
        <div style={{
          marginTop: '0.25rem',
          width: '100%',
          height: '2px',
          backgroundColor: isPerformanceGood ? 'var(--color-success)' : 'var(--color-error)',
          borderRadius: '1px',
        }} />
      </div>
      
      {/* Optimization Suggestion */}
      {showOptimizationSuggestion && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '1rem',
          backgroundColor: 'var(--color-cardBackground)',
          border: '1px solid var(--color-warning)',
          borderRadius: '8px',
          zIndex: 10001,
          maxWidth: '300px',
          textAlign: 'center',
          boxShadow: '0 8px 24px var(--color-shadowColor)',
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-warning)' }}>
            ⚡ Performance Issue Detected
          </h4>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: 'var(--color-text)' }}>
            Current FPS: {metrics.fps} (target: {thresholds.minFPS}+)
          </p>
          <p style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            Would you like to switch to a more optimized engine?
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
            <button
              onClick={() => setShowOptimizationSuggestion(false)}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                border: '1px solid var(--color-border)',
                borderRadius: '4px',
                backgroundColor: 'transparent',
                color: 'var(--color-text)',
                cursor: 'pointer',
              }}
            >
              Ignore
            </button>
            <button
              onClick={async () => {
                await switchToOptimalEngine();
                setShowOptimizationSuggestion(false);
              }}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.75rem',
                border: '1px solid var(--color-success)',
                borderRadius: '4px',
                backgroundColor: 'var(--color-success)',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              Optimize
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Performance Optimization Utilities
// ============================================================================

export const performanceOptimizations = {
  /** Debounce function to limit expensive operations */
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },
  
  /** Throttle function to limit operation frequency */
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },
  
  /** Memoize expensive computations */
  memoize: <T extends (...args: any[]) => any>(func: T): T => {
    const cache = new Map();
    return ((...args: Parameters<T>): ReturnType<T> => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  },
  
  /** Request animation frame with fallback */
  requestAnimationFrame: (callback: FrameRequestCallback): number => {
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      return window.requestAnimationFrame(callback);
    }
    return window.setTimeout(callback, 16) as any;
  },
  
  /** Cancel animation frame with fallback */
  cancelAnimationFrame: (id: number): void => {
    if (typeof window !== 'undefined' && window.cancelAnimationFrame) {
      window.cancelAnimationFrame(id);
    } else {
      window.clearTimeout(id);
    }
  },
};