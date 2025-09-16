/**
 * Performance Configuration Utility
 * Automatically adjusts animation and layout settings based on graph size and device capabilities
 */

import { logger } from "@/lib/logger";

export interface PerformanceConfig {
  // Animation settings
  targetFPS: number;
  sendEveryNTicks: number;
  alphaDecay: number;
  maxIterations: number;

  // Force simulation settings
  linkDistance: number;
  linkStrength: number;
  chargeStrength: number;
  centerStrength: number;
  collisionRadius: number;
  collisionStrength: number;
  velocityDecay: number;

  // Rendering settings
  useWebWorker: boolean;
  enableProgressUpdates: boolean;
  enablePerformanceMonitoring: boolean;

  // Memory management
  positionUpdateBatchSize: number;
  enablePositionInterpolation: boolean;
}

export interface DeviceCapabilities {
  cores: number;
  memory: number; // GB estimate
  isLowPowerMode: boolean;
  isMobile: boolean;
  supportsWebWorkers: boolean;
  supportsRequestAnimationFrame: boolean;
}

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number; // edges / (nodes * (nodes - 1) / 2)
  pinnedNodeCount: number;
  estimatedComplexity: "low" | "medium" | "high" | "extreme";
}

// Performance profiles for different scenarios
export const PERFORMANCE_PROFILES = {
	SMOOTH: {
		targetFPS: 60,
		sendEveryNTicks: 1,
		alphaDecay: 0.01,
		maxIterations: 800,
		linkDistance: 100,
		linkStrength: 0.01,
		chargeStrength: -1000,
		centerStrength: 0.01,
		collisionRadius: 120,
		collisionStrength: 1.0,
		velocityDecay: 0.1,
		useWebWorker: true,
		enableProgressUpdates: true,
		enablePerformanceMonitoring: true,
		positionUpdateBatchSize: 50,
		enablePositionInterpolation: true,
	},

	BALANCED: {
		targetFPS: 30,
		sendEveryNTicks: 2,
		alphaDecay: 0.02,
		maxIterations: 600,
		linkDistance: 80,
		linkStrength: 0.015,
		chargeStrength: -800,
		centerStrength: 0.015,
		collisionRadius: 100,
		collisionStrength: 0.8,
		velocityDecay: 0.15,
		useWebWorker: true,
		enableProgressUpdates: true,
		enablePerformanceMonitoring: true,
		positionUpdateBatchSize: 100,
		enablePositionInterpolation: false,
	},

	PERFORMANCE: {
		targetFPS: 15,
		sendEveryNTicks: 4,
		alphaDecay: 0.05,
		maxIterations: 400,
		linkDistance: 60,
		linkStrength: 0.02,
		chargeStrength: -600,
		centerStrength: 0.02,
		collisionRadius: 80,
		collisionStrength: 0.6,
		velocityDecay: 0.2,
		useWebWorker: true,
		enableProgressUpdates: false,
		enablePerformanceMonitoring: false,
		positionUpdateBatchSize: 200,
		enablePositionInterpolation: false,
	},

	EXTREME: {
		targetFPS: 10,
		sendEveryNTicks: 8,
		alphaDecay: 0.1,
		maxIterations: 200,
		linkDistance: 40,
		linkStrength: 0.03,
		chargeStrength: -400,
		centerStrength: 0.03,
		collisionRadius: 60,
		collisionStrength: 0.4,
		velocityDecay: 0.3,
		useWebWorker: true,
		enableProgressUpdates: false,
		enablePerformanceMonitoring: false,
		positionUpdateBatchSize: 500,
		enablePositionInterpolation: false,
	},
} as const;

