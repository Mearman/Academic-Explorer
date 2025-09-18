/**
 * Unit tests for EventBridge cross-context communication system
 * Tests message validation, worker registration, and event emission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { EventBridge } from "./event-bridge";
import { WorkerEventType, type CrossContextMessage } from "./types";

// Mock logger to avoid console noise in tests
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock Worker class for testing
class MockWorker extends EventTarget {
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn((type, listener) => {
    super.addEventListener(type, listener);
  });
  removeEventListener = vi.fn((type, listener) => {
    super.removeEventListener(type, listener);
  });
}

// Mock global Worker constructor
global.Worker = MockWorker as unknown as typeof Worker;

describe("EventBridge", () => {
  let eventBridge: EventBridge;
  let mockWorker: MockWorker;

  beforeEach(() => {
    // Reset singleton before each test
    EventBridge.resetInstance();
    eventBridge = EventBridge.getInstance();
    mockWorker = new MockWorker();
  });

  afterEach(() => {
    EventBridge.resetInstance();
    vi.clearAllMocks();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = EventBridge.getInstance();
      const instance2 = EventBridge.getInstance();
      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = EventBridge.getInstance();
      EventBridge.resetInstance();
      const instance2 = EventBridge.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Context Detection", () => {
    it("should detect main context by default", () => {
      expect(eventBridge.getCurrentContext()).toBe("main");
    });

    it("should provide debug information", () => {
      const debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo).toHaveProperty("currentContext");
      expect(debugInfo).toHaveProperty("registeredWorkers");
      expect(debugInfo).toHaveProperty("messageHandlers");
    });
  });

  describe("Worker Registration", () => {
    it("should register a worker successfully", () => {
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.registeredWorkers).toContain("test-worker");
    });

    it("should not register worker in non-main context", () => {
      // Mock worker context by simulating worker environment
      const originalWindow = (global as any).window;
      const originalSelf = (global as any).self;

      // Simulate worker context
      delete (global as any).window;
      (global as any).self = { addEventListener: vi.fn() };

      // Create new EventBridge instance in worker context
      EventBridge.resetInstance();
      const workerEventBridge = EventBridge.getInstance();

      workerEventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const debugInfo = workerEventBridge.getDebugInfo();
      expect(debugInfo.registeredWorkers).not.toContain("test-worker");

      // Restore original environment
      (global as any).window = originalWindow;
      (global as any).self = originalSelf;

      // Restore main context EventBridge
      EventBridge.resetInstance();
      eventBridge = EventBridge.getInstance();
    });

    it("should listen for messages from registered worker", () => {
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");
      expect(mockWorker.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
    });
  });

  describe("Message Handler Registration", () => {
    it("should register message handler", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);

      const debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.messageHandlers).toContain("test-handler");
    });

    it("should unregister message handler", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.unregisterMessageHandler("test-handler");

      const debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.messageHandlers).not.toContain("test-handler");
    });
  });

  describe("Message Validation", () => {
    it("should validate proper CrossContextMessage", () => {
      const validMessage: CrossContextMessage = {
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      };

      // Access private method through type assertion for testing
      const isValid = (eventBridge as any).isValidCrossContextMessage(validMessage);
      expect(isValid).toBe(true);
    });

    it("should reject invalid message format", () => {
      const invalidMessage = {
        type: "ready", // Wrong format - should be "event"
      };

      const isValid = (eventBridge as any).isValidCrossContextMessage(invalidMessage);
      expect(isValid).toBe(false);
    });

    it("should reject null or undefined messages", () => {
      expect((eventBridge as any).isValidCrossContextMessage(null)).toBe(false);
      expect((eventBridge as any).isValidCrossContextMessage(undefined)).toBe(false);
      expect((eventBridge as any).isValidCrossContextMessage("string")).toBe(false);
    });
  });

  describe("Event Emission", () => {
    it("should emit event to local handlers", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };
      eventBridge.emit(WorkerEventType.WORKER_READY, payload);

      expect(handler).toHaveBeenCalledWith({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload,
        sourceContext: "main",
        targetContext: undefined,
        timestamp: expect.any(Number),
      });
    });

    it("should emit event to specific context", () => {
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };
      eventBridge.emit(WorkerEventType.WORKER_READY, payload, "worker");

      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload,
        sourceContext: "main",
        targetContext: "worker",
        timestamp: expect.any(Number),
      });
    });

    it("should handle errors when sending to worker", () => {
      mockWorker.postMessage = vi.fn().mockImplementation(() => {
        throw new Error("Worker communication failed");
      });

      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };

      // Should not throw, but handle error gracefully
      expect(() => {
        eventBridge.emit(WorkerEventType.WORKER_READY, payload, "worker");
      }).not.toThrow();
    });
  });

  describe("Serialization", () => {
    it("should serialize event payload correctly", () => {
      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };
      const serialized = eventBridge.serialize(WorkerEventType.WORKER_READY, payload, "worker");

      expect(serialized).toEqual({
        eventType: WorkerEventType.WORKER_READY,
        payload: JSON.stringify(payload),
        metadata: {
          sourceContext: "main",
          targetContext: "worker",
          timestamp: expect.any(Number),
        },
      });
    });

    it("should deserialize event payload correctly", () => {
      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };
      const serialized = eventBridge.serialize(WorkerEventType.WORKER_READY, payload, "worker");
      const deserialized = eventBridge.deserialize(serialized);

      expect(deserialized).toEqual({
        eventType: WorkerEventType.WORKER_READY,
        payload,
      });
    });

    it("should handle serialization errors", () => {
      const circularPayload: any = {};
      circularPayload.self = circularPayload; // Create circular reference

      expect(() => {
        eventBridge.serialize(WorkerEventType.WORKER_READY, circularPayload);
      }).toThrow("Event serialization failed");
    });

    it("should handle deserialization errors", () => {
      const invalidSerialized = {
        eventType: WorkerEventType.WORKER_READY,
        payload: "invalid json {",
        metadata: {
          sourceContext: "main",
          targetContext: "worker",
          timestamp: Date.now(),
        },
      };

      expect(() => {
        eventBridge.deserialize(invalidSerialized);
      }).toThrow("Event deserialization failed");
    });
  });

  describe("Cross-Context Message Handling", () => {
    it("should process valid cross-context messages", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);

      const validMessage: CrossContextMessage = {
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "worker",
        targetContext: "main",
        timestamp: Date.now(),
      };

      // Simulate receiving a message from worker
      const messageEvent = new MessageEvent("message", { data: validMessage });
      mockWorker.dispatchEvent(messageEvent);

      // Since worker is not registered, handler should not be called
      expect(handler).not.toHaveBeenCalled();

      // Now register worker and try again
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");
      mockWorker.dispatchEvent(messageEvent);

      expect(handler).toHaveBeenCalledWith(validMessage);
    });

    it("should ignore invalid cross-context messages", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const invalidMessage = { type: "ready" }; // Invalid format

      const messageEvent = new MessageEvent("message", { data: invalidMessage });
      mockWorker.dispatchEvent(messageEvent);

      expect(handler).not.toHaveBeenCalled();
    });

    it("should filter messages by target context", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      const messageForWorker: CrossContextMessage = {
        type: "event",
        eventType: WorkerEventType.WORKER_READY,
        payload: { workerId: "test", workerType: "data-fetching", timestamp: Date.now() },
        sourceContext: "main",
        targetContext: "worker", // Not for main context
        timestamp: Date.now(),
      };

      const messageEvent = new MessageEvent("message", { data: messageForWorker });
      mockWorker.dispatchEvent(messageEvent);

      // Handler should not be called because message is targeted to worker context
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("Cleanup", () => {
    it("should clean up resources", () => {
      const handler = vi.fn();
      eventBridge.registerMessageHandler("test-handler", handler);
      eventBridge.registerWorker(mockWorker as unknown as Worker, "test-worker");

      let debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.messageHandlers).toContain("test-handler");
      expect(debugInfo.registeredWorkers).toContain("test-worker");

      eventBridge.cleanup();

      debugInfo = eventBridge.getDebugInfo();
      expect(debugInfo.messageHandlers).toHaveLength(0);
      expect(debugInfo.registeredWorkers).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in message handlers gracefully", () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error("Handler error");
      });
      const workingHandler = vi.fn();

      eventBridge.registerMessageHandler("error-handler", errorHandler);
      eventBridge.registerMessageHandler("working-handler", workingHandler);

      const payload = { workerId: "test", workerType: "data-fetching" as const, timestamp: Date.now() };

      // Should not throw, even with error in one handler
      expect(() => {
        eventBridge.emit(WorkerEventType.WORKER_READY, payload);
      }).not.toThrow();

      expect(errorHandler).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled();
    });
  });
});