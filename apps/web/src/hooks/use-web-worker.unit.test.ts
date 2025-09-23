/**
 * Unit tests for useWebWorker hook
 * Tests the enhanced worker hook functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWebWorker } from "./use-web-worker";
import type { WorkerRequest, WorkerResponse } from "./use-web-worker";

// Mock Worker
class MockWorker {
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: ErrorEvent) => void) | null = null;
  public onmessageerror: ((event: MessageEvent) => void) | null = null;
  private terminated = false;

  constructor(public url: string, public options?: WorkerOptions) {}

  postMessage(message: WorkerRequest) {
    if (this.terminated) {
      throw new Error("Worker terminated");
    }

    // Simulate async message processing
    setTimeout(() => {
      if (this.onmessage && !this.terminated) {
        // Echo back a response based on the request type
        let response: WorkerResponse;

        switch (message.type) {
          case "TEST_SUCCESS":
            response = {
              type: "SUCCESS",
              requestId: message.requestId,
              result: { processed: message.data },
              metadata: { processingTime: 100 }
            };
            break;

          case "TEST_PROGRESS":
            // Send multiple progress updates
            response = {
              type: "PROGRESS",
              requestId: message.requestId,
              progress: 0.5,
              metadata: { step: "processing" }
            };
            this.onmessage(new MessageEvent("message", { data: response }));

            response = {
              type: "SUCCESS",
              requestId: message.requestId,
              result: { completed: true }
            };
            break;

          case "TEST_ERROR":
            response = {
              type: "ERROR",
              requestId: message.requestId,
              error: "Test error message"
            };
            break;

          default:
            response = {
              type: "ERROR",
              requestId: message.requestId,
              error: "Unknown message type"
            };
        }

        this.onmessage(new MessageEvent("message", { data: response }));
      }
    }, 10);
  }

  terminate() {
    this.terminated = true;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
  }

  // Test helpers
  simulateError(message: string, filename?: string, lineno?: number) {
    if (this.onerror && !this.terminated) {
      const errorEvent = new ErrorEvent("error", {
        message,
        filename,
        lineno
      });
      this.onerror(errorEvent);
    }
  }

  simulateMessageError() {
    if (this.onmessageerror && !this.terminated) {
      this.onmessageerror(new MessageEvent("messageerror"));
    }
  }
}

// Mock the global Worker
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

  describe("Basic Functionality", () => {
    it("should initialize worker correctly", () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      expect(result.current.isWorkerAvailable()).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.isIdle).toBe(true);
    });

    it("should post messages and track stats", async () => {
      const onMessage = vi.fn();
      const { result } = renderHook(() =>
        useWebWorker(workerFactory, { onMessage })
      );

      act(() => {
        const requestId = result.current.postMessage({
          type: "TEST_SUCCESS",
          data: { test: "data" }
        });
        expect(requestId).toBeTruthy();
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.stats.messagesSent).toBe(1);

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.stats.messagesReceived).toBe(1);
      expect(onMessage).toHaveBeenCalled();
    });

    it("should handle successful responses", async () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useWebWorker(workerFactory, { onSuccess })
      );

      act(() => {
        result.current.postMessage({
          type: "TEST_SUCCESS",
          data: { test: "data" }
        });
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(onSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ processed: { test: "data" } }),
        expect.any(String)
      );
      expect(result.current.error).toBe(null);
    });

    it("should handle progress updates", async () => {
      const onProgress = vi.fn();
      const { result } = renderHook(() =>
        useWebWorker(workerFactory, { onProgress })
      );

      act(() => {
        result.current.postMessage({
          type: "TEST_PROGRESS",
          data: { test: "data" }
        });
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(onProgress).toHaveBeenCalledWith(0.5, expect.any(String));
    });

    it("should handle error responses", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useWebWorker(workerFactory, { onError: onError as any })
      );

      act(() => {
        result.current.postMessage({
          type: "TEST_ERROR",
          data: { test: "data" }
        });
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.error).toBe("Test error message");
      expect(result.current.stats.errors).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle worker errors", async () => {
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useWebWorker(workerFactory, { onError })
      );

      act(() => {
        mockWorker.simulateError("Worker runtime error", "worker.js", 42);
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result.current.error).toContain("Worker error:");
      expect(result.current.stats.errors).toBe(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Worker runtime error",
          filename: "worker.js",
          lineno: 42
        })
      );
    });

    it("should handle message serialization errors", async () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      act(() => {
        mockWorker.simulateMessageError();
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(result.current.error).toContain("message error");
      expect(result.current.stats.errors).toBe(1);
    });

    it("should handle postMessage failures", () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      // Terminate worker first
      act(() => {
        result.current.terminate();
      });

      act(() => {
        const requestId = result.current.postMessage({
          type: "TEST_SUCCESS",
          data: {}
        });
        expect(requestId).toBe(null);
      });

      expect(result.current.error).toContain("Worker not available");
    });
  });

  describe("Performance Metrics", () => {
    it("should calculate response times", async () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      act(() => {
        result.current.postMessage({
          type: "TEST_SUCCESS",
          data: {}
        });
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.averageResponseTime).toBeGreaterThan(0);
      expect(result.current.totalMessages).toBe(2); // 1 sent + 1 received
    });

    it("should track error rates", async () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      // Send successful message
      act(() => {
        result.current.postMessage({
          type: "TEST_SUCCESS",
          data: {}
        });
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      // Send error message
      act(() => {
        result.current.postMessage({
          type: "TEST_ERROR",
          data: {}
        });
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.errorRate).toBe(0.5); // 1 error out of 2 messages
    });
  });

  describe("Worker Lifecycle", () => {
    it("should terminate worker manually", () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      expect(result.current.isWorkerAvailable()).toBe(true);

      act(() => {
        result.current.terminate();
      });

      expect(result.current.isWorkerAvailable()).toBe(false);
    });

    it("should auto-terminate on unmount", () => {
      const { unmount } = renderHook(() =>
        useWebWorker(workerFactory, { autoTerminate: true })
      );

      const terminateSpy = vi.spyOn(mockWorker, "terminate");

      unmount();

      expect(terminateSpy).toHaveBeenCalled();
    });

    it("should not auto-terminate when disabled", () => {
      const { unmount } = renderHook(() =>
        useWebWorker(workerFactory, { autoTerminate: false })
      );

      const terminateSpy = vi.spyOn(mockWorker, "terminate");

      unmount();

      expect(terminateSpy).not.toHaveBeenCalled();
    });
  });

  describe("Request ID Generation", () => {
    it("should generate unique request IDs", () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      const requestIds: (string | null)[] = [];

      act(() => {
        requestIds.push(result.current.postMessage({ type: "TEST_SUCCESS", data: {} }));
        requestIds.push(result.current.postMessage({ type: "TEST_SUCCESS", data: {} }));
        requestIds.push(result.current.postMessage({ type: "TEST_SUCCESS", data: {} }));
      });

      expect(requestIds.every(id => id !== null)).toBe(true);
      expect(new Set(requestIds).size).toBe(3); // All unique
    });

    it("should preserve custom request IDs", () => {
      const onMessage = vi.fn();
      const { result } = renderHook(() =>
        useWebWorker(workerFactory, { onMessage })
      );

      const customRequestId = "custom-request-123";

      act(() => {
        const returnedId = result.current.postMessage({
          type: "TEST_SUCCESS",
          data: {},
          requestId: customRequestId
        });
        expect(returnedId).toBe(customRequestId);
      });
    });
  });

  describe("Computed Properties", () => {
    it("should calculate computed properties correctly", async () => {
      const { result } = renderHook(() => useWebWorker(workerFactory));

      // Initial state
      expect(result.current.isIdle).toBe(true);
      expect(result.current.hasError).toBe(false);

      // Loading state
      act(() => {
        result.current.postMessage({
          type: "TEST_SUCCESS",
          data: {}
        });
      });

      expect(result.current.isIdle).toBe(false);

      // Success state
      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.isIdle).toBe(true);
      expect(result.current.hasError).toBe(false);

      // Error state
      act(() => {
        result.current.postMessage({
          type: "TEST_ERROR",
          data: {}
        });
      });

      await new Promise(resolve => setTimeout(resolve, 20));

      expect(result.current.hasError).toBe(true);
    });
  });
});