/**
 * Performance Helper for E2E Tests
 * Provides utilities for measuring performance metrics
 */

import { type Page } from '@playwright/test';

export interface PerformanceMetrics {
  navigationStart: number;
  domContentLoaded: number;
  loadComplete: number;
  firstPaint: number;
  firstContentfulPaint: number;
  timeToInteractive: number;
}

export interface CustomMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class PerformanceHelper {
  private readonly page: Page;
  private readonly customMetrics: Map<string, CustomMetric> = new Map();

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Get navigation timing metrics from the browser
   */
  async getNavigationMetrics(): Promise<PerformanceMetrics | null> {
    return this.page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (!perfData) {
        return null;
      }

      const paintEntries = performance.getEntriesByType('paint');
      const firstPaint = paintEntries.find((entry) => entry.name === 'first-paint');
      const firstContentfulPaint = paintEntries.find((entry) => entry.name === 'first-contentful-paint');

      return {
        navigationStart: perfData.startTime,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.startTime,
        loadComplete: perfData.loadEventEnd - perfData.startTime,
        firstPaint: firstPaint?.startTime ?? 0,
        firstContentfulPaint: firstContentfulPaint?.startTime ?? 0,
        timeToInteractive: perfData.domInteractive - perfData.startTime,
      };
    });
  }

  /**
   * Start measuring a custom performance metric
   * @param name - The metric name
   */
  startMeasure(name: string): void {
    this.customMetrics.set(name, {
      name,
      startTime: Date.now(),
    });
  }

  /**
   * End measuring a custom performance metric
   * @param name - The metric name
   */
  endMeasure(name: string): number {
    const metric = this.customMetrics.get(name);

    if (!metric) {
      throw new Error(`No measurement started for "${name}"`);
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;

    this.customMetrics.set(name, {
      ...metric,
      endTime,
      duration,
    });

    return duration;
  }

  /**
   * Get a custom metric measurement
   * @param name - The metric name
   */
  getMeasure(name: string): CustomMetric | undefined {
    return this.customMetrics.get(name);
  }

  /**
   * Get all custom metrics
   */
  getAllMeasures(): CustomMetric[] {
    return Array.from(this.customMetrics.values());
  }

  /**
   * Clear all custom metrics
   */
  clearMeasures(): void {
    this.customMetrics.clear();
  }

  /**
   * Measure graph rendering time
   * @param timeout - Maximum time to wait for graph to render
   */
  async measureGraphRendering(timeout = 30000): Promise<number> {
    this.startMeasure('graph-rendering');

    // Wait for canvas to appear
    await this.page.waitForSelector('canvas', { state: 'visible', timeout });

    // Wait for graph to have content
    await this.page.waitForFunction(
      () => {
        const canvas = document.querySelector('canvas');
        return canvas !== null && canvas.width > 0 && canvas.height > 0;
      },
      { timeout }
    );

    return this.endMeasure('graph-rendering');
  }

  /**
   * Measure search operation time
   * @param searchAction - Function that performs the search
   */
  async measureSearch(searchAction: () => Promise<void>): Promise<number> {
    this.startMeasure('search');
    await searchAction();
    return this.endMeasure('search');
  }

  /**
   * Measure page load time
   * @param url - URL to navigate to
   */
  async measurePageLoad(url: string): Promise<number> {
    this.startMeasure('page-load');
    await this.page.goto(url);
    await this.page.waitForLoadState('load');
    return this.endMeasure('page-load');
  }

  /**
   * Get memory usage information
   */
  async getMemoryUsage(): Promise<{
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  } | null> {
    return this.page.evaluate(() => {
      // @ts-expect-error - memory is non-standard
      if (performance.memory) {
        // @ts-expect-error - memory is non-standard
        const mem = performance.memory;
        return {
          usedJSHeapSize: mem.usedJSHeapSize,
          totalJSHeapSize: mem.totalJSHeapSize,
          jsHeapSizeLimit: mem.jsHeapSizeLimit,
        };
      }
      return null;
    });
  }

  /**
   * Get resource timing entries (scripts, stylesheets, images, etc.)
   */
  async getResourceTimings(): Promise<Array<{
    name: string;
    type: string;
    duration: number;
    size: number;
  }>> {
    return this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

      return resources.map((resource) => ({
        name: resource.name,
        type: resource.initiatorType,
        duration: resource.duration,
        size: resource.transferSize,
      }));
    });
  }

  /**
   * Get the total size of all loaded resources
   */
  async getTotalResourceSize(): Promise<number> {
    const resources = await this.getResourceTimings();
    return resources.reduce((total, resource) => total + resource.size, 0);
  }

  /**
   * Assert that a metric is within acceptable bounds
   * @param metricName - The metric name
   * @param maxDuration - Maximum acceptable duration in milliseconds
   */
  assertMetricWithinBounds(metricName: string, maxDuration: number): void {
    const metric = this.getMeasure(metricName);

    if (!metric) {
      throw new Error(`No measurement found for "${metricName}"`);
    }

    if (!metric.duration) {
      throw new Error(`Measurement "${metricName}" has not been completed`);
    }

    if (metric.duration > maxDuration) {
      throw new Error(
        `Performance metric "${metricName}" exceeded bounds: ${metric.duration}ms > ${maxDuration}ms`
      );
    }
  }

  /**
   * Wait for network idle (no requests in flight)
   * @param timeout - Maximum time to wait
   * @param maxInflight - Maximum number of in-flight requests to consider idle (default: 0)
   */
  async waitForNetworkIdle(timeout = 30000, maxInflight = 0): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Measure time until app is interactive (custom definition)
   * @param readySelector - Selector to determine if app is ready
   */
  async measureTimeToInteractive(readySelector = '#root'): Promise<number> {
    this.startMeasure('time-to-interactive');

    await this.page.waitForSelector(readySelector, { state: 'attached' });

    // Wait for app to be ready (no loading indicators)
    await this.page.waitForFunction(
      () => {
        const loadingIndicators = document.querySelectorAll('[data-loading="true"], .loading, .spinner');
        return loadingIndicators.length === 0;
      },
      { timeout: 30000 }
    );

    return this.endMeasure('time-to-interactive');
  }

  /**
   * Get Long Task entries (tasks that block the main thread for >50ms)
   */
  async getLongTasks(): Promise<Array<{
    name: string;
    startTime: number;
    duration: number;
  }>> {
    return this.page.evaluate(() => {
      const longTasks = performance.getEntriesByType('longtask');

      return longTasks.map((task) => ({
        name: task.name,
        startTime: task.startTime,
        duration: task.duration,
      }));
    });
  }

  /**
   * Clear browser performance data
   */
  async clearPerformanceData(): Promise<void> {
    await this.page.evaluate(() => {
      performance.clearResourceTimings();
      performance.clearMarks();
      performance.clearMeasures();
    });

    this.clearMeasures();
  }

  /**
   * Generate a performance report
   */
  async generateReport(): Promise<{
    navigation: PerformanceMetrics | null;
    custom: CustomMetric[];
    resources: {
      count: number;
      totalSize: number;
      largestResource: { name: string; size: number } | null;
    };
    memory: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    } | null;
  }> {
    const navigation = await this.getNavigationMetrics();
    const custom = this.getAllMeasures();
    const resources = await this.getResourceTimings();
    const memory = await this.getMemoryUsage();

    const largestResource = resources.length > 0
      ? resources.reduce((largest, current) =>
          current.size > largest.size ? current : largest
        )
      : null;

    return {
      navigation,
      custom,
      resources: {
        count: resources.length,
        totalSize: resources.reduce((total, r) => total + r.size, 0),
        largestResource: largestResource
          ? { name: largestResource.name, size: largestResource.size }
          : null,
      },
      memory,
    };
  }
}
