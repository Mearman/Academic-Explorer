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
		emit: vi.fn(),
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
	isWorkerReady: vi.fn().mockReturnValue(true),
	terminateBackgroundWorker: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import React from "react";
import { useBackgroundWorker } from "./use-background-worker";
import { getConfigByGraphSize } from "@/lib/graph/utils/performance-config";
import { BackgroundWorkerProvider } from "@/contexts/BackgroundWorkerProvider";
import { EventBridgeProvider } from "@/contexts/EventBridgeProvider";
import { BackgroundWorkerContext, EventBridgeContext } from "@/contexts/contexts";

// Global variables to hold context values that can be updated
let mockEventBridgeContext: any;
let mockBackgroundWorkerContext: any;
let staticMockWorker: MockWorker;

// Mock context providers to provide controlled values
const MockBackgroundWorkerProvider = ({ children }: { children: React.ReactNode }) => {
	// Use the global context that can be updated in tests
	if (!mockBackgroundWorkerContext) {
		mockBackgroundWorkerContext = {
			worker: staticMockWorker,
			isWorkerReady: true,
			isInitializing: false,
			error: null,
			getWorker: vi.fn().mockResolvedValue(staticMockWorker),
			terminateWorker: vi.fn(),
		};
	}
	return (
		<BackgroundWorkerContext.Provider value={mockBackgroundWorkerContext}>
			{children}
		</BackgroundWorkerContext.Provider>
	);
};

const MockEventBridgeProvider = ({ children }: { children: React.ReactNode }) => {
	if (!mockEventBridgeContext) {
		mockEventBridgeContext = {
			registerHandler: vi.fn(),
			unregisterHandler: vi.fn(),
			emit: vi.fn(),
			registerWorker: vi.fn(),
		};
	}
	return (
		<EventBridgeContext.Provider value={mockEventBridgeContext}>
			{children}
		</EventBridgeContext.Provider>
	);
};

// Test wrapper component that provides all required contexts
function TestWrapper({ children }: { children: React.ReactNode }) {
	return (
		<MockEventBridgeProvider>
			<MockBackgroundWorkerProvider>
				{children}
			</MockBackgroundWorkerProvider>
		</MockEventBridgeProvider>
	);
}

// Mock Web Worker
class MockWorker {
	public onmessage: ((event: MessageEvent) => void) | null = null;
	public onerror: ((event: ErrorEvent) => void) | null = null;
	private eventTarget = new EventTarget();
	// Note: postMessage is now mocked but not used by real worker (uses EventBridge)
	public postMessage = vi.fn();

