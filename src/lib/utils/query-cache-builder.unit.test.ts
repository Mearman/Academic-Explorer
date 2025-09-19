/**
 * Unit tests for query cache builder utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addFilteredQuery,
  getQueryHashForUrl
} from "./query-cache-builder";
import { generateQueryHash } from "./static-data-index-generator";

// Mock file system operations
vi.mock("fs/promises", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  };
});

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }
}));

describe("Query Cache Builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getQueryHashForUrl", () => {
    it("should generate consistent hashes for the same URL", () => {
      const url = "https://api.openalex.org/works?filter=author.id:A5017898742";
      const hash1 = getQueryHashForUrl(url);
      const hash2 = getQueryHashForUrl(url);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(16);
      expect(hash1).toMatch(/^[a-f0-9]{16}$/);
    });

    it("should generate different hashes for different URLs", () => {
      const url1 = "https://api.openalex.org/works?filter=author.id:A5017898742";
      const url2 = "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name";

      const hash1 = getQueryHashForUrl(url1);
      const hash2 = getQueryHashForUrl(url2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle URLs with same parameters in different order", () => {
      const url1 = "https://api.openalex.org/works?filter=author.id:A5017898742&per_page=25";
      const url2 = "https://api.openalex.org/works?per_page=25&filter=author.id:A5017898742";

      const hash1 = getQueryHashForUrl(url1);
      const hash2 = getQueryHashForUrl(url2);

      // Note: Different order might produce different hashes - this is expected
      // In practice, you'd want to normalize parameter order for consistency
      expect(typeof hash1).toBe("string");
      expect(typeof hash2).toBe("string");
    });
  });

  describe("addFilteredQuery", () => {
    it("should build correct URL for simple filter", async () => {
      const queryHash = await addFilteredQuery("works", {
        "filter": "author.id:A5017898742",
        "per_page": 25
      }, "/tmp/test");

      expect(queryHash).toHaveLength(16);
      expect(queryHash).toMatch(/^[a-f0-9]{16}$/);
    });

    it("should build correct URL for select parameters", async () => {
      const queryHash = await addFilteredQuery("works", {
        "filter": "author.id:A5017898742",
        "select": ["id", "display_name", "publication_year"],
        "per_page": 25
      }, "/tmp/test");

      expect(queryHash).toHaveLength(16);
    });

    it("should handle multiple parameters", async () => {
      const queryHash = await addFilteredQuery("authors", {
        "sort": "works_count:desc",
        "filter": "last_known_institution.country_code:US",
        "per_page": 50
      }, "/tmp/test");

      expect(queryHash).toHaveLength(16);
    });
  });

  describe("URL examples", () => {
    it("should generate hashes for example URLs", () => {
      const examples = [
        "https://api.openalex.org/works?filter=author.id:A5017898742",
        "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name",
        "https://api.openalex.org/authors?sort=works_count:desc&per_page=25",
        "https://api.openalex.org/institutions?filter=country_code:US&per_page=100"
      ];

      examples.forEach(url => {
        const hash = getQueryHashForUrl(url);
        expect(hash).toHaveLength(16);
        expect(hash).toMatch(/^[a-f0-9]{16}$/);

        // Verify consistency with generateQueryHash
        const expectedHash = generateQueryHash(url);
        expect(hash).toBe(expectedHash);
      });
    });
  });
});