// Detect device capabilities
export function detectDeviceCapabilities(): DeviceCapabilities {
	const cores = navigator.hardwareConcurrency || 4;

	// Estimate memory (very rough)
	const memory = (navigator as any).deviceMemory ||
    (cores >= 8 ? 8 : cores >= 4 ? 4 : 2);

	// Detect low power mode (iOS Safari)
	const isLowPowerMode = (navigator as any).userAgent?.includes("Safari") &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

	// Detect mobile
	const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	);

	// Feature detection
	const supportsWebWorkers = typeof Worker !== "undefined";
	const supportsRequestAnimationFrame = typeof requestAnimationFrame !== "undefined" &&
    typeof (self as any).requestAnimationFrame !== "undefined";

	return {
		cores,
		memory,
		isLowPowerMode: isLowPowerMode || false,
		isMobile,
		supportsWebWorkers,
		supportsRequestAnimationFrame,
	};
}

// Calculate graph complexity metrics
export function calculateGraphMetrics(nodeCount: number, edgeCount: number, pinnedNodeCount = 0): GraphMetrics {
	const maxPossibleEdges = nodeCount * (nodeCount - 1) / 2;
	const density = maxPossibleEdges > 0 ? edgeCount / maxPossibleEdges : 0;

	let estimatedComplexity: GraphMetrics["estimatedComplexity"];

	if (nodeCount < 50) {
		estimatedComplexity = "low";
	} else if (nodeCount < 200) {
		estimatedComplexity = "medium";
	} else if (nodeCount < 1000) {
		estimatedComplexity = "high";
	} else {
		estimatedComplexity = "extreme";
	}

	// Adjust complexity based on density
	if (density > 0.1 && estimatedComplexity === "low") {
		estimatedComplexity = "medium";
	} else if (density > 0.05 && estimatedComplexity === "medium") {
		estimatedComplexity = "high";
	} else if (density > 0.02 && estimatedComplexity === "high") {
		estimatedComplexity = "extreme";
	}

	return {
		nodeCount,
		edgeCount,
		density,
		pinnedNodeCount,
		estimatedComplexity,
	};
}

// Get optimal configuration based on graph and device characteristics
export function getOptimalPerformanceConfig(
	graphMetrics: GraphMetrics,
	deviceCapabilities?: DeviceCapabilities
): PerformanceConfig {
	const device = deviceCapabilities || detectDeviceCapabilities();

	logger.info("graph", "Calculating optimal performance config", {
		graphMetrics,
		deviceCapabilities: device,
	});

	// Start with base profile based on graph complexity
	let baseProfile: PerformanceConfig;

	switch (graphMetrics.estimatedComplexity) {
		case "low":
			baseProfile = { ...PERFORMANCE_PROFILES.SMOOTH };
			break;
		case "medium":
			baseProfile = { ...PERFORMANCE_PROFILES.BALANCED };
			break;
		case "high":
			baseProfile = { ...PERFORMANCE_PROFILES.PERFORMANCE };
			break;
		case "extreme":
			baseProfile = { ...PERFORMANCE_PROFILES.EXTREME };
			break;
		default:
			baseProfile = { ...PERFORMANCE_PROFILES.BALANCED };
	}

	// Adjust based on device capabilities
	const adjustedProfile = { ...baseProfile };

	// Low-power or mobile adjustments
	if (device.isLowPowerMode || device.isMobile) {
		adjustedProfile.targetFPS = Math.min(adjustedProfile.targetFPS, 30);
		adjustedProfile.sendEveryNTicks = Math.max(adjustedProfile.sendEveryNTicks, 2);
		adjustedProfile.enablePerformanceMonitoring = false;
		adjustedProfile.enablePositionInterpolation = false;
	}

	// Low core count adjustments
	if (device.cores <= 2) {
		adjustedProfile.targetFPS = Math.min(adjustedProfile.targetFPS, 20);
		adjustedProfile.maxIterations = Math.min(adjustedProfile.maxIterations, 300);
		adjustedProfile.positionUpdateBatchSize = Math.max(adjustedProfile.positionUpdateBatchSize, 100);
	}

	// Low memory adjustments
	if (device.memory <= 2) {
		adjustedProfile.maxIterations = Math.min(adjustedProfile.maxIterations, 400);
		adjustedProfile.positionUpdateBatchSize = Math.max(adjustedProfile.positionUpdateBatchSize, 200);
		adjustedProfile.enablePerformanceMonitoring = false;
	}

	// High core count optimizations
	if (device.cores >= 8 && !device.isMobile) {
		if (graphMetrics.estimatedComplexity === "low") {
			adjustedProfile.targetFPS = 60;
			adjustedProfile.sendEveryNTicks = 1;
		}
	}

	// Disable web workers if not supported
	if (!device.supportsWebWorkers) {
		adjustedProfile.useWebWorker = false;
		adjustedProfile.targetFPS = Math.min(adjustedProfile.targetFPS, 15);
		adjustedProfile.maxIterations = Math.min(adjustedProfile.maxIterations, 200);
	}

	// High density graph adjustments
	if (graphMetrics.density > 0.1) {
		adjustedProfile.alphaDecay = Math.min(adjustedProfile.alphaDecay * 1.5, 0.1);
		adjustedProfile.velocityDecay = Math.min(adjustedProfile.velocityDecay * 1.2, 0.4);
	}

	// Many pinned nodes adjustments
	const pinnedRatio = graphMetrics.pinnedNodeCount / graphMetrics.nodeCount;
	if (pinnedRatio > 0.3) {
		adjustedProfile.alphaDecay = Math.min(adjustedProfile.alphaDecay * 1.3, 0.08);
		adjustedProfile.maxIterations = Math.max(adjustedProfile.maxIterations * 0.7, 100);
	}

	logger.info("graph", "Optimal performance config calculated", {
		baseProfile: graphMetrics.estimatedComplexity,
		adjustments: {
			lowPowerMode: device.isLowPowerMode,
			mobile: device.isMobile,
			lowCores: device.cores <= 2,
			lowMemory: device.memory <= 2,
			highDensity: graphMetrics.density > 0.1,
			manyPinned: pinnedRatio > 0.3,
		},
		finalConfig: adjustedProfile,
	});

	return adjustedProfile;
}

