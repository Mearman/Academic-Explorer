/**
 * Unit tests for query cache builder utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addFilteredQuery,
  getUrlIdentifier
} from "./query-cache-builder";

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

  describe("getUrlIdentifier", () => {
    it("should generate consistent identifiers for the same URL", () => {
      const url = "https://api.openalex.org/works?filter=author.id:A5017898742";
      const id1 = getUrlIdentifier(url);
      const id2 = getUrlIdentifier(url);

      expect(id1).toBe(id2);
      expect(id1).toBe(encodeURIComponent(url));
    });

    it("should generate different identifiers for different URLs", () => {
      const url1 = "https://api.openalex.org/works?filter=author.id:A5017898742";
      const url2 = "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name";

      const id1 = getUrlIdentifier(url1);
      const id2 = getUrlIdentifier(url2);

      expect(id1).not.toBe(id2);
      expect(id1).toBe(encodeURIComponent(url1));
      expect(id2).toBe(encodeURIComponent(url2));
    });

    it("should handle URLs with same parameters in different order", () => {
      const url1 = "https://api.openalex.org/works?filter=author.id:A5017898742&per_page=25";
      const url2 = "https://api.openalex.org/works?per_page=25&filter=author.id:A5017898742";

      const id1 = getUrlIdentifier(url1);
      const id2 = getUrlIdentifier(url2);

      // Different order produces different identifiers - this is expected behavior
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1).toBe(encodeURIComponent(url1));
      expect(id2).toBe(encodeURIComponent(url2));
    });
  });

  describe("addFilteredQuery", () => {
    it("should build correct URL for simple filter", async () => {
      const urlIdentifier = await addFilteredQuery("works", {
        "filter": "author.id:A5017898742",
        "per_page": 25
      }, "/tmp/test");

      const expectedUrl = "https://api.openalex.org/works?filter=author.id%3AA5017898742&per_page=25";
      expect(urlIdentifier).toBe(encodeURIComponent(expectedUrl));
    });

    it("should build correct URL for select parameters", async () => {
      const urlIdentifier = await addFilteredQuery("works", {
        "filter": "author.id:A5017898742",
        "select": ["id", "display_name", "publication_year"],
        "per_page": 25
      }, "/tmp/test");

      const expectedUrl = "https://api.openalex.org/works?filter=author.id%3AA5017898742&select=id%2Cdisplay_name%2Cpublication_year&per_page=25";
      expect(urlIdentifier).toBe(encodeURIComponent(expectedUrl));
    });

    it("should handle multiple parameters", async () => {
      const urlIdentifier = await addFilteredQuery("authors", {
        "sort": "works_count:desc",
        "filter": "last_known_institution.country_code:US",
        "per_page": 50
      }, "/tmp/test");

      const expectedUrl = "https://api.openalex.org/authors?sort=works_count%3Adesc&filter=last_known_institution.country_code%3AUS&per_page=50";
      expect(urlIdentifier).toBe(encodeURIComponent(expectedUrl));
    });
  });

  describe("URL examples", () => {
    it("should generate URL identifiers for example URLs", () => {
      const examples = [
        "https://api.openalex.org/works?filter=author.id:A5017898742",
        "https://api.openalex.org/works?filter=author.id:A5017898742&select=id,display_name",
        "https://api.openalex.org/authors?sort=works_count:desc&per_page=25",
        "https://api.openalex.org/institutions?filter=country_code:US&per_page=100"
      ];

      examples.forEach(url => {
        const identifier = getUrlIdentifier(url);
        expect(identifier).toBe(encodeURIComponent(url));
        expect(typeof identifier).toBe("string");
        expect(identifier.length).toBeGreaterThan(0);
      });
    });
  });
});