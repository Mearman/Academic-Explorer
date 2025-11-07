import { logger } from "@academic-explorer/utils/logger";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

/**
 * Performance monitoring configuration
 */
interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, fraction of users to monitor
  endpoint?: string; // Optional analytics endpoint
  thresholds: {
    // Web Vitals thresholds (in milliseconds)
    LCP: number; // Largest Contentful Paint
    FID: number; // First Input Delay
    INP: number; // Interaction to Next Paint
    CLS: number; // Cumulative Layout Shift
    FCP: number; // First Contentful Paint
    TTFB: number; // Time to First Byte
  };
}

/**
 * Performance metrics interface
 */
interface PerformanceMetrics {
  LCP?: number;
  FID?: number;
  INP?: number;
  CLS?: number;
  FCP?: number;
  TTFB?: number;
  navigationStart?: number;
  loadComplete?: number;
  domContentLoaded?: number;
  memoryUsage?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
  bundleSize?: {
    total: number;
    compressed: number;
    chunks: Array<{ name: string; size: number }>;
  };
}

/**
 * Enhanced performance monitoring system
 */
class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private loadStartTime: number = Date.now();

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0, // Monitor all users in development
      thresholds: {
        LCP: 2500, // Good: <2.5s
        FID: 100,  // Good: <100ms
        INP: 200,  // Good: <200ms
        CLS: 0.1,  // Good: <0.1
        FCP: 1800, // Good: <1.8s
        TTFB: 800, // Good: <800ms
      },
      ...config,
    };

    if (this.config.enabled && this.shouldSample()) {
      this.init();
    }
  }

  /**
   * Determine if current session should be sampled
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * Initialize performance monitoring
   */
  private init(): void {
    this.observeWebVitals();
    this.observeNavigationTiming();
    this.observeResourceTiming();
    this.observeMemoryUsage();
    this.observeLongTasks();

    // Monitor bundle loading
    this.monitorBundleLoading();

    logger.debug("performance", "Performance monitoring initialized");
  }

  /**
   * Monitor Web Vitals
   */
  private observeWebVitals(): void {
    const vitalsConfig = {
      CLS: onCLS,
      FCP: onFCP,
      INP: onINP,
      LCP: onLCP,
      TTFB: onTTFB,
    };

    Object.entries(vitalsConfig).forEach(([metric, onMetric]) => {
      (onMetric as any)(
        (value: any) => {
          this.metrics[metric as keyof PerformanceMetrics] = value;
          this.analyzeMetric(metric, value);
        },
        { reportAllChanges: true }
      );
    });
  }

  /**
   * Monitor navigation timing
   */
  private observeNavigationTiming(): void {
    if (!("performance" in window) || !("getEntriesByType" in performance)) {
      return;
    }

    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      // Use fetchStart instead of deprecated navigationStart
      this.metrics.navigationStart = nav.fetchStart;
      this.metrics.domContentLoaded = nav.domContentLoadedEventEnd - nav.fetchStart;
      this.metrics.loadComplete = nav.loadEventEnd - nav.fetchStart;
      this.metrics.TTFB = nav.responseStart - nav.requestStart;
    }
  }

  /**
   * Monitor resource loading performance
   */
  private observeResourceTiming(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "resource") {
            const resource = entry as PerformanceResourceTiming;
            this.analyzeResourceTiming(resource);
          }
        });
      });
      observer.observe({ entryTypes: ["resource"] });
      this.observers.set("resource", observer);
    } catch (error) {
      logger.debug("performance", "Resource timing observation not supported", { error });
    }
  }

  /**
   * Monitor memory usage (Chrome-specific)
   */
  private observeMemoryUsage(): void {
    if ("memory" in performance) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };

      // Monitor memory periodically
      setInterval(() => {
        const currentMemory = (performance as any).memory;
        const memoryDiff = currentMemory.usedJSHeapSize - this.metrics.memoryUsage!.usedJSHeapSize;

        if (memoryDiff > 10 * 1024 * 1024) { // 10MB increase
          logger.warn("performance", "Memory usage increased significantly", {
            before: this.formatBytes(this.metrics.memoryUsage!.usedJSHeapSize),
            after: this.formatBytes(currentMemory.usedJSHeapSize),
            increase: this.formatBytes(memoryDiff),
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Monitor long tasks that block the main thread
   */
  private observeLongTasks(): void {
    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "longtask") {
            logger.warn("performance", "Long task detected", {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        });
      });
      observer.observe({ entryTypes: ["longtask"] });
      this.observers.set("longtask", observer);
    } catch (error) {
      logger.debug("performance", "Long task observation not supported", { error });
    }
  }

  /**
   * Monitor bundle loading performance
   */
  private monitorBundleLoading(): void {
    // Track when bundles finish loading
    window.addEventListener("load", () => {
      const loadTime = Date.now() - this.loadStartTime;
      logger.info("performance", "Application loaded", {
        loadTime: `${loadTime}ms`,
        bundles: this.identifyLoadedBundles(),
      });
    });

    // Monitor dynamic imports - note: window.import may not exist in all browsers
    if ('import' in window && typeof (window as any).import === 'function') {
      const originalImport = (window as any).import;
      (window as any).import = (...args: any[]) => {
        const startTime = performance.now();
        return originalImport(...args).then(
          (module: any) => {
            const loadTime = performance.now() - startTime;
            if (loadTime > 100) { // Log slow dynamic imports
              logger.debug("performance", "Dynamic import loaded", {
                duration: `${loadTime.toFixed(2)}ms`,
                module: args[0],
              });
            }
            return module;
          },
          (error: any) => {
            const loadTime = performance.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error("performance", "Dynamic import failed", {
              duration: `${loadTime.toFixed(2)}ms`,
              module: args[0],
              error: errorMessage,
            });
            throw error;
          }
        );
      };
    }
  }

  /**
   * Identify loaded bundles from resource timing
   */
  private identifyLoadedBundles(): string[] {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    return resources
      .filter(resource => resource.name.includes('.js') && resource.name.includes('/assets/'))
      .map(resource => resource.name.split('/').pop() || 'unknown');
  }

  /**
   * Analyze individual metric against thresholds
   */
  private analyzeMetric(metric: string, value: any): void {
    const threshold = this.config.thresholds[metric as keyof typeof this.config.thresholds];
    if (!threshold) return;

    const numericValue = typeof value === 'object' && value !== null && 'value' in value ? (value as { value: number }).value : value;
    const status = this.getMetricStatus(numericValue, threshold);

    if (status === 'poor') {
      logger.warn("performance", `Poor ${metric} performance`, {
        value: this.formatMetricValue(metric, numericValue),
        threshold: this.formatMetricValue(metric, threshold),
      });
    } else if (status === 'needs-improvement') {
      logger.debug("performance", `${metric} needs improvement`, {
        value: this.formatMetricValue(metric, numericValue),
        threshold: this.formatMetricValue(metric, threshold),
      });
    }
  }

  /**
   * Analyze resource timing performance
   */
  private analyzeResourceTiming(resource: PerformanceResourceTiming): void {
    const loadTime = resource.responseEnd - resource.requestStart;
    const size = resource.transferSize || 0;

    // Log slow resources
    if (loadTime > 2000) { // 2 seconds
      logger.debug("performance", "Slow resource loading", {
        name: resource.name.split('/').pop(),
        loadTime: `${loadTime.toFixed(2)}ms`,
        size: this.formatBytes(size),
      });
    }

    // Log large resources
    if (size > 1024 * 1024) { // 1MB
      logger.debug("performance", "Large resource loaded", {
        name: resource.name.split('/').pop(),
        size: this.formatBytes(size),
        loadTime: `${loadTime.toFixed(2)}ms`,
      });
    }
  }

  /**
   * Get metric status based on threshold
   */
  private getMetricStatus(value: number, threshold: number): 'good' | 'needs-improvement' | 'poor' {
    if (value <= threshold) return 'good';
    if (value <= threshold * 1.5) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Format metric value for display
   */
  private formatMetricValue(metric: string, value: number): string {
    switch (metric) {
      case 'CLS':
        return value.toFixed(3);
      case 'LCP':
      case 'FID':
      case 'INP':
      case 'FCP':
      case 'TTFB':
        return `${value.toFixed(0)}ms`;
      default:
        return value.toString();
    }
  }

  /**
   * Format bytes for display
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get current performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  public getPerformanceScore(): number {
    let totalScore = 0;
    let metricsCount = 0;

    Object.entries(this.config.thresholds).forEach(([metric, threshold]) => {
      const value = this.metrics[metric as keyof PerformanceMetrics];
      if (value !== undefined) {
        // Skip complex objects that aren't metrics with values
        if (typeof value === 'object' && value !== null && !('value' in value)) {
          return;
        }
        const numericValue = typeof value === 'object' && value !== null && 'value' in value ? (value as { value: number }).value : value as number;
        const status = this.getMetricStatus(numericValue, threshold);

        switch (status) {
          case 'good':
            totalScore += 100;
            break;
          case 'needs-improvement':
            totalScore += 50;
            break;
          case 'poor':
            totalScore += 0;
            break;
        }
        metricsCount++;
      }
    });

    return metricsCount > 0 ? Math.round(totalScore / metricsCount) : 0;
  }

  /**
   * Cleanup observers
   */
  public destroy(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers.clear();
    logger.debug("performance", "Performance monitoring cleaned up");
  }
}

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring(config?: Partial<PerformanceConfig>): PerformanceMonitor | null {
  if (typeof window === 'undefined') return null;

  try {
    return new PerformanceMonitor(config);
  } catch (error) {
    logger.error("performance", "Failed to initialize performance monitoring", { error });
    return null;
  }
}

/**
 * Get performance metrics for debugging
 */
export function getPerformanceMetrics(): PerformanceMetrics | null {
  if (typeof window === 'undefined' || !(window as any).performanceMonitor) {
    return null;
  }

  return (window as any).performanceMonitor.getMetrics();
}

/**
 * Performance monitoring singleton
 */
let performanceMonitor: PerformanceMonitor | null = null;

export default function usePerformanceMonitoring(): PerformanceMonitor | null {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = initPerformanceMonitoring();
  }
  return performanceMonitor;
}