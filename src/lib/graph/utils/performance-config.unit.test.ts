/**
 * Unit tests for performance configuration utilities
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
	detectDeviceCapabilities,
	calculateGraphMetrics,
	getOptimalPerformanceConfig,
	getConfigByGraphSize,
	PerformanceMonitor,
	PERFORMANCE_PROFILES,
} from "./performance-config";

// Mock navigator
const mockNavigator = {
	hardwareConcurrency: 4,
	userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
};

Object.defineProperty(global, "navigator", {
	value: mockNavigator,
	writable: true,
});

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});

// Mock performance
Object.defineProperty(global, "performance", {
	value: {
		now: vi.fn().mockReturnValue(1000),
		memory: {
			usedJSHeapSize: 50000000,
		},
	},
	writable: true,
});

describe("Performance Configuration Utilities", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("detectDeviceCapabilities", () => {
		it("should detect basic device capabilities", () => {
			const capabilities = detectDeviceCapabilities();

			expect(capabilities).toEqual({
				cores: 4,
				memory: expect.any(Number),
				isLowPowerMode: false,
				isMobile: false,
				supportsWebWorkers: true,
				supportsRequestAnimationFrame: true,
			});
		});

		it("should detect mobile devices", () => {
			mockNavigator.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)";

			const capabilities = detectDeviceCapabilities();

			expect(capabilities.isMobile).toBe(true);
		});

		it("should detect low power mode", () => {
			mockNavigator.userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) Safari/604.1";
			window.matchMedia = vi.fn().mockReturnValue({ matches: true });

			const capabilities = detectDeviceCapabilities();

			expect(capabilities.isLowPowerMode).toBe(true);
		});

		it("should handle missing hardwareConcurrency", () => {
			delete (mockNavigator as any).hardwareConcurrency;

			const capabilities = detectDeviceCapabilities();

			expect(capabilities.cores).toBe(4); // Default fallback
		});
	});

	describe("calculateGraphMetrics", () => {
		it("should calculate metrics for small graph", () => {
			const metrics = calculateGraphMetrics(20, 10, 2);

			expect(metrics).toEqual({
				nodeCount: 20,
				edgeCount: 10,
				density: expect.any(Number),
				pinnedNodeCount: 2,
				estimatedComplexity: "low",
			});

			expect(metrics.density).toBeGreaterThan(0);
			expect(metrics.density).toBeLessThan(1);
		});

		it("should calculate metrics for medium graph", () => {
			const metrics = calculateGraphMetrics(100, 50, 5);

			expect(metrics.estimatedComplexity).toBe("medium");
		});

		it("should calculate metrics for large graph", () => {
			const metrics = calculateGraphMetrics(500, 200, 10);

			expect(metrics.estimatedComplexity).toBe("high");
		});

		it("should calculate metrics for extreme graph", () => {
			const metrics = calculateGraphMetrics(2000, 1000, 50);

			expect(metrics.estimatedComplexity).toBe("extreme");
		});

		it("should adjust complexity based on density", () => {
			// High density small graph should be upgraded to medium
			const metrics = calculateGraphMetrics(30, 200, 0); // Very high density

			expect(metrics.estimatedComplexity).toBe("medium");
		});

		it("should handle zero edges", () => {
			const metrics = calculateGraphMetrics(10, 0, 0);

			expect(metrics.density).toBe(0);
			expect(metrics.estimatedComplexity).toBe("low");
		});
	});

	describe("getOptimalPerformanceConfig", () => {
		it("should return smooth profile for low complexity", () => {
			const metrics = calculateGraphMetrics(50, 25, 0);
			const config = getOptimalPerformanceConfig(metrics);

			expect(config.targetFPS).toBeGreaterThanOrEqual(PERFORMANCE_PROFILES.BALANCED.targetFPS);
			expect(config.alphaDecay).toBeLessThanOrEqual(PERFORMANCE_PROFILES.BALANCED.alphaDecay);
		});

		it("should return performance profile for high complexity", () => {
			const metrics = calculateGraphMetrics(800, 400, 0);
			const config = getOptimalPerformanceConfig(metrics);

			expect(config.targetFPS).toBeLessThanOrEqual(PERFORMANCE_PROFILES.BALANCED.targetFPS);
			expect(config.alphaDecay).toBeGreaterThanOrEqual(PERFORMANCE_PROFILES.BALANCED.alphaDecay);
		});

		it("should adjust for low-power devices", () => {
			const metrics = calculateGraphMetrics(100, 50, 0);
			const deviceCapabilities = {
				cores: 4,
				memory: 4,
				isLowPowerMode: true,
				isMobile: false,
				supportsWebWorkers: true,
				supportsRequestAnimationFrame: true,
			};

			const config = getOptimalPerformanceConfig(metrics, deviceCapabilities);

			expect(config.targetFPS).toBeLessThanOrEqual(30);
			expect(config.enablePerformanceMonitoring).toBe(false);
			expect(config.enablePositionInterpolation).toBe(false);
		});

		it("should adjust for mobile devices", () => {
			const metrics = calculateGraphMetrics(100, 50, 0);
			const deviceCapabilities = {
				cores: 4,
				memory: 4,
				isLowPowerMode: false,
				isMobile: true,
				supportsWebWorkers: true,
				supportsRequestAnimationFrame: true,
			};

			const config = getOptimalPerformanceConfig(metrics, deviceCapabilities);

			expect(config.targetFPS).toBeLessThanOrEqual(30);
			expect(config.sendEveryNTicks).toBeGreaterThanOrEqual(2);
		});

		it("should adjust for low-core devices", () => {
			const metrics = calculateGraphMetrics(100, 50, 0);
			const deviceCapabilities = {
				cores: 2,
				memory: 4,
				isLowPowerMode: false,
				isMobile: false,
				supportsWebWorkers: true,
				supportsRequestAnimationFrame: true,
			};

			const config = getOptimalPerformanceConfig(metrics, deviceCapabilities);

			expect(config.targetFPS).toBeLessThanOrEqual(20);
			expect(config.maxIterations).toBeLessThanOrEqual(300);
		});

		it("should disable web workers when not supported", () => {
			const metrics = calculateGraphMetrics(100, 50, 0);
			const deviceCapabilities = {
				cores: 4,
				memory: 4,
				isLowPowerMode: false,
				isMobile: false,
				supportsWebWorkers: false,
				supportsRequestAnimationFrame: true,
			};

			const config = getOptimalPerformanceConfig(metrics, deviceCapabilities);

			expect(config.useWebWorker).toBe(false);
			expect(config.targetFPS).toBeLessThanOrEqual(15);
			expect(config.maxIterations).toBeLessThanOrEqual(200);
		});

		it("should adjust for high-density graphs", () => {
			const metrics = calculateGraphMetrics(50, 200, 0); // High density
			const config = getOptimalPerformanceConfig(metrics);

			expect(config.alphaDecay).toBeGreaterThan(PERFORMANCE_PROFILES.SMOOTH.alphaDecay);
			expect(config.velocityDecay).toBeGreaterThan(PERFORMANCE_PROFILES.SMOOTH.velocityDecay);
		});

		it("should adjust for many pinned nodes", () => {
			const metrics = calculateGraphMetrics(100, 50, 40); // 40% pinned
			const config = getOptimalPerformanceConfig(metrics);

			expect(config.alphaDecay).toBeGreaterThan(PERFORMANCE_PROFILES.SMOOTH.alphaDecay);
			expect(config.maxIterations).toBeLessThan(PERFORMANCE_PROFILES.SMOOTH.maxIterations);
		});
	});

	describe("getConfigByGraphSize", () => {
		it("should return appropriate config for small graph", () => {
			const config = getConfigByGraphSize(50, 25, 0);

			expect(config.targetFPS).toBeGreaterThan(0);
			expect(config.alphaDecay).toBeGreaterThan(0);
			expect(config.maxIterations).toBeGreaterThan(0);
			expect(config.useWebWorker).toBe(true);
		});

		it("should return more conservative config for large graph", () => {
			const smallConfig = getConfigByGraphSize(50, 25, 0);
			const largeConfig = getConfigByGraphSize(1000, 500, 0);

			expect(largeConfig.targetFPS).toBeLessThanOrEqual(smallConfig.targetFPS);
			expect(largeConfig.alphaDecay).toBeGreaterThanOrEqual(smallConfig.alphaDecay);
		});
	});

	describe("PerformanceMonitor", () => {
		let monitor: PerformanceMonitor;

		beforeEach(() => {
			monitor = new PerformanceMonitor(60);
			vi.mocked(performance.now).mockReturnValue(1000);
		});

		it("should start monitoring", () => {
			monitor.start();

			expect(performance.now).toHaveBeenCalled();
		});

		it("should record frames and calculate metrics", () => {
			monitor.start();

			// Simulate frame recordings
			vi.mocked(performance.now).mockReturnValue(1016); // 16ms later (60 FPS)
			monitor.recordFrame();

			vi.mocked(performance.now).mockReturnValue(1033); // 17ms later (~59 FPS)
			monitor.recordFrame();

			vi.mocked(performance.now).mockReturnValue(1050); // 17ms later (~59 FPS)
			monitor.recordFrame();

			const metrics = monitor.getMetrics();

			expect(metrics.totalFrames).toBe(3);
			expect(metrics.averageFPS).toBeGreaterThan(50);
			expect(metrics.averageFPS).toBeLessThan(70);
			expect(metrics.minFPS).toBeGreaterThan(0);
			expect(metrics.maxFPS).toBeGreaterThan(0);
			expect(metrics.animationDuration).toBeGreaterThan(0);
		});

		it("should count frame drops", () => {
			monitor.start();

			// Simulate a frame drop (slower than target)
			vi.mocked(performance.now).mockReturnValue(1050); // 50ms later (20 FPS - below 80% of 60)
			monitor.recordFrame();

			const metrics = monitor.getMetrics();

			expect(metrics.frameDrops).toBeGreaterThan(0);
		});

		it("should limit FPS history size", () => {
			monitor.start();

			// Record more than 100 frames
			for (let i = 1; i <= 150; i++) {
				vi.mocked(performance.now).mockReturnValue(1000 + i * 16);
				monitor.recordFrame();
			}

			const metrics = monitor.getMetrics();

			expect(metrics.totalFrames).toBe(150);
			// Internal FPS history should be limited but metrics should still be calculated
			expect(metrics.averageFPS).toBeGreaterThan(0);
		});
	});
});