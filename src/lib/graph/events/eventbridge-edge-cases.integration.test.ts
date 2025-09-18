/**
 * Edge case and error scenario tests for EventBridge system
 * Tests resilience, error handling, and boundary conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventBridge } from "./event-bridge";
import { WorkerEventType, type CrossContextMessage } from "./types";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock worker that can simulate various failure modes
class FailureWorker extends EventTarget {
  private messageHandlers: Array<(event: MessageEvent) => void> = [];
  private shouldFailPostMessage = false;
  private shouldFailEventDispatch = false;

  postMessage = vi.fn((_message: any) => {
    if (this.shouldFailPostMessage) {
      throw new Error("Worker postMessage failed");
    }
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

  // Control failure modes
  setPostMessageFailure(shouldFail: boolean) {
    this.shouldFailPostMessage = shouldFail;
  }

  setEventDispatchFailure(shouldFail: boolean) {
    this.shouldFailEventDispatch = shouldFail;
  }

  // Simulate receiving a message from worker
  simulateWorkerMessage(message: CrossContextMessage) {
    if (this.shouldFailEventDispatch) {
      throw new Error("Event dispatch failed");
    }
    const event = new MessageEvent("message", { data: message });
    this.messageHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        // Simulate handler errors
        if (this.shouldFailEventDispatch) {
          throw error;
        }
      }
    });
  }
}

global.Worker = FailureWorker as unknown as typeof Worker;

describe("EventBridge Edge Cases and Error Handling", () => {
  let eventBridge: EventBridge;
  let mockWorker: FailureWorker;

  beforeEach(() => {
    EventBridge.resetInstance();
    eventBridge = EventBridge.getInstance();
    mockWorker = new FailureWorker();
  });

  afterEach(() => {
    EventBridge.resetInstance();
    vi.clearAllMocks();
  });

  describe("Worker Communication Failures", () => {
    it("should handle postMessage failures gracefully", () => {
      mockWorker.setPostMessageFailure(true);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "failing-worker");

      // Should not throw even when postMessage fails
      expect(() => {
        eventBridge.emit(WorkerEventType.WORKER_READY, {
          workerId: "test",
          workerType: "data-fetching",
          timestamp: Date.now(),
        }, "worker");
      }).not.toThrow();

      expect(mockWorker.postMessage).toHaveBeenCalled();
    });

    it("should handle worker termination during message sending", () => {
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      // Simulate worker being terminated
      mockWorker.terminate();
      mockWorker.postMessage = vi.fn(() => {
        throw new Error("Worker is terminated");
      });

      // Should handle gracefully
      expect(() => {
        eventBridge.emit(WorkerEventType.WORKER_READY, {
          workerId: "test",
          workerType: "data-fetching",
          timestamp: Date.now(),
        }, "worker");
      }).not.toThrow();
    });

    it("should handle malformed messages from worker", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      // Send completely invalid message
      mockWorker.simulateWorkerMessage(null as any);
      mockWorker.simulateWorkerMessage(undefined as any);
      mockWorker.simulateWorkerMessage("string" as any);
      mockWorker.simulateWorkerMessage(123 as any);

      // Handler should not be called for invalid messages
      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle partially invalid messages", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      // Message missing required fields
      const partialMessage = {
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        // Missing other required fields
      };

      mockWorker.simulateWorkerMessage(partialMessage as any);

      // Should not process invalid message
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Handler Error Resilience", () => {
    it("should continue processing when one handler throws", () => {
      const errorHandler = vi.fn(() => {
        throw new Error("Handler error");
      });
      const workingHandler1 = vi.fn();
      const workingHandler2 = vi.fn();

      eventBridge.registerMessageHandler("error-handler", errorHandler);
      eventBridge.registerMessageHandler("working-handler-1", workingHandler1);
      eventBridge.registerMessageHandler("working-handler-2", workingHandler2);

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };
      eventBridge.emit(WorkerEventType.WORKER_READY, payload);

      // All handlers should be called despite error in one
      expect(errorHandler).toHaveBeenCalled();
      expect(workingHandler1).toHaveBeenCalled();
      expect(workingHandler2).toHaveBeenCalled();
    });

    it("should handle async handler errors", async () => {
      const asyncErrorHandler = vi.fn(async () => {
        await new Promise<void>(resolve => setTimeout(resolve, 10));
        throw new Error("Async handler error");
      });
      const syncHandler = vi.fn();

      eventBridge.registerMessageHandler("async-error-handler", (...args) => {
        void asyncErrorHandler(...args);
      });
      eventBridge.registerMessageHandler("sync-handler", syncHandler);

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };

      // Should not throw synchronously
      expect(() => {
        eventBridge.emit(WorkerEventType.WORKER_READY, payload);
      }).not.toThrow();

      // Both handlers should be called
      expect(asyncErrorHandler).toHaveBeenCalled();
      expect(syncHandler).toHaveBeenCalled();
    });
  });

  describe("Serialization Edge Cases", () => {
    it("should handle circular reference in payload", () => {
      const circularPayload: any = { workerId: "test", workerType: "data-fetching" };
      circularPayload.self = circularPayload;

      expect(() => {
        eventBridge.serialize(WorkerEventType.WORKER_READY, circularPayload);
      }).toThrow("Event serialization failed");
    });

    it("should handle undefined and null values in payload", () => {
      const payloadWithNulls = {
        workerId: "test",
        workerType: "data-fetching" as const,
        undefinedValue: undefined,
        nullValue: null,
        timestamp: Date.now(),
      };

      const serialized = eventBridge.serialize(WorkerEventType.WORKER_READY, payloadWithNulls);
      const deserialized = eventBridge.deserialize(serialized);

      expect(deserialized.payload).toEqual({
        workerId: "test",
        workerType: "data-fetching",
        undefinedValue: undefined, // undefined is preserved in JSON
        nullValue: null,
        timestamp: expect.any(Number),
      });
    });

    it("should handle very large payloads", () => {
      const largeArray = new Array(10000).fill("x").map((_, i) => `item-${i}`);
      const largePayload = {
        workerId: "test",
        workerType: "data-fetching" as const,
        largeData: largeArray,
        timestamp: Date.now(),
      };

      const serialized = eventBridge.serialize(WorkerEventType.WORKER_READY, largePayload);
      const deserialized = eventBridge.deserialize(serialized);

      expect(deserialized.payload).toEqual(largePayload);
    });

    it("should handle malformed JSON in deserialization", () => {
      const malformedSerialized = {
        eventType: WorkerEventType.WORKER_READY,
        payload: "{ invalid json }",
        metadata: {
          sourceContext: "worker",
          targetContext: "main",
          timestamp: Date.now(),
        },
      };

      expect(() => {
        eventBridge.deserialize(malformedSerialized);
      }).toThrow("Event deserialization failed");
    });
  });

  describe("Context Filtering Edge Cases", () => {
    it("should handle messages with unknown target contexts", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const messageWithUnknownContext: CrossContextMessage = {
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "unknown-context" as any,
        timestamp: Date.now(),
      };

      mockWorker.simulateWorkerMessage(messageWithUnknownContext);

      // Should not process message with unknown target context
      expect(handler).not.toHaveBeenCalled();
    });

    it("should handle messages without target context", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const messageWithoutTarget: CrossContextMessage = {
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: undefined,
        timestamp: Date.now(),
      };

      mockWorker.simulateWorkerMessage(messageWithoutTarget);

      // Should process message without target context (broadcast)
      expect(handler).toHaveBeenCalled();
    });

    it("should handle self-referencing contexts", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);

      // Message from main to main
      eventBridge.emit(WorkerEventType.WORKER_READY, {
        workerId: "test",
        workerType: "data-fetching",
        timestamp: Date.now(),
      }, "main");

      expect(handler).toHaveBeenCalled();
    });
  });

  describe("Memory and Resource Management", () => {
    it("should handle rapid handler registration/unregistration", () => {
      // Register many handlers
      const handlers = Array.from({ length: 1000 }, (_, i) => {
        const handler = vi.fn();
        eventBridge.registerMessageHandler(`handler-${i}`, handler);
        return { id: `handler-${i}`, handler };
      });

      let debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.messageHandlers).toHaveLength(1000);

      // Unregister all handlers
      handlers.forEach(({ id }) => {
        eventBridge.unregisterMessageHandler(id);
      });

      debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.messageHandlers).toHaveLength(0);
    });

    it("should handle rapid worker registration/cleanup", () => {
      Array.from({ length: 100 }, (_, i) => {
        const worker = new FailureWorker();
        eventBridge.registerWorker(worker as unknown as Worker, `worker-${i}`);
        return worker;
      });

      let debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.registeredWorkers).toHaveLength(100);

      // Cleanup
      eventBridge.cleanup();

      debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.registeredWorkers).toHaveLength(0);
    });

    it("should handle duplicate handler registration", () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBridge.registerMessageHandler("duplicate-id", handler1);
      eventBridge.registerMessageHandler("duplicate-id", handler2); // Overwrite

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };
      eventBridge.emit(WorkerEventType.WORKER_READY, payload);

      // Only the second handler should be called
      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });

    it("should handle duplicate worker registration", () => {
      const worker1 = new FailureWorker();
      const worker2 = new FailureWorker();

      eventBridge.registerWorker(worker1 as unknown as Worker, "duplicate-worker");
      eventBridge.registerWorker(worker2 as unknown as Worker, "duplicate-worker"); // Overwrite

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };
      eventBridge.emit(WorkerEventType.WORKER_READY, payload, "worker");

      // Only the second worker should receive message
      expect(worker1.postMessage).not.toHaveBeenCalled();
      expect(worker2.postMessage).toHaveBeenCalled();
    });
  });

  describe("Timing and Race Conditions", () => {
    it("should handle messages sent before worker registration", () => {
      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };

      // Send message before any workers are registered
      expect(() => {
        eventBridge.emit(WorkerEventType.WORKER_READY, payload, "worker");
      }).not.toThrow();

      // Register worker after message was sent
      eventBridge.registerWorker(mockWorker as unknown as Worker, "late-worker");

      // Worker should not receive the earlier message
      expect(mockWorker.postMessage).not.toHaveBeenCalled();
    });

    it("should handle worker termination during message processing", () => {
      const handler = vi.fn(() => {
        // Simulate worker being terminated during handler execution
        eventBridge.cleanup();
      });

      eventBridge.registerMessageHandler("terminating-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const validMessage: CrossContextMessage = {
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      };

      // Should not throw even when cleanup happens during processing
      expect(() => {
        mockWorker.simulateWorkerMessage(validMessage);
      }).not.toThrow();

      expect(handler).toHaveBeenCalled();
    });

    it("should handle rapid event emission", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("rapid-handler", handler);

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };

      // Send 1000 events rapidly
      for (let i = 0; i < 1000; i++) {
        eventBridge.emit(WorkerEventType.WORKER_READY, { ...payload, iteration: i });
      }

      expect(handler).toHaveBeenCalledTimes(1000);
    });
  });

  describe("Boundary Value Testing", () => {
    it("should handle empty payloads", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("empty-handler", handler);

      eventBridge.emit(WorkerEventType.WORKER_READY, {});

      expect(handler).toHaveBeenCalledWith({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: {},
        sourceContext: "main",
        targetContext: undefined,
        timestamp: expect.any(Number),
      });
    });

    it("should handle very long event type names", () => {
      const longEventType = "a".repeat(1000);
      const handler = vi.fn();
      eventBridge.registerMessageHandler("long-event-handler", handler);

      eventBridge.emit(longEventType, { workerId: "test", workerType: "data-fetching" });

      expect(handler).toHaveBeenCalledWith({
        type: "event",
        eventType: longEventType,
        payload: { workerId: "test", workerType: "data-fetching" },
        sourceContext: "main",
        targetContext: undefined,
        timestamp: expect.any(Number),
      });
    });

    it("should handle timestamps at boundary values", () => {
      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: 0 };
      const serialized = eventBridge.serialize(WorkerEventType.WORKER_READY, payload);
      const deserialized = eventBridge.deserialize(serialized);

      expect(deserialized.payload).toEqual(payload);

      // Test with max safe integer
      const maxPayload = { ...payload, timestamp: Number.MAX_SAFE_INTEGER };
      const maxSerialized = eventBridge.serialize(WorkerEventType.WORKER_READY, maxPayload);
      const maxDeserialized = eventBridge.deserialize(maxSerialized);

      expect(maxDeserialized.payload).toEqual(maxPayload);
    });
  });
});