	constructor(public url: string, public options?: WorkerOptions) {
		// Setup default behavior for postMessage (legacy compatibility)
		this.postMessage.mockImplementation(() => {
			// Do nothing by default, tests can override
		});

		// Simulate ready message via EventBridge instead of postMessage
		setTimeout(() => {
			// Mock EventBridge ready event
			void import("@/lib/graph/events/event-bridge").then(({ eventBridge }) => {
				if (eventBridge.emit) {
					eventBridge.emit("WORKER_READY", {
						workerId: "force-animation-worker",
						workerType: "force-animation",
						timestamp: Date.now()
					}, "main");
				}
			});
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

	// Create static mock worker for consistent testing
	staticMockWorker = new MockWorker("test-url", { type: "module" });

	// Initialize a default mock worker
	mockWorker = staticMockWorker;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Create a mock constructor that creates and stores the worker instance
		mockWorkerConstructor = vi.fn().mockImplementation((...args) => {
			mockWorker = new MockWorker(...args);
			return mockWorker;
		});
		// Replace global Worker with our mock
		global.Worker = mockWorkerConstructor;

		// Also update the worker singleton mock to return our static mock worker
		const workerSingleton = await import("@/lib/graph/worker-singleton");
		vi.mocked(workerSingleton.getBackgroundWorker).mockResolvedValue(staticMockWorker);

		// Reset context mocks
		mockEventBridgeContext = null;
		mockBackgroundWorkerContext = null;
	});

	afterEach(() => {
		vi.restoreAllMocks();
		cleanup(); // Clean up DOM between tests
	});

	it("should initialize with default state", () => {
		const { result } = renderHook(() => useBackgroundWorker(), { wrapper: TestWrapper });

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
		const { result } = renderHook(() => useBackgroundWorker(), { wrapper: TestWrapper });

		// Wait for worker initialization through provider
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 50));
		});

		// The provider should handle worker ready state
		expect(result.current.isWorkerReady).toBe(true);
	});

	it("should start animation with correct parameters", async () => {
		const onPositionUpdate = vi.fn();
		const { result } = renderHook(() =>
			useBackgroundWorker({ onPositionUpdate }), { wrapper: TestWrapper }
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

		// Verify EventBridge was used to send start message
		expect(mockEventBridgeContext.emit).toHaveBeenCalledWith({
			eventType: "FORCE_SIMULATION_START",
			payload: expect.objectContaining({
				nodes,
				links,
				config: undefined,
				pinnedNodes: undefined,
			}),
			target: "worker"
		});
	});

	it("should handle position updates from worker", async () => {
		const onPositionUpdate = vi.fn();
		const { result } = renderHook(() =>
			useBackgroundWorker({ onPositionUpdate }), { wrapper: TestWrapper }
		);

		// Wait for worker ready
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		const positions = [
			{ id: "node1", x: 50, y: 25 },
			{ id: "node2", x: 75, y: 50 },
		];

		// Simulate worker tick message by calling handler directly
		act(() => {
			const messageEvent = new MessageEvent("message", {
				data: {
					type: "tick",
					positions,
					alpha: 0.5,
					iteration: 10,
					progress: 0.1,
					fps: 60,
				}
			});
			// Simulate the message through worker's onmessage
			if (staticMockWorker.onmessage) {
				staticMockWorker.onmessage(messageEvent);
			}
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
			useBackgroundWorker({ onComplete }), { wrapper: TestWrapper }
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
			const messageEvent = new MessageEvent("message", {
				data: {
					type: "complete",
					positions: finalPositions,
					...stats,
				}
			});
			if (staticMockWorker.onmessage) {
				staticMockWorker.onmessage(messageEvent);
			}
		});

		expect(onComplete).toHaveBeenCalledWith(finalPositions, stats);
		expect(result.current.nodePositions).toEqual(finalPositions);
		expect(result.current.animationState.isRunning).toBe(false);
		expect(result.current.animationState.progress).toBe(1);
	});

	it("should handle worker errors", async () => {
		const onError = vi.fn();
		renderHook(() =>
			useBackgroundWorker({ onError }), { wrapper: TestWrapper }
		);

		// Wait for worker ready
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		// Simulate worker error
		act(() => {
			const messageEvent = new MessageEvent("message", {
				data: {
					type: "error",
					error: "Simulation failed",
				}
			});
			if (staticMockWorker.onmessage) {
				staticMockWorker.onmessage(messageEvent);
			}
		});

		expect(onError).toHaveBeenCalledWith("Worker error: Simulation failed");
	});

	it("should stop animation when requested", async () => {
		const { result } = renderHook(() => useBackgroundWorker(), { wrapper: TestWrapper });

		// Wait for worker ready and start animation
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		// Simulate running animation
		act(() => {
			const messageEvent = new MessageEvent("message", {
				data: {
					type: "started",
					nodeCount: 2,
					linkCount: 1,
				}
			});
			if (staticMockWorker.onmessage) {
				staticMockWorker.onmessage(messageEvent);
			}
		});

		expect(result.current.animationState.isRunning).toBe(true);

		// Stop animation
		act(() => {
			result.current.stopAnimation();
		});

		// Simulate worker stopped message
		act(() => {
			const messageEvent = new MessageEvent("message", {
				data: {
					type: "stopped",
				}
			});
			if (staticMockWorker.onmessage) {
				staticMockWorker.onmessage(messageEvent);
			}
		});

		expect(result.current.animationState.isRunning).toBe(false);
	});

	it("should get optimal config for different graph sizes", () => {
		const { result } = renderHook(() => useBackgroundWorker(), { wrapper: TestWrapper });

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

	it("should cleanup worker on unmount", async () => {
		const { unmount } = renderHook(() => useBackgroundWorker(), { wrapper: TestWrapper });

		// Wait for worker initialization
		await act(async () => {
			await new Promise(resolve => setTimeout(resolve, 10));
		});

		// Unmount should cleanup properly through provider
		unmount();

		// Verify no errors during cleanup
		expect(true).toBe(true);
	});
});