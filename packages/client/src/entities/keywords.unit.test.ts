/**
 * Comprehensive unit tests for KeywordsApi entity class
 * Tests all methods including CRUD, search, filtering, and streaming
 */

import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { KeywordsApi, SearchKeywordsOptions } from "./keywords";
import { OpenAlexBaseClient } from "../client";
import type { Keyword, OpenAlexResponse } from "../types";

// Mock the query-builder utility
vi.mock("../utils/query-builder", () => ({
  buildFilterString: vi.fn((filters) => {
    if (!filters || Object.keys(filters).length === 0) {
      return "";
    }
    return Object.entries(filters)
      .map(([key, value]) => `${key}:${value}`)
      .join(",");
  }),
}));

// Mock the base client
vi.mock("../client");

describe("KeywordsApi", () => {
  let keywordsApi: KeywordsApi;
  let mockClient: Mocked<OpenAlexBaseClient>;

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

    keywordsApi = new KeywordsApi(mockClient);
  });

  describe("getKeyword", () => {
    it("should fetch a single keyword by ID", async () => {
      const mockKeyword: Partial<Keyword> = {
        id: "K123456789",
        display_name: "machine learning",
        works_count: 50000,
        cited_by_count: 250000,
      };

      mockClient.getById.mockResolvedValue(mockKeyword as Keyword);

      const result = await keywordsApi.getKeyword("K123456789");

      expect(mockClient.getById).toHaveBeenCalledWith(
        "keywords",
        "K123456789",
        {},
      );
      expect(result).toEqual(mockKeyword);
    });

    it("should pass additional parameters to client", async () => {
      const mockKeyword: Partial<Keyword> = {
        id: "K123456789",
        display_name: "machine learning",
      };

      const params = { select: ["id", "display_name"] };
      mockClient.getById.mockResolvedValue(mockKeyword as Keyword);

      await keywordsApi.getKeyword("K123456789", params);

      expect(mockClient.getById).toHaveBeenCalledWith(
        "keywords",
        "K123456789",
        params,
      );
    });
  });

  describe("getKeywords", () => {
    it("should fetch keywords without parameters", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await keywordsApi.getKeywords();

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {});
      expect(result).toEqual(mockResponse);
    });

    it("should fetch keywords with parameters", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        filter: "works_count:>100",
        sort: "cited_by_count:desc",
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getKeywords(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", params);
    });
  });

  describe("searchKeywords", () => {
    it("should search keywords with query and default options", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.searchKeywords("machine learning");

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        search: "machine learning",
        filter: "",
        sort: "relevance_score:desc",
        page: 1,
        per_page: 25,
      });
    });

    it("should search keywords with custom options", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      const options: SearchKeywordsOptions = {
        filters: { works_count: ">100" },
        sort: "cited_by_count",
        page: 2,
        per_page: 10,
        select: ["id", "display_name", "works_count"],
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.searchKeywords("neural networks", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        search: "neural networks",
        filter: "works_count:>100",
        sort: "cited_by_count",
        page: 2,
        per_page: 10,
        select: ["id", "display_name", "works_count"],
      });
    });

    it("should handle empty filters", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: SearchKeywordsOptions = {
        filters: {},
        sort: "works_count",
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.searchKeywords("ai", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        search: "ai",
        filter: "",
        sort: "works_count",
        page: 1,
        per_page: 25,
        select: undefined,
      });
    });
  });

  describe("getKeywordsByWorksCount", () => {
    it("should fetch keywords by minimum works count", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getKeywordsByWorksCount(100);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        filter: "works_count:>=100",
      });
    });

    it("should merge with additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      const params = {
        sort: "works_count" as const,
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getKeywordsByWorksCount(500, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        ...params,
        filter: "works_count:>=500",
      });
    });
  });

  describe("getRandomKeywords", () => {
    it("should fetch random keywords", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getRandomKeywords();

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        sort: "random",
      });
    });

    it("should include additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      const params = {
        per_page: 10,
        select: ["id", "display_name", "works_count"],
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getRandomKeywords(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        ...params,
        sort: "random",
      });
    });
  });

  describe("streamKeywords", () => {
    it("should stream keywords", async () => {
      const mockGenerator = async function* () {
        yield [{ id: "K1" }, { id: "K2" }] as Keyword[];
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = keywordsApi.streamKeywords();
      const result = await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith("keywords", {});
      expect(result.done).toBe(false);
      expect(result.value).toEqual([{ id: "K1" }, { id: "K2" }]);
    });

    it("should stream keywords with parameters", async () => {
      const mockGenerator = async function* () {
        yield [{ id: "K1" }] as Keyword[];
      };

      const params = {
        filter: "works_count:>10",
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = keywordsApi.streamKeywords(params);
      await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith("keywords", params);
    });
  });

  describe("getAllKeywords", () => {
    it("should get all keywords", async () => {
      const mockKeywords = [
        { id: "K1", display_name: "Keyword 1" },
        { id: "K2", display_name: "Keyword 2" },
      ] as Keyword[];

      mockClient.getAll.mockResolvedValue(mockKeywords);

      const result = await keywordsApi.getAllKeywords();

      expect(mockClient.getAll).toHaveBeenCalledWith("keywords", {}, undefined);
      expect(result).toEqual(mockKeywords);
    });

    it("should get all keywords with parameters and max results", async () => {
      const mockKeywords = [
        { id: "K1", display_name: "Keyword 1" },
      ] as Keyword[];

      const params = {
        filter: "works_count:>1000",
      };

      mockClient.getAll.mockResolvedValue(mockKeywords);

      await keywordsApi.getAllKeywords(params, 500);

      expect(mockClient.getAll).toHaveBeenCalledWith("keywords", params, 500);
    });
  });

  describe("getKeywordsStats", () => {
    it("should calculate keywords statistics", async () => {
      const mockInitialResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 1000,
          db_response_time_ms: 50,
          page: 1,
          per_page: 1,
        },
      };

      const mockSampleResponse: OpenAlexResponse<Keyword> = {
        results: [
          {
            id: "K1",
            display_name: "AI",
            works_count: 100,
            cited_by_count: 500,
          },
          {
            id: "K2",
            display_name: "ML",
            works_count: 200,
            cited_by_count: 800,
          },
        ] as Keyword[],
        meta: {
          count: 1000,
          db_response_time_ms: 50,
          page: 1,
          per_page: 2,
        },
      };

      mockClient.getResponse
        .mockResolvedValueOnce(mockInitialResponse)
        .mockResolvedValueOnce(mockSampleResponse);

      const result = await keywordsApi.getKeywordsStats();

      expect(mockClient.getResponse).toHaveBeenCalledTimes(2);
      expect(mockClient.getResponse).toHaveBeenNthCalledWith(1, "keywords", {
        per_page: 1,
      });
      expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "keywords", {
        per_page: 1000,
      });

      expect(result).toEqual({
        count: 1000,
        total_works: 300,
        total_citations: 1300,
        avg_works_per_keyword: 150,
        avg_citations_per_keyword: 650,
      });
    });

    it("should limit sample size for large datasets", async () => {
      const mockInitialResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 5000,
          db_response_time_ms: 50,
          page: 1,
          per_page: 1,
        },
      };

      const mockSampleResponse: OpenAlexResponse<Keyword> = {
        results: [
          {
            id: "K1",
            display_name: "AI",
            works_count: 100,
            cited_by_count: 500,
          },
        ] as Keyword[],
        meta: {
          count: 5000,
          db_response_time_ms: 50,
          page: 1,
          per_page: 1000,
        },
      };

      mockClient.getResponse
        .mockResolvedValueOnce(mockInitialResponse)
        .mockResolvedValueOnce(mockSampleResponse);

      await keywordsApi.getKeywordsStats();

      expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "keywords", {
        per_page: 1000,
      });
    });

    it("should include additional parameters in stats calculation", async () => {
      const mockInitialResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 100,
          db_response_time_ms: 50,
          page: 1,
          per_page: 1,
        },
      };

      const mockSampleResponse: OpenAlexResponse<Keyword> = {
        results: [
          {
            id: "K1",
            display_name: "AI",
            works_count: 100,
            cited_by_count: 500,
          },
        ] as Keyword[],
        meta: {
          count: 100,
          db_response_time_ms: 50,
          page: 1,
          per_page: 100,
        },
      };

      const params = {
        filter: "works_count:>50",
      };

      mockClient.getResponse
        .mockResolvedValueOnce(mockInitialResponse)
        .mockResolvedValueOnce(mockSampleResponse);

      await keywordsApi.getKeywordsStats(params);

      expect(mockClient.getResponse).toHaveBeenNthCalledWith(1, "keywords", {
        ...params,
        per_page: 1,
      });
      expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "keywords", {
        ...params,
        per_page: 100,
      });
    });
  });

  describe("getTrendingKeywords", () => {
    it("should get trending keywords for year range", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getTrendingKeywords(2020, 2023);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        filter:
          "from_created_date:2020-01-01,to_created_date:2023-12-31,works_count:>10",
        sort: "works_count",
      });
    });

    it("should use current year as default end year", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const currentYear = new Date().getFullYear();
      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getTrendingKeywords(2020);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        filter: `from_created_date:2020-01-01,to_created_date:${String(currentYear)}-12-31,works_count:>10`,
        sort: "works_count",
      });
    });

    it("should merge with additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 20,
        },
      };

      const params = {
        per_page: 20,
        select: ["id", "display_name", "works_count"],
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getTrendingKeywords(2020, 2023, params);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        ...params,
        filter:
          "from_created_date:2020-01-01,to_created_date:2023-12-31,works_count:>10",
        sort: "works_count",
      });
    });
  });

  describe("getHighlyCitedKeywords", () => {
    it("should get highly cited keywords", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getHighlyCitedKeywords();

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        filter: "cited_by_count:>1000",
        sort: "cited_by_count",
      });
    });

    it("should merge with additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Keyword> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const params = {
        per_page: 25,
        select: ["id", "display_name", "cited_by_count", "works_count"],
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await keywordsApi.getHighlyCitedKeywords(params);

      expect(mockClient.getResponse).toHaveBeenCalledWith("keywords", {
        ...params,
        filter: "cited_by_count:>1000",
        sort: "cited_by_count",
      });
    });
  });
});
