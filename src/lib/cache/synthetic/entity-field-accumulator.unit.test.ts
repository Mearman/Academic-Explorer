/**
 * Tests for EntityFieldAccumulator
 * Verifies field-level caching and accumulation behavior
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { EntityFieldAccumulator } from "./entity-field-accumulator";
import { EntityType, CachePolicy } from "./types";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn()
  },
  logError: vi.fn()
}));

describe("EntityFieldAccumulator", () => {
  let accumulator: EntityFieldAccumulator;
  let mockPolicy: CachePolicy;

  beforeEach(() => {
    mockPolicy = {
      entityTTL: {
        works: {
          id: 30 * 24 * 60 * 60 * 1000, // 30 days
          display_name: 7 * 24 * 60 * 60 * 1000, // 7 days
          default: 24 * 60 * 60 * 1000 // 1 day
        },
        authors: {
          default: 24 * 60 * 60 * 1000
        },
        sources: { default: 24 * 60 * 60 * 1000 },
        institutions: { default: 24 * 60 * 60 * 1000 },
        topics: { default: 24 * 60 * 60 * 1000 },
        publishers: { default: 24 * 60 * 60 * 1000 },
        funders: { default: 24 * 60 * 60 * 1000 }
      },
      collectionTTL: {
        works: 24 * 60 * 60 * 1000,
        authors: 24 * 60 * 60 * 1000,
        sources: 24 * 60 * 60 * 1000,
        institutions: 24 * 60 * 60 * 1000,
        topics: 24 * 60 * 60 * 1000,
        publishers: 24 * 60 * 60 * 1000,
        funders: 24 * 60 * 60 * 1000
      },
      tierPreferences: {
        hotDataThreshold: 5 * 60 * 1000,
        warmDataThreshold: 60 * 60 * 1000,
        coldDataArchival: 24 * 60 * 60 * 1000
      }
    };

    accumulator = new EntityFieldAccumulator(mockPolicy);
  });

  describe("putEntityFields and getEntityFields", () => {
    it("should store and retrieve entity fields", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";
      const testData = {
        id: "W123",
        display_name: "Test Work",
        publication_year: 2023
      };

      // Store data
      await accumulator.putEntityFields(entityType, entityId, testData);

      // Retrieve all fields
      const result = await accumulator.getEntityFields(entityType, entityId, ["id", "display_name", "publication_year"]);

      expect(result).toEqual(testData);
    });

    it("should accumulate fields from multiple requests", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";

      // First request: store basic info
      await accumulator.putEntityFields(entityType, entityId, {
        id: "W123",
        display_name: "Test Work"
      });

      // Second request: add more fields
      await accumulator.putEntityFields(entityType, entityId, {
        publication_year: 2023,
        cited_by_count: 42
      });

      // Should have all fields accumulated
      const result = await accumulator.getEntityFields(entityType, entityId, [
        "id", "display_name", "publication_year", "cited_by_count"
      ]);

      expect(result).toEqual({
        id: "W123",
        display_name: "Test Work",
        publication_year: 2023,
        cited_by_count: 42
      });
    });

    it("should return only requested fields", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";

      await accumulator.putEntityFields(entityType, entityId, {
        id: "W123",
        display_name: "Test Work",
        publication_year: 2023,
        cited_by_count: 42
      });

      // Request only specific fields
      const result = await accumulator.getEntityFields(entityType, entityId, ["id", "display_name"]);

      expect(result).toEqual({
        id: "W123",
        display_name: "Test Work"
      });
    });

    it("should return empty object for non-existent entity", async () => {
      const result = await accumulator.getEntityFields("works", "W999", ["id", "display_name"]);
      expect(result).toEqual({});
    });

    it("should handle missing fields gracefully", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";

      await accumulator.putEntityFields(entityType, entityId, {
        id: "W123",
        display_name: "Test Work"
      });

      // Request fields that don't exist
      const result = await accumulator.getEntityFields(entityType, entityId, [
        "id", "display_name", "missing_field"
      ]);

      expect(result).toEqual({
        id: "W123",
        display_name: "Test Work"
      });
    });
  });

  describe("getFieldCoverage", () => {
    it("should return available fields for entity", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";

      await accumulator.putEntityFields(entityType, entityId, {
        id: "W123",
        display_name: "Test Work",
        publication_year: 2023
      });

      const coverage = await accumulator.getFieldCoverage(entityType, entityId);
      expect(coverage).toEqual(expect.arrayContaining(["id", "display_name", "publication_year"]));
    });

    it("should return empty array for non-existent entity", async () => {
      const coverage = await accumulator.getFieldCoverage("works", "W999");
      expect(coverage).toEqual([]);
    });
  });

  describe("hasFields", () => {
    it("should return true when entity has all requested fields", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";

      await accumulator.putEntityFields(entityType, entityId, {
        id: "W123",
        display_name: "Test Work",
        publication_year: 2023
      });

      const hasFields = await accumulator.hasFields(entityType, entityId, ["id", "display_name"]);
      expect(hasFields).toBe(true);
    });

    it("should return false when entity is missing some fields", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";

      await accumulator.putEntityFields(entityType, entityId, {
        id: "W123",
        display_name: "Test Work"
      });

      const hasFields = await accumulator.hasFields(entityType, entityId, ["id", "display_name", "missing_field"]);
      expect(hasFields).toBe(false);
    });

    it("should return false for non-existent entity", async () => {
      const hasFields = await accumulator.hasFields("works", "W999", ["id"]);
      expect(hasFields).toBe(false);
    });
  });

  describe("deleteEntity", () => {
    it("should remove entity from accumulator", async () => {
      const entityType: EntityType = "works";
      const entityId = "W123";

      await accumulator.putEntityFields(entityType, entityId, {
        id: "W123",
        display_name: "Test Work"
      });

      // Verify entity exists
      let result = await accumulator.getEntityFields(entityType, entityId, ["id"]);
      expect(result).toEqual({ id: "W123" });

      // Delete entity
      await accumulator.deleteEntity(entityType, entityId);

      // Verify entity is gone
      result = await accumulator.getEntityFields(entityType, entityId, ["id"]);
      expect(result).toEqual({});
    });
  });

  describe("mergeEntityFields", () => {
    it("should merge multiple entities at once", async () => {
      const entityType: EntityType = "works";
      const entityFieldMap = new Map([
        ["W123", { id: "W123", display_name: "Work 1" }],
        ["W456", { id: "W456", display_name: "Work 2" }],
        ["W789", { id: "W789", display_name: "Work 3" }]
      ]);

      await accumulator.mergeEntityFields(entityType, entityFieldMap);

      // Verify all entities were stored
      const result1 = await accumulator.getEntityFields(entityType, "W123", ["id", "display_name"]);
      const result2 = await accumulator.getEntityFields(entityType, "W456", ["id", "display_name"]);
      const result3 = await accumulator.getEntityFields(entityType, "W789", ["id", "display_name"]);

      expect(result1).toEqual({ id: "W123", display_name: "Work 1" });
      expect(result2).toEqual({ id: "W456", display_name: "Work 2" });
      expect(result3).toEqual({ id: "W789", display_name: "Work 3" });
    });
  });

  describe("getWellPopulatedEntities", () => {
    it("should return entities with sufficient field count", async () => {
      const entityType: EntityType = "works";

      // Entity with many fields
      await accumulator.putEntityFields(entityType, "W123", {
        id: "W123",
        display_name: "Well Populated Work",
        publication_year: 2023,
        cited_by_count: 42,
        author_count: 3,
        concept_count: 5
      });

      // Entity with few fields
      await accumulator.putEntityFields(entityType, "W456", {
        id: "W456",
        display_name: "Sparse Work"
      });

      const wellPopulated = accumulator.getWellPopulatedEntities(entityType, 5);

      expect(wellPopulated).toHaveLength(1);
      expect(wellPopulated[0].entityId).toBe("W123");
      expect(wellPopulated[0].fieldCount).toBe(6);
      expect(wellPopulated[0].fields).toEqual(expect.arrayContaining([
        "id", "display_name", "publication_year", "cited_by_count", "author_count", "concept_count"
      ]));
    });

    it("should sort by field count descending", async () => {
      const entityType: EntityType = "works";

      await accumulator.putEntityFields(entityType, "W123", {
        id: "W123",
        display_name: "Work 1",
        publication_year: 2023
      });

      await accumulator.putEntityFields(entityType, "W456", {
        id: "W456",
        display_name: "Work 2",
        publication_year: 2023,
        cited_by_count: 42,
        author_count: 3,
        concept_count: 5
      });

      const wellPopulated = accumulator.getWellPopulatedEntities(entityType, 3);

      expect(wellPopulated).toHaveLength(2);
      expect(wellPopulated[0].entityId).toBe("W456"); // More fields
      expect(wellPopulated[0].fieldCount).toBe(6);
      expect(wellPopulated[1].entityId).toBe("W123"); // Fewer fields
      expect(wellPopulated[1].fieldCount).toBe(3);
    });
  });

  describe("clear", () => {
    it("should remove all cached data", async () => {
      const entityType: EntityType = "works";

      await accumulator.putEntityFields(entityType, "W123", { id: "W123", display_name: "Work 1" });
      await accumulator.putEntityFields(entityType, "W456", { id: "W456", display_name: "Work 2" });

      // Verify data exists
      let result1 = await accumulator.getEntityFields(entityType, "W123", ["id"]);
      let result2 = await accumulator.getEntityFields(entityType, "W456", ["id"]);
      expect(result1).toEqual({ id: "W123" });
      expect(result2).toEqual({ id: "W456" });

      // Clear all data
      await accumulator.clear();

      // Verify data is gone
      result1 = await accumulator.getEntityFields(entityType, "W123", ["id"]);
      result2 = await accumulator.getEntityFields(entityType, "W456", ["id"]);
      expect(result1).toEqual({});
      expect(result2).toEqual({});
    });
  });

  describe("getStats", () => {
    it("should return memory usage statistics", async () => {
      const entityType: EntityType = "works";

      await accumulator.putEntityFields(entityType, "W123", {
        id: "W123",
        display_name: "Work 1",
        publication_year: 2023
      });

      await accumulator.putEntityFields(entityType, "W456", {
        id: "W456",
        display_name: "Work 2"
      });

      const stats = await accumulator.getStats();

      expect(stats).toHaveProperty("memory");
      expect(stats.memory).toHaveProperty("entities", 2);
      expect(stats.memory).toHaveProperty("fields", 5); // 3 + 2 fields
      expect(stats.memory).toHaveProperty("size");
      expect(stats.memory.size).toBeGreaterThan(0);
    });
  });
});