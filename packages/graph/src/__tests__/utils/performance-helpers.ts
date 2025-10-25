/**
 * Provider health monitoring and performance test utilities
 * Provides comprehensive performance tracking and health monitoring for graph testing
 */

import type { GraphDataProvider } from '../../providers/base-provider';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  duration: number;
  memoryBefore?: number;
  memoryAfter?: number;
  memoryDelta?: number;
  cpuTime?: number;
  timestamp: number;
  operation: string;
  metadata?: Record<string, unknown>;
}

/**
 * Health monitoring configuration
 */
export interface HealthMonitorConfig {
  checkInterval?: number;
  timeout?: number;
  maxRetries?: number;
  expectedHealthy?: boolean;
  onHealthChange?: (isHealthy: boolean, provider: string) => void;
}

/**
 * Performance benchmarking options
 */
export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  memoryTracking?: boolean;
  cpuTracking?: boolean;
  timeout?: number;
  cooldownBetweenIterations?: number;
}

/**
 * Performance testing and health monitoring utility class
 */
export class PerformanceTestHelper {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private healthMonitors: Map<string, NodeJS.Timeout> = new Map();
  private healthStatus: Map<string, boolean> = new Map();

  /**
   * Measure the performance of an operation
   */
  async measurePerformance<T>(
    operation: () => Promise<T> | T,
    operationName: string,
    options: { memoryTracking?: boolean; cpuTracking?: boolean; metadata?: Record<string, unknown> } = {}
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const { memoryTracking = true, cpuTracking = false, metadata = {} } = options;

    // Force garbage collection if available (for more accurate memory measurements)
    if (typeof global !== 'undefined' && (global as Record<string, unknown>).gc) {
      const gc = (global as Record<string, unknown>).gc;
      if (typeof gc === 'function') {
        gc();
      }
    }

    const startTime = performance.now();
    const memoryBefore = memoryTracking ? this.getMemoryUsage() : undefined;
    const cpuBefore = cpuTracking ? process.cpuUsage?.() : undefined;

    let result: T;
    try {
      result = await operation();
    } catch (error) {
      const metrics: PerformanceMetrics = {
        duration: performance.now() - startTime,
        memoryBefore,
        timestamp: Date.now(),
        operation: operationName,
        metadata: { ...metadata, error: error instanceof Error ? error.message : String(error) },
      };

      this.recordMetrics(operationName, metrics);
      throw error;
    }

    const endTime = performance.now();
    const memoryAfter = memoryTracking ? this.getMemoryUsage() : undefined;
    const cpuAfter = cpuTracking ? process.cpuUsage?.(cpuBefore) : undefined;

    const metrics: PerformanceMetrics = {
      duration: endTime - startTime,
      memoryBefore,
      memoryAfter,
      memoryDelta: memoryBefore && memoryAfter ? memoryAfter - memoryBefore : undefined,
      cpuTime: cpuAfter ? cpuAfter.user + cpuAfter.system : undefined,
      timestamp: Date.now(),
      operation: operationName,
      metadata,
    };

    this.recordMetrics(operationName, metrics);

    return { result, metrics };
  }

  /**
   * Run a benchmark with multiple iterations
   */
  async benchmark<T>(
    operation: () => Promise<T> | T,
    operationName: string,
    options: BenchmarkOptions = {}
  ): Promise<{
    results: T[];
    metrics: PerformanceMetrics[];
    summary: {
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      stdDevDuration: number;
      totalMemoryDelta?: number;
      avgMemoryDelta?: number;
      totalCpuTime?: number;
    };
  }> {
    const {
      iterations = 10,
      warmupIterations = 2,
      memoryTracking = true,
      cpuTracking = false,
      timeout = 30000,
      cooldownBetweenIterations = 0,
    } = options;

    const results: T[] = [];
    const metrics: PerformanceMetrics[] = [];

    // Warmup iterations (not recorded)
    for (let i = 0; i < warmupIterations; i++) {
      await operation();
      if (cooldownBetweenIterations > 0) {
        await this.sleep(cooldownBetweenIterations);
      }
    }

    // Actual benchmark iterations
    const benchmarkStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      if (Date.now() - benchmarkStart > timeout) {
        throw new Error(`Benchmark timeout after ${i} iterations`);
      }

      const { result, metrics: iterationMetrics } = await this.measurePerformance(
        operation,
        `${operationName}_iteration_${i}`,
        { memoryTracking, cpuTracking, metadata: { iteration: i } }
      );

      results.push(result);
      metrics.push(iterationMetrics);

      if (cooldownBetweenIterations > 0 && i < iterations - 1) {
        await this.sleep(cooldownBetweenIterations);
      }
    }

