/**
 * Unit tests for useBackgroundWorker hook
 */

import { DEFAULT_FORCE_PARAMS } from "@/lib/graph/force-params";

// Mock the performance config first, before any imports
vi.mock("@/lib/graph/utils/performance-config", () => ({
	getConfigByGraphSize: vi.fn(() => ({
		targetFPS: 60,
		sendEveryNTicks: 1,
		alphaDecay: 0.02,
		maxIterations: 1000,
		linkDistance: DEFAULT_FORCE_PARAMS.linkDistance,
		linkStrength: DEFAULT_FORCE_PARAMS.linkStrength,
		chargeStrength: DEFAULT_FORCE_PARAMS.chargeStrength,
		centerStrength: DEFAULT_FORCE_PARAMS.centerStrength,
		collisionRadius: DEFAULT_FORCE_PARAMS.collisionRadius,
		collisionStrength: DEFAULT_FORCE_PARAMS.collisionStrength,
		velocityDecay: DEFAULT_FORCE_PARAMS.velocityDecay,
		useWebWorker: true,
		enableProgressUpdates: true,
		enablePerformanceMonitoring: false,
		positionUpdateBatchSize: 100,
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

// Mock EventBridge
vi.mock("@/lib/graph/events/event-bridge", () => ({
	eventBridge: {
		registerWorker: vi.fn(),
		registerMessageHandler: vi.fn(),
		unregisterMessageHandler: vi.fn(),
		sendMessage: vi.fn(),
	},
}));

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useBackgroundWorker } from "./use-background-worker";
import { getConfigByGraphSize } from "@/lib/graph/utils/performance-config";

// Mock Web Worker
class MockWorker {
	public onmessage: ((event: MessageEvent) => void) | null = null;
	public onerror: ((event: ErrorEvent) => void) | null = null;
	private eventTarget = new EventTarget();
	public postMessage = vi.fn();

	constructor(public url: string, public options?: WorkerOptions) {
		// Setup default behavior for postMessage
		this.postMessage.mockImplementation(() => {
			// Do nothing by default, tests can override
		});

		// Simulate ready message on creation with a longer delay to ensure it's processed
		setTimeout(() => {
			if (this.onmessage) {
				this.onmessage(new MessageEvent("message", {
					data: { type: "ready" }
				}));
			}
		}, 10);
	}

	terminate() {
		// Mock termination
	}

	addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
		this.eventTarget.addEventListener(type, listener);
		// Also call the onmessage handler for Worker compatibility
		if (type === "message" && typeof listener === "function") {
			this.onmessage = listener;
		}
	}

	removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
		this.eventTarget.removeEventListener(type, listener);
	}

	dispatchEvent(event: Event) {
		// Call onmessage handler directly for message events
		if (event.type === "message" && this.onmessage) {
			this.onmessage(event as MessageEvent);
		}
		return this.eventTarget.dispatchEvent(event);
	}

	// Helper method to simulate worker messages
	simulateMessage(data: any) {
		const event = new MessageEvent("message", { data });
		if (this.onmessage) {
			this.onmessage(event);
		}
		this.dispatchEvent(event);
	}

	// Helper method to simulate worker errors
	simulateError(error: string) {
		const event = new ErrorEvent("error", { message: error });
		if (this.onerror) {
			this.onerror(event);
		}
		this.dispatchEvent(event);
	}
}

// Mock global Worker
global.Worker = MockWorker as any;

// Mock URL.createObjectURL and URL constructor
global.URL = class MockURL {
	href: string;

	constructor() {
		this.href = "mock-worker-url";
	}

	static createObjectURL = vi.fn().mockReturnValue("mock-worker-url");
	static revokeObjectURL = vi.fn();
} as any;

describe("useBackgroundWorker", () => {
	let mockWorker: MockWorker;
	let mockWorkerConstructor: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Create a mock constructor that creates and stores the worker instance
		mockWorkerConstructor = vi.fn().mockImplementation((...args) => {
			mockWorker = new MockWorker(...args);
			return mockWorker;
		});
		// Replace global Worker with our mock
		global.Worker = mockWorkerConstructor;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		cleanup(); // Clean up DOM between tests
	});

	it("should initialize with default state", () => {
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

	it("should create worker on mount and set ready state", async () => {
		// Verify the mock is set up correctly before rendering the hook
		expect(global.Worker).toBe(mockWorkerConstructor);

		const { result } = renderHook(() => useBackgroundWorker());

		expect(mockWorkerConstructor).toHaveBeenCalledWith(
			expect.any(Object), // URL object
			{ type: "module" }
		);

		// Wait for worker creation and setup
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 50));
		});

		// Manually trigger the ready message to ensure it's processed
		await act(async () => {
			if (mockWorker.onmessage) {
				mockWorker.onmessage(new MessageEvent("message", {
					data: { type: "ready" }
				}));
			}
		});

		expect(result.current.isWorkerReady).toBe(true);
	});

	it("should start animation with correct parameters", async () => {
		const onPositionUpdate = vi.fn();
		const { result } = renderHook(() =>
			useBackgroundWorker({ onPositionUpdate })
		);

		// Wait for worker ready
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		const nodes = [
			{ id: "node1", x: 0, y: 0 },
			{ id: "node2", x: 100, y: 0 },
		];
		const links = [
			{ id: "link1", source: "node1", target: "node2" },
		];

		act(() => {
			result.current.startAnimation(nodes, links);
		});

		// Verify worker received start message
		expect(mockWorker.postMessage).toHaveBeenCalledWith({
			type: "start",
			nodes,
			links,
			config: undefined, // No config provided in the test
			pinnedNodes: undefined,
		});
	});

	it("should handle position updates from worker", async () => {
		const onPositionUpdate = vi.fn();
		const { result } = renderHook(() =>
			useBackgroundWorker({ onPositionUpdate })
		);

		// Wait for worker ready
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		const positions = [
			{ id: "node1", x: 50, y: 25 },
			{ id: "node2", x: 75, y: 50 },
		];

		// Simulate worker tick message
		act(() => {
			mockWorker.simulateMessage({
				type: "tick",
				positions,
				alpha: 0.5,
				iteration: 10,
				progress: 0.1,
				fps: 60,
			});
		});

		expect(onPositionUpdate).toHaveBeenCalledWith(positions);
		expect(result.current.nodePositions).toEqual(positions);
		expect(result.current.animationState.alpha).toBe(0.5);
		expect(result.current.animationState.iteration).toBe(10);
		expect(result.current.animationState.progress).toBe(0.1);
		expect(result.current.animationState.fps).toBe(60);
	});

	it("should handle animation completion", async () => {
		const onComplete = vi.fn();
		const { result } = renderHook(() =>
			useBackgroundWorker({ onComplete })
		);

		// Wait for worker ready
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		const finalPositions = [
			{ id: "node1", x: 100, y: 50 },
			{ id: "node2", x: 150, y: 100 },
		];

		const stats = {
			totalIterations: 100,
			finalAlpha: 0.001,
			reason: "converged",
		};

		// Simulate worker completion message
		act(() => {
			mockWorker.simulateMessage({
				type: "complete",
				positions: finalPositions,
				...stats,
			});
		});

		expect(onComplete).toHaveBeenCalledWith(finalPositions, stats);
		expect(result.current.nodePositions).toEqual(finalPositions);
		expect(result.current.animationState.isRunning).toBe(false);
		expect(result.current.animationState.progress).toBe(1);
	});

	it("should handle worker errors", async () => {
		const onError = vi.fn();
		renderHook(() =>
			useBackgroundWorker({ onError })
		);

		// Wait for worker ready
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		// Simulate worker error
		act(() => {
			mockWorker.simulateMessage({
				type: "error",
				error: "Simulation failed",
			});
		});

		expect(onError).toHaveBeenCalledWith("Worker error: Simulation failed");
	});

	it("should stop animation when requested", async () => {
		const { result } = renderHook(() => useBackgroundWorker());

		// Wait for worker ready and start animation
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		// Simulate running animation
		act(() => {
			mockWorker.simulateMessage({
				type: "started",
				nodeCount: 2,
				linkCount: 1,
			});
		});

		expect(result.current.animationState.isRunning).toBe(true);

		// Stop animation
		act(() => {
			result.current.stopAnimation();
		});

		// Simulate worker stopped message
		act(() => {
			mockWorker.simulateMessage({
				type: "stopped",
			});
		});

		expect(result.current.animationState.isRunning).toBe(false);
	});

	it("should get optimal config for different graph sizes", () => {
		const { result } = renderHook(() => useBackgroundWorker());

		// Verify the mock is working
		expect(vi.mocked(getConfigByGraphSize)).toBeDefined();

		const smallGraphConfig = result.current.getOptimalConfig(50, 10, 0);
		const largeGraphConfig = result.current.getOptimalConfig(1000, 500, 10);

		// Verify the mock was called
		expect(getConfigByGraphSize).toHaveBeenCalledWith(50, 10, 0);
		expect(getConfigByGraphSize).toHaveBeenCalledWith(1000, 500, 10);

		// The mock should provide the exact values we defined
		expect(smallGraphConfig).toEqual({
			targetFPS: 60,
			sendEveryNTicks: 1,
			alphaDecay: 0.02,
			maxIterations: 1000,
			linkDistance: DEFAULT_FORCE_PARAMS.linkDistance,
			linkStrength: DEFAULT_FORCE_PARAMS.linkStrength,
			chargeStrength: -1000,
			centerStrength: 0.01,
			collisionRadius: 120,
			collisionStrength: 1.0,
			velocityDecay: 0.1,
		});

		expect(largeGraphConfig).toEqual({
			targetFPS: 60,
			sendEveryNTicks: 1,
			alphaDecay: 0.02,
			maxIterations: 1000,
			linkDistance: DEFAULT_FORCE_PARAMS.linkDistance,
			linkStrength: DEFAULT_FORCE_PARAMS.linkStrength,
			chargeStrength: -1000,
			centerStrength: 0.01,
			collisionRadius: 120,
			collisionStrength: 1.0,
			velocityDecay: 0.1,
		});
	});

	it("should cleanup worker on unmount", () => {
		const { unmount } = renderHook(() => useBackgroundWorker());

		// Add spy to the terminate method
		mockWorker.terminate = vi.fn();

		unmount();

		expect(mockWorker.terminate).toHaveBeenCalled();
	});
});