// Convenience function for getting config by node/edge count
export function getConfigByGraphSize(
	nodeCount: number,
	edgeCount: number,
	pinnedNodeCount = 0
): PerformanceConfig {
	const metrics = calculateGraphMetrics(nodeCount, edgeCount, pinnedNodeCount);
	return getOptimalPerformanceConfig(metrics);
}

// Performance monitoring utilities
export interface PerformanceMetrics {
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  frameDrops: number;
  totalFrames: number;
  animationDuration: number;
  memoryUsage?: number;
}

export class PerformanceMonitor {
	private startTime: number = 0;
	private frameCount: number = 0;
	private fpsHistory: number[] = [];
	private lastFrameTime: number = 0;
	private frameDrops: number = 0;
	private targetFPS: number;

	constructor(targetFPS: number = 60) {
		this.targetFPS = targetFPS;
	}

	start() {
		this.startTime = performance.now();
		this.frameCount = 0;
		this.fpsHistory = [];
		this.frameDrops = 0;
		this.lastFrameTime = this.startTime;
	}

	recordFrame() {
		const now = performance.now();
		const deltaTime = now - this.lastFrameTime;
		const fps = 1000 / deltaTime;

		this.fpsHistory.push(fps);
		this.frameCount++;

		// Count frame drops (FPS significantly below target)
		if (fps < this.targetFPS * 0.8) {
			this.frameDrops++;
		}

		this.lastFrameTime = now;

		// Keep only last 100 FPS readings
		if (this.fpsHistory.length > 100) {
			this.fpsHistory.shift();
		}
	}

	getMetrics(): PerformanceMetrics {
		const duration = this.lastFrameTime - this.startTime;
		const averageFPS = this.fpsHistory.length > 0
			? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length
			: 0;

		return {
			averageFPS,
			minFPS: Math.min(...this.fpsHistory),
			maxFPS: Math.max(...this.fpsHistory),
			frameDrops: this.frameDrops,
			totalFrames: this.frameCount,
			animationDuration: duration,
			memoryUsage: (performance as any).memory?.usedJSHeapSize,
		};
	}
}