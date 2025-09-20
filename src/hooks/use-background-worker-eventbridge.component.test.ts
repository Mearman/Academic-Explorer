/**
 * Component tests for use-animated-force-simulation hook EventBridge integration
 * Tests real hook behavior with EventBridge communication
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useBackgroundWorker } from "./use-background-worker";
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

// Mock performance config utility
vi.mock("@/lib/graph/utils/performance-config", () => ({
  getConfigByGraphSize: vi.fn().mockReturnValue({
    targetFPS: 60,
    sendEveryNTicks: 1,
    alphaDecay: 0.03,
    maxIterations: 1000,
    linkDistance: 200,
    linkStrength: 0.05,
    chargeStrength: -1000,
    centerStrength: 0.01,
    collisionRadius: 120,
    collisionStrength: 1.0,
    velocityDecay: 0.1,
  }),
}));

// Enhanced mock worker for component testing
class TestForceWorker extends EventTarget {
  private messageHandlers: Array<(event: MessageEvent) => void> = [];
  private eventBridge: EventBridge;

  postMessage = vi.fn();
  terminate = vi.fn();

  constructor() {
    super();
    this.eventBridge = EventBridge.getInstance();
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
    // The EventBridge should handle routing to registered handlers
    this.eventBridge.emit(eventType, payload, "main");
  }

  // Simulate legacy worker message
  simulateLegacyMessage(message: any) {
    const event = new MessageEvent("message", { data: message });
    this.messageHandlers.forEach(handler => { handler(event); });
  }
}

// Mock Worker constructor with instance tracking
const workerInstances: TestForceWorker[] = [];
const OriginalWorker = TestForceWorker;
global.Worker = vi.fn().mockImplementation((...args) => {
  const instance = new OriginalWorker(...args);
  workerInstances.push(instance);
  return instance;
}) as unknown as typeof Worker;

describe.skip("useBackgroundWorker EventBridge Integration", () => {
  let testWorker: TestForceWorker;

  beforeEach(() => {
    EventBridge.resetInstance();
    workerInstances.length = 0; // Clear instances array
  });

  afterEach(() => {
    EventBridge.resetInstance();
    vi.clearAllMocks();
    cleanup(); // Clean up DOM between tests
  });

  describe("EventBridge Communication", () => {
    it("should handle worker ready event via EventBridge", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      // Get the worker instance created by the hook
      testWorker = workerInstances[0];

      expect(result.current.isWorkerReady).toBe(false);

      // Simulate worker ready via EventBridge
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          timestamp: Date.now(),
        });
      });

      expect(result.current.isWorkerReady).toBe(true);
    });

    it("should handle worker error via EventBridge", async () => {
      const onError = vi.fn();
      renderHook(() => useBackgroundWorker({ onError }));

      testWorker = workerInstances[0];

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_ERROR, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          error: "Force simulation error",
          timestamp: Date.now(),
        });
      });

      expect(onError).toHaveBeenCalledWith("Worker error: Force simulation error");
    });

    it("should handle force simulation progress via EventBridge", async () => {
      const onPositionUpdate = vi.fn();
      const { result } = renderHook(() => useBackgroundWorker({ onPositionUpdate }));

      testWorker = workerInstances[0];

      const progressPayload: WorkerEventPayloads[WorkerEventType.FORCE_SIMULATION_PROGRESS] = {
        workerId: "force-animation-worker",
        workerType: "force-animation",
        messageType: "tick",
        positions: [
          { id: "node1", x: 100, y: 150 },
          { id: "node2", x: 200, y: 250 },
        ],
        alpha: 0.8,
        iteration: 25,
        progress: 0.25,
        fps: 60,
        timestamp: Date.now(),
      };

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, progressPayload);
      });

      expect(onPositionUpdate).toHaveBeenCalledWith(progressPayload.positions);
      expect(result.current.animationState.alpha).toBe(0.8);
      expect(result.current.animationState.iteration).toBe(25);
      expect(result.current.animationState.progress).toBe(0.25);
      expect(result.current.animationState.fps).toBe(60);
    });

    it("should handle force simulation started event", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "started",
          nodeCount: 10,
          linkCount: 15,
          timestamp: Date.now(),
        });
      });

      expect(result.current.animationState.isRunning).toBe(true);
      expect(result.current.animationState.isPaused).toBe(false);
      expect(result.current.animationState.nodeCount).toBe(10);
      expect(result.current.animationState.linkCount).toBe(15);
    });

    it("should handle force simulation paused/resumed events", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Start animation first
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "started",
          nodeCount: 10,
          linkCount: 15,
          timestamp: Date.now(),
        });
      });

      // Pause
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "paused",
          timestamp: Date.now(),
        });
      });

      expect(result.current.animationState.isPaused).toBe(true);

      // Resume
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "resumed",
          timestamp: Date.now(),
        });
      });

      expect(result.current.animationState.isPaused).toBe(false);
    });

    it("should handle force simulation complete via EventBridge", async () => {
      const onComplete = vi.fn();
      const onPositionUpdate = vi.fn();
      const { result } = renderHook(() => useBackgroundWorker({ onComplete, onPositionUpdate }));

      testWorker = workerInstances[0];

      const completePayload: WorkerEventPayloads[WorkerEventType.FORCE_SIMULATION_COMPLETE] = {
        workerId: "force-animation-worker",
        workerType: "force-animation",
        positions: [
          { id: "node1", x: 150, y: 175 },
          { id: "node2", x: 250, y: 275 },
        ],
        totalIterations: 100,
        finalAlpha: 0.01,
        reason: "converged",
        timestamp: Date.now(),
      };

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_COMPLETE, completePayload);
      });

      expect(onPositionUpdate).toHaveBeenCalledWith(completePayload.positions);
      expect(onComplete).toHaveBeenCalledWith(
        completePayload.positions,
        {
          totalIterations: 100,
          finalAlpha: 0.01,
          reason: "converged",
        }
      );

      expect(result.current.animationState.isRunning).toBe(false);
      expect(result.current.animationState.isPaused).toBe(false);
      expect(result.current.animationState.progress).toBe(1);
      expect(result.current.animationState.alpha).toBe(0.01);
    });

    it("should handle force simulation stopped via EventBridge", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Start animation first
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "started",
          nodeCount: 10,
          linkCount: 15,
          timestamp: Date.now(),
        });
      });

      expect(result.current.animationState.isRunning).toBe(true);

      // Stop animation
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_STOPPED, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          timestamp: Date.now(),
        });
      });

      expect(result.current.animationState.isRunning).toBe(false);
      expect(result.current.animationState.isPaused).toBe(false);
    });

    it("should handle force simulation error via EventBridge", async () => {
      const onError = vi.fn();
      renderHook(() => useBackgroundWorker({ onError }));

      testWorker = workerInstances[0];

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_ERROR, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          error: "Simulation crashed",
          filename: "force-worker.js",
          lineno: 42,
          timestamp: Date.now(),
        });
      });

      expect(onError).toHaveBeenCalledWith("Worker error: Simulation crashed");
    });
  });

  describe("Legacy Message Compatibility", () => {
    it("should still handle legacy worker messages", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Simulate legacy ready message
      act(() => {
        testWorker.simulateLegacyMessage({ type: "ready" });
      });

      expect(result.current.isWorkerReady).toBe(true);
    });

    it("should handle both EventBridge and legacy messages simultaneously", async () => {
      const onPositionUpdate = vi.fn();
      const { result } = renderHook(() => useBackgroundWorker({ onPositionUpdate }));

      testWorker = workerInstances[0];

      // Legacy ready
      act(() => {
        testWorker.simulateLegacyMessage({ type: "ready" });
      });

      expect(result.current.isWorkerReady).toBe(true);

      // EventBridge tick
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "tick",
          positions: [{ id: "node1", x: 100, y: 150 }],
          alpha: 0.8,
          iteration: 25,
          progress: 0.25,
          fps: 60,
          timestamp: Date.now(),
        });
      });

      // Legacy tick
      act(() => {
        testWorker.simulateLegacyMessage({
          type: "tick",
          positions: [{ id: "node2", x: 200, y: 250 }],
          alpha: 0.7,
          iteration: 26,
          progress: 0.26,
          fps: 55,
        });
      });

      expect(onPositionUpdate).toHaveBeenCalledTimes(2);
      expect(onPositionUpdate).toHaveBeenNthCalledWith(1, [{ id: "node1", x: 100, y: 150 }]);
      expect(onPositionUpdate).toHaveBeenNthCalledWith(2, [{ id: "node2", x: 200, y: 250 }]);
    });
  });

  describe("Worker Type Filtering", () => {
    it("should only handle events for force-animation worker", async () => {
      const onError = vi.fn();
      renderHook(() => useBackgroundWorker({ onError }));

      testWorker = workerInstances[0];

      // Send event for wrong worker type
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_ERROR, {
          workerId: "data-fetching-worker",
          workerType: "data-fetching", // Wrong type
          error: "Data worker error",
          timestamp: Date.now(),
        });
      });

      // Should not trigger handler
      expect(onError).not.toHaveBeenCalled();

      // Send event for correct worker type
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_ERROR, {
          workerId: "force-animation-worker",
          workerType: "force-animation", // Correct type
          error: "Force worker error",
          timestamp: Date.now(),
        });
      });

      // Should trigger handler
      expect(onError).toHaveBeenCalledWith("Worker error: Force worker error");
    });
  });

  describe("Animation Control", () => {
    it("should start animation and send message to worker", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Mark worker as ready
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          timestamp: Date.now(),
        });
      });

      const nodes = [
        { id: "node1", x: 100, y: 150 },
        { id: "node2", x: 200, y: 250 },
      ];

      const links = [
        { id: "link1", source: "node1", target: "node2" },
      ];

      // Start animation
      act(() => {
        result.current.startAnimation(nodes, links);
      });

      expect(testWorker.postMessage).toHaveBeenCalledWith({
        type: "start",
        nodes,
        links,
        config: undefined,
        pinnedNodes: undefined,
      });
    });

    it("should control animation lifecycle (pause, resume, stop)", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Mark worker as ready and animation as running
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          timestamp: Date.now(),
        });

        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "started",
          nodeCount: 2,
          linkCount: 1,
          timestamp: Date.now(),
        });
      });

      // Pause animation
      act(() => {
        result.current.pauseAnimation();
      });

      expect(testWorker.postMessage).toHaveBeenCalledWith({ type: "pause" });

      // Resume animation (need to simulate paused state first)
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "paused",
          timestamp: Date.now(),
        });
      });

      act(() => {
        result.current.resumeAnimation();
      });

      expect(testWorker.postMessage).toHaveBeenCalledWith({ type: "resume" });

      // Stop animation
      act(() => {
        result.current.stopAnimation();
      });

      expect(testWorker.postMessage).toHaveBeenCalledWith({ type: "stop" });
    });

    it("should update parameters during animation", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Mark worker as ready and animation as running
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.WORKER_READY, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          timestamp: Date.now(),
        });

        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "started",
          nodeCount: 2,
          linkCount: 1,
          timestamp: Date.now(),
        });
      });

      const newConfig = {
        chargeStrength: -500,
        linkDistance: 150,
      };

      act(() => {
        result.current.updateParameters(newConfig);
      });

      expect(testWorker.postMessage).toHaveBeenCalledWith({
        type: "update_parameters",
        config: newConfig,
      });
    });
  });

  describe("Performance Stats", () => {
    it("should track performance statistics", async () => {
      const { result } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Send multiple tick events with different FPS
      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "tick",
          positions: [{ id: "node1", x: 100, y: 150 }],
          alpha: 0.8,
          iteration: 1,
          progress: 0.01,
          fps: 60,
          timestamp: Date.now(),
        });
      });

      act(() => {
        testWorker.simulateEventBridgeMessage(WorkerEventType.FORCE_SIMULATION_PROGRESS, {
          workerId: "force-animation-worker",
          workerType: "force-animation",
          messageType: "tick",
          positions: [{ id: "node1", x: 101, y: 151 }],
          alpha: 0.79,
          iteration: 2,
          progress: 0.02,
          fps: 55,
          timestamp: Date.now(),
        });
      });

      const stats = result.current.performanceStats;
      expect(stats.frameCount).toBe(2);
      expect(stats.averageFPS).toBeCloseTo(57.5, 1);
      expect(stats.minFPS).toBe(55);
      expect(stats.maxFPS).toBe(60);
    });
  });

  describe("Cleanup", () => {
    it("should unregister EventBridge listeners on unmount", () => {
      const { unmount } = renderHook(() => useBackgroundWorker());

      testWorker = workerInstances[0];

      // Verify EventBridge has handlers registered
      const eventBridge = EventBridge.getInstance();
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