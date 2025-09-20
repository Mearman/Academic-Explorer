/**
 * Unit tests for content-based hashing utilities
 */

import { describe, it, expect } from "vitest";
import {
  createContentHash,
  createEntityContentHash,
  createQueryContentHash,
  hasContentChanged
} from "./content-hash";

describe("Content Hash Utilities", () => {
  describe("createContentHash", () => {
    it("should create consistent hashes for identical content", () => {
      const indexContent = {
        entityType: "authors",
        count: 2,
        entities: ["A5017898742", "A1234567890"],
        metadata: {
          totalSize: 1000,
          files: [
            { id: "A5017898742", size: 500, lastModified: "2024-01-01T00:00:00.000Z" },
            { id: "A1234567890", size: 500, lastModified: "2024-01-02T00:00:00.000Z" }
          ]
        }
      };

      const hash1 = createContentHash(indexContent);
      const hash2 = createContentHash(indexContent);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex format
    });

    it("should ignore file timestamps in content hash", () => {
      const baseContent = {
        entityType: "authors",
        count: 1,
        entities: ["A5017898742"],
        metadata: {
          totalSize: 500,
          files: [
            { id: "A5017898742", size: 500, lastModified: "2024-01-01T00:00:00.000Z" }
          ]
        }
      };

      const modifiedContent = {
        ...baseContent,
        metadata: {
          ...baseContent.metadata,
          files: [
            { id: "A5017898742", size: 500, lastModified: "2024-12-31T23:59:59.999Z" }
          ]
        }
      };

      const hash1 = createContentHash(baseContent);
      const hash2 = createContentHash(modifiedContent);

      expect(hash1).toBe(hash2); // Timestamps should not affect hash
    });

    it("should create different hashes for different content", () => {
      const content1 = {
        entityType: "authors",
        count: 1,
        entities: ["A5017898742"],
        metadata: {
          totalSize: 500,
          files: [{ id: "A5017898742", size: 500 }]
        }
      };

      const content2 = {
        entityType: "authors",
        count: 2,
        entities: ["A5017898742", "A1234567890"],
        metadata: {
          totalSize: 1000,
          files: [
            { id: "A5017898742", size: 500 },
            { id: "A1234567890", size: 500 }
          ]
        }
      };

      const hash1 = createContentHash(content1);
      const hash2 = createContentHash(content2);

      expect(hash1).not.toBe(hash2);
    });

    it("should handle entities in different order consistently", () => {
      const content1 = {
        entityType: "authors",
        count: 2,
        entities: ["A5017898742", "A1234567890"],
        metadata: {
          totalSize: 1000,
          files: [
            { id: "A5017898742", size: 500 },
            { id: "A1234567890", size: 500 }
          ]
        }
      };

      const content2 = {
        entityType: "authors",
        count: 2,
        entities: ["A1234567890", "A5017898742"], // Different order
        metadata: {
          totalSize: 1000,
          files: [
            { id: "A1234567890", size: 500 }, // Different order
            { id: "A5017898742", size: 500 }
          ]
        }
      };

      const hash1 = createContentHash(content1);
      const hash2 = createContentHash(content2);

      expect(hash1).toBe(hash2); // Should be same due to internal sorting
    });

    it("should handle queries in content hash", () => {
      const contentWithQueries = {
        entityType: "works",
        count: 10,
        entities: ["W1234567890"],
        queries: [
          {
            queryHash: "abcd1234",
            url: "https://api.openalex.org/works?filter=author.id:A5017898742",
            params: { "filter": "author.id:A5017898742" },
            resultCount: 10,
            size: 2000,
            lastModified: "2024-01-01T00:00:00.000Z"
          }
        ],
        metadata: {
          totalSize: 3000,
          files: [{ id: "W1234567890", size: 1000 }]
        }
      };

      const contentWithoutQueries = {
        entityType: "works",
        count: 10,
        entities: ["W1234567890"],
        metadata: {
          totalSize: 3000,
          files: [{ id: "W1234567890", size: 1000 }]
        }
      };

      const hash1 = createContentHash(contentWithQueries);
      const hash2 = createContentHash(contentWithoutQueries);

      expect(hash1).not.toBe(hash2); // Queries should affect hash
    });
  });

  describe("createEntityContentHash", () => {
    it("should create hash from entity static fields", () => {
      const entityData = {
        id: "https://openalex.org/A5017898742",
        display_name: "Joseph Mearman",
        orcid: "https://orcid.org/0000-0002-3654-6894",
        works_count: 9,
        cited_by_count: 42,
        last_known_institution: { id: "https://openalex.org/I1234567890" },
        updated_date: "2024-01-01",
        // Non-static fields that should be ignored
        some_dynamic_field: "changing value",
        cached_at: "2024-12-31T23:59:59.999Z"
      };

      const hash = createEntityContentHash({ entityData });
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      // Should be consistent
      const hash2 = createEntityContentHash({ entityData });
      expect(hash).toBe(hash2);
    });

    it("should ignore non-static fields", () => {
      const baseEntity = {
        id: "https://openalex.org/A5017898742",
        display_name: "Joseph Mearman",
        works_count: 9
      };

      const entityWithExtra = {
        ...baseEntity,
        cached_at: "2024-12-31T23:59:59.999Z",
        some_dynamic_field: "this should be ignored"
      };

      const hash1 = createEntityContentHash({ entityData: baseEntity });
      const hash2 = createEntityContentHash({ entityData: entityWithExtra });

      expect(hash1).toBe(hash2); // Should ignore extra non-static fields
    });
  });

  describe("createQueryContentHash", () => {
    it("should create hash from query static fields", () => {
      const queryData = {
        queryHash: "abcd1234",
        url: "https://api.openalex.org/works?filter=author.id:A5017898742",
        params: { "filter": "author.id:A5017898742", "per_page": "25" },
        resultCount: 10
      };

      const hash = createQueryContentHash(queryData);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);

      // Should be consistent
      const hash2 = createQueryContentHash(queryData);
      expect(hash).toBe(hash2);
    });

    it("should create different hashes for different queries", () => {
      const query1 = {
        queryHash: "abcd1234",
        url: "https://api.openalex.org/works?filter=author.id:A5017898742",
        params: { "filter": "author.id:A5017898742" },
        resultCount: 10
      };

      const query2 = {
        queryHash: "efgh5678",
        url: "https://api.openalex.org/works?filter=author.id:A1234567890",
        params: { "filter": "author.id:A1234567890" },
        resultCount: 5
      };

      const hash1 = createQueryContentHash(query1);
      const hash2 = createQueryContentHash(query2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("hasContentChanged", () => {
    it("should return true when hashes are different", () => {
      const oldHash = "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234";
      const newHash = "efgh5678901234efgh5678901234efgh5678901234efgh5678901234efgh5678";

      expect(hasContentChanged({ currentHash: oldHash, newHash })).toBe(true);
    });

    it("should return false when hashes are the same", () => {
      const hash = "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234";

      expect(hasContentChanged({ currentHash: hash, newHash: hash })).toBe(false);
    });

    it("should return true when old hash is undefined", () => {
      const newHash = "abcd1234567890abcd1234567890abcd1234567890abcd1234567890abcd1234";

      expect(hasContentChanged({ currentHash: undefined, newHash })).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty entities array", () => {
      const content = {
        entityType: "authors",
        count: 0,
        entities: [],
        metadata: {
          totalSize: 0,
          files: []
        }
      };

      const hash = createContentHash(content);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle missing optional fields", () => {
      const content = {
        entityType: "works",
        count: 1,
        entities: ["W1234567890"],
        // queries field is optional and missing
        metadata: {
          totalSize: 1000,
          files: [{ id: "W1234567890", size: 1000 }]
        }
      };

      const hash = createContentHash(content);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should handle complex nested params in queries", () => {
      const content = {
        entityType: "works",
        count: 1,
        entities: ["W1234567890"],
        queries: [
          {
            queryHash: "complex123",
            url: "https://api.openalex.org/works",
            params: {
              "filter": "author.id:A5017898742,publication_year:2023",
              "select": "id,display_name,publication_year",
              "sort": "cited_by_count:desc",
              "per_page": "25"
            },
            resultCount: 15
          }
        ],
        metadata: {
          totalSize: 5000,
          files: [{ id: "W1234567890", size: 1000 }]
        }
      };

      const hash = createContentHash(content);
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("should produce same hash regardless of object key order", () => {
      const content1 = {
        entityType: "authors",
        count: 1,
        entities: ["A5017898742"],
        metadata: {
          totalSize: 500,
          files: [{ id: "A5017898742", size: 500 }]
        }
      };

      const content2 = {
        count: 1,
        entityType: "authors", // Different key order
        metadata: {
          files: [{ size: 500, id: "A5017898742" }], // Different key order
          totalSize: 500
        },
        entities: ["A5017898742"]
      };

      const hash1 = createContentHash(content1);
      const hash2 = createContentHash(content2);

      expect(hash1).toBe(hash2); // Should be same due to key sorting
    });
  });

  describe("JSON Output Key Ordering", () => {
    it("should produce JSON with sorted keys at all levels", () => {
      const content = {
        entityType: "authors",
        count: 2,
        entities: ["A5017898742", "A1234567890"],
        metadata: {
          totalSize: 1000,
          files: [
            { id: "A5017898742", size: 500, lastModified: "2024-01-01T00:00:00.000Z" },
            { id: "A1234567890", size: 500, lastModified: "2024-01-02T00:00:00.000Z" }
          ]
        },
        queries: [
          {
            queryHash: "abcd1234",
            url: "https://api.openalex.org/authors?filter=works_count:>5",
            params: { filter: "works_count:>5" },
            resultCount: 10
          }
        ]
      };

      // Simulate the JSON.stringify with key sorting (same as used in the generator)
      const jsonOutput = JSON.stringify(content, (key, value: unknown) => {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          // Sort object keys for consistent output
          const sortedObj: Record<string, unknown> = {};
          const typedValue = value as Record<string, unknown>;
          Object.keys(typedValue).sort().forEach(sortedKey => {
            sortedObj[sortedKey] = typedValue[sortedKey];
          });
          return sortedObj;
        }
        return value;
      }, 2);

      // Parse back to verify key order
      const parsed = JSON.parse(jsonOutput);
      const rootKeys = Object.keys(parsed);

      // Root keys should be in alphabetical order
      expect(rootKeys).toEqual([
        "count",
        "entities",
        "entityType",
        "metadata",
        "queries"
      ]);

      // Metadata keys should be sorted
      const metadataKeys = Object.keys(parsed.metadata);
      expect(metadataKeys).toEqual(["files", "totalSize"]);

      // File object keys should be sorted
      const firstFileKeys = Object.keys(parsed.metadata.files[0]);
      expect(firstFileKeys).toEqual(["id", "lastModified", "size"]);

      // Query object keys should be sorted
      const firstQueryKeys = Object.keys(parsed.queries[0]);
      expect(firstQueryKeys).toEqual(["params", "queryHash", "resultCount", "url"]);
    });
  });
});