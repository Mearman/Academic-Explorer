/**
 * Unit tests for cache configuration utilities
 * Tests cache configuration constants, entity-specific settings, and utility functions
 */

import { describe, it, expect } from "vitest";
import {
	CACHE_CONFIG,
	ENTITY_CACHE_TIMES,
	getCacheConfig,
	type EntityType,
} from "./cache";

describe("cache configuration", () => {
	describe("CACHE_CONFIG", () => {
		it("should have correct general cache configuration", () => {
			expect(CACHE_CONFIG).toEqual({
				maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
				maxSize: 100 * 1024 * 1024,      // 100MB
				compressionThreshold: 1024,       // 1KB
				defaultRetries: 3,
				defaultStaleTime: 1000 * 60 * 5, // 5 minutes
			});
		});

		it("should have reasonable cache size limits", () => {
			// Max age should be 7 days
			expect(CACHE_CONFIG.maxAge).toBe(604800000); // 7 * 24 * 60 * 60 * 1000

			// Max size should be 100MB
			expect(CACHE_CONFIG.maxSize).toBe(104857600); // 100 * 1024 * 1024

			// Compression threshold should be 1KB
			expect(CACHE_CONFIG.compressionThreshold).toBe(1024);

			// Default retries should be reasonable
			expect(CACHE_CONFIG.defaultRetries).toBe(3);

			// Default stale time should be 5 minutes
			expect(CACHE_CONFIG.defaultStaleTime).toBe(300000); // 5 * 60 * 1000
		});
	});

	describe("ENTITY_CACHE_TIMES", () => {
		it("should have work cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.work).toEqual({
				stale: 1000 * 60 * 60 * 24,     // 1 day
				gc: 1000 * 60 * 60 * 24 * 7,    // 7 days
			});
		});

		it("should have author cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.author).toEqual({
				stale: 1000 * 60 * 60 * 12,     // 12 hours
				gc: 1000 * 60 * 60 * 24 * 3,    // 3 days
			});
		});

		it("should have source cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.source).toEqual({
				stale: 1000 * 60 * 60 * 24 * 7, // 7 days
				gc: 1000 * 60 * 60 * 24 * 30,   // 30 days
			});
		});

		it("should have institution cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.institution).toEqual({
				stale: 1000 * 60 * 60 * 24 * 30, // 30 days
				gc: 1000 * 60 * 60 * 24 * 90,    // 90 days
			});
		});

		it("should have topic cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.topic).toEqual({
				stale: 1000 * 60 * 60 * 24 * 7,  // 7 days
				gc: 1000 * 60 * 60 * 24 * 30,    // 30 days
			});
		});

		it("should have publisher cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.publisher).toEqual({
				stale: 1000 * 60 * 60 * 24 * 30, // 30 days
				gc: 1000 * 60 * 60 * 24 * 90,    // 90 days
			});
		});

		it("should have funder cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.funder).toEqual({
				stale: 1000 * 60 * 60 * 24 * 30, // 30 days
				gc: 1000 * 60 * 60 * 24 * 90,    // 90 days
			});
		});

		it("should have search cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.search).toEqual({
				stale: 1000 * 60 * 5,             // 5 minutes
				gc: 1000 * 60 * 60,               // 1 hour
			});
		});

		it("should have related cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.related).toEqual({
				stale: 1000 * 60 * 60 * 6,        // 6 hours
				gc: 1000 * 60 * 60 * 24,          // 1 day
			});
		});

		it("should have appropriate cache duration hierarchy", () => {
			// Stable entities should have longer cache times
			expect(ENTITY_CACHE_TIMES.institution.stale).toBeGreaterThan(ENTITY_CACHE_TIMES.author.stale);
			expect(ENTITY_CACHE_TIMES.source.stale).toBeGreaterThan(ENTITY_CACHE_TIMES.author.stale);
			expect(ENTITY_CACHE_TIMES.publisher.stale).toBeGreaterThan(ENTITY_CACHE_TIMES.work.stale);

			// Dynamic content should have shorter cache times
			expect(ENTITY_CACHE_TIMES.search.stale).toBeLessThan(ENTITY_CACHE_TIMES.author.stale);
			expect(ENTITY_CACHE_TIMES.related.stale).toBeLessThan(ENTITY_CACHE_TIMES.work.stale);

			// GC times should be longer than stale times for all entities
			expect(ENTITY_CACHE_TIMES.work.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.work.stale);
			expect(ENTITY_CACHE_TIMES.author.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.author.stale);
			expect(ENTITY_CACHE_TIMES.source.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.source.stale);
			expect(ENTITY_CACHE_TIMES.institution.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.institution.stale);
			expect(ENTITY_CACHE_TIMES.topic.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.topic.stale);
			expect(ENTITY_CACHE_TIMES.publisher.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.publisher.stale);
			expect(ENTITY_CACHE_TIMES.funder.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.funder.stale);
			expect(ENTITY_CACHE_TIMES.search.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.search.stale);
			expect(ENTITY_CACHE_TIMES.related.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.related.stale);
		});

		it("should have all required entity types", () => {
			const requiredEntityTypes: EntityType[] = [
				"work",
				"author",
				"source",
				"institution",
				"topic",
				"publisher",
				"funder",
				"search",
				"related"
			];

			for (const entityType of requiredEntityTypes) {
				expect(ENTITY_CACHE_TIMES).toHaveProperty(entityType);
				expect(ENTITY_CACHE_TIMES[entityType]).toHaveProperty("stale");
				expect(ENTITY_CACHE_TIMES[entityType]).toHaveProperty("gc");
			}
		});

		it("should have positive cache durations", () => {
			const entityTypes = Object.keys(ENTITY_CACHE_TIMES) as EntityType[];

			for (const entityType of entityTypes) {
				const config = ENTITY_CACHE_TIMES[entityType];
				expect(config.stale).toBeGreaterThan(0);
				expect(config.gc).toBeGreaterThan(0);
			}
		});

		it("should have reasonable time values", () => {
			// Works: 1 day stale, 7 days gc
			expect(ENTITY_CACHE_TIMES.work.stale).toBe(86400000);  // 1 day
			expect(ENTITY_CACHE_TIMES.work.gc).toBe(604800000);    // 7 days

			// Authors: 12 hours stale, 3 days gc
			expect(ENTITY_CACHE_TIMES.author.stale).toBe(43200000); // 12 hours
			expect(ENTITY_CACHE_TIMES.author.gc).toBe(259200000);   // 3 days

			// Search: 5 minutes stale, 1 hour gc (most dynamic)
			expect(ENTITY_CACHE_TIMES.search.stale).toBe(300000);   // 5 minutes
			expect(ENTITY_CACHE_TIMES.search.gc).toBe(3600000);     // 1 hour

			// Institutions: 30 days stale, 90 days gc (most stable)
			expect(ENTITY_CACHE_TIMES.institution.stale).toBe(2592000000); // 30 days
			expect(ENTITY_CACHE_TIMES.institution.gc).toBe(7776000000);    // 90 days
		});
	});

	describe("getCacheConfig", () => {
		it("should return correct configuration for each entity type", () => {
			expect(getCacheConfig("work")).toEqual(ENTITY_CACHE_TIMES.work);
			expect(getCacheConfig("author")).toEqual(ENTITY_CACHE_TIMES.author);
			expect(getCacheConfig("source")).toEqual(ENTITY_CACHE_TIMES.source);
			expect(getCacheConfig("institution")).toEqual(ENTITY_CACHE_TIMES.institution);
			expect(getCacheConfig("topic")).toEqual(ENTITY_CACHE_TIMES.topic);
			expect(getCacheConfig("publisher")).toEqual(ENTITY_CACHE_TIMES.publisher);
			expect(getCacheConfig("funder")).toEqual(ENTITY_CACHE_TIMES.funder);
			expect(getCacheConfig("search")).toEqual(ENTITY_CACHE_TIMES.search);
			expect(getCacheConfig("related")).toEqual(ENTITY_CACHE_TIMES.related);
		});

		it("should return references to the original configurations", () => {
			// Should return the same object reference
			expect(getCacheConfig("work")).toBe(ENTITY_CACHE_TIMES.work);
			expect(getCacheConfig("author")).toBe(ENTITY_CACHE_TIMES.author);
			expect(getCacheConfig("search")).toBe(ENTITY_CACHE_TIMES.search);
		});

		it("should work with all valid entity types", () => {
			const entityTypes: EntityType[] = [
				"work", "author", "source", "institution", "topic",
				"publisher", "funder", "search", "related"
			];

			for (const entityType of entityTypes) {
				const config = getCacheConfig(entityType);
				expect(config).toBeDefined();
				expect(config).toHaveProperty("stale");
				expect(config).toHaveProperty("gc");
				expect(typeof config.stale).toBe("number");
				expect(typeof config.gc).toBe("number");
			}
		});

		it("should maintain type safety", () => {
			// TypeScript should enforce that only valid EntityType values are passed
			// This test ensures the function signature matches the type definition
			const workConfig = getCacheConfig("work");
			expect(workConfig.stale).toBeTypeOf("number");
			expect(workConfig.gc).toBeTypeOf("number");

			const searchConfig = getCacheConfig("search");
			expect(searchConfig.stale).toBeTypeOf("number");
			expect(searchConfig.gc).toBeTypeOf("number");
		});
	});

	describe("EntityType type", () => {
		it("should include all expected entity types", () => {
			// This test ensures the EntityType type includes all expected values
			const expectedTypes = [
				"work", "author", "source", "institution", "topic",
				"publisher", "funder", "keyword", "concepts", "search", "related"
			];

			// Verify all expected types exist in ENTITY_CACHE_TIMES
			for (const type of expectedTypes) {
				expect(ENTITY_CACHE_TIMES).toHaveProperty(type);
			}

			// Verify the number of types matches expectations
			expect(Object.keys(ENTITY_CACHE_TIMES)).toHaveLength(expectedTypes.length);
		});
	});
});