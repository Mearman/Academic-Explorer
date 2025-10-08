/**
 * Comprehensive unit tests for ConceptsApi entity class
 * Tests Wikidata ID resolution functionality
 */

import { beforeEach, describe, expect, it, vi, type Mocked } from "vitest";
import { OpenAlexBaseClient } from "../client";
import type { Concept } from "../types";
import { ConceptsApi } from "./concepts";

// Mock the base client
vi.mock("../client");

// Mock the ID resolver utilities
vi.mock("../utils/id-resolver", () => ({
  isValidWikidata: vi.fn((id: string) => {
    // Mock implementation that recognizes various Wikidata formats
    return (
      /^Q\d+$/.test(id) ||
      id.startsWith("wikidata:Q") ||
      id.includes("wikidata.org/wiki/Q") ||
      id.includes("wikidata.org/entity/Q")
    );
  }),
  normalizeExternalId: vi.fn((id: string, type: string) => {
    if (type !== "wikidata") return null;

    // Extract Q number from various formats
    if (/^Q\d+$/.test(id)) return id; // Already Q format
    if (id.startsWith("wikidata:")) return id.replace("wikidata:", "");

    const urlMatch = id.match(/wikidata\.org\/(?:wiki|entity)\/(Q\d+)/);
    if (urlMatch) return urlMatch[1];

    return null;
  }),
}));

let conceptsApi: ConceptsApi;
let mockClient: Mocked<OpenAlexBaseClient>;

describe("getConcept - Wikidata ID support", () => {
  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      getResponse: vi.fn(),
      getById: vi.fn(),
      stream: vi.fn(),
      getAll: vi.fn(),
      updateConfig: vi.fn(),
      getRateLimitStatus: vi.fn(),
    } as unknown as Mocked<OpenAlexBaseClient>;

    conceptsApi = new ConceptsApi(mockClient);
  });

  it("should fetch a single concept by OpenAlex ID", async () => {
    const mockConcept: Partial<Concept> = {
      id: "C71924100",
      display_name: "Medicine",
      level: 0,
      works_count: 100000,
      cited_by_count: 500000,
    };

    mockClient.getById.mockResolvedValue(mockConcept as Concept);

    const result = await conceptsApi.getConcept("C71924100");

    expect(mockClient.getById).toHaveBeenCalledWith(
      "concepts",
      "C71924100",
      {},
    );
    expect(result).toEqual(mockConcept);
  });

  it("should handle Wikidata ID in Q format", async () => {
    const mockConcept: Partial<Concept> = {
      id: "C71924100",
      display_name: "Medicine",
      level: 0,
    };

    mockClient.getById.mockResolvedValue(mockConcept as Concept);

    const result = await conceptsApi.getConcept("Q11190");

    expect(mockClient.getById).toHaveBeenCalledWith(
      "concepts",
      "wikidata:Q11190",
      {},
    );
    expect(result).toEqual(mockConcept);
  });

  it("should handle Wikidata ID in wikidata: format", async () => {
    const mockConcept: Partial<Concept> = {
      id: "C71924100",
      display_name: "Computer Science",
      level: 0,
    };

    mockClient.getById.mockResolvedValue(mockConcept as Concept);

    const result = await conceptsApi.getConcept("wikidata:Q11190");

    expect(mockClient.getById).toHaveBeenCalledWith(
      "concepts",
      "wikidata:Q11190",
      {},
    );
    expect(result).toEqual(mockConcept);
  });

  it("should handle Wikidata URL wiki format", async () => {
    const mockConcept: Partial<Concept> = {
      id: "C71924100",
      display_name: "Biology",
      level: 0,
    };

    mockClient.getById.mockResolvedValue(mockConcept as Concept);

    const result = await conceptsApi.getConcept(
      "https://www.wikidata.org/wiki/Q11190",
    );

    expect(mockClient.getById).toHaveBeenCalledWith(
      "concepts",
      "wikidata:Q11190",
      {},
    );
    expect(result).toEqual(mockConcept);
  });

  it("should handle Wikidata URL entity format", async () => {
    const mockConcept: Partial<Concept> = {
      id: "C71924100",
      display_name: "Physics",
      level: 0,
    };

    mockClient.getById.mockResolvedValue(mockConcept as Concept);

    const result = await conceptsApi.getConcept(
      "https://www.wikidata.org/entity/Q11190",
    );

    expect(mockClient.getById).toHaveBeenCalledWith(
      "concepts",
      "wikidata:Q11190",
      {},
    );
    expect(result).toEqual(mockConcept);
  });

  it("should handle Wikidata ID with parameters", async () => {
    const mockConcept: Partial<Concept> = {
      id: "C71924100",
      display_name: "Chemistry",
      level: 0,
    };

    const params = { select: ["id", "display_name", "level"] };
    mockClient.getById.mockResolvedValue(mockConcept as Concept);

    const result = await conceptsApi.getConcept("Q11190", params);

    expect(mockClient.getById).toHaveBeenCalledWith(
      "concepts",
      "wikidata:Q11190",
      params,
    );
    expect(result).toEqual(mockConcept);
  });

  it("should fall back to original ID for invalid Wikidata format", async () => {
    const mockConcept: Partial<Concept> = {
      id: "C71924100",
      display_name: "Test Concept",
      level: 0,
    };

    mockClient.getById.mockResolvedValue(mockConcept as Concept);

    const result = await conceptsApi.getConcept("Q-invalid");

    // Should use original ID since Q-invalid is not a valid Wikidata format
    expect(mockClient.getById).toHaveBeenCalledWith(
      "concepts",
      "Q-invalid",
      {},
    );
    expect(result).toEqual(mockConcept);
  });

  it("should throw error for empty ID", async () => {
    await expect(conceptsApi.getConcept("")).rejects.toThrow(
      "Concept ID must be a non-empty string",
    );
  });

  it("should throw error for non-string ID", async () => {
    await expect(
      conceptsApi.getConcept(null as unknown as string),
    ).rejects.toThrow("Concept ID must be a non-empty string");
  });
});

