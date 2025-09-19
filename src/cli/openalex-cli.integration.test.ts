/**
 * Integration tests for OpenAlex CLI using real static data
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenAlexCLI } from "./openalex-cli-class.js";
import { detectEntityType } from "../lib/entities/entity-detection.js";

// Mock fetch to prevent actual API calls
global.fetch = vi.fn();

describe("OpenAlexCLI Integration Tests", () => {
  let cli: OpenAlexCLI;

  beforeEach(() => {
    cli = new OpenAlexCLI();
    vi.clearAllMocks();
  });

  describe("Static Data Operations", () => {
    it("should detect available static data types", async () => {
      const hasAuthors = await cli.hasStaticData("authors");
      const hasWorks = await cli.hasStaticData("works");
      const hasInstitutions = await cli.hasStaticData("institutions");

      expect(hasAuthors).toBe(true);
      expect(hasWorks).toBe(true);
      expect(hasInstitutions).toBe(true);
    });

    it("should load author index successfully", async () => {
      const index = await cli.getEntitySummary("authors");

      expect(index).toBeTruthy();
      expect(index?.entityType).toBe("authors");
      expect(index?.count).toBeGreaterThan(0);
      expect(Array.isArray(index?.entities)).toBe(true);
      expect(index?.entities.length).toBeGreaterThan(0);
    });

    it("should load specific author entity", async () => {
      // First get the list of available authors
      const entities = await cli.listEntities("authors");
      expect(entities.length).toBeGreaterThan(0);

      // Load the first author
      const authorId = entities[0];
      const author = await cli.loadEntity("authors", authorId);

      expect(author).toBeTruthy();
      expect(author?.id).toContain(authorId);
      expect(author?.display_name).toBeTruthy();
      expect(typeof author?.display_name).toBe("string");
    });

    it("should search authors by name", async () => {
      const results = await cli.searchEntities("authors", "Joseph");

      expect(Array.isArray(results)).toBe(true);
      // Expecting at least one result for "Joseph"
      expect(results.length).toBeGreaterThan(0);

      if (results.length > 0) {
        const author = results[0];
        expect(author.display_name.toLowerCase()).toContain("joseph");
      }
    });

    it("should get statistics for all entity types", async () => {
      const stats = await cli.getStatistics();

      expect(typeof stats).toBe("object");
      expect(Object.keys(stats).length).toBeGreaterThan(0);

      // Check authors stats
      if (stats.authors) {
        expect(stats.authors.count).toBeGreaterThan(0);
        expect(stats.authors.totalSize).toBeGreaterThan(0);
        expect(typeof stats.authors.lastModified).toBe("string");
      }

      // Check works stats
      if (stats.works) {
        expect(stats.works.count).toBeGreaterThan(0);
        expect(stats.works.totalSize).toBeGreaterThan(0);
      }
    });

    it("should return null for non-existent entity", async () => {
      const entity = await cli.loadEntity("authors", "A9999999999");
      expect(entity).toBeNull();
    });

    it("should return empty array for non-existent entity type search", async () => {
      const results = await cli.searchEntities("authors", "NonExistentNameXYZ123");
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);
    });
  });

  describe("Cache Control", () => {
    it("should handle cache-only mode for existing entity", async () => {
      const entities = await cli.listEntities("authors");
      const authorId = entities[0];

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.getEntityWithCache("authors", authorId, {
        useCache: true,
        saveToCache: false,
        cacheOnly: true
      });

      expect(result).toBeTruthy();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Cache hit for authors/${authorId}`)
      );

      consoleSpy.mockRestore();
    });

    it("should handle cache-only mode for non-existent entity", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.getEntityWithCache("authors", "A9999999999", {
        useCache: true,
        saveToCache: false,
        cacheOnly: true
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Cache-only mode: entity A9999999999 not found in cache"
      );

      consoleSpy.mockRestore();
    });

    it("should skip cache when no-cache enabled", async () => {
      const entities = await cli.listEntities("authors");
      const authorId = entities[0];

      // Mock successful API response
      const mockEntity = {
        id: `https://openalex.org/${authorId}`,
        display_name: "Mock Author",
        works_count: 5
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [mockEntity] })
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.getEntityWithCache("authors", authorId, {
        useCache: false,
        saveToCache: false,
        cacheOnly: false
      });

      expect(result).toEqual(mockEntity);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(`filter=id%3A${authorId}`)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Query Building", () => {
    it("should build correct query URLs", () => {
      const url1 = cli.buildQueryUrl("authors", {});
      expect(url1).toBe("https://api.openalex.org/authors?");

      const url2 = cli.buildQueryUrl("works", {
        filter: "author.id:A123",
        select: ["id", "display_name"],
        per_page: 25
      });

      expect(url2).toContain("https://api.openalex.org/works?");
      expect(url2).toContain("filter=author.id%3AA123");
      expect(url2).toContain("select=id%2Cdisplay_name");
      expect(url2).toContain("per_page=25");
    });
  });

  describe("Error Handling", () => {
    it("should handle API fetch errors gracefully", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(cli.fetchFromAPI("authors", {})).rejects.toThrow("Network error");

      consoleSpy.mockRestore();
    });

    it("should handle API response errors", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 404,
        statusText: "Not Found"
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(cli.fetchFromAPI("authors", {})).rejects.toThrow(
        "API request failed: 404 Not Found"
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Real Data Validation", () => {
    it("should have consistent data structure in author entities", async () => {
      const entities = await cli.listEntities("authors");
      const authorId = entities[0];
      const author = await cli.loadEntity("authors", authorId);

      expect(author).toBeTruthy();
      expect(typeof author?.id).toBe("string");
      expect(author?.id).toContain("https://openalex.org/");
      expect(typeof author?.display_name).toBe("string");
      expect(author?.display_name.length).toBeGreaterThan(0);
    });

    it("should have Joseph Mearman in the static data", async () => {
      const results = await cli.searchEntities("authors", "Joseph Mearman");

      expect(results.length).toBeGreaterThan(0);
      const joseph = results.find(author =>
        author.display_name === "Joseph Mearman"
      );

      expect(joseph).toBeTruthy();
      expect(joseph?.id).toBe("https://openalex.org/A5017898742");
    });

    it("should have works data available", async () => {
      const works = await cli.listEntities("works");
      expect(works.length).toBeGreaterThan(0);

      const firstWork = await cli.loadEntity("works", works[0]);
      expect(firstWork).toBeTruthy();
      expect(typeof firstWork?.display_name).toBe("string");
    });
  });

  describe("Entity Auto-Detection", () => {
    it("should detect author entity type from bare ID", () => {
      const entityType = detectEntityType("A5017898742");
      expect(entityType).toBe("authors");
    });

    it("should detect works entity type from bare ID", () => {
      const entityType = detectEntityType("W2241997964");
      expect(entityType).toBe("works");
    });

    it("should detect entity type from full OpenAlex URL", () => {
      const entityType = detectEntityType("https://openalex.org/A5017898742");
      expect(entityType).toBe("authors");
    });

    it("should detect all supported entity types", () => {
      expect(detectEntityType("W2241997964")).toBe("works");
      expect(detectEntityType("A5017898742")).toBe("authors");
      expect(detectEntityType("S123")).toBe("sources");
      expect(detectEntityType("I123")).toBe("institutions");
      expect(detectEntityType("T123")).toBe("topics");
      expect(detectEntityType("P123")).toBe("publishers");
    });

    it("should throw error for invalid entity ID format", () => {
      expect(() => detectEntityType("invalid123")).toThrow("Cannot detect entity type from ID: invalid123");
      expect(() => detectEntityType("123")).toThrow("Cannot detect entity type from ID: 123");
      expect(() => detectEntityType("")).toThrow("Cannot detect entity type from ID: ");
    });

    it("should work with auto-detection in CLI workflow", async () => {
      // Test the integration of auto-detection with actual CLI functionality
      const entityId = "A5017898742";
      const detectedType = detectEntityType(entityId);

      const entity = await cli.getEntityWithCache(detectedType, entityId, {
        useCache: true,
        saveToCache: false,
        cacheOnly: true
      });

      expect(entity).toBeTruthy();
      expect(entity?.id).toContain(entityId);
      expect(detectedType).toBe("authors");
    });
  });
});