/**
 * Engine Performance Indicator Component
 * 
 * Real-time performance display showing FPS, memory usage, GPU acceleration status,
 * and other key performance metrics for the active graph engine.
 */

import { clsx } from 'clsx';
import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useEngineCapabilities } from '../graph-engines/hooks/useEngineCapabilities';
import { useGraphEngine } from '../graph-engines/hooks/useGraphEngine';
import type { GraphEngineType } from '../graph-engines/provider';

import {
  performanceIndicator,
  performanceHeader,
  performanceTitle,
  performanceStatus,
  performanceMetrics,
  performanceMetric,
  metricValue,
  metricLabel,
  metricUnit,
} from './components.css';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EnginePerformanceIndicatorProps {
  /** Engine to monitor (defaults to current engine) */
  engineType?: GraphEngineType;
  
  /** Update interval in milliseconds */
  updateInterval?: number;
  
  /** Whether to show detailed metrics */
  showDetails?: boolean;
  
  /** Whether to auto-hide when performance is good */
  autoHide?: boolean;
  
  /** Whether to show performance history */
  showHistory?: boolean;
  
  /** Position of the indicator */
  position?: string;
  
  /** Custom CSS class name */
  className?: string;
  
  /** Test ID for automation */
  'data-testid'?: string;
}

interface PerformanceMetrics {
  frameRate: number;
  memoryUsage: number;
  verticesRendered: number;
  edgesRendered: number;
  lastRenderTime: number;
  gpuAccelerated: boolean;
  timestamp: number;
}

interface PerformanceHistory {
  frameRates: number[];
  memoryUsages: number[];
  renderTimes: number[];
  timestamps: number[];
}

type PerformanceStatus = 'excellent' | 'good' | 'moderate' | 'poor' | 'unknown';

// ============================================================================
// Performance Monitoring Hook
// ============================================================================

