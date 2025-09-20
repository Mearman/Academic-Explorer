/**
 * Component tests for use-background-worker hook EventBridge integration
 * Tests that the hook properly uses EventBridge for worker communication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";

// Mock the performance config first, before any imports
vi.mock("@/lib/graph/utils/performance-config", () => ({
	getConfigByGraphSize: vi.fn(() => ({
		targetFPS: 60,
		sendEveryNTicks: 1,
		alphaDecay: 0.02,
		maxIterations: 1000,
		linkDistance: 200,
		linkStrength: 0.05,
		chargeStrength: -1000,
		centerStrength: 0.01,
		collisionRadius: 120,
		collisionStrength: 1.0,
		velocityDecay: 0.1,
	})),
}));

// Mock the logger
vi.mock("@/lib/logger", () => ({
	logger: {
		debug: vi.fn(),
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// Mock EventBridge with the correct API
vi.mock("@/lib/graph/events/event-bridge", () => ({
	eventBridge: {
		registerWorker: vi.fn(),
		registerMessageHandler: vi.fn(),
		unregisterMessageHandler: vi.fn(),
		emit: vi.fn(), // Use emit instead of sendMessage
	},
}));

// Mock the worker singleton to return a mock worker
vi.mock("@/lib/graph/worker-singleton", () => ({
	getBackgroundWorker: vi.fn().mockResolvedValue({
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		terminate: vi.fn(),
		postMessage: vi.fn(),
	}),
}));

import { useBackgroundWorker } from "./use-background-worker";
import { eventBridge } from "@/lib/graph/events/event-bridge";

describe("useBackgroundWorker EventBridge Integration", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		cleanup();
	});

	describe("Initialization", () => {
		it("should register EventBridge handlers on mount", async () => {
			renderHook(() => useBackgroundWorker());

			// Wait for worker initialization
			await act(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
			});

			// Verify EventBridge handlers were registered
			expect(eventBridge.registerMessageHandler).toHaveBeenCalled();
		});

		it("should cleanup EventBridge handlers on unmount", async () => {
			const { unmount } = renderHook(() => useBackgroundWorker());

			await act(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
			});

			unmount();

			// Verify EventBridge handlers were unregistered
			expect(eventBridge.unregisterMessageHandler).toHaveBeenCalled();
		});
	});

	describe("Animation Control via EventBridge", () => {
		it("should emit FORCE_SIMULATION_START via EventBridge", async () => {
			const { result } = renderHook(() => useBackgroundWorker());

			// Wait for initialization
			await act(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
			});

			const nodes = [
				{ id: "node1", x: 100, y: 150 },
				{ id: "node2", x: 200, y: 250 },
			];

			const links = [
				{ id: "link1", source: "node1", target: "node2" },
			];

			act(() => {
				result.current.startAnimation(nodes, links);
			});

			expect(eventBridge.emit).toHaveBeenCalledWith(
				"FORCE_SIMULATION_START",
				{
					nodes,
					links,
					config: undefined,
					pinnedNodes: undefined,
				},
				"worker"
			);
		});

		it("should emit FORCE_SIMULATION_STOP via EventBridge", async () => {
			const { result } = renderHook(() => useBackgroundWorker());

			await act(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
			});

			act(() => {
				result.current.stopAnimation();
			});

			expect(eventBridge.emit).toHaveBeenCalledWith(
				"FORCE_SIMULATION_STOP",
				{},
				"worker"
			);
		});

		it("should provide updateParameters method", async () => {
			const { result } = renderHook(() => useBackgroundWorker());

			await act(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
			});

			// Verify the method exists and can be called without error
			expect(typeof result.current.updateParameters).toBe("function");

			const newConfig = {
				chargeStrength: -500,
				linkDistance: 150,
			};

			act(() => {
				result.current.updateParameters(newConfig);
			});

			// The method should not throw an error
			expect(true).toBe(true);
		});
	});

	describe("Node Expansion via EventBridge", () => {
		it("should emit DATA_FETCH_EXPAND_NODE via EventBridge", async () => {
			const { result } = renderHook(() => useBackgroundWorker());

			await act(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
			});

			act(() => {
				result.current.expandNode(
					"node1",
					"entity123",
					"works",
					{ depth: 2 },
					{ enabled: true }
				);
			});

			expect(eventBridge.emit).toHaveBeenCalledWith(
				"DATA_FETCH_EXPAND_NODE",
				{
					expandRequest: {
						id: expect.any(String),
						nodeId: "node1",
						entityId: "entity123",
						entityType: "works",
						options: { depth: 2 },
						expansionSettings: { enabled: true },
					}
				},
				"worker"
			);
		});

		it("should emit DATA_FETCH_CANCEL_EXPANSION via EventBridge", async () => {
			const { result } = renderHook(() => useBackgroundWorker());

			await act(async () => {
				await new Promise(resolve => setTimeout(resolve, 10));
			});

			act(() => {
				result.current.cancelExpansion("request123");
			});

			expect(eventBridge.emit).toHaveBeenCalledWith(
				"DATA_FETCH_CANCEL_EXPANSION",
				{
					requestId: "request123"
				},
				"worker"
			);
		});
	});

	describe("State Management", () => {
		it("should have correct initial state", () => {
			const { result } = renderHook(() => useBackgroundWorker());

			expect(result.current.animationState).toEqual({
				isRunning: false,
				isPaused: false,
				alpha: 1,
				iteration: 0,
				progress: 0,
				fps: 0,
				nodeCount: 0,
				linkCount: 0,
			});

			expect(result.current.nodePositions).toEqual([]);
			expect(result.current.isIdle).toBe(true);
			expect(result.current.canPause).toBe(false);
			expect(result.current.canResume).toBe(false);
			expect(result.current.canStop).toBe(false);
		});
	});

	describe("Performance Configuration", () => {
		it("should return optimal configuration based on graph size", () => {
			const { result } = renderHook(() => useBackgroundWorker());

			const config = result.current.getOptimalConfig(100, 50, 5);

			expect(config).toEqual({
				targetFPS: 60,
				sendEveryNTicks: 1,
				alphaDecay: 0.02,
				maxIterations: 1000,
				linkDistance: 200,
				linkStrength: 0.05,
				chargeStrength: -1000,
				centerStrength: 0.01,
				collisionRadius: 120,
				collisionStrength: 1.0,
				velocityDecay: 0.1,
			});
		});
	});
});