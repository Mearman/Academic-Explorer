/**
 * Test static data integration with rate-limited OpenAlex client
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimitedOpenAlex } from "@/lib/openalex/rate-limited-client";
import { staticDataProvider } from "./static-data-provider";

// Mock the static data provider
vi.mock("./static-data-provider", () => ({
  staticDataProvider: {
    getEntity: vi.fn(),
    hasEntity: vi.fn(),
    getStatistics: vi.fn(),
    clearCache: vi.fn(),
    getCacheStats: vi.fn(),
  }
}));

// Mock the underlying OpenAlex client (not the rate-limited wrapper)
vi.mock("@/lib/openalex/openalex-client", () => ({
  OpenAlexClient: vi.fn().mockImplementation(() => ({
    getEntity: vi.fn(),
    getWork: vi.fn(),
    getAuthor: vi.fn(),
    getInstitution: vi.fn(),
    getTopic: vi.fn(),
    getPublisher: vi.fn(),
    getFunder: vi.fn(),
    detectEntityType: vi.fn(),
    isValidOpenAlexId: vi.fn(),
  }))
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
  }
}));

describe("Rate-Limited OpenAlex Client with Static Data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getEntity", () => {
    it("should return static data when available", async () => {
      const mockWork = {
        id: "https://openalex.org/W2250748100",
        display_name: "Alternative Representations of 3D-Reconstructed Heritage Data",
        publication_year: 2015
      };

      // Mock static data provider to return the work
      vi.mocked(staticDataProvider.getEntity).mockResolvedValue(mockWork);

      const result = await rateLimitedOpenAlex.getEntity("W2250748100");

      expect(result).toEqual(mockWork);
      expect(staticDataProvider.getEntity).toHaveBeenCalledWith("works", "W2250748100");
      // Static data should be called but API should not be needed
    });

    it("should fallback to API when static data not available", async () => {
      const mockWork = {
        id: "https://openalex.org/W9999999999",
        display_name: "Some API Work",
        publication_year: 2023
      };

      // Mock static data provider to return null (not found)
      vi.mocked(staticDataProvider.getEntity).mockResolvedValue(null);
      // The underlying client will be called by the rate-limited client

      const result = await rateLimitedOpenAlex.getEntity("W9999999999");

      expect(result).toEqual(mockWork);
      expect(staticDataProvider.getEntity).toHaveBeenCalledWith("works", "W9999999999");
      // Should have fallen back to API client after static data failed
    });
  });

  describe("getWork", () => {
    it("should return static work when no params provided", async () => {
      const mockWork = {
        id: "https://openalex.org/W2250748100",
        display_name: "Alternative Representations of 3D-Reconstructed Heritage Data",
        publication_year: 2015
      };

      // Mock static data provider to return the work
      vi.mocked(staticDataProvider.getEntity).mockResolvedValue(mockWork);

      const result = await rateLimitedOpenAlex.getWork("W2250748100");

      expect(result).toEqual(mockWork);
      expect(staticDataProvider.getEntity).toHaveBeenCalledWith("works", "W2250748100");
      // Static data should be used, API should not be needed
    });

    it("should skip static data when params are provided", async () => {
      const mockWork = {
        id: "https://openalex.org/W2250748100",
        display_name: "Alternative Representations of 3D-Reconstructed Heritage Data",
        publication_year: 2015
      };

      vi.mocked(rateLimitedOpenAlex.getWork).mockResolvedValue(mockWork);

      await rateLimitedOpenAlex.getWork("W2250748100", { select: "id,display_name" });

      expect(staticDataProvider.getEntity).not.toHaveBeenCalled();
      // Should have called API directly due to params
    });
  });

  describe("getAuthor", () => {
    it("should return static author when available", async () => {
      const mockAuthor = {
        id: "https://openalex.org/A5017898742",
        display_name: "Joseph Mearman",
        works_count: 9
      };

      vi.mocked(staticDataProvider.getEntity).mockResolvedValue(mockAuthor);

      const result = await rateLimitedOpenAlex.getAuthor("A5017898742");

      expect(result).toEqual(mockAuthor);
      expect(staticDataProvider.getEntity).toHaveBeenCalledWith("authors", "A5017898742");
    });
  });

  describe("hasStaticEntity", () => {
    it("should check if entity exists in static data", async () => {
      vi.mocked(staticDataProvider.hasEntity).mockResolvedValue(true);

      const result = await rateLimitedOpenAlex.hasStaticEntity("works", "W2250748100");

      expect(result).toBe(true);
      expect(staticDataProvider.hasEntity).toHaveBeenCalledWith("works", "W2250748100");
    });

    it("should return false for unsupported entity types", async () => {
      const result = await rateLimitedOpenAlex.hasStaticEntity("keywords", "K123456");

      expect(result).toBe(false);
      expect(staticDataProvider.hasEntity).not.toHaveBeenCalled();
    });
  });

  describe("getStaticDataStats", () => {
    it("should return static data statistics", async () => {
      const mockStats = {
        authors: { count: 5, totalSize: 141346 },
        works: { count: 9, totalSize: 145000 },
        institutions: null,
        topics: null,
        publishers: null,
        funders: null
      };

      vi.mocked(staticDataProvider.getStatistics).mockResolvedValue(mockStats);

      const result = await rateLimitedOpenAlex.getStaticDataStats();

      expect(result).toEqual(mockStats);
      expect(staticDataProvider.getStatistics).toHaveBeenCalled();
    });
  });

  describe("clearStaticCache", () => {
    it("should clear static data cache", () => {
      rateLimitedOpenAlex.clearStaticCache();

      expect(staticDataProvider.clearCache).toHaveBeenCalled();
    });
  });

  describe("ID cleaning", () => {
    it("should clean OpenAlex URLs from IDs", async () => {
      const mockWork = {
        id: "https://openalex.org/W2250748100",
        display_name: "Test Work"
      };

      vi.mocked(rateLimitedOpenAlex.detectEntityType).mockReturnValue("works");
      vi.mocked(staticDataProvider.getEntity).mockResolvedValue(mockWork);

      await rateLimitedOpenAlex.getEntity("https://openalex.org/W2250748100");

      expect(staticDataProvider.getEntity).toHaveBeenCalledWith("works", "W2250748100");
    });
  });
});