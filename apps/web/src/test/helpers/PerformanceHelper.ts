import type { Page } from "@playwright/test";

export interface PerformanceMetrics {
	loadTime: number;
	domContentLoaded: number;
	firstPaint?: number;
	firstContentfulPaint?: number;
}

interface MemoryUsage {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
}

export class PerformanceHelper {
	private timers: Map<string, number> = new Map();

	constructor(private page: Page) {}

	/**
	 * Start a performance timer with a label
	 * @param label
	 */
	startTimer(label: string): void {
		this.timers.set(label, Date.now());
	}

	/**
	 * Stop a timer and return elapsed time in milliseconds
	 * @param label
	 * @throws Error if timer was not started
	 */
	stopTimer(label: string): number {
		const startTime = this.timers.get(label);
		if (startTime === undefined) {
			throw new Error(`Timer "${label}" was not started`);
		}
		const elapsed = Date.now() - startTime;
		this.timers.delete(label);
		return elapsed;
	}

	/**
	 * Get navigation timing metrics from the browser
	 */
	async getNavigationTiming(): Promise<PerformanceMetrics> {
		const metrics = await this.page.evaluate(() => {
			const timing = window.performance.timing;
			const navigationStart = timing.navigationStart;

			// Get paint timing entries
			const paintEntries = performance.getEntriesByType("paint");
			const firstPaint = paintEntries.find(
				(entry) => entry.name === "first-paint"
			);
			const firstContentfulPaint = paintEntries.find(
				(entry) => entry.name === "first-contentful-paint"
			);

			return {
				loadTime: timing.loadEventEnd - navigationStart,
				domContentLoaded: timing.domContentLoadedEventEnd - navigationStart,
				firstPaint: firstPaint?.startTime,
				firstContentfulPaint: firstContentfulPaint?.startTime,
			};
		});

		return metrics;
	}

	/**
	 * Navigate to a URL and measure page load performance
	 * @param url
	 */
	async measurePageLoad(url: string): Promise<PerformanceMetrics> {
		await this.page.goto(url, { waitUntil: "load" });
		return this.getNavigationTiming();
	}

	/**
	 * Assert that page load time is under a threshold
	 * @param maxMs
	 * @throws Error if load time exceeds threshold
	 */
	async assertLoadTimeUnder(maxMs: number): Promise<void> {
		const metrics = await this.getNavigationTiming();
		if (metrics.loadTime > maxMs) {
			throw new Error(
				`Page load time (${metrics.loadTime}ms) exceeded threshold (${maxMs}ms)`
			);
		}
	}

	/**
	 * Get memory usage (Chrome only)
	 * Returns null if performance.memory is not available
	 */
	async getMemoryUsage(): Promise<MemoryUsage | null> {
		const memory = await this.page.evaluate(() => {
			// @ts-expect-error - performance.memory is Chrome-specific
			if (performance.memory === undefined) {
				return null;
			}

			// @ts-expect-error - performance.memory is Chrome-specific
			const memoryInfo = performance.memory;
			return {
				usedJSHeapSize: memoryInfo.usedJSHeapSize,
				totalJSHeapSize: memoryInfo.totalJSHeapSize,
			};
		});

		return memory;
	}

	/**
	 * Log current timer value to console
	 * @param label
	 * @throws Error if timer was not started
	 */
	logPerformance(label: string): void {
		const startTime = this.timers.get(label);
		if (startTime === undefined) {
			throw new Error(`Timer "${label}" was not started`);
		}
		const elapsed = Date.now() - startTime;
		console.log(`[Performance] ${label}: ${elapsed}ms`);
	}
}

/**
 * Factory function to create a PerformanceHelper instance
 * @param page
 */
export const performanceHelper = (page: Page): PerformanceHelper => {
	return new PerformanceHelper(page);
};