    // Calculate summary statistics
    const durations = metrics.map(m => m.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
    const stdDevDuration = Math.sqrt(variance);

    const memoryDeltas = metrics.map(m => m.memoryDelta).filter(d => d !== undefined);
    const totalMemoryDelta = memoryDeltas.reduce((sum, d) => sum + d, 0);
    const avgMemoryDelta = memoryDeltas.length > 0 ? totalMemoryDelta / memoryDeltas.length : undefined;

    const cpuTimes = metrics.map(m => m.cpuTime).filter(t => t !== undefined);
    const totalCpuTime = cpuTimes.reduce((sum, t) => sum + t, 0);

    const summary = {
      avgDuration,
      minDuration,
      maxDuration,
      stdDevDuration,
      totalMemoryDelta: memoryDeltas.length > 0 ? totalMemoryDelta : undefined,
      avgMemoryDelta,
      totalCpuTime: cpuTimes.length > 0 ? totalCpuTime : undefined,
    };

    return { results, metrics, summary };
  }

  /**
   * Monitor provider health continuously
   */
  startHealthMonitoring(
    provider: GraphDataProvider,
    providerName: string,
    config: HealthMonitorConfig = {}
  ): void {
    const {
      checkInterval = 5000,
      timeout = 2000,
      maxRetries = 3,
      expectedHealthy = true,
      onHealthChange,
    } = config;

    // Clear existing monitor if present
    this.stopHealthMonitoring(providerName);

    let consecutiveFailures = 0;
    let lastHealthStatus = this.healthStatus.get(providerName);

    const checkHealth = async () => {
      try {
        const healthCheck = await this.withTimeout(
          provider.isHealthy(),
          timeout,
          `Health check timeout for ${providerName}`
        );

        const isCurrentlyHealthy = healthCheck === expectedHealthy;
        consecutiveFailures = isCurrentlyHealthy ? 0 : consecutiveFailures + 1;

        // Update health status and trigger callback if changed
        if (lastHealthStatus !== isCurrentlyHealthy) {
          this.healthStatus.set(providerName, isCurrentlyHealthy);
          if (onHealthChange) {
            onHealthChange(isCurrentlyHealthy, providerName);
          }
          lastHealthStatus = isCurrentlyHealthy;
        }

        // Log health metrics
        this.recordMetrics(`${providerName}_health_check`, {
          duration: 0,
          timestamp: Date.now(),
          operation: 'health_check',
          metadata: {
            healthy: isCurrentlyHealthy,
            consecutiveFailures,
            expectedHealthy,
          },
        });

        if (consecutiveFailures >= maxRetries) {
          throw new Error(`Provider ${providerName} failed health check ${maxRetries} times`);
        }
      } catch (error) {
        consecutiveFailures++;
        this.recordMetrics(`${providerName}_health_error`, {
          duration: 0,
          timestamp: Date.now(),
          operation: 'health_check_error',
          metadata: {
            error: error instanceof Error ? error.message : String(error),
            consecutiveFailures,
          },
        });

        if (consecutiveFailures >= maxRetries) {
          this.stopHealthMonitoring(providerName);
          throw error;
        }
      }
    };

    // Start monitoring
    const intervalId = setInterval(checkHealth, checkInterval);
    this.healthMonitors.set(providerName, intervalId);

    // Initial health check
    checkHealth().catch(() => {
      // Error handling is done in checkHealth function
    });
  }

