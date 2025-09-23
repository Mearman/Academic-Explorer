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
		it("should have works cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.works).toEqual({
				stale: 1000 * 60 * 60 * 24,     // 1 day
				gc: 1000 * 60 * 60 * 24 * 7,    // 7 days
			});
		});

		it("should have authors cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.authors).toEqual({
				stale: 1000 * 60 * 60 * 12,     // 12 hours
				gc: 1000 * 60 * 60 * 24 * 3,    // 3 days
			});
		});

		it("should have sources cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.sources).toEqual({
				stale: 1000 * 60 * 60 * 24 * 7, // 7 days
				gc: 1000 * 60 * 60 * 24 * 30,   // 30 days
			});
		});

		it("should have institutions cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.institutions).toEqual({
				stale: 1000 * 60 * 60 * 24 * 30, // 30 days
				gc: 1000 * 60 * 60 * 24 * 90,    // 90 days
			});
		});

		it("should have topics cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.topics).toEqual({
				stale: 1000 * 60 * 60 * 24 * 7,  // 7 days
				gc: 1000 * 60 * 60 * 24 * 30,    // 30 days
			});
		});

		it("should have publishers cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.publishers).toEqual({
				stale: 1000 * 60 * 60 * 24 * 30, // 30 days
				gc: 1000 * 60 * 60 * 24 * 90,    // 90 days
			});
		});

		it("should have funders cache configuration", () => {
			expect(ENTITY_CACHE_TIMES.funders).toEqual({
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
			expect(ENTITY_CACHE_TIMES.institutions.stale).toBeGreaterThan(ENTITY_CACHE_TIMES.authors.stale);
			expect(ENTITY_CACHE_TIMES.sources.stale).toBeGreaterThan(ENTITY_CACHE_TIMES.authors.stale);
			expect(ENTITY_CACHE_TIMES.publishers.stale).toBeGreaterThan(ENTITY_CACHE_TIMES.works.stale);

			// Dynamic content should have shorter cache times
			expect(ENTITY_CACHE_TIMES.search.stale).toBeLessThan(ENTITY_CACHE_TIMES.authors.stale);
			expect(ENTITY_CACHE_TIMES.related.stale).toBeLessThan(ENTITY_CACHE_TIMES.works.stale);

			// GC times should be longer than stale times for all entities
			expect(ENTITY_CACHE_TIMES.works.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.works.stale);
			expect(ENTITY_CACHE_TIMES.authors.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.authors.stale);
			expect(ENTITY_CACHE_TIMES.sources.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.sources.stale);
			expect(ENTITY_CACHE_TIMES.institutions.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.institutions.stale);
			expect(ENTITY_CACHE_TIMES.topics.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.topics.stale);
			expect(ENTITY_CACHE_TIMES.publishers.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.publishers.stale);
			expect(ENTITY_CACHE_TIMES.funders.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.funders.stale);
			expect(ENTITY_CACHE_TIMES.search.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.search.stale);
			expect(ENTITY_CACHE_TIMES.related.gc).toBeGreaterThan(ENTITY_CACHE_TIMES.related.stale);
		});

		it("should have all required entity types", () => {
			const requiredEntityTypes: EntityType[] = [
				"works",
				"authors",
				"sources",
				"institutions",
				"topics",
				"publishers",
				"funders",
				"keywords",
				"concepts",
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
			expect(ENTITY_CACHE_TIMES.works.stale).toBe(86400000);  // 1 day
			expect(ENTITY_CACHE_TIMES.works.gc).toBe(604800000);    // 7 days

			// Authors: 12 hours stale, 3 days gc
			expect(ENTITY_CACHE_TIMES.authors.stale).toBe(43200000); // 12 hours
			expect(ENTITY_CACHE_TIMES.authors.gc).toBe(259200000);   // 3 days

			// Search: 5 minutes stale, 1 hour gc (most dynamic)
			expect(ENTITY_CACHE_TIMES.search.stale).toBe(300000);   // 5 minutes
			expect(ENTITY_CACHE_TIMES.search.gc).toBe(3600000);     // 1 hour

			// Institutions: 30 days stale, 90 days gc (most stable)
			expect(ENTITY_CACHE_TIMES.institutions.stale).toBe(2592000000); // 30 days
			expect(ENTITY_CACHE_TIMES.institutions.gc).toBe(7776000000);    // 90 days
		});
	});

	describe("getCacheConfig", () => {
		it("should return correct configuration for each entity type", () => {
			expect(getCacheConfig("works")).toEqual(ENTITY_CACHE_TIMES.works);
			expect(getCacheConfig("authors")).toEqual(ENTITY_CACHE_TIMES.authors);
			expect(getCacheConfig("sources")).toEqual(ENTITY_CACHE_TIMES.sources);
			expect(getCacheConfig("institutions")).toEqual(ENTITY_CACHE_TIMES.institutions);
			expect(getCacheConfig("topics")).toEqual(ENTITY_CACHE_TIMES.topics);
			expect(getCacheConfig("publishers")).toEqual(ENTITY_CACHE_TIMES.publishers);
			expect(getCacheConfig("funders")).toEqual(ENTITY_CACHE_TIMES.funders);
			expect(getCacheConfig("keywords")).toEqual(ENTITY_CACHE_TIMES.keywords);
			expect(getCacheConfig("concepts")).toEqual(ENTITY_CACHE_TIMES.concepts);
			expect(getCacheConfig("search")).toEqual(ENTITY_CACHE_TIMES.search);
			expect(getCacheConfig("related")).toEqual(ENTITY_CACHE_TIMES.related);
		});

		it("should return references to the original configurations", () => {
			// Should return the same object reference
			expect(getCacheConfig("works")).toBe(ENTITY_CACHE_TIMES.works);
			expect(getCacheConfig("authors")).toBe(ENTITY_CACHE_TIMES.authors);
			expect(getCacheConfig("search")).toBe(ENTITY_CACHE_TIMES.search);
		});

		it("should work with all valid entity types", () => {
			const entityTypes: EntityType[] = [
				"works", "authors", "sources", "institutions", "topics",
				"publishers", "funders", "keywords", "concepts", "search", "related"
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
			const workConfig = getCacheConfig("works");
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
				"works", "authors", "sources", "institutions", "topics",
				"publishers", "funders", "keywords", "concepts", "search", "related"
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