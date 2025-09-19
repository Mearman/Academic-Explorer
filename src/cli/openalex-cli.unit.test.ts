/**
 * Unit tests for OpenAlex CLI
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFile, access, writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Mock the fs/promises module
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn(),
    access: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

// Mock the generateQueryHash function
vi.mock("../lib/utils/query-hash.js", () => ({
  generateQueryHash: vi.fn().mockResolvedValue("mockhash123"),
}));

// Mock fetch globally
global.fetch = vi.fn();

// Import after mocks are set up
import { OpenAlexCLI } from "./openalex-cli-class.js";

describe("OpenAlexCLI", () => {
  let cli: any;

  beforeEach(() => {
    cli = new OpenAlexCLI();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("hasStaticData", () => {
    it("should return true when index file exists", async () => {
      vi.mocked(access).mockResolvedValue(undefined);

      const result = await cli.hasStaticData("authors");

      expect(result).toBe(true);
      expect(access).toHaveBeenCalledWith(
        expect.stringContaining("authors/index.json")
      );
    });

    it("should return false when index file does not exist", async () => {
      vi.mocked(access).mockRejectedValue(new Error("File not found"));

      const result = await cli.hasStaticData("authors");

      expect(result).toBe(false);
    });
  });

  describe("loadIndex", () => {
    it("should load and parse index file successfully", async () => {
      const mockIndex = {
        entityType: "authors",
        count: 5,
        entities: ["A1", "A2", "A3"],
        metadata: { totalSize: 1000, files: [] }
      };

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockIndex));

      const result = await cli.loadIndex("authors");

      expect(result).toEqual(mockIndex);
      expect(readFile).toHaveBeenCalledWith(
        expect.stringContaining("authors/index.json"),
        "utf-8"
      );
    });

    it("should return null and log error when file read fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(readFile).mockRejectedValue(new Error("Read failed"));

      const result = await cli.loadIndex("authors");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load index for authors:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("loadEntity", () => {
    it("should load and parse entity file successfully", async () => {
      const mockEntity = {
        id: "https://openalex.org/A5017898742",
        display_name: "Test Author",
        works_count: 10
      };

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockEntity));

      const result = await cli.loadEntity("authors", "A5017898742");

      expect(result).toEqual(mockEntity);
      expect(readFile).toHaveBeenCalledWith(
        expect.stringContaining("authors/A5017898742.json"),
        "utf-8"
      );
    });

    it("should return null when file does not exist (ENOENT)", async () => {
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      vi.mocked(readFile).mockRejectedValue(error);

      const result = await cli.loadEntity("authors", "A5017898742");

      expect(result).toBeNull();
    });

    it("should log error and return null for other file read errors", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(readFile).mockRejectedValue(new Error("Permission denied"));

      const result = await cli.loadEntity("authors", "A5017898742");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to load entity A5017898742:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("buildQueryUrl", () => {
    it("should build basic URL with entity type", () => {
      const url = cli.buildQueryUrl("authors", {});

      expect(url).toBe("https://api.openalex.org/authors?");
    });

    it("should build URL with all query parameters", () => {
      const options = {
        filter: "works_count:>10",
        select: ["id", "display_name", "works_count"],
        sort: "works_count:desc",
        per_page: 25,
        page: 2
      };

      const url = cli.buildQueryUrl("authors", options);

      expect(url).toBe(
        "https://api.openalex.org/authors?filter=works_count%3A%3E10&select=id%2Cdisplay_name%2Cworks_count&sort=works_count%3Adesc&per_page=25&page=2"
      );
    });

    it("should handle partial parameters", () => {
      const options = {
        filter: "works_count:>5",
        per_page: 10
      };

      const url = cli.buildQueryUrl("works", options);

      expect(url).toBe(
        "https://api.openalex.org/works?filter=works_count%3A%3E5&per_page=10"
      );
    });
  });

  describe("fetchFromAPI", () => {
    it("should successfully fetch data from API", async () => {
      const mockResponse = {
        results: [{ id: "A5017898742", display_name: "Test Author" }],
        meta: { count: 1 }
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.fetchFromAPI("authors", { per_page: 1 });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.openalex.org/authors?per_page=1"
      );

      consoleSpy.mockRestore();
    });

    it("should throw error when API request fails", async () => {
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

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await expect(cli.fetchFromAPI("authors", {})).rejects.toThrow("Network error");

      consoleSpy.mockRestore();
    });
  });

  describe("saveEntityToCache", () => {
    it("should save entity to cache successfully", async () => {
      const mockEntity = {
        id: "https://openalex.org/A5017898742",
        display_name: "Test Author"
      };

      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await cli.saveEntityToCache("authors", mockEntity);

      expect(mkdir).toHaveBeenCalledWith(
        expect.stringContaining("authors"),
        { recursive: true }
      );
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("authors/A5017898742.json"),
        JSON.stringify(mockEntity, null, 2)
      );

      consoleSpy.mockRestore();
    });

    it("should handle save errors gracefully", async () => {
      const mockEntity = {
        id: "https://openalex.org/A5017898742",
        display_name: "Test Author"
      };

      vi.mocked(mkdir).mockRejectedValue(new Error("Permission denied"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await cli.saveEntityToCache("authors", mockEntity);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to save entity to cache:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("getEntityWithCache", () => {
    it("should return cached entity when cache hit and useCache enabled", async () => {
      const mockEntity = {
        id: "https://openalex.org/A5017898742",
        display_name: "Test Author"
      };

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockEntity));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.getEntityWithCache("authors", "A5017898742", {
        useCache: true,
        saveToCache: false,
        cacheOnly: false
      });

      expect(result).toEqual(mockEntity);
      expect(consoleSpy).toHaveBeenCalledWith("Cache hit for authors/A5017898742");

      consoleSpy.mockRestore();
    });

    it("should return null in cache-only mode when entity not found", async () => {
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      vi.mocked(readFile).mockRejectedValue(error);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.getEntityWithCache("authors", "A5017898742", {
        useCache: true,
        saveToCache: false,
        cacheOnly: true
      });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Cache-only mode: entity A5017898742 not found in cache"
      );

      consoleSpy.mockRestore();
    });

    it("should fetch from API when cache miss and not cache-only", async () => {
      const mockEntity = {
        id: "https://openalex.org/A5017898742",
        display_name: "Test Author"
      };

      const mockApiResponse = {
        results: [mockEntity]
      };

      // Mock cache miss
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      vi.mocked(readFile).mockRejectedValue(error);

      // Mock successful API call
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      } as Response);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.getEntityWithCache("authors", "A5017898742", {
        useCache: true,
        saveToCache: false,
        cacheOnly: false
      });

      expect(result).toEqual(mockEntity);
      expect(fetch).toHaveBeenCalledWith(
        "https://api.openalex.org/authors?filter=id%3AA5017898742&per_page=1"
      );

      consoleSpy.mockRestore();
    });

    it("should save to cache when saveToCache enabled", async () => {
      const mockEntity = {
        id: "https://openalex.org/A5017898742",
        display_name: "Test Author"
      };

      const mockApiResponse = {
        results: [mockEntity]
      };

      // Mock cache miss
      const error = new Error("File not found");
      (error as any).code = "ENOENT";
      vi.mocked(readFile).mockRejectedValue(error);

      // Mock successful API call
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockApiResponse)
      } as Response);

      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.getEntityWithCache("authors", "A5017898742", {
        useCache: true,
        saveToCache: true,
        cacheOnly: false
      });

      expect(result).toEqual(mockEntity);
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining("authors/A5017898742.json"),
        JSON.stringify(mockEntity, null, 2)
      );

      consoleSpy.mockRestore();
    });
  });

  describe("listEntities", () => {
    it("should return entity list from index", async () => {
      const mockIndex = {
        entityType: "authors",
        count: 3,
        entities: ["A1", "A2", "A3"],
        metadata: { totalSize: 1000, files: [] }
      };

      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockIndex));

      const result = await cli.listEntities("authors");

      expect(result).toEqual(["A1", "A2", "A3"]);
    });

    it("should return empty array when index not found", async () => {
      vi.mocked(readFile).mockRejectedValue(new Error("File not found"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await cli.listEntities("authors");

      expect(result).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  describe("searchEntities", () => {
    it("should search entities by display name", async () => {
      const mockIndex = {
        entityType: "authors",
        count: 2,
        entities: ["A1", "A2"],
        metadata: { totalSize: 1000, files: [] }
      };

      const mockEntity1 = {
        id: "https://openalex.org/A1",
        display_name: "John Smith"
      };

      const mockEntity2 = {
        id: "https://openalex.org/A2",
        display_name: "Jane Doe"
      };

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(mockIndex))
        .mockResolvedValueOnce(JSON.stringify(mockEntity1))
        .mockResolvedValueOnce(JSON.stringify(mockEntity2));

      const result = await cli.searchEntities("authors", "john");

      expect(result).toEqual([mockEntity1]);
    });

    it("should perform case-insensitive search", async () => {
      const mockIndex = {
        entityType: "authors",
        count: 1,
        entities: ["A1"],
        metadata: { totalSize: 1000, files: [] }
      };

      const mockEntity = {
        id: "https://openalex.org/A1",
        display_name: "John SMITH"
      };

      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(mockIndex))
        .mockResolvedValueOnce(JSON.stringify(mockEntity));

      const result = await cli.searchEntities("authors", "smith");

      expect(result).toEqual([mockEntity]);
    });
  });

  describe("getStatistics", () => {
    it("should collect statistics from all entity types", async () => {
      const mockAuthorIndex = {
        entityType: "authors",
        count: 5,
        lastModified: "2025-01-01T00:00:00Z",
        metadata: { totalSize: 1000, files: [] }
      };

      const mockWorksIndex = {
        entityType: "works",
        count: 10,
        lastModified: "2025-01-01T01:00:00Z",
        metadata: { totalSize: 2000, files: [] }
      };

      // Mock hasStaticData calls
      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // authors
        .mockResolvedValueOnce(undefined) // works
        .mockRejectedValueOnce(new Error("Not found")) // institutions
        .mockRejectedValueOnce(new Error("Not found")) // topics
        .mockRejectedValueOnce(new Error("Not found")) // publishers
        .mockRejectedValueOnce(new Error("Not found")); // funders

      // Mock loadIndex calls
      vi.mocked(readFile)
        .mockResolvedValueOnce(JSON.stringify(mockAuthorIndex))
        .mockResolvedValueOnce(JSON.stringify(mockWorksIndex));

      const result = await cli.getStatistics();

      expect(result).toEqual({
        authors: {
          count: 5,
          totalSize: 1000,
          lastModified: "2025-01-01T00:00:00Z"
        },
        works: {
          count: 10,
          totalSize: 2000,
          lastModified: "2025-01-01T01:00:00Z"
        }
      });
    });
  });
});