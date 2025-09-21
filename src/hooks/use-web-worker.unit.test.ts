import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebWorker } from "./use-web-worker";
import type { WorkerRequest, WorkerResponse } from "./use-web-worker";

class MockWorker {
  public onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent) => void) | null = null;
  private terminated = false;

  constructor(public readonly url: string) {}

  postMessage(message: WorkerRequest) {
    if (this.terminated) {
      throw new Error("Worker terminated");
    }

    setTimeout(() => {
      if (!this.onmessage || this.terminated) return;

      if (message.type === "TRIGGER_ERROR") {
        this.onmessage(new MessageEvent("message", {
          data: { type: "ERROR", error: "Worker task failed", requestId: message.requestId }
        }));
        return;
      }

      const response: WorkerResponse = {
        type: "SUCCESS",
        requestId: message.requestId,
        result: { echo: message.data }
      };
      this.onmessage(new MessageEvent("message", { data: response }));
    }, 5);
  }

  terminate() {
    this.terminated = true;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }

  simulateRuntimeError(message: string) {
    this.onerror?.(new ErrorEvent("error", { message }));
  }

  simulateMessageError() {
    this.onmessageerror?.(new MessageEvent("messageerror"));
  }
}

global.Worker = MockWorker as any;

describe("useWebWorker", () => {
  const workerFactory = () => new Worker("test-worker.js");
  let mockWorker: MockWorker;

  beforeEach(() => {
    mockWorker = new MockWorker("test-worker.js");
    vi.spyOn(global, "Worker").mockImplementation(() => mockWorker);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initialises the worker and exposes default state", () => {
    const { result } = renderHook(() => useWebWorker({ workerFactory }));

    expect(result.current.isWorkerAvailable()).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("posts messages and notifies onMessage listeners", async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useWebWorker({ workerFactory, options: { onMessage } }));

    let requestId: string | null = null;
    act(() => {
      requestId = result.current.postMessage({ type: "PING", data: { value: 1 } });
    });

    expect(requestId).toBeTruthy();
    expect(result.current.isLoading).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(result.current.isLoading).toBe(false);
    expect(onMessage).toHaveBeenCalledWith({
      type: "SUCCESS",
      requestId,
      result: { echo: { value: 1 } }
    });
  });

  it("surfaces error responses from the worker", async () => {
    const { result } = renderHook(() => useWebWorker({ workerFactory }));

    act(() => {
      result.current.postMessage({ type: "TRIGGER_ERROR" });
    });

    await new Promise(resolve => setTimeout(resolve, 20));

    expect(result.current.error).toBe("Worker task failed");
    expect(result.current.isLoading).toBe(false);
  });

  it("captures runtime errors from the worker", async () => {
    const { result } = renderHook(() => useWebWorker({ workerFactory }));

    act(() => {
      mockWorker.simulateRuntimeError("Runtime exploded");
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    expect(result.current.error).toBe("Runtime exploded");
  });

  it("handles message serialization errors", async () => {
    const { result } = renderHook(() => useWebWorker({ workerFactory }));

    act(() => {
      mockWorker.simulateMessageError();
    });

    await new Promise(resolve => setTimeout(resolve, 5));

    expect(result.current.error).toBe("Worker message error");
  });

  it("terminates the worker when terminate is called", () => {
    const terminateSpy = vi.spyOn(mockWorker, "terminate");
    const { result } = renderHook(() => useWebWorker({ workerFactory }));

    act(() => {
      result.current.terminate();
    });

    expect(terminateSpy).toHaveBeenCalled();
    expect(result.current.isWorkerAvailable()).toBe(false);
  });

  it("returns null request id when worker is unavailable", () => {
    const { result } = renderHook(() => useWebWorker({ workerFactory }));

    act(() => {
      result.current.terminate();
    });

    let id: string | null = null;
    act(() => {
      id = result.current.postMessage({ type: "AFTER_TERMINATION" });
    });

    expect(id).toBeNull();
    expect(result.current.error).toBe("Worker not available");
  });
});
