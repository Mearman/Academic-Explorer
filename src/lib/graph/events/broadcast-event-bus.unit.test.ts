/**
 * Unit tests for BroadcastEventBus
 * Tests the enhanced event-driven worker communication system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BroadcastEventBus, WorkerEventBus } from "./broadcast-event-bus";
import { WorkerEventType } from "./types";

// Mock BroadcastChannel with proper cross-context simulation
const mockChannels = new Map<string, MockBroadcastChannel[]>();

class MockBroadcastChannel {
  public onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public name: string) {
    // Add this channel to the mock registry
    if (!mockChannels.has(name)) {
      mockChannels.set(name, []);
    }
    mockChannels.get(name)!.push(this);
  }

  postMessage(message: any) {
    // Simulate async cross-context message delivery
    setTimeout(() => {
      const event = new MessageEvent("message", { data: message });
      // Send to all other channels with the same name (simulating cross-context)
      const channels = mockChannels.get(this.name) || [];
      channels.forEach(channel => {
        if (channel !== this && channel.onmessage) {
          channel.onmessage(event);
        }
      });
    }, 0);
  }

  close() {
    const channels = mockChannels.get(this.name);
    if (channels) {
      const index = channels.indexOf(this);
      if (index > -1) {
        channels.splice(index, 1);
      }
    }
  }

  // Test helper to simulate external messages from another context
  simulateExternalMessage(message: any) {
    const event = new MessageEvent("message", { data: message });
    if (this.onmessage) {
      this.onmessage(event);
    }
  }
}

// Mock the global BroadcastChannel
global.BroadcastChannel = MockBroadcastChannel as any;

describe("BroadcastEventBus", () => {
  let eventBus: BroadcastEventBus;

  beforeEach(() => {
    // Reset singleton and mock channels
    BroadcastEventBus.resetInstance();
    mockChannels.clear();
    eventBus = BroadcastEventBus.getInstance("test-channel");
  });

  afterEach(() => {
    eventBus.close();
    BroadcastEventBus.resetInstance();
    mockChannels.clear();
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance", () => {
      const instance1 = BroadcastEventBus.getInstance("test");
      const instance2 = BroadcastEventBus.getInstance("test");
      expect(instance1).toBe(instance2);
    });

    it("should reset instance correctly", () => {
      const instance1 = BroadcastEventBus.getInstance("test");
      BroadcastEventBus.resetInstance();
      const instance2 = BroadcastEventBus.getInstance("test");
      expect(instance1).not.toBe(instance2);
    });
  });

  describe("Event Emission and Listening", () => {
    it("should emit and receive events", async () => {
      const testPayload = { test: "data" };
      const receivedEvents: any[] = [];

      const listenerId = eventBus.listen("TEST_EVENT", (event) => {
        receivedEvents.push(event);
      });

      // Simulate receiving a message from another context (worker)
      // Since BroadcastEventBus filters out same-context messages, we need to simulate cross-context
      const mockChannel = mockChannels.get("test-channel")![0];
      mockChannel.simulateExternalMessage({
        type: "TEST_EVENT", // This should be the event type directly
        payload: testPayload,
        messageId: "test-msg-1",
        timestamp: Date.now(),
        sourceContext: "worker", // Different context
        targetContext: "main"
      });

      // Wait for async message delivery
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].payload).toEqual(testPayload);
      expect(receivedEvents[0].type).toBe("TEST_EVENT");
      expect(receivedEvents[0].sourceContext).toBe("worker");

      eventBus.removeListener(listenerId);
    });

    it("should handle multiple listeners for the same event", async () => {
      const receivedEvents1: any[] = [];
      const receivedEvents2: any[] = [];

      const listener1Id = eventBus.listen("MULTI_EVENT", (event) => {
        receivedEvents1.push(event);
      });

      const listener2Id = eventBus.listen("MULTI_EVENT", (event) => {
        receivedEvents2.push(event);
      });

      // Simulate cross-context message
      const mockChannel = mockChannels.get("test-channel")![0];
      mockChannel.simulateExternalMessage({
        type: "MULTI_EVENT",
        payload: { data: "test" },
        messageId: "test-msg-multi",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents1).toHaveLength(1);
      expect(receivedEvents2).toHaveLength(1);

      eventBus.removeListener(listener1Id);
      eventBus.removeListener(listener2Id);
    });

    it("should support once listeners", async () => {
      const receivedEvents: any[] = [];

      eventBus.once("ONCE_EVENT", (event) => {
        receivedEvents.push(event);
      });

      const mockChannel = mockChannels.get("test-channel")![0];

      // Emit the event twice
      mockChannel.simulateExternalMessage({
        type: "ONCE_EVENT",
        payload: { data: "first" },
        messageId: "test-msg-once-1",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      mockChannel.simulateExternalMessage({
        type: "ONCE_EVENT",
        payload: { data: "second" },
        messageId: "test-msg-once-2",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // Should only receive the first event
      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].payload.data).toBe("first");
    });
  });

  describe("Context Filtering", () => {
    it("should filter events by target context", async () => {
      const receivedEvents: any[] = [];

      eventBus.listen("CONTEXT_EVENT", (event) => {
        receivedEvents.push(event);
      });

      const mockChannel = mockChannels.get("test-channel")![0];

      // This should be received (no target specified)
      mockChannel.simulateExternalMessage({
        type: "CONTEXT_EVENT",
        payload: { data: "all" },
        messageId: "test-msg-all",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      // This should be received (target is "all")
      mockChannel.simulateExternalMessage({
        type: "CONTEXT_EVENT",
        payload: { data: "explicit_all" },
        messageId: "test-msg-explicit-all",
        timestamp: Date.now(),
        sourceContext: "worker",
        targetContext: "all"
      });

      // This should be received (target matches current context)
      mockChannel.simulateExternalMessage({
        type: "CONTEXT_EVENT",
        payload: { data: "main_target" },
        messageId: "test-msg-main-target",
        timestamp: Date.now(),
        sourceContext: "worker",
        targetContext: "main"
      });

      // This should NOT be received (target is different context)
      mockChannel.simulateExternalMessage({
        type: "CONTEXT_EVENT",
        payload: { data: "worker_target" },
        messageId: "test-msg-worker-target",
        timestamp: Date.now(),
        sourceContext: "worker",
        targetContext: "worker"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents).toHaveLength(3);
      expect(receivedEvents.map(e => e.payload.data)).toEqual([
        "all",
        "explicit_all",
        "main_target"
      ]);
    });
  });

  describe("Error Handling", () => {
    it("should handle listener errors gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation();
      const receivedEvents: any[] = [];

      // Add a listener that throws an error
      eventBus.listen("ERROR_EVENT", () => {
        throw new Error("Listener error");
      });

      // Add a normal listener
      eventBus.listen("ERROR_EVENT", (event) => {
        receivedEvents.push(event);
      });

      const mockChannel = mockChannels.get("test-channel")![0];
      mockChannel.simulateExternalMessage({
        type: "ERROR_EVENT",
        payload: { data: "test" },
        messageId: "test-msg-error",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      // The normal listener should still receive the event
      expect(receivedEvents).toHaveLength(1);

      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("should remove listeners correctly", () => {
      const listenerId = eventBus.listen("CLEANUP_EVENT", () => {});

      expect(eventBus.removeListener(listenerId)).toBe(true);
      expect(eventBus.removeListener(listenerId)).toBe(false); // Already removed
    });

    it("should remove all listeners for an event type", async () => {
      const receivedEvents: any[] = [];

      eventBus.listen("REMOVE_ALL_EVENT", (event) => {
        receivedEvents.push(event);
      });

      eventBus.listen("REMOVE_ALL_EVENT", (event) => {
        receivedEvents.push(event);
      });

      eventBus.removeAllListeners("REMOVE_ALL_EVENT");

      eventBus.emit({
        type: "REMOVE_ALL_EVENT",
        payload: { data: "test" },
        timestamp: Date.now(),
        sourceContext: "main"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents).toHaveLength(0);
    });

    it("should clean up all listeners", async () => {
      const receivedEvents: any[] = [];

      eventBus.listen("EVENT1", (event) => {
        receivedEvents.push(event);
      });

      eventBus.listen("EVENT2", (event) => {
        receivedEvents.push(event);
      });

      eventBus.removeAllListeners();

      eventBus.emit({
        type: "EVENT1",
        payload: { data: "test1" },
        timestamp: Date.now(),
        sourceContext: "main"
      });

      eventBus.emit({
        type: "EVENT2",
        payload: { data: "test2" },
        timestamp: Date.now(),
        sourceContext: "main"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedEvents).toHaveLength(0);
    });
  });

  describe("Debug Information", () => {
    it("should provide debug information", () => {
      eventBus.listen("DEBUG_EVENT1", () => {});
      eventBus.listen("DEBUG_EVENT1", () => {});
      eventBus.listen("DEBUG_EVENT2", () => {});

      const debugInfo = eventBus.getDebugInfo();

      expect(debugInfo.currentContext).toBe("main");
      expect(debugInfo.totalListeners).toBe(3);
      expect((debugInfo.listenerCounts as any).DEBUG_EVENT1).toBe(2);
      expect((debugInfo.listenerCounts as any).DEBUG_EVENT2).toBe(1);
    });
  });
});

describe("WorkerEventBus", () => {
  let workerEventBus: WorkerEventBus;

  beforeEach(() => {
    BroadcastEventBus.resetInstance();
    workerEventBus = new WorkerEventBus("test-worker-channel");
  });

  afterEach(() => {
    BroadcastEventBus.resetInstance();
  });

  describe("Typed Event Handling", () => {
    it("should emit and receive typed worker events", async () => {
      const receivedPayloads: any[] = [];

      const listenerId = workerEventBus.listen(WorkerEventType.WORKER_READY, (payload) => {
        receivedPayloads.push(payload);
      });

      // Simulate cross-context message for WorkerEventBus
      const mockChannel = mockChannels.get("test-worker-channel")![0];
      mockChannel.simulateExternalMessage({
        type: WorkerEventType.WORKER_READY,
        payload: {
          workerId: "test-worker",
          workerType: "force-animation",
          timestamp: Date.now()
        },
        messageId: "test-worker-msg-1",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedPayloads).toHaveLength(1);
      expect(receivedPayloads[0].workerId).toBe("test-worker");
      expect(receivedPayloads[0].workerType).toBe("force-animation");

      workerEventBus.removeListener(listenerId);
    });

    it("should support once listeners for typed events", async () => {
      const receivedPayloads: any[] = [];

      workerEventBus.once(WorkerEventType.WORKER_ERROR, (payload) => {
        receivedPayloads.push(payload);
      });

      const mockChannel = mockChannels.get("test-worker-channel")![0];

      // Emit the event twice
      mockChannel.simulateExternalMessage({
        type: WorkerEventType.WORKER_ERROR,
        payload: {
          workerId: "test-worker",
          workerType: "force-animation",
          error: "First error",
          timestamp: Date.now()
        },
        messageId: "test-worker-error-1",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      mockChannel.simulateExternalMessage({
        type: WorkerEventType.WORKER_ERROR,
        payload: {
          workerId: "test-worker",
          workerType: "force-animation",
          error: "Second error",
          timestamp: Date.now()
        },
        messageId: "test-worker-error-2",
        timestamp: Date.now(),
        sourceContext: "worker"
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedPayloads).toHaveLength(1);
      expect(receivedPayloads[0].error).toBe("First error");
    });
  });
});