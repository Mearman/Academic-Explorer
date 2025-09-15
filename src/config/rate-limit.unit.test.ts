/**
 * Unit tests for rate-limit configuration utilities
 * Tests retry delay calculations, configuration constants, and edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	RATE_LIMIT_CONFIG,
	RETRY_CONFIG,
	calculateRetryDelay,
} from "./rate-limit";

describe("rate-limit configuration", () => {
	describe("RATE_LIMIT_CONFIG", () => {
		it("should have OpenAlex rate limiting configuration", () => {
			expect(RATE_LIMIT_CONFIG.openAlex).toEqual({
				limit: 8,
				window: 1000,
				windowType: "sliding",
				headers: {
					"User-Agent": "Academic-Explorer/1.0 (mailto:your-email@example.com)",
				},
			});
		});

		it("should have search throttling configuration", () => {
			expect(RATE_LIMIT_CONFIG.search).toEqual({
				throttleMs: 500,
				debounceMs: 300,
				leading: false,
				trailing: true,
			});
		});

		it("should have prefetch rate limiting configuration", () => {
			expect(RATE_LIMIT_CONFIG.prefetch).toEqual({
				limit: 5,
				window: 1000,
				windowType: "sliding",
			});
		});

		it("should have background rate limiting configuration", () => {
			expect(RATE_LIMIT_CONFIG.background).toEqual({
				limit: 2,
				window: 1000,
				windowType: "sliding",
			});
		});

		it("should use conservative OpenAlex limits", () => {
			// Should be under the 10 req/sec OpenAlex limit
			expect(RATE_LIMIT_CONFIG.openAlex.limit).toBeLessThan(10);
			expect(RATE_LIMIT_CONFIG.openAlex.window).toBe(1000);
		});
	});

	describe("RETRY_CONFIG", () => {
		it("should have rate limited retry configuration", () => {
			expect(RETRY_CONFIG.rateLimited).toEqual({
				maxAttempts: 5,
				baseDelay: 2000,
				maxDelay: 30000,
				exponentialBase: 2,
				jitterMs: 1000,
			});
		});

		it("should have network retry configuration", () => {
			expect(RETRY_CONFIG.network).toEqual({
				maxAttempts: 3,
				baseDelay: 1000,
				maxDelay: 10000,
				exponentialBase: 2,
				jitterMs: 500,
			});
		});

		it("should have server retry configuration", () => {
			expect(RETRY_CONFIG.server).toEqual({
				maxAttempts: 2,
				baseDelay: 2000,
				maxDelay: 5000,
				exponentialBase: 1.5,
				jitterMs: 1000,
			});
		});

		it("should have client retry configuration with no retries", () => {
			expect(RETRY_CONFIG.client).toEqual({
				maxAttempts: 0,
			});
		});

		it("should have appropriate retry progression", () => {
			// Rate limited should be most aggressive
			expect(RETRY_CONFIG.rateLimited.maxAttempts).toBeGreaterThan(RETRY_CONFIG.network.maxAttempts);
			expect(RETRY_CONFIG.rateLimited.maxAttempts).toBeGreaterThan(RETRY_CONFIG.server.maxAttempts);

			// Client errors should not retry
			expect(RETRY_CONFIG.client.maxAttempts).toBe(0);
		});
	});

	describe("calculateRetryDelay", () => {
		beforeEach(() => {
			// Mock Math.random for consistent testing
			vi.spyOn(Math, "random").mockReturnValue(0.5);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("should respect Retry-After header when provided", () => {
			const delay = calculateRetryDelay(0, RETRY_CONFIG.rateLimited, 5000);
			expect(delay).toBe(5000);
		});

		it("should calculate exponential backoff for rate limited retry", () => {
			const config = RETRY_CONFIG.rateLimited;

			// First attempt (index 0): baseDelay * (exponentialBase^0) + jitter = 2000 * 1 + 500 = 2500
			const delay0 = calculateRetryDelay(0, config);
			expect(delay0).toBe(2000 + 500); // 2000 + (0.5 * 1000)

			// Second attempt (index 1): baseDelay * (exponentialBase^1) + jitter = 2000 * 2 + 500 = 4500
			const delay1 = calculateRetryDelay(1, config);
			expect(delay1).toBe(4000 + 500); // 4000 + (0.5 * 1000)

			// Third attempt (index 2): baseDelay * (exponentialBase^2) + jitter = 2000 * 4 + 500 = 8500
			const delay2 = calculateRetryDelay(2, config);
			expect(delay2).toBe(8000 + 500); // 8000 + (0.5 * 1000)
		});

		it("should calculate exponential backoff for network retry", () => {
			const config = RETRY_CONFIG.network;

			// First attempt: 1000 * 1 + 250 = 1250
			const delay0 = calculateRetryDelay(0, config);
			expect(delay0).toBe(1000 + 250); // 1000 + (0.5 * 500)

			// Second attempt: 1000 * 2 + 250 = 2250
			const delay1 = calculateRetryDelay(1, config);
			expect(delay1).toBe(2000 + 250);
		});

		it("should calculate exponential backoff for server retry", () => {
			const config = RETRY_CONFIG.server;

			// First attempt: 2000 * (1.5^0) + 500 = 2000 + 500 = 2500
			const delay0 = calculateRetryDelay(0, config);
			expect(delay0).toBe(2000 + 500);

			// Second attempt: 2000 * (1.5^1) + 500 = 3000 + 500 = 3500
			const delay1 = calculateRetryDelay(1, config);
			expect(delay1).toBe(3000 + 500);
		});

		it("should cap delays at maxDelay", () => {
			const config = RETRY_CONFIG.network; // maxDelay: 10000

			// High attempt index should hit the cap
			const delay = calculateRetryDelay(10, config);
			expect(delay).toBeLessThanOrEqual(config.maxDelay);
			expect(delay).toBe(10000); // Should be exactly maxDelay since exponential would exceed it
		});

		it("should handle different jitter values", () => {
			vi.spyOn(Math, "random").mockReturnValue(0.8); // Different random value

			const config = RETRY_CONFIG.rateLimited;
			const delay = calculateRetryDelay(0, config);

			// Should be baseDelay + (0.8 * jitterMs) = 2000 + 800 = 2800
			expect(delay).toBe(2000 + 800);
		});

		it("should handle zero jitter", () => {
			vi.spyOn(Math, "random").mockReturnValue(0);

			const config = RETRY_CONFIG.rateLimited;
			const delay = calculateRetryDelay(0, config);

			// Should be exactly baseDelay when jitter is 0
			expect(delay).toBe(2000);
		});

		it("should handle maximum jitter", () => {
			vi.spyOn(Math, "random").mockReturnValue(1);

			const config = RETRY_CONFIG.rateLimited;
			const delay = calculateRetryDelay(0, config);

			// Should be baseDelay + full jitterMs = 2000 + 1000 = 3000
			expect(delay).toBe(3000);
		});

		it("should use fallback calculation for invalid config", () => {
			// Create config without required properties
			const invalidConfig = {} as any;

			const delay = calculateRetryDelay(2, invalidConfig);

			// Should use fallback: 1000 * (2^2) = 4000
			expect(delay).toBe(4000);
		});

		it("should handle fallback for different attempt indices", () => {
			const invalidConfig = {} as any;

			expect(calculateRetryDelay(0, invalidConfig)).toBe(1000); // 2^0 = 1
			expect(calculateRetryDelay(1, invalidConfig)).toBe(2000); // 2^1 = 2
			expect(calculateRetryDelay(3, invalidConfig)).toBe(8000); // 2^3 = 8
		});

		it("should prioritize Retry-After over config calculation", () => {
			const config = RETRY_CONFIG.rateLimited;
			const retryAfterMs = 15000;

			const delay = calculateRetryDelay(5, config, retryAfterMs);

			// Should return Retry-After value regardless of exponential calculation
			expect(delay).toBe(retryAfterMs);
		});

		it("should handle edge case with very high attempt index", () => {
			const config = RETRY_CONFIG.rateLimited;

			// Very high attempt index should still be capped at maxDelay
			const delay = calculateRetryDelay(100, config);
			expect(delay).toBeLessThanOrEqual(config.maxDelay);
			expect(delay).toBe(config.maxDelay);
		});

		it("should generate different delays with different random values", () => {
			const config = RETRY_CONFIG.network;

			// First call with random = 0.5
			vi.spyOn(Math, "random").mockReturnValueOnce(0.5);
			const delay1 = calculateRetryDelay(0, config);

			// Second call with random = 0.3
			vi.spyOn(Math, "random").mockReturnValueOnce(0.3);
			const delay2 = calculateRetryDelay(0, config);

			expect(delay1).not.toBe(delay2);
			expect(Math.abs(delay1 - delay2)).toBeLessThanOrEqual(config.jitterMs);
		});

		it("should handle client config which has no delay properties", () => {
			const config = RETRY_CONFIG.client;

			// Should use fallback since client config has no delay properties
			const delay = calculateRetryDelay(1, config as any);
			expect(delay).toBe(2000); // Fallback: 1000 * (2^1)
		});
	});
});