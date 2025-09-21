import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BroadcastEventBus, WorkerEventBus } from "./broadcast-event-bus";
import { WorkerEventType } from "./types";

// Lightweight BroadcastChannel mock so tests run in Node.
class MockBroadcastChannel {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  private static registry = new Map<string, Set<MockBroadcastChannel>>();

  constructor(public readonly name: string) {
    if (!MockBroadcastChannel.registry.has(name)) {
      MockBroadcastChannel.registry.set(name, new Set());
    }
    MockBroadcastChannel.registry.get(name)!.add(this);
  }

  postMessage(message: unknown) {
    const peers = MockBroadcastChannel.registry.get(this.name);
    if (!peers) return;
    // deliver asynchronously like the real API
    setTimeout(() => {
      for (const peer of peers) {
        if (peer !== this) {
          peer.onmessage?.(new MessageEvent("message", { data: message }));
        }
      }
    }, 0);
  }

  close() {
    MockBroadcastChannel.registry.get(this.name)?.delete(this);
  }

  static reset() {
    for (const channels of MockBroadcastChannel.registry.values()) {
      channels.clear();
    }
    MockBroadcastChannel.registry.clear();
  }
}

// @ts-expect-error - assign mock implementation for tests
global.BroadcastChannel = MockBroadcastChannel;

describe("BroadcastEventBus", () => {
  beforeEach(() => {
    BroadcastEventBus.resetInstance();
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    BroadcastEventBus.resetInstance();
    MockBroadcastChannel.reset();
  });

  it("returns the same instance for the same channel", () => {
    const a = BroadcastEventBus.getInstance("test-channel");
    const b = BroadcastEventBus.getInstance("test-channel");
    expect(a).toBe(b);
  });

  it("creates a fresh instance after reset", () => {
    const a = BroadcastEventBus.getInstance("test-channel");
    BroadcastEventBus.resetInstance();
    const b = BroadcastEventBus.getInstance("test-channel");
    expect(a).not.toBe(b);
  });

  it("notifies listeners in the same context", () => {
    const bus = BroadcastEventBus.getInstance("local-channel");
    const handler = vi.fn();
    bus.listen("HELLO", handler);
    bus.emit({ type: "HELLO", payload: { answer: 42 } });
    expect(handler).toHaveBeenCalledWith({ type: "HELLO", payload: { answer: 42 } });
  });

  it("notifies listeners created in a different context", async () => {
    const busA = BroadcastEventBus.getInstance("shared-channel");
    const busB = BroadcastEventBus.getInstance("shared-channel");

    const handler = vi.fn();
    busB.listen("PING", handler);

    busA.emit({ type: "PING", payload: { data: "cross" } });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ data: "cross" });
  });

  it("supports once listeners", async () => {
    const bus = BroadcastEventBus.getInstance("once-channel");
    const handler = vi.fn();
    bus.once("TICK", handler);

    bus.emit({ type: "TICK" });
    bus.emit({ type: "TICK" });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("removes listeners", () => {
    const bus = BroadcastEventBus.getInstance("remove-channel");
    const handler = vi.fn();
    const id = bus.listen("BYE", handler);

    expect(bus.removeListener(id)).toBe(true);
    bus.emit({ type: "BYE" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("removes all listeners for a specific event", () => {
    const bus = BroadcastEventBus.getInstance("remove-all-channel");
    const handler = vi.fn();
    bus.listen("EVENT", handler);
    bus.listen("EVENT", handler);
    bus.removeAllListeners("EVENT");
    bus.emit({ type: "EVENT" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("cleans up every listener", () => {
    const bus = BroadcastEventBus.getInstance("cleanup-channel");
    const handler = vi.fn();
    bus.listen("A", handler);
    bus.listen("B", handler);
    bus.removeAllListeners();
    bus.emit({ type: "A" });
    bus.emit({ type: "B" });
    expect(handler).not.toHaveBeenCalled();
  });

  it("logs listener errors but continues notifying others", async () => {
    const bus = BroadcastEventBus.getInstance("error-channel");
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const first = vi.fn(() => {
      throw new Error("boom");
    });
    const second = vi.fn();
    bus.listen("ERR", first);
    bus.listen("ERR", second);

    bus.emit({ type: "ERR" });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(second).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("WorkerEventBus", () => {
  beforeEach(() => {
    BroadcastEventBus.resetInstance();
    MockBroadcastChannel.reset();
  });

  afterEach(() => {
    BroadcastEventBus.resetInstance();
    MockBroadcastChannel.reset();
  });

  it("relays typed worker events", async () => {
    const bus = new WorkerEventBus("worker-channel");
    const handler = vi.fn();
    bus.listen(WorkerEventType.WORKER_READY, handler);

    bus.emit(WorkerEventType.WORKER_READY, {
      workerId: "id",
      workerType: "example",
      timestamp: Date.now(),
    });

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({ workerId: "id" });
  });

  it("removes worker listeners", () => {
    const bus = new WorkerEventBus("worker-remove");
    const handler = vi.fn();
    const id = bus.listen(WorkerEventType.WORKER_ERROR, handler);
    expect(bus.removeListener(id)).toBe(true);
    bus.emit(WorkerEventType.WORKER_ERROR, {
      workerId: "id",
      workerType: "example",
      error: "oops",
      timestamp: Date.now(),
    });
    expect(handler).not.toHaveBeenCalled();
  });
});
