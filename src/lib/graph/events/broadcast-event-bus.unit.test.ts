import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BroadcastEventBus, WorkerEventBus } from "./broadcast-event-bus";
import { WorkerEventType } from "./types";

// -----------------------------------------------------------------------------
// BroadcastChannel mock
// -----------------------------------------------------------------------------

const mockChannels = new Map<string, MockBroadcastChannel[]>();

class MockBroadcastChannel {
  public onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(public readonly name: string) {
    if (!mockChannels.has(name)) {
      mockChannels.set(name, []);
    }
    mockChannels.get(name)!.push(this);
  }

  postMessage(message: unknown) {
    // Simulate asynchronous fan-out to other contexts listening on the same channel.
    setTimeout(() => {
      const event = new MessageEvent("message", { data: message });
      const peers = mockChannels.get(this.name) ?? [];
      for (const peer of peers) {
        if (peer !== this && typeof peer.onmessage === "function") {
          peer.onmessage(event);
        }
      }
    }, 0);
  }

  close() {
    const peers = mockChannels.get(this.name);
    if (!peers) {
      return;
    }
    const index = peers.indexOf(this);
    if (index >= 0) {
      peers.splice(index, 1);
    }
  }

  simulateExternalMessage(message: unknown) {
    const event = new MessageEvent("message", { data: message });
    this.onmessage?.(event);
  }
}

// @ts-expect-error - provide mock implementation for test environment
 
global.BroadcastChannel = MockBroadcastChannel;

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe("BroadcastEventBus", () => {
  beforeEach(() => {
    BroadcastEventBus.resetInstance();
    mockChannels.clear();
  });

  afterEach(() => {
    BroadcastEventBus.resetInstance();
    mockChannels.clear();
  });

  it("returns the same instance for the same channel name", () => {
    const first = BroadcastEventBus.getInstance("shared-channel");
    const second = BroadcastEventBus.getInstance("shared-channel");
    expect(first).toBe(second);
  });

  it("emits events to local listeners", () => {
    const bus = BroadcastEventBus.getInstance("local-channel");
    const handler = vi.fn();
    const listenerId = bus.listen("LOCAL_EVENT", handler);

    bus.emit({ type: "LOCAL_EVENT", payload: { value: 1 } });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      type: "LOCAL_EVENT",
      payload: { value: 1 },
      source: "local"
    });

    bus.removeListener(listenerId);
  });

  it("receives events from other contexts via BroadcastChannel", async () => {
    const channelName = "remote-channel";
    const bus = BroadcastEventBus.getInstance(channelName);
    const handler = vi.fn();
    bus.listen("REMOTE_EVENT", handler);

    const channel = mockChannels.get(channelName)?.[0];
    expect(channel).toBeDefined();

    channel?.simulateExternalMessage({
      type: "REMOTE_EVENT",
      payload: { answer: 42 }
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      type: "REMOTE_EVENT",
      payload: { answer: 42 },
      source: "remote"
    });
  });

  it("supports one-time listeners", async () => {
    const bus = BroadcastEventBus.getInstance("once-channel");
    const handler = vi.fn();
    bus.once("ONCE_EVENT", handler);

    const channel = mockChannels.get("once-channel")?.[0];
    expect(channel).toBeDefined();

    channel?.simulateExternalMessage({ type: "ONCE_EVENT", payload: { count: 1 } });
    channel?.simulateExternalMessage({ type: "ONCE_EVENT", payload: { count: 2 } });

    await new Promise(resolve => setTimeout(resolve, 5));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].payload).toEqual({ count: 1 });
  });

  it("removes listeners", () => {
    const bus = BroadcastEventBus.getInstance("remove-channel");
    const handler = vi.fn();
    const listenerId = bus.listen("REMOVE_EVENT", handler);

    const removed = bus.removeListener(listenerId);
    bus.emit({ type: "REMOVE_EVENT" });

    expect(removed).toBe(true);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe("WorkerEventBus", () => {
  beforeEach(() => {
    BroadcastEventBus.resetInstance();
    mockChannels.clear();
  });

  afterEach(() => {
    BroadcastEventBus.resetInstance();
    mockChannels.clear();
  });

  it("wraps BroadcastEventBus with typed events", () => {
    const workerBus = new WorkerEventBus("worker-channel");
    const handler = vi.fn();
    workerBus.listen(WorkerEventType.WORKER_READY, handler);

    workerBus.emit(WorkerEventType.WORKER_READY, {
      workerId: "background-worker",
      workerType: "force-animation",
      timestamp: Date.now()
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0]).toMatchObject({
      workerId: "background-worker",
      workerType: "force-animation"
    });
  });
});
