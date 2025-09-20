/**
 * Tests for CollectionResultMapper
 * Verifies collection result mapping and pagination tracking
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { CollectionResultMapper } from "./collection-result-mapper";
import { EntityType, CachePolicy, QueryParams } from "./types";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn()
  },
  logError: vi.fn()
}));

describe("CollectionResultMapper", () => {
  let mapper: CollectionResultMapper;
  let mockPolicy: CachePolicy;

  beforeEach(() => {
    mockPolicy = {
      entityTTL: {
        works: { default: 24 * 60 * 60 * 1000 },
        authors: { default: 24 * 60 * 60 * 1000 },
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

    mapper = new CollectionResultMapper(mockPolicy);
  });

  describe("generateQueryKey", () => {
    it("should generate consistent query keys", () => {
      const entityType: EntityType = "works";
      const params: QueryParams = {
        filter: { "author.id": "A123" },
        select: ["id", "display_name"],
        sort: "publication_year"
      };

      const key1 = mapper.generateQueryKey(entityType, params);
      const key2 = mapper.generateQueryKey(entityType, params);

      expect(key1).toBe(key2);
      expect(key1).toContain("works");
      expect(key1).toContain("author.id");
    });

    it("should generate different keys for different parameters", () => {
      const entityType: EntityType = "works";
      const params1: QueryParams = { filter: { "author.id": "A123" } };
      const params2: QueryParams = { filter: { "author.id": "A456" } };

      const key1 = mapper.generateQueryKey(entityType, params1);
      const key2 = mapper.generateQueryKey(entityType, params2);

      expect(key1).not.toBe(key2);
    });

    it("should normalize parameter order", () => {
      const entityType: EntityType = "works";
      const params1: QueryParams = {
        filter: { "author.id": "A123", "publication_year": 2023 },
        select: ["display_name", "id"]
      };
      const params2: QueryParams = {
        filter: { "publication_year": 2023, "author.id": "A123" },
        select: ["id", "display_name"]
      };

      const key1 = mapper.generateQueryKey(entityType, params1);
      const key2 = mapper.generateQueryKey(entityType, params2);

      expect(key1).toBe(key2);
    });
  });

  describe("putCollectionPage and getCollectionPage", () => {
    it("should store and retrieve collection pages", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';
      const page = 1;
      const entityIds = ["W123", "W456", "W789"];

      await mapper.putCollectionPage(queryKey, page, entityIds);

      const retrievedIds = await mapper.getCollectionPage(queryKey, page);
      expect(retrievedIds).toEqual(entityIds);
    });

    it("should handle multiple pages for same collection", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';
      const page1Ids = ["W123", "W456", "W789"];
      const page2Ids = ["W101", "W102", "W103"];

      await mapper.putCollectionPage(queryKey, 1, page1Ids);
      await mapper.putCollectionPage(queryKey, 2, page2Ids);

      const retrieved1 = await mapper.getCollectionPage(queryKey, 1);
      const retrieved2 = await mapper.getCollectionPage(queryKey, 2);

      expect(retrieved1).toEqual(page1Ids);
      expect(retrieved2).toEqual(page2Ids);
    });

    it("should return null for non-existent collection page", async () => {
      const result = await mapper.getCollectionPage("non-existent-key", 1);
      expect(result).toBeNull();
    });

    it("should return null for non-existent page in existing collection", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';
      await mapper.putCollectionPage(queryKey, 1, ["W123", "W456"]);

      const result = await mapper.getCollectionPage(queryKey, 2);
      expect(result).toBeNull();
    });
  });

  describe("putCollectionMetadata and getCollectionMetadata", () => {
    it("should store and retrieve collection metadata", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';
      const metadata = {
        totalCount: 100,
        lastFetched: new Date().toISOString(),
        ttl: 24 * 60 * 60 * 1000,
        isComplete: false,
        filters: { "author.id": "A123" },
        sort: "publication_year"
      };

      await mapper.putCollectionMetadata(queryKey, metadata);

      const retrieved = await mapper.getCollectionMetadata(queryKey);
      expect(retrieved).toMatchObject({
        totalCount: 100,
        isComplete: false,
        filters: { "author.id": "A123" },
        sort: "publication_year"
      });
    });

    it("should return null for non-existent collection metadata", async () => {
      const result = await mapper.getCollectionMetadata("non-existent-key");
      expect(result).toBeNull();
    });
  });

  describe("deleteCollection", () => {
    it("should remove collection and all its pages", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';

      await mapper.putCollectionPage(queryKey, 1, ["W123", "W456"]);
      await mapper.putCollectionPage(queryKey, 2, ["W789", "W101"]);
      await mapper.putCollectionMetadata(queryKey, {
        totalCount: 50,
        lastFetched: new Date().toISOString(),
        ttl: 24 * 60 * 60 * 1000,
        isComplete: false,
        filters: { "author.id": "A123" }
      });

      // Verify data exists
      let page1 = await mapper.getCollectionPage(queryKey, 1);
      let metadata = await mapper.getCollectionMetadata(queryKey);
      expect(page1).toEqual(["W123", "W456"]);
      expect(metadata).toBeTruthy();

      // Delete collection
      await mapper.deleteCollection(queryKey);

      // Verify data is gone
      page1 = await mapper.getCollectionPage(queryKey, 1);
      const page2 = await mapper.getCollectionPage(queryKey, 2);
      metadata = await mapper.getCollectionMetadata(queryKey);

      expect(page1).toBeNull();
      expect(page2).toBeNull();
      expect(metadata).toBeNull();
    });
  });

  describe("getAvailablePages", () => {
    it("should return sorted list of available pages", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';

      await mapper.putCollectionPage(queryKey, 3, ["W789"]);
      await mapper.putCollectionPage(queryKey, 1, ["W123"]);
      await mapper.putCollectionPage(queryKey, 2, ["W456"]);

      const pages = mapper.getAvailablePages(queryKey);
      expect(pages).toEqual([1, 2, 3]);
    });

    it("should return empty array for non-existent collection", () => {
      const pages = mapper.getAvailablePages("non-existent-key");
      expect(pages).toEqual([]);
    });
  });

  describe("getCachedEntityCount", () => {
    it("should return total number of cached entities across all pages", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';

      await mapper.putCollectionPage(queryKey, 1, ["W123", "W456", "W789"]);
      await mapper.putCollectionPage(queryKey, 2, ["W101", "W102"]);

      const count = mapper.getCachedEntityCount(queryKey);
      expect(count).toBe(5);
    });

    it("should return 0 for non-existent collection", () => {
      const count = mapper.getCachedEntityCount("non-existent-key");
      expect(count).toBe(0);
    });
  });

  describe("isCollectionComplete and markCollectionComplete", () => {
    it("should track collection completeness", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';

      await mapper.putCollectionPage(queryKey, 1, ["W123", "W456"]);

      // Initially incomplete
      expect(mapper.isCollectionComplete(queryKey)).toBe(false);

      // Mark as complete
      await mapper.markCollectionComplete(queryKey, 50);

      // Should now be complete
      expect(mapper.isCollectionComplete(queryKey)).toBe(true);

      // Metadata should be updated
      const metadata = await mapper.getCollectionMetadata(queryKey);
      expect(metadata?.isComplete).toBe(true);
      expect(metadata?.totalCount).toBe(50);
    });
  });

  describe("matchesCollection", () => {
    it("should match collections with same filters", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';
      const entityType: EntityType = "works";
      const filters = { "author.id": "A123" };

      await mapper.putCollectionMetadata(queryKey, {
        totalCount: 100,
        lastFetched: new Date().toISOString(),
        ttl: 24 * 60 * 60 * 1000,
        isComplete: false,
        filters
      });

      const matches = mapper.matchesCollection(queryKey, entityType, filters);
      expect(matches).toBe(true);
    });

    it("should not match collections with different filters", async () => {
      const queryKey = 'works|filter:{"author.id":"A123"}';
      const entityType: EntityType = "works";

      await mapper.putCollectionMetadata(queryKey, {
        totalCount: 100,
        lastFetched: new Date().toISOString(),
        ttl: 24 * 60 * 60 * 1000,
        isComplete: false,
        filters: { "author.id": "A123" }
      });

      const matches = mapper.matchesCollection(queryKey, entityType, { "author.id": "A456" });
      expect(matches).toBe(false);
    });
  });

  describe("getPopularCollections", () => {
    it("should return collections with sufficient pages or entities", async () => {
      // Small collection (should not be included)
      const queryKey1 = 'works|filter:{"author.id":"A123"}';
      await mapper.putCollectionPage(queryKey1, 1, ["W123"]);

      // Large collection by page count
      const queryKey2 = 'works|filter:{"author.id":"A456"}';
      await mapper.putCollectionPage(queryKey2, 1, ["W456"]);
      await mapper.putCollectionPage(queryKey2, 2, ["W457"]);
      await mapper.putCollectionPage(queryKey2, 3, ["W458"]);
      await mapper.putCollectionPage(queryKey2, 4, ["W459"]);
      await mapper.putCollectionPage(queryKey2, 5, ["W460"]);

      // Large collection by entity count
      const queryKey3 = 'works|filter:{"author.id":"A789"}';
      const manyEntities = Array.from({ length: 60 }, (_, i) => `W${i + 1000}`);
      await mapper.putCollectionPage(queryKey3, 1, manyEntities);

      const popular = mapper.getPopularCollections(5);

      expect(popular).toHaveLength(2);
      expect(popular.map(p => p.queryKey)).toContain(queryKey2);
      expect(popular.map(p => p.queryKey)).toContain(queryKey3);
      expect(popular.map(p => p.queryKey)).not.toContain(queryKey1);

      // Should be sorted by entity count
      expect(popular[0].entityCount).toBeGreaterThanOrEqual(popular[1].entityCount);
    });
  });

  describe("clear", () => {
    it("should remove all collections", async () => {
      await mapper.putCollectionPage("key1", 1, ["W123"]);
      await mapper.putCollectionPage("key2", 1, ["W456"]);

      const stats1 = await mapper.getStats();
      expect(stats1.memory?.collections).toBe(2);

      await mapper.clear();

      const stats2 = await mapper.getStats();
      expect(stats2.memory?.collections).toBe(0);

      const result1 = await mapper.getCollectionPage("key1", 1);
      const result2 = await mapper.getCollectionPage("key2", 1);
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe("getStats", () => {
    it("should return memory usage statistics", async () => {
      await mapper.putCollectionPage("key1", 1, ["W123", "W456"]);
      await mapper.putCollectionPage("key2", 1, ["W789"]);

      const stats = await mapper.getStats();

      expect(stats).toHaveProperty("memory");
      expect(stats.memory).toHaveProperty("collections", 2);
      expect(stats.memory).toHaveProperty("entities", 3);
      expect(stats.memory).toHaveProperty("size");
      expect(stats.memory.size).toBeGreaterThan(0);
    });
  });
});