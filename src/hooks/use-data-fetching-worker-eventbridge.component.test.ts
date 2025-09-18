/**
 * Component tests for use-data-fetching-worker hook EventBridge integration
 * Tests real hook behavior with EventBridge communication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDataFetchingWorker } from "./use-data-fetching-worker";
import { EventBridge } from "@/lib/graph/events/event-bridge";
import { WorkerEventType, type WorkerEventPayloads } from "@/lib/graph/events/types";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Enhanced mock worker for component testing
class TestWorker extends EventTarget {
  private messageHandlers: Array<(event: MessageEvent) => void> = [];
  private sharedEventBridge: EventBridge | null = null; // Will be set to shared instance

  postMessage = vi.fn();
  terminate = vi.fn();

  // Constructor inherited from EventTarget

  // Set the shared EventBridge instance
  setEventBridge(eventBridge: EventBridge) {
    this.sharedEventBridge = eventBridge;
  }

  addEventListener = vi.fn((type: string, listener: any) => {
    if (type === "message") {
      this.messageHandlers.push(listener);
    }
    super.addEventListener(type, listener);
  });

  removeEventListener = vi.fn((type: string, listener: any) => {
    if (type === "message") {
      const index = this.messageHandlers.indexOf(listener);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    }
    super.removeEventListener(type, listener);
  });

  // Simulate worker sending EventBridge messages
  simulateEventBridgeMessage(eventType: string, payload: any) {
    // Emit as if coming from worker context to main context
    if (this.sharedEventBridge) {
      // Emit directly to current context handlers (no cross-context needed in tests)
      this.sharedEventBridge.emit(eventType, payload, "current");
    }
  }

  // Simulate legacy worker message
  simulateLegacyMessage(message: any) {
    const event = new MessageEvent("message", { data: message });
    this.messageHandlers.forEach(handler => { handler(event); });
  }
}

// Mock Worker constructor with instance tracking
const workerInstances: TestWorker[] = [];
const OriginalWorker = TestWorker;
global.Worker = vi.fn().mockImplementation((...args) => {
  const instance = new OriginalWorker(...args);
  workerInstances.push(instance);
  return instance;
}) as unknown as typeof Worker;

describe("useDataFetchingWorker EventBridge Integration", () => {
  let testWorker: TestWorker;

  beforeEach(() => {
    EventBridge.resetInstance();
    workerInstances.length = 0; // Clear instances array
  });

  afterEach(() => {
    EventBridge.resetInstance();
    vi.clearAllMocks();
  });

  describe("EventBridge Communication", () => {
    it("should handle worker ready event via EventBridge", async () => {
      // Use the same eventBridge instance that the hook uses
      const { eventBridge } = await import("@/lib/graph/events");

      const { result } = renderHook(() => useDataFetchingWorker());

      // Get the worker instance created by the hook
      testWorker = workerInstances[0];
      // Set the shared EventBridge instance
      testWorker.setEventBridge(eventBridge);

      expect(result.current.isWorkerReady).toBe(false);

      // Wait for React to flush effects
      await act(async () => {
        // Force a small delay to ensure effects run
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const debugInfo = eventBridge.getDebugInfo();
      console.log("Registered handlers after effects:", debugInfo.messageHandlers);

      // Add a spy to monitor event emissions
      const originalEmit = eventBridge.emit;
      const emitSpy = vi.fn();
      eventBridge.emit = (...args) => {
        console.log("EventBridge.emit called with:", args);
        emitSpy(...args);
        originalEmit.apply(eventBridge, args);
      };

      // Simulate worker ready via EventBridge
      act(() => {
        console.log("Emitting WORKER_READY event with type:", WorkerEventType.WORKER_READY);
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          timestamp: Date.now(),
        });
      });

      expect(result.current.isWorkerReady).toBe(true);
    });

    it("should handle worker error via EventBridge", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const onExpandError = vi.fn();
      const { result } = renderHook(() => useDataFetchingWorker({ onExpandError }));

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      act(() => {
        console.log("Emitting WORKER_ERROR with payload:", {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          error: "Test error message",
          timestamp: Date.now(),
        });
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_ERROR, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          error: "Test error message",
          timestamp: Date.now(),
        });
      });

      // Worker error should set worker as not ready
      expect(result.current.isWorkerReady).toBe(false);
    });

    it("should handle data fetch progress via EventBridge", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const onProgress = vi.fn();
      const { result } = renderHook(() => useDataFetchingWorker({ onProgress }));

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Mark worker as ready first
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          timestamp: Date.now(),
        });
      });

      // Start expansion to create a pending request
      act(() => {
        void result.current.expandNode("node-456", "A123456789", "authors");
      });

      // Wait for expansion to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Get the actual request ID from the postMessage call
      const postMessageCalls = testWorker.postMessage.mock.calls;
      console.log("PostMessage calls:", postMessageCalls);
      expect(postMessageCalls.length).toBeGreaterThan(0);
      const lastCall = postMessageCalls[postMessageCalls.length - 1];
      const requestId = lastCall[0].id;
      console.log("Using requestId:", requestId);

      // Add EventBridge spy to monitor events
      const originalEmit = eventBridge.emit;
      const emitSpy = vi.fn();
      eventBridge.emit = (...args) => {
        console.log("EventBridge.emit called with:", args);
        emitSpy(...args);
        originalEmit.apply(eventBridge, args);
      };

      const progressPayload: WorkerEventPayloads[WorkerEventType.DATA_FETCH_PROGRESS] = {
        requestId,
        nodeId: "node-456",
        entityId: "A123456789",
        progress: 0.75,
        currentStep: "Fetching related authors",
        timestamp: Date.now(),
      };

      act(() => {
        console.log("Emitting progress event with payload:", progressPayload);
        testWorker.simulateEventBridgeMessage(WorkerEventType.DATA_FETCH_PROGRESS, progressPayload);
      });

      console.log("onProgress call count:", onProgress.mock.calls.length);
      console.log("onProgress calls:", onProgress.mock.calls);

      expect(onProgress).toHaveBeenCalledWith("node-456", {
        completed: 75, // 0.75 * 100
        total: 100,
        stage: "Fetching related authors",
      });
    });

    it("should handle data fetch complete via EventBridge", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const onComplete = vi.fn();
      const { result } = renderHook(() => useDataFetchingWorker({ onComplete }));

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Mark worker as ready first
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          timestamp: Date.now(),
        });
      });

      // Start expansion to create a pending request
      act(() => {
        void result.current.expandNode("node-456", "A123456789", "authors");
      });

      // Wait for expansion to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Get the actual request ID from the postMessage call
      const postMessageCalls = testWorker.postMessage.mock.calls;
      expect(postMessageCalls.length).toBeGreaterThan(0);
      const lastCall = postMessageCalls[postMessageCalls.length - 1];
      const requestId = lastCall[0].id;

      const completePayload: WorkerEventPayloads[WorkerEventType.DATA_FETCH_COMPLETE] = {
        requestId,
        nodeId: "node-456",
        entityId: "A123456789",
        nodes: [
          { id: "node1", type: "author", data: { entityId: "A111", name: "Test Author" } },
        ],
        edges: [
          { id: "edge1", source: "node-456", target: "node1", type: "collaboration" },
        ],
        statistics: {
          nodesAdded: 1,
          edgesAdded: 1,
          apiCalls: 2,
          duration: 1500,
        },
        timestamp: Date.now(),
      };

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.DATA_FETCH_COMPLETE, completePayload);
      });

      expect(onComplete).toHaveBeenCalledWith({
        requestId,
        nodeId: "node-456",
        entityId: "A123456789",
        nodes: completePayload.nodes,
        edges: completePayload.edges,
        statistics: completePayload.statistics,
      });
    });

    it("should handle data fetch error via EventBridge", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const onExpandError = vi.fn();
      const { result } = renderHook(() => useDataFetchingWorker({ onExpandError }));

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Mark worker as ready first
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          timestamp: Date.now(),
        });
      });

      // Start expansion to create a pending request
      act(() => {
        void result.current.expandNode("node-456", "A123456789", "authors");
      });

      // Wait for expansion to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      // Get the actual request ID from the postMessage call
      const postMessageCalls = testWorker.postMessage.mock.calls;
      expect(postMessageCalls.length).toBeGreaterThan(0);
      const lastCall = postMessageCalls[postMessageCalls.length - 1];
      const requestId = lastCall[0].id;

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.DATA_FETCH_ERROR, {
          requestId,
          nodeId: "node-456",
          entityId: "A123456789",
          error: "API rate limit exceeded",
          timestamp: Date.now(),
        });
      });

      expect(onExpandError).toHaveBeenCalledWith("node-456", "API rate limit exceeded");
    });
  });

  describe("Legacy Message Compatibility", () => {
    it("should still handle legacy worker messages", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const { result } = renderHook(() => useDataFetchingWorker());

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Simulate legacy ready message
      act(() => {
        testWorker.simulateLegacyMessage({ type: "ready" });
      });

      expect(result.current.isWorkerReady).toBe(true);
    });

    it("should handle both EventBridge and legacy messages simultaneously", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const onExpandError = vi.fn();
      const { result } = renderHook(() => useDataFetchingWorker({ onExpandError }));

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Legacy ready
      act(() => {
        testWorker.simulateLegacyMessage({ type: "ready" });
      });

      expect(result.current.isWorkerReady).toBe(true);

      // EventBridge error (doesn't call error callback, just sets worker state)
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_ERROR, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          error: "EventBridge error",
          timestamp: Date.now(),
        });
      });

      // Worker should be marked as not ready
      expect(result.current.isWorkerReady).toBe(false);

      // Legacy error (does call error callback)
      act(() => {
        testWorker.simulateLegacyMessage({
          type: "expandError",
          error: "Legacy error",
          requestId: "req-456",
        });
      });

      // Only legacy error should trigger callback
      expect(onExpandError).toHaveBeenCalledTimes(1);
      expect(onExpandError).toHaveBeenCalledWith("Expansion failed: Legacy error");
    });
  });

  describe("Worker Type Filtering", () => {
    it("should only handle events for data-fetching worker", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const { result } = renderHook(() => useDataFetchingWorker());

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Mark worker as ready initially
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          timestamp: Date.now(),
        });
      });

      expect(result.current.isWorkerReady).toBe(true);

      // Send event for wrong worker type
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_ERROR, {
          workerId: "force-animation-worker",
          workerType: "force-animation", // Wrong type
          error: "Force worker error",
          timestamp: Date.now(),
        });
      });

      // Should not affect data-fetching worker state
      expect(result.current.isWorkerReady).toBe(true);

      // Send event for correct worker type
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_ERROR, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching", // Correct type
          error: "Data worker error",
          timestamp: Date.now(),
        });
      });

      // Should affect data-fetching worker state
      expect(result.current.isWorkerReady).toBe(false);
    });
  });

  describe("Request Management", () => {
    it("should expand node and handle response via EventBridge", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const onProgress = vi.fn();
      const onComplete = vi.fn();

      const { result } = renderHook(() =>
        useDataFetchingWorker({ onProgress, onComplete })
      );

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Mark worker as ready
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching",
          timestamp: Date.now(),
        });
      });

      // Start expansion
      act(() => {
        void result.current.expandNode("node-123", "A123456789", "authors", { maxRelated: 5 });
      });

      expect(testWorker.postMessage).toHaveBeenCalledWith({
        type: "expandNode",
        id: expect.any(String),
        payload: {
          nodeId: "node-123",
          entityId: "A123456789",
          entityType: "authors",
          options: { maxRelated: 5 },
          expansionSettings: undefined,
        },
      });

      // Get the actual request ID from the postMessage call
      const postMessageCalls = testWorker.postMessage.mock.calls;
      expect(postMessageCalls.length).toBeGreaterThan(0);
      const lastCall = postMessageCalls[postMessageCalls.length - 1];
      const requestId = lastCall[0].id;

      // Simulate progress
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.DATA_FETCH_PROGRESS, {
          requestId,
          nodeId: "node-123",
          entityId: "A123456789",
          progress: 0.5,
          currentStep: "Fetching data",
          timestamp: Date.now(),
        });
      });

      expect(onProgress).toHaveBeenCalled();

      // Simulate completion
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.DATA_FETCH_COMPLETE, {
          requestId,
          nodeId: "node-123",
          entityId: "A123456789",
          nodes: [],
          edges: [],
          timestamp: Date.now(),
        });
      });

      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("should unregister EventBridge listeners on unmount", async () => {
      const { eventBridge } = await import("@/lib/graph/events");
      const { unmount } = renderHook(() => useDataFetchingWorker());

      testWorker = workerInstances[0];
      testWorker.setEventBridge(eventBridge);

      // Verify EventBridge has handlers registered
      const debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.messageHandlers.length).toBeGreaterThan(0);

      // Unmount component
      unmount();

      // Verify handlers are cleaned up
      const finalDebugInfo = eventBridge.getDebugInfo();
      expect(finalDebugInfo.messageHandlers.length).toBe(0);
    });
  });
});