  /**
   * Stop health monitoring for a provider
   */
  stopHealthMonitoring(providerName: string): void {
    const intervalId = this.healthMonitors.get(providerName);
    if (intervalId) {
      clearInterval(intervalId);
      this.healthMonitors.delete(providerName);
    }
  }

  /**
   * Get current health status
   */
  getHealthStatus(providerName: string): boolean | undefined {
    return this.healthStatus.get(providerName);
  }

  /**
   * Memory leak detection
   */
  async detectMemoryLeaks<T>(
    operation: () => Promise<T> | T,
    operationName: string,
    options: {
      iterations?: number;
      memoryThreshold?: number; // in MB
      gcBetweenIterations?: boolean;
    } = {}
  ): Promise<{
    hasLeak: boolean;
    memoryGrowth: number;
    metrics: PerformanceMetrics[];
  }> {
    const { iterations = 10, memoryThreshold = 10, gcBetweenIterations = true } = options;

    const metrics: PerformanceMetrics[] = [];
    let baselineMemory: number | undefined;

    for (let i = 0; i < iterations; i++) {
      if (gcBetweenIterations && typeof global !== 'undefined' && (global as Record<string, unknown>).gc) {
        const gc = (global as Record<string, unknown>).gc;
        if (typeof gc === 'function') {
          gc();
        }
        await this.sleep(100); // Allow GC to complete
      }

      const { metrics: iterationMetrics } = await this.measurePerformance(
        operation,
        `${operationName}_leak_test_${i}`,
        { memoryTracking: true, metadata: { iteration: i } }
      );

      metrics.push(iterationMetrics);

      if (i === 0 && iterationMetrics.memoryBefore !== undefined) {
        baselineMemory = iterationMetrics.memoryBefore;
      }
    }

    const finalMemory = metrics[metrics.length - 1].memoryAfter;
    const memoryGrowth = baselineMemory && finalMemory
      ? (finalMemory - baselineMemory) / (1024 * 1024) // Convert to MB
      : 0;

    const hasLeak = memoryGrowth > memoryThreshold;

    return { hasLeak, memoryGrowth, metrics };
  }

