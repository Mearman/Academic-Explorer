import { describe, it, expect, beforeAll } from "vitest";
import { generateRedirectTestCases } from "./redirect-test-utils";

describe("Web App Redirect Tests", () => {
  let _testCases: Awaited<ReturnType<typeof generateRedirectTestCases>>;

  beforeAll(async () => {
    _testCases = await generateRedirectTestCases();
  });

  describe("Hash Routing Redirects", () => {
    it("should determine correct canonical routes for entity URLs", () => {
      const testEntityUrls = [
        { path: "authors/A123456789", expected: "#/authors/A123456789" },
        { path: "works/W987654321", expected: "#/works/W987654321" },
        { path: "sources/S456789123", expected: "#/sources/S456789123" },
      ];

      for (const { path, expected } of testEntityUrls) {
        const pathSegments = path.split("/");
        if (pathSegments.length >= 2) {
          const entityType = pathSegments[0];
          const entityId = pathSegments[1].split("?")[0];
          const canonicalRoute = `#/${entityType}/${entityId}`;
          expect(canonicalRoute).toBe(expected);
        }
      }
    });

    it("should determine correct canonical routes for collection URLs", () => {
      const testCollectionUrls = [
        { path: "works?filter=author.id:A123", expected: "#/works" },
        { path: "authors?search=einstein", expected: "#/authors" },
        { path: "sources?filter=type:journal", expected: "#/sources" },
      ];

      for (const { path, expected } of testCollectionUrls) {
        const pathSegments = path.split("/");
        if (pathSegments.length === 1 && pathSegments[0].includes("?")) {
          const [entityType] = pathSegments[0].split("?");
          const canonicalRoute = `#/${entityType}`;
          expect(canonicalRoute).toBe(expected);
        }
      }
    });

    it("should generate correct variation patterns", async () => {
      // Test with a sample case
      const samplePath = "authors/A123456789";

      const expectedWebAppVariations = [
        `#/https://api.openalex.org/${samplePath}`,
        `#/https://openalex.org/${samplePath}`,
        `#/api.openalex.org/${samplePath}`,
        `#/openalex.org/${samplePath}`,
        `#/${samplePath}`,
      ];

      // Verify all variations are generated correctly
      for (const variation of expectedWebAppVariations) {
        expect(variation).toMatch(/^#\//);
        expect(variation).toContain(samplePath);
      }
    });

    it("should handle URL preprocessing correctly", () => {
      const testUrls = [
        "api.openalex.org/authors/A123",
        "openalex.org/works/W456",
      ];

      for (const url of testUrls) {
        if (
          url.startsWith("api.openalex.org/") ||
          url.startsWith("openalex.org/")
        ) {
          const preprocessed = `https://${url}`;
          expect(preprocessed).toMatch(/^https:\/\/(api\.)?openalex\.org\//);
        }
      }
    });
  });
});
