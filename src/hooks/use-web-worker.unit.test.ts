import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebWorker } from "./use-web-worker";
import type { WorkerRequest, WorkerResponse } from "./use-web-worker";

class MockWorker extends EventTarget {
  static lastInstance: MockWorker | null = null;

  public onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent) => void) | null = null;
  private terminated = false;
  public lastMessage: WorkerRequest | null = null;

  constructor(public readonly url: string, public readonly options?: WorkerOptions) {
    super();
    MockWorker.lastInstance = this;
  }

  postMessage(message: WorkerRequest) {
    if (this.terminated) {
      throw new Error("Worker terminated");
    }
    this.lastMessage = message;
  }

  terminate() {
    this.terminated = true;
    this.onmessage = null;
    this.onerror = null;
  }

  simulateError(message: string) {
    this.onerror?.(new ErrorEvent("error", { message }));
  }

  dispatch(data: WorkerResponse) {
    this.onmessage?.(new MessageEvent("message", { data }));
  }
}

// @ts-expect-error - assign mock worker implementation for tests
global.Worker = MockWorker;

describe("useWebWorker", () => {
  beforeEach(() => {
    MockWorker.lastInstance = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a worker instance", () => {
    const { result, unmount } = renderHook(() => useWebWorker(() => new Worker("test-worker.js")));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    unmount();
  });

  it("posts messages and handles success", async () => {
    const onMessage = vi.fn();
    const { result } = renderHook(() => useWebWorker(() => new Worker("test-worker.js"), { onMessage }));
    const worker = MockWorker.lastInstance;
    if (!worker) {
      throw new Error("Worker instance not created");
    }

    act(() => {
      result.current.postMessage({ type: "SUCCESS_TEST", payload: { value: 1 } });
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      worker.dispatch({ type: "SUCCESS", event: "TEST_EVENT", payload: { done: true } });
    });

    expect(result.current.isLoading).toBe(false);
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({ type: "SUCCESS" }));
  });

  it("keeps loading state during progress updates", async () => {
    const { result } = renderHook(() => useWebWorker(() => new Worker("test-worker.js")));
    const worker = MockWorker.lastInstance;
    if (!worker) {
      throw new Error("Worker instance not created");
    }

    act(() => {
      result.current.postMessage({ type: "PROGRESS_TEST" });
    });

    act(() => {
      worker.dispatch({ type: "PROGRESS", event: "TEST_EVENT", progress: 0.4 });
    });

    expect(result.current.isLoading).toBe(true);

    act(() => {
      worker.dispatch({ type: "SUCCESS", event: "TEST_EVENT", payload: { done: true } });
    });

    expect(result.current.isLoading).toBe(false);
  });

  it("handles worker error events", async () => {
    const onError = vi.fn();
    const { result } = renderHook(() => useWebWorker(() => new Worker("test-worker.js"), { onError }));
    const worker = MockWorker.lastInstance;
    if (!worker) {
      throw new Error("Worker instance not created");
    }

    act(() => {
      result.current.postMessage({ type: "SUCCESS_TEST" });
    });

    act(() => {
      worker.simulateError("boom");
    });

    expect(result.current.error).toBe("boom");
    expect(onError).toHaveBeenCalled();
  });

  it("handles error messages from worker", async () => {
    const { result } = renderHook(() => useWebWorker(() => new Worker("test-worker.js")));
    const worker = MockWorker.lastInstance;
    if (!worker) {
      throw new Error("Worker instance not created");
    }

    act(() => {
      result.current.postMessage({ type: "ERROR_TEST" });
    });

    act(() => {
      worker.dispatch({ type: "ERROR", event: "TEST_EVENT", error: "worker failure" });
    });

    expect(result.current.error).toBe("worker failure");
  });
});
