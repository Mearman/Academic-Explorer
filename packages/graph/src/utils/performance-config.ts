/**
 * Performance Configuration Utility
 * Automatically adjusts animation and layout settings based on graph size and device capabilities
 */

import { DEFAULT_FORCE_PARAMS } from "../constants/force-params";
import { logger } from "@academic-explorer/shared-utils/logger";

// Extended Navigator interface for device memory API
interface NavigatorWithDeviceMemory extends Navigator {
  deviceMemory?: number;
}

// Extended Performance interface for memory API
interface PerformanceWithMemory extends Performance {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
  };
}

// Type guards for browser API feature detection
function hasDeviceMemory(navigator: Navigator): navigator is NavigatorWithDeviceMemory {
	return "deviceMemory" in navigator;
}

function hasPerformanceMemory(performance: Performance): performance is PerformanceWithMemory {
	return "memory" in performance;
}

function hasRequestAnimationFrame(context: unknown): context is { requestAnimationFrame: typeof requestAnimationFrame } {
	return typeof context === "object" && context !== null && "requestAnimationFrame" in context;
}

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
		linkDistance: DEFAULT_FORCE_PARAMS.linkDistance,
		linkStrength: DEFAULT_FORCE_PARAMS.linkStrength,
		chargeStrength: DEFAULT_FORCE_PARAMS.chargeStrength,
		centerStrength: DEFAULT_FORCE_PARAMS.centerStrength,
		collisionRadius: DEFAULT_FORCE_PARAMS.collisionRadius,
		collisionStrength: DEFAULT_FORCE_PARAMS.collisionStrength,
		velocityDecay: DEFAULT_FORCE_PARAMS.velocityDecay,
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

	// Estimate memory (very rough) using proper type guard
	const memory = hasDeviceMemory(navigator) && navigator.deviceMemory
		? navigator.deviceMemory
		: (cores >= 8 ? 8 : cores >= 4 ? 4 : 2);

	// Detect low power mode (iOS Safari) using proper navigator.userAgent access
	const isLowPowerMode = navigator.userAgent.includes("Safari") &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// Detect mobile
	const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		navigator.userAgent
	);

	// Feature detection with proper type guards
	const supportsWebWorkers = typeof Worker !== "undefined";
	const supportsRequestAnimationFrame = typeof requestAnimationFrame !== "undefined" &&
    hasRequestAnimationFrame(self);

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
	const device = deviceCapabilities ?? detectDeviceCapabilities();

	logger.debug("graph", "Calculating optimal performance config", {
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

	logger.debug("graph", "Optimal performance config calculated", {
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

		// Use proper type guard for performance.memory access
		const memoryUsage = hasPerformanceMemory(performance)
			? performance.memory?.usedJSHeapSize
			: undefined;

		const result: PerformanceMetrics = {
			averageFPS,
			minFPS: Math.min(...this.fpsHistory),
			maxFPS: Math.max(...this.fpsHistory),
			frameDrops: this.frameDrops,
			totalFrames: this.frameCount,
			animationDuration: duration,
		};

		if (memoryUsage !== undefined) {
			result.memoryUsage = memoryUsage;
		}

		return result;
	}
}