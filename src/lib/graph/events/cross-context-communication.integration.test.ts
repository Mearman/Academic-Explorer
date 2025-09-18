/**
 * Integration tests for cross-context EventBridge communication
 * Tests actual worker communication patterns and message flow
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventBridge } from "./event-bridge";
import { WorkerEventType, type WorkerEventPayloads, type CrossContextMessage, isWorkerEventType } from "./types";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Enhanced mock worker that can simulate message communication
class MockWorker extends EventTarget {
  private messageHandlers: Array<(event: MessageEvent) => void> = [];

  postMessage = vi.fn((message: any) => {
    // Simulate async message processing
    setTimeout(() => {
      // Simulate worker sending back a response
      if (message.type === "start") {
        this.simulateWorkerMessage({
          type: "event",
          eventType: WorkerEventType.WORKER_READY,
          payload: {
            workerId: "test-worker",
            workerType: "data-fetching" as const,
            timestamp: Date.now(),
          },
          sourceContext: "worker",
          targetContext: "main",
          timestamp: Date.now(),
        });
      }
    }, 10);
  });

  terminate = vi.fn();

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

  // Simulate receiving a message from worker
  simulateWorkerMessage(message: CrossContextMessage) {
    const event = new MessageEvent("message", { data: message });
    this.messageHandlers.forEach(handler => { handler(event); });
  }

  // Simulate worker error
  simulateWorkerError(message: string) {
    const errorEvent = new ErrorEvent("error", { message });
    this.dispatchEvent(errorEvent);
  }
}

global.Worker = MockWorker as unknown as typeof Worker;

describe("Cross-Context EventBridge Communication", () => {
  let eventBridge: EventBridge;
  let mockWorker: MockWorker;

  beforeEach(() => {
    EventBridge.resetInstance();
    eventBridge = EventBridge.getInstance();
    mockWorker = new MockWorker();
  });

  afterEach(() => {
    EventBridge.resetInstance();
    vi.clearAllMocks();
  });

  describe("Worker Lifecycle Events", () => {
    it("should handle worker ready event", async () => {
      const readyHandler = vi.fn();

      eventBridge.registerMessageHandler("worker-ready", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.WORKER_READY) {
          readyHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      // Simulate worker sending ready message
      const readyPayload: WorkerEventPayloads[WorkerEventType.WORKER_READY] = {
        workerId: "test-worker",
        workerType: "data-fetching",
        timestamp: Date.now(),
      };

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: readyPayload,
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      // Wait for async processing
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(readyHandler).toHaveBeenCalledWith(readyPayload);
    });

    it("should handle worker error event", async () => {
      const errorHandler = vi.fn();

      eventBridge.registerMessageHandler("worker-error", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.WORKER_ERROR) {
          errorHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const errorPayload: WorkerEventPayloads[WorkerEventType.WORKER_ERROR] = {
        workerId: "test-worker",
        workerType: "data-fetching",
        error: "Test error message",
        timestamp: Date.now(),
      };

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.WORKER_ERROR,
        payload: errorPayload,
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(errorHandler).toHaveBeenCalledWith(errorPayload);
    });
  });

  describe("Data Fetching Worker Events", () => {
    it("should handle data fetch progress event", async () => {
      const progressHandler = vi.fn();

      eventBridge.registerMessageHandler("data-progress", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.DATA_FETCH_PROGRESS) {
          progressHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "data-fetching-worker");

      const progressPayload: WorkerEventPayloads[WorkerEventType.DATA_FETCH_PROGRESS] = {
        requestId: "req-123",
        nodeId: "node-456",
        entityId: "entity-789",
        progress: 0.5,
        currentStep: "Fetching related works",
        timestamp: Date.now(),
      };

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.DATA_FETCH_PROGRESS,
        payload: progressPayload,
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(progressHandler).toHaveBeenCalledWith(progressPayload);
    });

    it("should handle data fetch complete event", async () => {
      const completeHandler = vi.fn();

      eventBridge.registerMessageHandler("data-complete", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.DATA_FETCH_COMPLETE) {
          completeHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "data-fetching-worker");

      const completePayload: WorkerEventPayloads[WorkerEventType.DATA_FETCH_COMPLETE] = {
        requestId: "req-123",
        nodeId: "node-456",
        entityId: "entity-789",
        nodes: [],
        edges: [],
        statistics: {
          nodesAdded: 5,
          edgesAdded: 3,
          apiCalls: 2,
          duration: 1500,
        },
        timestamp: Date.now(),
      };

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.DATA_FETCH_COMPLETE,
        payload: completePayload,
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(completeHandler).toHaveBeenCalledWith(completePayload);
    });
  });

  describe("Force Simulation Worker Events", () => {
    it("should handle force simulation progress event", async () => {
      const progressHandler = vi.fn();

      eventBridge.registerMessageHandler("force-progress", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.FORCE_SIMULATION_PROGRESS) {
          progressHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "force-animation-worker");

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

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.FORCE_SIMULATION_PROGRESS,
        payload: progressPayload,
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(progressHandler).toHaveBeenCalledWith(progressPayload);
    });

    it("should handle force simulation complete event", async () => {
      const completeHandler = vi.fn();

      eventBridge.registerMessageHandler("force-complete", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.FORCE_SIMULATION_COMPLETE) {
          completeHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "force-animation-worker");

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

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.FORCE_SIMULATION_COMPLETE,
        payload: completePayload,
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(completeHandler).toHaveBeenCalledWith(completePayload);
    });

    it("should handle force simulation stopped event", async () => {
      const stoppedHandler = vi.fn();

      eventBridge.registerMessageHandler("force-stopped", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.FORCE_SIMULATION_STOPPED) {
          stoppedHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "force-animation-worker");

      const stoppedPayload: WorkerEventPayloads[WorkerEventType.FORCE_SIMULATION_STOPPED] = {
        workerId: "force-animation-worker",
        workerType: "force-animation",
        timestamp: Date.now(),
      };

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.FORCE_SIMULATION_STOPPED,
        payload: stoppedPayload,
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(stoppedHandler).toHaveBeenCalledWith(stoppedPayload);
    });
  });

  describe("Bi-directional Communication", () => {
    it("should support main thread sending commands to worker", () => {
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const commandPayload = {
        workerId: "test-worker",
        workerType: "data-fetching" as const,
        command: "start",
        timestamp: Date.now(),
      };

      eventBridge.emit("worker:command", commandPayload, "worker");

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: "event",
        eventType: "worker:command",
        payload: commandPayload,
        sourceContext: "main",
        targetContext: "worker",
        timestamp: expect.any(Number),
      });
    });

    it("should handle multiple workers simultaneously", async () => {
      const worker1 = new MockWorker();
      const worker2 = new MockWorker();

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBridge.registerWorker(worker1 as unknown as Worker, "worker-1");
      eventBridge.registerWorker(worker2 as unknown as Worker, "worker-2");

      eventBridge.registerMessageHandler("worker-1-ready", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.WORKER_READY &&
            message.payload && typeof message.payload === "object" &&
            "workerId" in message.payload && message.payload.workerId === "worker-1") {
          handler1(message.payload);
        }
      });

      eventBridge.registerMessageHandler("worker-2-ready", (message) => {
        if (isWorkerEventType(message.eventType) && message.eventType === WorkerEventType.WORKER_READY &&
            message.payload && typeof message.payload === "object" &&
            "workerId" in message.payload && message.payload.workerId === "worker-2") {
          handler2(message.payload);
        }
      });

      // Simulate both workers sending ready messages
      worker1.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "worker-1", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      worker2.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "worker-2", workerType: "force-animation", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(handler1).toHaveBeenCalledWith(
        expect.objectContaining({ workerId: "worker-1" })
      );
      expect(handler2).toHaveBeenCalledWith(
        expect.objectContaining({ workerId: "worker-2" })
      );
    });
  });

  describe("Message Filtering", () => {
    it("should filter messages by worker type", async () => {
      const dataHandler = vi.fn();
      const forceHandler = vi.fn();

      eventBridge.registerMessageHandler("data-events", (message) => {
        if (message.payload && typeof message.payload === "object" &&
            "workerType" in message.payload && message.payload.workerType === "data-fetching") {
          dataHandler(message.payload);
        }
      });

      eventBridge.registerMessageHandler("force-events", (message) => {
        if (message.payload && typeof message.payload === "object" &&
            "workerType" in message.payload && message.payload.workerType === "force-animation") {
          forceHandler(message.payload);
        }
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      // Send data-fetching event
      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(dataHandler).toHaveBeenCalled();
      expect(forceHandler).not.toHaveBeenCalled();

      // Reset and send force-animation event
      dataHandler.mockClear();
      forceHandler.mockClear();

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "force-animation", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(dataHandler).not.toHaveBeenCalled();
      expect(forceHandler).toHaveBeenCalled();
    });
  });

  describe("Error Recovery", () => {
    it("should continue processing after handler errors", async () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error("Handler error");
      });
      const successHandler = vi.fn();

      eventBridge.registerMessageHandler("error-handler", errorHandler);
      eventBridge.registerMessageHandler("success-handler", successHandler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      mockWorker.simulateWorkerMessage({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(errorHandler).toHaveBeenCalled();
      expect(successHandler).toHaveBeenCalled();
    });

    it("should handle worker communication failures gracefully", () => {
      mockWorker.postMessage.mockImplementation(() => {
        throw new Error("Communication failed");
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      // Should not throw
      expect(() => {
        eventBridge.emit(WorkerEventType.WORKER_READY, {
          workerId: "test",
          workerType: "data-fetching",
          timestamp: Date.now(),
        }, "worker");
      }).not.toThrow();
    });
  });
});