  /**
   * Performance regression testing
   */
  async performanceRegression<T>(
    operation: () => Promise<T> | T,
    operationName: string,
    baselineMetrics: PerformanceMetrics,
    options: {
      iterations?: number;
      tolerancePercent?: number;
      memoryRegressionThreshold?: number;
    } = {}
  ): Promise<{
    hasRegression: boolean;
    currentPerformance: PerformanceMetrics;
    performanceDelta: number;
    memoryDelta?: number;
  }> {
    const { iterations = 5, tolerancePercent = 20, memoryRegressionThreshold = 50 } = options;

    const { summary } = await this.benchmark(operation, operationName, { iterations });

    const currentPerformance: PerformanceMetrics = {
      duration: summary.avgDuration,
      memoryDelta: summary.avgMemoryDelta,
      timestamp: Date.now(),
      operation: operationName,
    };

    const performanceDelta = ((currentPerformance.duration - baselineMetrics.duration) / baselineMetrics.duration) * 100;

    const memoryDelta = baselineMetrics.memoryDelta && currentPerformance.memoryDelta
      ? ((currentPerformance.memoryDelta - baselineMetrics.memoryDelta) / Math.abs(baselineMetrics.memoryDelta)) * 100
      : undefined;

    const hasPerformanceRegression = performanceDelta > tolerancePercent;
    const hasMemoryRegression = memoryDelta !== undefined && memoryDelta > memoryRegressionThreshold;
    const hasRegression = hasPerformanceRegression || hasMemoryRegression;

    return {
      hasRegression,
      currentPerformance,
      performanceDelta,
      memoryDelta,
    };
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(operationName?: string): PerformanceMetrics[] {
    if (operationName) {
      return this.metrics.get(operationName) || [];
    }

    const allMetrics: PerformanceMetrics[] = [];
    for (const metrics of this.metrics.values()) {
      allMetrics.push(...metrics);
    }

    return allMetrics;
  }

  /**
   * Clear metrics
   */
  clearMetrics(operationName?: string): void {
    if (operationName) {
      this.metrics.delete(operationName);
    } else {
      this.metrics.clear();
    }
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    operations: Array<{
      name: string;
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      totalMemoryDelta?: number;
      avgMemoryDelta?: number;
    }>;
    summary: {
      totalOperations: number;
      totalDuration: number;
      avgDuration: number;
      totalMemoryDelta?: number;
    };
  } {
    const operations: Array<{
      name: string;
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      totalMemoryDelta?: number;
      avgMemoryDelta?: number;
    }> = [];

    let totalOperations = 0;
    let totalDuration = 0;
    let totalMemoryDelta = 0;
    let memoryDeltaCount = 0;

    for (const [operationName, metrics] of this.metrics) {
      const durations = metrics.map(m => m.duration);
      const memoryDeltas = metrics.map(m => m.memoryDelta).filter(d => d !== undefined);

      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);
      const operationTotalMemoryDelta = memoryDeltas.reduce((sum, d) => sum + d, 0);
      const avgMemoryDelta = memoryDeltas.length > 0 ? operationTotalMemoryDelta / memoryDeltas.length : undefined;

      operations.push({
        name: operationName,
        count: metrics.length,
        avgDuration,
        minDuration,
        maxDuration,
        totalMemoryDelta: memoryDeltas.length > 0 ? operationTotalMemoryDelta : undefined,
        avgMemoryDelta,
      });

      totalOperations += metrics.length;
      totalDuration += durations.reduce((sum, d) => sum + d, 0);
      totalMemoryDelta += operationTotalMemoryDelta;
      memoryDeltaCount += memoryDeltas.length;
    }

    const avgDuration = totalOperations > 0 ? totalDuration / totalOperations : 0;
    const finalTotalMemoryDelta = memoryDeltaCount > 0 ? totalMemoryDelta : undefined;

    return {
      operations,
      summary: {
        totalOperations,
        totalDuration,
        avgDuration,
        totalMemoryDelta: finalTotalMemoryDelta,
      },
    };
  }

  /**
   * Clean up all monitoring and metrics
   */
  cleanup(): void {
    // Stop all health monitors
    for (const [providerName] of this.healthMonitors) {
      this.stopHealthMonitoring(providerName);
    }

    // Clear all data
    this.metrics.clear();
    this.healthStatus.clear();
  }

  // Private helper methods

  private recordMetrics(operationName: string, metrics: PerformanceMetrics): void {
    if (!this.metrics.has(operationName)) {
      this.metrics.set(operationName, []);
    }
    const operationMetrics = this.metrics.get(operationName);
    if (operationMetrics) {
      operationMetrics.push(metrics);
    }
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as unknown as Record<string, unknown>).memory) {
      const memory = (performance as unknown as Record<string, unknown>).memory;
      return (memory as Record<string, unknown>).usedJSHeapSize as number;
    }
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage().heapUsed;
    }
    return 0;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    message = 'Operation timed out'
  ): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(() => { reject(new Error(message)); }, timeoutMs)
      ),
    ]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Global performance helper instance
 */
let globalPerformanceHelper: PerformanceTestHelper | null = null;

export function getPerformanceHelper(): PerformanceTestHelper {
  if (!globalPerformanceHelper) {
    globalPerformanceHelper = new PerformanceTestHelper();
  }
  return globalPerformanceHelper;
}

export function resetPerformanceHelper(): void {
  if (globalPerformanceHelper) {
    globalPerformanceHelper.cleanup();
    globalPerformanceHelper = null;
  }
}

// Auto cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', resetPerformanceHelper);
}