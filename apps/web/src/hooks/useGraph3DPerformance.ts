/**
 * useGraph3DPerformance - Performance monitoring hook for 3D graph visualization
 *
 * Tracks FPS, frame times, memory usage, and provides performance insights
 * to help diagnose rendering issues and optimize the visualization.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PerformanceStats {
  /** Current frames per second */
  fps: number;
  /** Average frame time in milliseconds */
  avgFrameTime: number;
  /** Minimum frame time in last sample window */
  minFrameTime: number;
  /** Maximum frame time in last sample window */
  maxFrameTime: number;
  /** Estimated memory usage in MB (if available) */
  memoryMB: number | null;
  /** Number of visible nodes */
  visibleNodes: number;
  /** Number of visible edges */
  visibleEdges: number;
  /** Performance level: 'good' (60+ fps), 'ok' (30-60), 'poor' (<30) */
  performanceLevel: 'good' | 'ok' | 'poor';
  /** Jank score (0-100, higher = more jank/stuttering) */
  jankScore: number;
  /** Whether performance monitoring is active */
  isMonitoring: boolean;
}

export interface UseGraph3DPerformanceOptions {
  /** Enable/disable monitoring (default: true) */
  enabled?: boolean;
  /** Sample window size for averaging (default: 60 frames) */
  sampleSize?: number;
  /** Update interval in milliseconds (default: 500) */
  updateIntervalMs?: number;
  /** Callback when performance drops below threshold */
  onPerformanceDrop?: (stats: PerformanceStats) => void;
  /** FPS threshold for performance drop callback (default: 30) */
  fpsThreshold?: number;
}

const DEFAULT_STATS: PerformanceStats = {
  fps: 0,
  avgFrameTime: 0,
  minFrameTime: 0,
  maxFrameTime: 0,
  memoryMB: null,
  visibleNodes: 0,
  visibleEdges: 0,
  performanceLevel: 'good',
  jankScore: 0,
  isMonitoring: false,
};

/**
 * Calculate jank score based on frame time variance
 * Higher variance = more stuttering/jank
 */
function calculateJankScore(frameTimes: number[]): number {
  if (frameTimes.length < 2) return 0;

  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const targetFrameTime = 16.67; // 60fps target

  // Calculate how many frames exceeded the target by a significant margin
  const jankFrames = frameTimes.filter(t => t > targetFrameTime * 1.5).length;
  const jankRatio = jankFrames / frameTimes.length;

  // Calculate variance
  const variance = frameTimes.reduce((sum, t) => sum + (t - avg) ** 2, 0) / frameTimes.length;
  const stdDev = Math.sqrt(variance);

  // Combine jank ratio and standard deviation into a 0-100 score
  const jankFromRatio = jankRatio * 50;
  const jankFromVariance = Math.min(50, stdDev / targetFrameTime * 25);

  return Math.round(jankFromRatio + jankFromVariance);
}

/**
 * Get memory usage if Performance API is available
 */
function getMemoryUsage(): number | null {
  // @ts-expect-error - memory is non-standard
  if (performance.memory) {
    // @ts-expect-error - memory is non-standard
    return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024 * 100) / 100;
  }
  return null;
}

/**
 * Determine performance level from FPS
 */
function getPerformanceLevel(fps: number): 'good' | 'ok' | 'poor' {
  if (fps >= 55) return 'good';
  if (fps >= 30) return 'ok';
  return 'poor';
}

export interface UseGraph3DPerformanceReturn {
  /** Current performance statistics */
  stats: PerformanceStats;
  /** Call at the start of each render frame */
  frameStart: () => void;
  /** Call at the end of each render frame */
  frameEnd: () => void;
  /** Update visible node/edge counts */
  updateVisibleCounts: (nodes: number, edges: number) => void;
  /** Reset statistics */
  reset: () => void;
  /** Start monitoring */
  startMonitoring: () => void;
  /** Stop monitoring */
  stopMonitoring: () => void;
}