function usePerformanceMonitoring(
  engineType: GraphEngineType | undefined,
  updateInterval: number
): {
  metrics: PerformanceMetrics | null;
  history: PerformanceHistory;
  status: PerformanceStatus;
  isMonitoring: boolean;
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [history, setHistory] = useState<PerformanceHistory>({
    frameRates: [],
    memoryUsages: [],
    renderTimes: [],
    timestamps: [],
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsRef = useRef<number>(0);
  
  // Performance status calculation
  const status = React.useMemo((): PerformanceStatus => {
    if (!metrics) return 'unknown';
    
    const { frameRate, memoryUsage, lastRenderTime } = metrics;
    
    // Calculate overall performance score
    const fpsScore = Math.min(100, (frameRate / 60) * 100);
    const memoryScore = Math.max(0, 100 - (memoryUsage / (1024 * 1024 * 100)) * 100); // Based on 100MB baseline
    const renderScore = Math.max(0, 100 - (lastRenderTime / 16.67) * 100); // Based on 16.67ms (60fps)
    
    const overallScore = (fpsScore * 0.4 + memoryScore * 0.3 + renderScore * 0.3);
    
    if (overallScore >= 80) return 'excellent';
    if (overallScore >= 65) return 'good';
    if (overallScore >= 45) return 'moderate';
    return 'poor';
  }, [metrics]);
  
  // FPS calculation using requestAnimationFrame
  const calculateFPS = useCallback(() => {
    const now = performance.now();
    frameCountRef.current++;
    
    if (now - lastTimeRef.current >= 1000) {
      fpsRef.current = Math.round((frameCountRef.current * 1000) / (now - lastTimeRef.current));
      frameCountRef.current = 0;
      lastTimeRef.current = now;
    }
    
    if (isMonitoring) {
      animationFrameRef.current = requestAnimationFrame(calculateFPS);
    }
  }, [isMonitoring]);
  
  // Memory usage estimation
  const getMemoryUsage = useCallback((): number => {
    // Modern browsers support performance.memory
    if ('memory' in performance) {
      const { memory } = performance as Performance & { memory?: { usedJSHeapSize: number } };
      return memory?.usedJSHeapSize || 0;
    }
    
    // Fallback estimation based on DOM elements and canvas
    const canvasElements = document.querySelectorAll('canvas, svg');
    let estimatedMemory = 0;
    
    canvasElements.forEach(element => {
      if (element instanceof HTMLCanvasElement) {
        const context = element.getContext('2d');
        if (context) {
          const imageData = context.getImageData(0, 0, element.width, element.height);
          estimatedMemory += imageData.data.length;
        }
      }
    });
    
    return estimatedMemory;
  }, []);
  
  // GPU acceleration detection
  const isGPUAccelerated = useCallback((): boolean => {
    const canvas = document.createElement('canvas');
    const contexts = ['webgl2', 'webgl', 'experimental-webgl'];
    
    for (const contextType of contexts) {
      try {
        const context = canvas.getContext(contextType as 'webgl' | 'webgl2' | 'experimental-webgl') as WebGLRenderingContext | null;
        if (context) {
          const debugInfo = context.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            const renderer = context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
            return !renderer.toLowerCase().includes('software');
          }
          return true; // Assume hardware acceleration if WebGL is available
        }
      } catch {
        continue;
      }
    }
    
    return false;
  }, []);
  
  // Update metrics
  const updateMetrics = useCallback(() => {
    const now = performance.now();
    const renderStart = performance.now();
    
    // Simulate a small render operation to measure render time
    requestAnimationFrame(() => {
      const renderTime = performance.now() - renderStart;
      
      const newMetrics: PerformanceMetrics = {
        frameRate: fpsRef.current,
        memoryUsage: getMemoryUsage(),
        verticesRendered: 0, // Would be provided by actual graph engine
        edgesRendered: 0,    // Would be provided by actual graph engine
        lastRenderTime: renderTime,
        gpuAccelerated: isGPUAccelerated(),
        timestamp: now,
      };
      
      setMetrics(newMetrics);
      
      // Update history (keep last 60 samples)
      setHistory(prev => {
        const maxSamples = 60;
        return {
          frameRates: [...prev.frameRates, newMetrics.frameRate].slice(-maxSamples),
          memoryUsages: [...prev.memoryUsages, newMetrics.memoryUsage].slice(-maxSamples),
          renderTimes: [...prev.renderTimes, newMetrics.lastRenderTime].slice(-maxSamples),
          timestamps: [...prev.timestamps, newMetrics.timestamp].slice(-maxSamples),
        };
      });
    });
  }, [getMemoryUsage, isGPUAccelerated]);
  
  // Start/stop monitoring
  useEffect(() => {
    if (!engineType) {
      setIsMonitoring(false);
      return;
    }
    
    setIsMonitoring(true);
    
    // Start FPS monitoring
    lastTimeRef.current = performance.now();
    frameCountRef.current = 0;
    calculateFPS();
    
    // Start metrics updates
    const interval = setInterval(updateMetrics, updateInterval);
    
    return () => {
      setIsMonitoring(false);
      clearInterval(interval);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [engineType, updateInterval, calculateFPS, updateMetrics]);
  
  return { metrics, history, status, isMonitoring };
}

// ============================================================================
// Component Implementation
// ============================================================================

export function EnginePerformanceIndicator({
  engineType,
  updateInterval = 1000,
  showDetails = true,
  autoHide = false,
  className,
  'data-testid': testId = 'engine-performance-indicator',
}: EnginePerformanceIndicatorProps): React.JSX.Element {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  
  const { currentEngine } = useGraphEngine();
  const { getCapabilities } = useEngineCapabilities();
  
  const activeEngine = engineType || currentEngine;
  const _capabilities = getCapabilities(activeEngine);
  
  const { metrics, history, status, isMonitoring } = usePerformanceMonitoring(
    activeEngine,
    updateInterval
  );
  
  // ============================================================================
  // Average Calculations (must be calculated before any early returns)
  // ============================================================================
  
  const averageMetrics = React.useMemo(() => {
    if (history.frameRates.length === 0) return null;
    
    const avgFPS = history.frameRates.reduce((a, b) => a + b, 0) / history.frameRates.length;
    const avgMemory = history.memoryUsages.reduce((a, b) => a + b, 0) / history.memoryUsages.length;
    const avgRenderTime = history.renderTimes.reduce((a, b) => a + b, 0) / history.renderTimes.length;
    
    return {
      avgFPS: Math.round(avgFPS),
      avgMemory,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
    };
  }, [history]);

  // ============================================================================
  // Auto-hide Logic
  // ============================================================================
  
  const shouldHide = React.useMemo(() => {
    return autoHide && status === 'excellent' && metrics && metrics.frameRate >= 55;
  }, [autoHide, status, metrics]);
  
  if (shouldHide) {
    return <div data-testid={testId} style={{ display: 'none' }} />;
  }
  
  // ============================================================================
  // Helper Functions
  // ============================================================================
  
  const formatMemoryUsage = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getStatusIcon = (status: PerformanceStatus): string => {
    switch (status) {
      case 'excellent': return 'STAR';
      case 'good': return 'GOOD';
      case 'moderate': return 'WARN';
      case 'poor': return 'POOR';
      default: return 'UNKNOWN';
    }
  };
  
  const getStatusLabel = (status: PerformanceStatus): string => {
    switch (status) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'moderate': return 'Moderate';
      case 'poor': return 'Poor';
      default: return 'Unknown';
    }
  };
  
  // ============================================================================
  // Render
  // ============================================================================
  
  if (!activeEngine || !isMonitoring) {
    return (
      <div
        className={clsx(performanceIndicator, className)}
        data-testid={testId}
      >
        <div className={performanceHeader}>
          <div className={performanceTitle}>Performance</div>
          <div className={performanceStatus({ status: 'unknown' })}>
            <span aria-hidden="true">❓</span>
            <span>Not Monitoring</span>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className={clsx(performanceIndicator, className)}
      data-testid={testId}
      aria-label="Graph engine performance metrics"
    >
      {/* Header */}
      <div className={performanceHeader}>
        <div className={performanceTitle}>Performance</div>
        <div
          className={performanceStatus({ status })}
          title={`Overall performance: ${getStatusLabel(status)}`}
          data-testid={`${testId}-status`}
        >
          <span aria-hidden="true">{getStatusIcon(status)}</span>
          <span>{getStatusLabel(status)}</span>
        </div>
      </div>
      
      {/* Metrics */}
      {showDetails && metrics && (
        <div className={performanceMetrics} data-testid={`${testId}-metrics`}>
          {/* Frame Rate */}
          <div className={performanceMetric}>
            <div className={metricValue} data-testid={`${testId}-fps`}>
              {metrics.frameRate}
              <span className={metricUnit}>fps</span>
            </div>
            <div className={metricLabel}>
              Frame Rate
              {averageMetrics && (
                <div style={{ fontSize: '10px', color: 'inherit', opacity: 0.7 }}>
                  avg: {averageMetrics.avgFPS}
                </div>
              )}
            </div>
          </div>
          
          {/* Memory Usage */}
          <div className={performanceMetric}>
            <div className={metricValue} data-testid={`${testId}-memory`}>
              {formatMemoryUsage(metrics.memoryUsage)}
            </div>
            <div className={metricLabel}>
              Memory Usage
              {averageMetrics && (
                <div style={{ fontSize: '10px', color: 'inherit', opacity: 0.7 }}>
                  avg: {formatMemoryUsage(averageMetrics.avgMemory)}
                </div>
              )}
            </div>
          </div>
          
          {/* Render Time */}
          <div className={performanceMetric}>
            <div className={metricValue} data-testid={`${testId}-render-time`}>
              {metrics.lastRenderTime.toFixed(1)}
              <span className={metricUnit}>ms</span>
            </div>
            <div className={metricLabel}>
              Render Time
              {averageMetrics && (
                <div style={{ fontSize: '10px', color: 'inherit', opacity: 0.7 }}>
                  avg: {averageMetrics.avgRenderTime}ms
                </div>
              )}
            </div>
          </div>
          
          {/* GPU Status */}
          <div className={performanceMetric}>
            <div className={metricValue} data-testid={`${testId}-gpu`}>
              {metrics.gpuAccelerated ? 'FAST' : 'SLOW'}
            </div>
            <div className={metricLabel}>
              {metrics.gpuAccelerated ? 'GPU Enabled' : 'Software Only'}
            </div>
          </div>
          
          {/* Graph Size */}
          {(metrics.verticesRendered > 0 || metrics.edgesRendered > 0) && (
            <>
              <div className={performanceMetric}>
                <div className={metricValue} data-testid={`${testId}-vertices`}>
                  {metrics.verticesRendered.toLocaleString()}
                </div>
                <div className={metricLabel}>Vertices</div>
              </div>
              
              <div className={performanceMetric}>
                <div className={metricValue} data-testid={`${testId}-edges`}>
                  {metrics.edgesRendered.toLocaleString()}
                </div>
                <div className={metricLabel}>Edges</div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Display Name
// ============================================================================

EnginePerformanceIndicator.displayName = 'EnginePerformanceIndicator';

// Named export only - no default export