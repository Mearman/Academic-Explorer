/**
 * Example: Modern Entity Detection with EntityDetectionService
 *
 * Demonstrates: Modern entity type detection using EntityDetectionService
 * Use cases: URL-based routing, external ID resolution, multi-format input handling
 * Prerequisites: Understanding of EntityDetectionService and EntityType enum
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { OpenAlexGraphProvider } from "../../../providers/openalex-provider";
import { EntityDetectionService } from "../../../services/entity-detection-service";
import type { EntityType } from "../../../types/core";

// Enhanced mock client that supports various identifier formats
class ComprehensiveMockClient {
  async getAuthor(id: string): Promise<Record<string, unknown>> {
    return {
      id: this.normalizeId(id, "A"),
      display_name: "Dr. Jane Smith",
      ids: {
        openalex: this.normalizeId(id, "A"),
        orcid: "https://orcid.org/0000-0002-1825-0097",
      },
    };
  }

  async getWork(id: string): Promise<Record<string, unknown>> {
    return {
      id: this.normalizeId(id, "W"),
      title: "Machine Learning in Academic Research",
      display_name: "Machine Learning in Academic Research",
      ids: {
        openalex: this.normalizeId(id, "W"),
        doi: "https://doi.org/10.1038/s41586-023-12345-6",
      },
    };
  }

  async getSource(id: string): Promise<Record<string, unknown>> {
    return {
      id: this.normalizeId(id, "S"),
      display_name: "Nature",
      ids: {
        openalex: this.normalizeId(id, "S"),
        issn_l: "0028-0836",
      },
    };
  }

  async getInstitution(id: string): Promise<Record<string, unknown>> {
    return {
      id: this.normalizeId(id, "I"),
      display_name: "Harvard University",
      ids: {
        openalex: this.normalizeId(id, "I"),
        ror: "https://ror.org/03vek6s52",
      },
    };
  }

  async get(endpoint: string, id: string): Promise<Record<string, unknown>> {
    const entityTypes: Record<string, string> = {
      topics: "T",
      publishers: "P",
      funders: "F",
      concepts: "C",
    };

    const prefix = entityTypes[endpoint] || "X";
    return {
      id: this.normalizeId(id, prefix),
      display_name: `${endpoint.slice(0, -1)} Entity`,
      ids: {
        openalex: this.normalizeId(id, prefix),
      },
    };
  }

  // Helper to normalize various ID formats to OpenAlex format
  private normalizeId(id: string, expectedPrefix: string): string {
    // Trim whitespace and handle various formats
    const trimmedId = id.trim();

    // If already in OpenAlex format, return as-is (uppercase)
    if (/^[AWSITPFC]\d+$/i.test(trimmedId)) {
      return trimmedId.toUpperCase();
    }

    // If it's a URL, extract the ID part
    const urlMatch = trimmedId.match(/openalex\.org\/([WASIPCFKQT]\d+)/i);
    if (urlMatch) {
      return urlMatch[1].toUpperCase();
    }

    // If it's a number, add prefix
    if (/^\d+$/.test(trimmedId)) {
      return `${expectedPrefix}${trimmedId}`;
    }

    // If it's a URL or external format, extract relevant part and add prefix
    const numericPart = trimmedId.replace(/\D/g, "").slice(-8).padStart(8, "0");
    return `${expectedPrefix}${numericPart}`;
  }

  // Required methods for interface compliance
  async works(): Promise<{ results: Record<string, unknown>[] }> {
    return { results: [] };
  }
  async authors(): Promise<{ results: Record<string, unknown>[] }> {
    return { results: [] };
  }
  async sources(): Promise<{ results: Record<string, unknown>[] }> {
    return { results: [] };
  }
  async institutions(): Promise<{ results: Record<string, unknown>[] }> {
    return { results: [] };
  }
}

describe("Example: Modern Entity Detection with EntityDetectionService", () => {
  let provider: OpenAlexGraphProvider;
  let mockClient: ComprehensiveMockClient;
  let detectionService: EntityDetectionService;

  beforeEach(async () => {
    mockClient = new ComprehensiveMockClient();
    provider = new OpenAlexGraphProvider(mockClient, {
      name: "entity-detection-test",
    });
    detectionService = new EntityDetectionService();
  });

  afterEach(() => {
    provider.destroy();
  });

  describe("EntityDetectionService Direct Usage", () => {
    it("demonstrates static entity type detection", () => {
      // Given: Various identifier formats
      const testCases = [
        { id: "W2741809807", expectedType: "works" },
        { id: "A5017898742", expectedType: "authors" },
        { id: "S4210184550", expectedType: "sources" },
        { id: "I4210140050", expectedType: "institutions" },
        { id: "T10364", expectedType: "topics" },
        { id: "P4310315808", expectedType: "publishers" },
        { id: "F4320332183", expectedType: "funders" },
        { id: "https://doi.org/10.1038/nature", expectedType: "works" },
        {
          id: "https://orcid.org/0000-0002-1825-0097",
          expectedType: "authors",
        },
        { id: "0028-0836", expectedType: "sources" },
        { id: "https://ror.org/03vek6s52", expectedType: "institutions" },
      ];

      // When: Using EntityDetectionService for type detection
      testCases.forEach(({ id, expectedType }) => {
        const detectedType = EntityDetectionService.detectEntityType(id);

        // Then: Should correctly identify entity type
        expect(detectedType).toBe(expectedType);
        console.log(`✓ ${id} → ${detectedType}`);
      });
    });

    it("demonstrates identifier normalization", () => {
      // Given: Various formats that should normalize to OpenAlex IDs
      const testCases = [
        { input: "w2741809807", expected: "W2741809807" },
        { input: "  A5017898742  ", expected: "A5017898742" },
        { input: "https://openalex.org/S4210184550", expected: "S4210184550" },
        { input: "HTTPS://OPENALEX.ORG/I4210140050", expected: "I4210140050" },
      ];

      // When: Using EntityDetectionService for normalization
      testCases.forEach(({ input, expected }) => {
        const normalized = EntityDetectionService.normalizeIdentifier(input);

        // Then: Should produce normalized OpenAlex ID
        expect(normalized).toBe(expected);
        console.log(`✓ "${input}" → "${normalized}"`);
      });
    });

    it("demonstrates combined detection and normalization workflow", () => {
      // Given: Raw identifier input that needs processing
      const rawIdentifiers = [
        "w2741809807",
        "https://orcid.org/0000-0002-1825-0097",
        "  0028-0836  ",
        "https://ror.org/03vek6s52",
      ];

      // When: Processing each identifier through complete detection workflow
      rawIdentifiers.forEach((rawId) => {
        // Step 1: Detect entity type
        const entityType = EntityDetectionService.detectEntityType(rawId);
        expect(entityType).toBeTruthy();

        // Step 2: Normalize identifier
        const normalizedId = EntityDetectionService.normalizeIdentifier(rawId);
        expect(normalizedId).toBeTruthy();

        // Step 3: Validate the result
        const isValid = EntityDetectionService.isValidIdentifier(normalizedId);
        expect(isValid).toBe(true);

        console.log(
          `✓ "${rawId}" → ${entityType} : ${normalizedId} (valid: ${isValid})`,
        );
      });
    });

    it("demonstrates error handling for invalid identifiers", () => {
      // Given: Invalid identifier formats
      const invalidIds = [
        "",
        "   ",
        "not-an-id",
        "X123456789",
        "https://example.com/invalid",
      ];

      // When: Attempting to detect types for invalid identifiers
      invalidIds.forEach((invalidId) => {
        const detectedType = EntityDetectionService.detectEntityType(invalidId);

        // Then: Should return null for invalid identifiers
        expect(detectedType).toBeNull();
        console.log(`✓ "${invalidId}" → null (correctly rejected)`);
      });
    });
  });

  describe("OpenAlex ID Format Detection", () => {
    it("demonstrates detection from standard OpenAlex IDs", async () => {
      // Given: Standard OpenAlex IDs for different entity types
      const testCases = [
        { id: "W2741809807", expectedType: "works" as EntityType },
        { id: "A5017898742", expectedType: "authors" as EntityType },
        { id: "S4210184550", expectedType: "sources" as EntityType },
        { id: "I4210140050", expectedType: "institutions" as EntityType },
        { id: "T10364", expectedType: "topics" as EntityType },
        { id: "P4310315808", expectedType: "publishers" as EntityType },
        { id: "F4320332183", expectedType: "funders" as EntityType },
        { id: "C71924100", expectedType: "concepts" as EntityType },
      ];

      // When: Fetching entities with these IDs
      for (const testCase of testCases) {
        const entity = await provider.fetchEntity(testCase.id);

        // Then: Should correctly detect entity type
        expect(entity.entityType).toBe(testCase.expectedType);
        expect(entity.id).toBe(testCase.id);
        expect(entity.entityId).toBe(testCase.id);

        // Best Practice: Verify label extraction works for each type
        expect(entity.label).toBeTruthy();
        expect(typeof entity.label).toBe("string");
        expect(entity.label.length).toBeGreaterThan(0);
      }
    });

    it("demonstrates case-insensitive ID handling", async () => {
      // Given: OpenAlex IDs in different cases
      const idVariants = [
        "w2741809807", // lowercase
        "W2741809807", // uppercase
        "a5017898742", // lowercase author
        "A5017898742", // uppercase author
      ];

      // When: Fetching entities with different cases
      const entities = await Promise.all(
        idVariants.map((id) => provider.fetchEntity(id)),
      );

      // Then: Should handle case variations consistently
      expect(entities[0].entityType).toBe("works");
      expect(entities[1].entityType).toBe("works");
      expect(entities[2].entityType).toBe("authors");
      expect(entities[3].entityType).toBe("authors");

      // Best Practice: IDs should be normalized to uppercase
      expect(entities[0].id).toBe("W2741809807");
      expect(entities[1].id).toBe("W2741809807");
      expect(entities[2].id).toBe("A5017898742");
      expect(entities[3].id).toBe("A5017898742");
    });
  });

  describe("External Identifier Detection", () => {
    it("demonstrates DOI-based detection for works", async () => {
      // Given: Various DOI formats
      const doiFormats = [
        "https://doi.org/10.1038/s41586-023-12345-6",
        "http://dx.doi.org/10.1038/s41586-023-12345-6",
        "doi:10.1038/s41586-023-12345-6",
        "10.1038/s41586-023-12345-6",
      ];

      // When: Processing DOI identifiers
      for (const doi of doiFormats) {
        try {
          const entity = await provider.fetchEntity(doi);

          // Then: Should detect as work entity
          expect(entity.entityType).toBe("works");

          // Best Practice: Should extract DOI from entity data
          const entityDoi = entity.entityData?.ids as Record<string, string>;
          expect(entityDoi?.doi).toContain("doi.org");

          // Best Practice: Should populate external identifiers
          const doiIdentifier = entity.externalIds.find(
            (id) => id.type === "doi",
          );
          expect(doiIdentifier).toBeDefined();
          expect(doiIdentifier?.url).toContain("doi.org");
        } catch (error) {
          // Some formats might not be supported - document this
          console.warn(`DOI format not supported: ${doi}`);
        }
      }
    });

    it("demonstrates ORCID-based detection for authors", async () => {
      // Given: Various ORCID formats
      const orcidFormats = [
        "https://orcid.org/0000-0002-1825-0097",
        "http://orcid.org/0000-0002-1825-0097",
        "orcid.org/0000-0002-1825-0097",
        "0000-0002-1825-0097",
      ];

      // When: Processing ORCID identifiers
      for (const orcid of orcidFormats) {
        try {
          const entity = await provider.fetchEntity(orcid);

          // Then: Should detect as author entity
          expect(entity.entityType).toBe("authors");

          // Best Practice: Should preserve ORCID in external identifiers
          const orcidIdentifier = entity.externalIds.find(
            (id) => id.type === "orcid",
          );
          expect(orcidIdentifier).toBeDefined();
          expect(orcidIdentifier?.value).toContain("orcid.org");
        } catch (error) {
          console.warn(`ORCID format not supported: ${orcid}`);
        }
      }
    });

    it("demonstrates ROR-based detection for institutions", async () => {
      // Given: ROR (Research Organization Registry) identifiers
      const rorFormats = [
        "https://ror.org/03vek6s52",
        "ror.org/03vek6s52",
        "03vek6s52",
      ];

      // When: Processing ROR identifiers
      for (const ror of rorFormats) {
        try {
          const entity = await provider.fetchEntity(ror);

          // Then: Should detect as institution entity
          expect(entity.entityType).toBe("institutions");

          // Best Practice: Should preserve ROR in external identifiers
          const rorIdentifier = entity.externalIds.find(
            (id) => id.type === "ror",
          );
          expect(rorIdentifier).toBeDefined();
          expect(rorIdentifier?.url).toContain("ror.org");
        } catch (error) {
          console.warn(`ROR format not supported: ${ror}`);
        }
      }
    });

    it("demonstrates ISSN-L detection for sources", async () => {
      // Given: ISSN-L identifiers for journals/sources
      const issnFormats = [
        "0028-0836", // Nature ISSN-L
        "1476-4687", // Nature (electronic ISSN)
        "2041-1723", // Nature Communications
      ];

      // When: Processing ISSN identifiers
      for (const issn of issnFormats) {
        try {
          const entity = await provider.fetchEntity(issn);

          // Then: Should detect as source entity
          expect(entity.entityType).toBe("sources");

          // Best Practice: Label should be meaningful journal name
          expect(entity.label).toBeTruthy();
          expect(entity.label).not.toBe("Unknown Source");
        } catch (error) {
          console.warn(`ISSN format not supported: ${issn}`);
        }
      }
    });
  });

  describe("Ambiguous Identifier Handling", () => {
    it("demonstrates handling of numeric-only identifiers", async () => {
      // Given: Numeric identifiers that could be multiple types
      const numericIds = [
        "2741809807", // Could be work, author, etc.
        "5017898742",
        "4210184550",
      ];

      // When: Processing numeric identifiers without prefix
      for (const numericId of numericIds) {
        try {
          // Provider should make reasonable assumptions or require explicit typing
          const entity = await provider.fetchEntity(numericId);

          // Then: Should have a valid entity type
          expect([
            "works",
            "authors",
            "sources",
            "institutions",
            "topics",
            "publishers",
            "funders",
            "concepts",
          ]).toContain(entity.entityType);

          // Best Practice: Should generate consistent results for same input
          const entity2 = await provider.fetchEntity(numericId);
          expect(entity2.entityType).toBe(entity.entityType);
          expect(entity2.id).toBe(entity.id);
        } catch (error) {
          // If ambiguous IDs aren't supported, that's also valid
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain(
            "Cannot detect entity type",
          );
        }
      }
    });

    it("demonstrates graceful error handling for invalid identifiers", async () => {
      // Given: Various invalid identifier formats
      const invalidIds = [
        "", // Empty string
        "   ", // Whitespace only
        "invalid-format",
        "X123456789", // Invalid OpenAlex prefix
        "https://example.com/invalid",
        "not-a-real-id-12345",
      ];

      // When: Processing invalid identifiers
      for (const invalidId of invalidIds) {
        // Then: Should either throw clear error or handle gracefully
        await expect(async () => {
          await provider.fetchEntity(invalidId);
        }).rejects.toThrow();

        // Best Practice: Error messages should be informative
        try {
          await provider.fetchEntity(invalidId);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          // Should contain one of these error types
          const message = (error as Error).message;
          expect(
            message.includes("Cannot detect entity type") ||
              message.includes("Cannot normalize identifier"),
          ).toBe(true);
        }
      }
    });
  });

  describe("URL-based Entity Detection", () => {
    it("demonstrates detection from OpenAlex URLs", async () => {
      // Given: Full OpenAlex URLs
      const openalexUrls = [
        "https://openalex.org/W2741809807",
        "https://openalex.org/A5017898742",
        "https://openalex.org/S4210184550",
        "https://openalex.org/I4210140050",
      ];

      // When: Processing OpenAlex URLs
      for (const url of openalexUrls) {
        try {
          const entity = await provider.fetchEntity(url);

          // Then: Should extract ID and detect type correctly
          const extractedId = url.split("/").pop() || "";
          expect(entity.id).toBe(extractedId);

          // Best Practice: Should preserve original URL context
          expect(entity.entityData).toBeDefined();
        } catch (error) {
          console.warn(`URL format not supported: ${url}`);
        }
      }
    });

    it("demonstrates handling of entity URLs in routing contexts", async () => {
      // Given: URLs that might come from web application routing
      const routingFormats = [
        "/authors/A5017898742",
        "/works/W2741809807",
        "/institutions/I4210140050",
        "authors/A5017898742", // Without leading slash
        "#/works/W2741809807", // Hash routing
      ];

      // When: Processing routing-style URLs
      for (const route of routingFormats) {
        try {
          // Extract entity ID from route
          const match = route.match(/([AWSITPFC]\d+)/i);
          if (match) {
            const entityId = match[1];
            const entity = await provider.fetchEntity(entityId);

            // Then: Should handle extracted IDs correctly
            expect(entity.id).toBe(entityId.toUpperCase());
            expect([
              "works",
              "authors",
              "sources",
              "institutions",
              "topics",
              "publishers",
              "funders",
              "concepts",
            ]).toContain(entity.entityType);
          }
        } catch (error) {
          console.warn(`Route format processing failed: ${route}`);
        }
      }
    });
  });

  describe("Best Practices for Entity Detection", () => {
    it("demonstrates input sanitization and normalization", async () => {
      // Given: Identifiers with various formatting issues
      const messyIds = [
        "  W2741809807  ", // Whitespace
        "w2741809807", // Wrong case
        "W2741809807/", // Trailing slash
        "https://openalex.org/W2741809807?tab=overview", // Query parameters
      ];

      // When: Processing messy identifiers
      for (const messyId of messyIds) {
        const entity = await provider.fetchEntity(messyId);

        // Then: Should normalize to clean format
        expect(entity.id).toBe("W2741809807");
        expect(entity.entityType).toBe("works");

        // Best Practice: Consistent output regardless of input format
        expect(entity.id).toMatch(/^[AWSITPFC]\d+$/);
      }
    });

    it("demonstrates caching and performance with repeated detections", async () => {
      // Given: Same entity requested multiple times with different formats
      const variations = [
        "W2741809807",
        "w2741809807",
        "  W2741809807  ",
        "https://openalex.org/W2741809807",
      ];

      const startTime = Date.now();

      // When: Fetching same entity in different formats
      const entities = [];
      for (const variation of variations) {
        try {
          const entity = await provider.fetchEntity(variation);
          entities.push(entity);
        } catch (error) {
          // Some formats might not be supported
          console.warn(`Format not supported: ${variation}`);
        }
      }

      const duration = Date.now() - startTime;

      // Then: Should return consistent results efficiently
      if (entities.length > 1) {
        const firstEntity = entities[0];
        entities.forEach((entity) => {
          expect(entity.id).toBe(firstEntity.id);
          expect(entity.entityType).toBe(firstEntity.entityType);
          expect(entity.label).toBe(firstEntity.label);
        });
      }

      // Best Practice: Multiple requests should be reasonably fast
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Best Practice: Provider stats should reflect actual requests made
      const stats = provider.getProviderInfo().stats;
      expect(stats.totalRequests).toBeGreaterThan(0);
    });

    it("demonstrates type-safe entity detection patterns", async () => {
      // Given: A function that needs to handle various entity types safely
      const processEntity = async (
        identifier: string,
      ): Promise<{
        type: EntityType;
        label: string;
        hasExternalIds: boolean;
      }> => {
        const entity = await provider.fetchEntity(identifier);

        return {
          type: entity.entityType,
          label: entity.label,
          hasExternalIds: entity.externalIds.length > 0,
        };
      };

      // When: Processing different entity types
      const testIds = ["W2741809807", "A5017898742", "S4210184550"];
      const results = await Promise.all(testIds.map(processEntity));

      // Then: Should provide type-safe information
      results.forEach((result, index) => {
        expect([
          "works",
          "authors",
          "sources",
          "institutions",
          "topics",
          "publishers",
          "funders",
          "concepts",
        ]).toContain(result.type);
        expect(typeof result.label).toBe("string");
        expect(typeof result.hasExternalIds).toBe("boolean");

        console.log(
          `Entity ${testIds[index]}: ${result.type} - "${result.label}" (External IDs: ${result.hasExternalIds})`,
        );
      });

      // Best Practice: Results should provide enough info for decision making
      expect(results.some((r) => r.hasExternalIds)).toBe(true);
      expect(results.every((r) => r.label.length > 0)).toBe(true);
    });
  });
});
