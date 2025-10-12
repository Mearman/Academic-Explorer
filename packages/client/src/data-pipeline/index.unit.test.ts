/**
 * Unit tests for the Request Pipeline
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { RequestPipeline, createRequestPipeline, ErrorType } from "./index";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("RequestPipeline", () => {
  let pipeline: RequestPipeline;

  beforeEach(() => {
    pipeline = createRequestPipeline({
      enableCache: false,
      enableDedupe: false,
      enableRetry: false,
      enableLogging: false,
      enableErrorClassification: false,
    });
    mockFetch.mockClear();
  });

  describe("basic functionality", () => {
    it("should execute a basic request", async () => {
      const mockResponse = new Response(JSON.stringify({ data: "test" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      const response = await pipeline.execute("https://api.example.com/test");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({ method: "GET" }),
      );
      expect(response).toBe(mockResponse);
    });

    it("should handle request options", async () => {
      const mockResponse = new Response("OK", { status: 200 });
      mockFetch.mockResolvedValueOnce(mockResponse);

      await pipeline.execute("https://api.example.com/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/test",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
        }),
      );
    });
  });

  describe("caching", () => {
    beforeEach(() => {
      pipeline = createRequestPipeline({
        enableCache: true,
        enableDedupe: false,
        enableRetry: false,
        enableLogging: false,
        enableErrorClassification: false,
      });
    });

    it("should cache successful responses", async () => {
      const mockResponse = new Response(JSON.stringify({ data: "cached" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      // First request
      const response1 = await pipeline.execute(
        "https://api.example.com/cache-test",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const response2 = await pipeline.execute(
        "https://api.example.com/cache-test",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1 call

      expect(response1).toBe(mockResponse);
      const data1 = await response1.clone().json();
      const data2 = await response2.json();
      expect(data1).toEqual({ data: "cached" });
      expect(data2).toEqual({ data: "cached" });
    });
  });

  describe("deduplication", () => {
    beforeEach(() => {
      pipeline = createRequestPipeline({
        enableCache: false,
        enableDedupe: true,
        enableRetry: false,
        enableLogging: false,
        enableErrorClassification: false,
      });
    });

    it("should deduplicate identical requests within window", async () => {
      const mockResponse = new Response(JSON.stringify({ data: "deduped" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

      mockFetch.mockResolvedValueOnce(mockResponse);

      // First request
      const response1 = await pipeline.execute(
        "https://api.example.com/dedupe-test",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second request within dedupe window
      const response2 = await pipeline.execute(
        "https://api.example.com/dedupe-test",
      );
      expect(mockFetch).toHaveBeenCalledTimes(1); // Still 1 call

      expect(response1).toBe(mockResponse);
      const response2Data = await response2.json();
      expect(response2Data).toEqual({
        message: "Request deduplicated",
        deduplicated: true,
      });
    });
  });

  describe("error classification", () => {
    beforeEach(() => {
      pipeline = createRequestPipeline({
        enableCache: false,
        enableDedupe: false,
        enableRetry: false,
        enableLogging: false,
        enableErrorClassification: true,
      });
    });

    it("should classify network errors", async () => {
      const networkError = new TypeError("Failed to fetch");
      mockFetch.mockRejectedValueOnce(networkError);

      await expect(
        pipeline.execute("https://api.example.com/error-test"),
      ).rejects.toThrow();

      // The error should be enhanced with classification
      try {
        await pipeline.execute("https://api.example.com/error-test");
      } catch (error: any) {
        expect(error.classification).toBeDefined();
        expect(error.classification.type).toBe(ErrorType.NETWORK);
        expect(error.classification.retryable).toBe(true);
      }
    });

    it("should classify timeout errors", async () => {
      const abortError = new DOMException(
        "The operation was aborted",
        "AbortError",
      );
      mockFetch.mockRejectedValueOnce(abortError);

      await expect(
        pipeline.execute("https://api.example.com/timeout-test"),
      ).rejects.toThrow();

      try {
        await pipeline.execute("https://api.example.com/timeout-test");
      } catch (error: any) {
        expect(error.classification).toBeDefined();
        expect(error.classification.type).toBe(ErrorType.TIMEOUT);
        expect(error.classification.retryable).toBe(true);
      }
    });
  });

  describe("cache management", () => {
    it("should provide cache statistics", () => {
      const stats = pipeline.getCacheStats();
      expect(stats).toHaveProperty("cacheEntries");
      expect(stats).toHaveProperty("dedupeEntries");
      expect(typeof stats.cacheEntries).toBe("number");
      expect(typeof stats.dedupeEntries).toBe("number");
    });

    it("should clear caches", () => {
      pipeline.clearCache();
      const stats = pipeline.getCacheStats();
      expect(stats.cacheEntries).toBe(0);
      expect(stats.dedupeEntries).toBe(0);
    });
  });
});