// Additional comprehensive test coverage for various Wikidata formats
describe("comprehensive Wikidata ID support", () => {
  const validWikidataFormats = [
    { input: "Q42", expected: "wikidata:Q42", description: "simple Q ID" },
    {
      input: "Q1234567890",
      expected: "wikidata:Q1234567890",
      description: "long Q ID",
    },
    {
      input: "wikidata:Q42",
      expected: "wikidata:Q42",
      description: "already prefixed",
    },
    {
      input: "https://www.wikidata.org/wiki/Q42",
      expected: "wikidata:Q42",
      description: "wiki URL",
    },
    {
      input: "https://www.wikidata.org/entity/Q42",
      expected: "wikidata:Q42",
      description: "entity URL",
    },
  ];

  validWikidataFormats.forEach(({ input, expected, description }) => {
    it(`should normalize ${description}: ${input} -> ${expected}`, async () => {
      const mockConcept: Partial<Concept> = {
        id: "C71924100",
        display_name: "Test Concept",
        level: 0,
      };

      mockClient.getById.mockResolvedValue(mockConcept as Concept);

      await conceptsApi.getConcept(input);

      expect(mockClient.getById).toHaveBeenCalledWith("concepts", expected, {});
    });
  });

  const invalidFormats = [
    "Q", // No number
    "Q-123", // Invalid character
    "Q123.456", // Decimal point
    "Q123abc", // Letters after number
    "P123", // P instead of Q
    "123", // No Q prefix
    "", // Empty string
    "   ", // Whitespace only
  ];

  invalidFormats.forEach((invalidId) => {
    if (invalidId.trim() === "") {
      // Skip empty/whitespace tests since they throw errors
      return;
    }

    it(`should pass through invalid Wikidata format: "${invalidId}"`, async () => {
      const mockConcept: Partial<Concept> = {
        id: "C71924100",
        display_name: "Test Concept",
        level: 0,
      };

      mockClient.getById.mockResolvedValue(mockConcept as Concept);

      await conceptsApi.getConcept(invalidId);

      // Should use original ID since it's not valid Wikidata format
      expect(mockClient.getById).toHaveBeenCalledWith(
        "concepts",
        invalidId,
        {},
      );
    });
  });
});
