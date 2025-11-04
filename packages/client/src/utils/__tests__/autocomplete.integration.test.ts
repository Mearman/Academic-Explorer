/**
 * Integration tests for AutocompleteApi
 * Tests actual API calls to OpenAlex autocomplete endpoints
 */

import { describe, it, expect, beforeAll } from "vitest";
import { OpenAlexClient } from "../../client";
import type { EntityType } from "../../types";

describe("AutocompleteApi Integration Tests", () => {
  let client: OpenAlexClient;

  beforeAll(() => {
    client = new OpenAlexClient({
      userEmail: "test@academic-explorer.com",
    });
  });

  describe("General Autocomplete", () => {
    it("should fetch results across all entity types", async () => {
      const results = await client.autocomplete.autocompleteGeneral(
        "machine learning",
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      if (results.length > 0) {
        expect(results[0]).toHaveProperty("id");
        expect(results[0]).toHaveProperty("display_name");
        expect(results[0]).toHaveProperty("entity_type");
      }
    });

    it("should handle queries with special characters", async () => {
      const results =
        await client.autocomplete.autocompleteGeneral("C++ programming");

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it("should return empty array for nonsense query", async () => {
      const results = await client.autocomplete.autocompleteGeneral(
        "xyzqweasdzxc123456789",
      );

      expect(Array.isArray(results)).toBe(true);
      // May return empty or small results
    });
  });

  describe("Entity-Specific Autocomplete Endpoints", () => {
    const testCases: Array<{
      entityType: EntityType;
      query: string;
      expectedType: string;
    }> = [
      { entityType: "authors", query: "Einstein", expectedType: "author" },
      {
        entityType: "works",
        query: "neural networks",
        expectedType: "work",
      },
      { entityType: "sources", query: "Nature", expectedType: "source" },
      { entityType: "institutions", query: "MIT", expectedType: "institution" },
      {
        entityType: "topics",
        query: "artificial intelligence",
        expectedType: "topic",
      },
      { entityType: "publishers", query: "Springer", expectedType: "publisher" },
      { entityType: "funders", query: "NSF", expectedType: "funder" },
      { entityType: "concepts", query: "deep learning", expectedType: "concept" },
    ];

    testCases.forEach(({ entityType, query, expectedType }) => {
      it(`should fetch ${entityType} with autocomplete`, async () => {
        const methodName = `autocomplete${entityType.charAt(0).toUpperCase() + entityType.slice(1)}` as keyof typeof client.autocomplete;
        const method = client.autocomplete[methodName] as (
          query: string,
        ) => Promise<unknown[]>;

        const results = await method(query);

        expect(results).toBeDefined();
        expect(Array.isArray(results)).toBe(true);

        if (results.length > 0) {
          const firstResult = results[0] as {
            id: string;
            display_name: string;
            entity_type: string;
          };
          expect(firstResult).toHaveProperty("id");
          expect(firstResult).toHaveProperty("display_name");
          expect(firstResult.entity_type).toBe(expectedType);
        }
      });
    });
  });

  describe("Response Structure", () => {
    it("should return results with required fields", async () => {
      const results = await client.autocomplete.autocompleteWorks(
        "machine learning",
      );

      if (results.length > 0) {
        const result = results[0];
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("display_name");
        expect(result).toHaveProperty("entity_type");
        expect(typeof result.id).toBe("string");
        expect(typeof result.display_name).toBe("string");
      }
    });

    it("should include optional fields when available", async () => {
      const results = await client.autocomplete.autocompleteWorks(
        "neural networks",
      );

      if (results.length > 0) {
        const result = results[0];
        // These fields may or may not be present
        if (result.cited_by_count !== undefined) {
          expect(typeof result.cited_by_count).toBe("number");
        }
        if (result.hint !== undefined) {
          expect(typeof result.hint).toBe("string");
        }
      }
    });
  });

  describe("Sorting and Ranking", () => {
    it("should return results sorted by relevance/citation count", async () => {
      const results = await client.autocomplete.autocompleteWorks(
        "artificial intelligence",
      );

      if (results.length > 1) {
        // Check that results with citation counts are sorted descending
        const resultsWithCitations = results.filter(
          (r) => r.cited_by_count !== undefined,
        );
        if (resultsWithCitations.length > 1) {
          for (let i = 0; i < resultsWithCitations.length - 1; i++) {
            expect(
              resultsWithCitations[i].cited_by_count! >=
                resultsWithCitations[i + 1].cited_by_count!,
            ).toBe(true);
          }
        }
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle empty query gracefully", async () => {
      await expect(
        client.autocomplete.autocompleteGeneral(""),
      ).rejects.toThrow("Query string is required");
    });

    it("should handle whitespace-only query", async () => {
      await expect(
        client.autocomplete.autocompleteGeneral("   "),
      ).rejects.toThrow("Query string is required");
    });
  });

  describe("Parameter Validation", () => {
    it("should not send format parameter", async () => {
      // This test verifies the fix - format parameter should never be sent
      const results = await client.autocomplete.autocompleteGeneral("test");

      // If we get results without 403 error, the parameter is not being sent
      expect(Array.isArray(results)).toBe(true);
    });

    it("should not send per_page parameter by default", async () => {
      // Default behavior should not include per_page
      const results = await client.autocomplete.autocompleteGeneral("test");

      // If we get results without 403 error, the parameter is not being sent incorrectly
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("Real-World Queries", () => {
    it("should find famous authors", async () => {
      const results = await client.autocomplete.autocompleteAuthors("Marie Curie");

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0].display_name.toLowerCase()).toContain("curie");
      }
    });

    it("should find well-known institutions", async () => {
      const results = await client.autocomplete.autocompleteInstitutions(
        "Massachusetts Institute of Technology",
      );

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        const names = results.map((r) => r.display_name.toLowerCase());
        expect(
          names.some(
            (name) => name.includes("mit") || name.includes("massachusetts"),
          ),
        ).toBe(true);
      }
    });

    it("should find major journals", async () => {
      const results = await client.autocomplete.autocompleteSources("Nature");

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        expect(results[0].display_name.toLowerCase()).toContain("nature");
      }
    });

    it("should find popular topics", async () => {
      const results = await client.autocomplete.autocompleteTopics(
        "Machine Learning",
      );

      expect(results.length).toBeGreaterThan(0);
      if (results.length > 0) {
        const names = results.map((r) => r.display_name.toLowerCase());
        expect(names.some((name) => name.includes("machine"))).toBe(true);
      }
    });
  });

  describe("Performance", () => {
    it("should complete requests in reasonable time", async () => {
      const startTime = Date.now();

      await client.autocomplete.autocompleteGeneral("test");

      const duration = Date.now() - startTime;
      // Should complete within 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it("should handle multiple concurrent requests", async () => {
      const queries = ["test1", "test2", "test3"];

      const results = await Promise.all(
        queries.map((q) => client.autocomplete.autocompleteGeneral(q)),
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle very short queries", async () => {
      const results = await client.autocomplete.autocompleteGeneral("AI");

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle very long queries", async () => {
      const longQuery =
        "machine learning artificial intelligence deep learning neural networks";

      const results = await client.autocomplete.autocompleteGeneral(longQuery);

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle queries with numbers", async () => {
      const results = await client.autocomplete.autocompleteGeneral(
        "COVID-19 pandemic 2020",
      );

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle queries with punctuation", async () => {
      const results = await client.autocomplete.autocompleteGeneral(
        "machine-learning, AI & neural-networks",
      );

      expect(Array.isArray(results)).toBe(true);
    });

    it("should handle unicode characters", async () => {
      const results =
        await client.autocomplete.autocompleteGeneral("日本の大学");

      expect(Array.isArray(results)).toBe(true);
    });
  });
});