/**
 * Hook for monitoring 3D graph visualization performance
 *
 * @param options - Configuration options
 * @returns Performance monitoring functions and stats
 *
 * @example
 * ```tsx
 * function Graph3DViewer() {
 *   const { stats, frameStart, frameEnd, updateVisibleCounts } = useGraph3DPerformance({
 *     onPerformanceDrop: (stats) => console.warn('Performance drop:', stats.fps),
 *   });
 *
 *   useEffect(() => {
 *     // In render loop:
 *     frameStart();
 *     // ... render ...
 *     frameEnd();
 *     updateVisibleCounts(nodes.length, edges.length);
 *   });
 *
 *   return (
 *     <div>
 *       <span>FPS: {stats.fps}</span>
 *       <span>Performance: {stats.performanceLevel}</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function useGraph3DPerformance(
  options: UseGraph3DPerformanceOptions = {}
): UseGraph3DPerformanceReturn {
  const {
    enabled = true,
    sampleSize = 60,
    updateIntervalMs = 500,
    onPerformanceDrop,
    fpsThreshold = 30,
  } = options;

  const [stats, setStats] = useState<PerformanceStats>(DEFAULT_STATS);
  const frameTimesRef = useRef<number[]>([]);
  const frameStartTimeRef = useRef<number>(0);
  const visibleCountsRef = useRef({ nodes: 0, edges: 0 });
  const isMonitoringRef = useRef(enabled);
  const lastDropCallbackRef = useRef<number>(0);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Frame timing functions
  const frameStart = useCallback(() => {
    if (!isMonitoringRef.current) return;
    frameStartTimeRef.current = performance.now();
  }, []);

  const frameEnd = useCallback(() => {
    if (!isMonitoringRef.current || frameStartTimeRef.current === 0) return;

    const frameTime = performance.now() - frameStartTimeRef.current;
    frameTimesRef.current.push(frameTime);

    // Keep only the last N samples
    if (frameTimesRef.current.length > sampleSize) {
      frameTimesRef.current.shift();
    }
  }, [sampleSize]);

  // Update visible counts
  const updateVisibleCounts = useCallback((nodes: number, edges: number) => {
    visibleCountsRef.current = { nodes, edges };
  }, []);

  // Reset statistics
  const reset = useCallback(() => {
    frameTimesRef.current = [];
    setStats(prev => ({ ...prev, ...DEFAULT_STATS, isMonitoring: isMonitoringRef.current }));
  }, []);

  // Start/stop monitoring
  const startMonitoring = useCallback(() => {
    isMonitoringRef.current = true;
    setStats(prev => ({ ...prev, isMonitoring: true }));
  }, []);

  const stopMonitoring = useCallback(() => {
    isMonitoringRef.current = false;
    setStats(prev => ({ ...prev, isMonitoring: false }));
  }, []);

  // Update stats periodically
  useEffect(() => {
    if (!enabled) return;

    const updateStats = () => {
      const frameTimes = frameTimesRef.current;

      if (frameTimes.length === 0) {
        return;
      }

      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      const fps = Math.round(1000 / avgFrameTime);
      const minFrameTime = Math.min(...frameTimes);
      const maxFrameTime = Math.max(...frameTimes);
      const jankScore = calculateJankScore(frameTimes);
      const performanceLevel = getPerformanceLevel(fps);
      const memoryMB = getMemoryUsage();

      const newStats: PerformanceStats = {
        fps,
        avgFrameTime: Math.round(avgFrameTime * 100) / 100,
        minFrameTime: Math.round(minFrameTime * 100) / 100,
        maxFrameTime: Math.round(maxFrameTime * 100) / 100,
        memoryMB,
        visibleNodes: visibleCountsRef.current.nodes,
        visibleEdges: visibleCountsRef.current.edges,
        performanceLevel,
        jankScore,
        isMonitoring: isMonitoringRef.current,
      };

      setStats(newStats);

      // Trigger performance drop callback if needed
      if (
        onPerformanceDrop &&
        fps < fpsThreshold &&
        Date.now() - lastDropCallbackRef.current > 5000 // Don't spam callback
      ) {
        lastDropCallbackRef.current = Date.now();
        onPerformanceDrop(newStats);
      }
    };

    updateIntervalRef.current = setInterval(updateStats, updateIntervalMs);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [enabled, updateIntervalMs, onPerformanceDrop, fpsThreshold]);

  // Initialize monitoring state
  useEffect(() => {
    isMonitoringRef.current = enabled;
    setStats(prev => ({ ...prev, isMonitoring: enabled }));
  }, [enabled]);

  return {
    stats,
    frameStart,
    frameEnd,
    updateVisibleCounts,
    reset,
    startMonitoring,
    stopMonitoring,
  };
}

/**
 * Performance overlay component props
 */
export interface PerformanceOverlayProps {
  stats: PerformanceStats;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
}

/**
 * Get CSS styles for performance level indicator
 */
export function getPerformanceLevelColor(level: 'good' | 'ok' | 'poor'): string {
  switch (level) {
    case 'good':
      return '#4caf50'; // Green
    case 'ok':
      return '#ff9800'; // Orange
    case 'poor':
      return '#f44336'; // Red
    default:
      return '#888888';
  }
}

/**
 * Format performance stats for display
 */
export function formatPerformanceStats(stats: PerformanceStats): string[] {
  const lines: string[] = [
    `FPS: ${stats.fps}`,
    `Frame Time: ${stats.avgFrameTime.toFixed(2)}ms`,
    `Nodes: ${stats.visibleNodes}`,
    `Edges: ${stats.visibleEdges}`,
    `Jank: ${stats.jankScore}%`,
  ];

  if (stats.memoryMB !== null) {
    lines.push(`Memory: ${stats.memoryMB}MB`);
  }

  return lines;
}
