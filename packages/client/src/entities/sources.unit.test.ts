/**
 * Comprehensive unit tests for SourcesApi entity class
 * Tests all methods including CRUD, search, filtering, and streaming
 */

import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { SourcesApi } from "./sources";
import { OpenAlexBaseClient } from "../client";
import type { Source, OpenAlexResponse, Work, SourcesFilters } from "../types";

// Mock the base client
vi.mock("../client");

describe("SourcesApi", () => {
  let sourcesApi: SourcesApi;
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

    sourcesApi = new SourcesApi(mockClient);
  });

  describe("getSource", () => {
    it("should fetch a single source by ID", async () => {
      const mockSource: Partial<Source> = {
        id: "S4306400886",
        display_name: "Nature",
        issn_l: "0028-0836",
        is_oa: false,
        type: "journal",
        works_count: 50000,
        cited_by_count: 1000000,
      };

      mockClient.getById.mockResolvedValue(mockSource as Source);

      const result = await sourcesApi.getSource("S4306400886");

      expect(mockClient.getById).toHaveBeenCalledWith(
        "sources",
        "S4306400886",
        {},
      );
      expect(result).toEqual(mockSource);
    });

    it("should pass additional parameters to client", async () => {
      const mockSource: Partial<Source> = {
        id: "S4306400886",
        display_name: "Nature",
      };

      const params = { select: ["id", "display_name"] };
      mockClient.getById.mockResolvedValue(mockSource as Source);

      await sourcesApi.getSource("S4306400886", params);

      expect(mockClient.getById).toHaveBeenCalledWith(
        "sources",
        "S4306400886",
        params,
      );
    });
  });

  describe("getSources", () => {
    it("should fetch sources without filters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await sourcesApi.getSources();

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {});
      expect(result).toEqual(mockResponse);
    });

    it("should fetch sources with filters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: SourcesFilters = {
        is_oa: true,
        type: "journal",
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSources({
        filter: filters,
        sort: "cited_by_count:desc",
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "is_oa:true,type:journal",
        sort: "cited_by_count:desc",
      });
    });

    it("should handle array filter values", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: SourcesFilters = {
        type: ["journal", "conference"],
        is_oa: true,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSources({ filter: filters });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "type:journal|conference,is_oa:true",
      });
    });
  });

  describe("searchSources", () => {
    it("should search sources with query", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.searchSources("nature science");

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        search: "nature science",
        sort: "relevance_score:desc",
      });
    });

    it("should search sources with query and filters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const filters: SourcesFilters = {
        is_oa: true,
        country_code: "US",
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.searchSources("nature science", { filters });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "is_oa:true,country_code:US",
        search: "nature science",
        sort: "relevance_score:desc",
      });
    });

    it("should handle additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.searchSources("nature science", {
        per_page: 50,
        sort: "works_count",
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        search: "nature science",
        per_page: 50,
        sort: "works_count",
      });
    });
  });

  describe("getSourcesByPublisher", () => {
    it("should fetch sources by publisher", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesByPublisher("Springer");

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "publisher:Springer",
        sort: "works_count:desc",
      });
    });

    it("should use custom sort parameter", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesByPublisher("Springer", {
        sort: "cited_by_count:desc",
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "publisher:Springer",
        sort: "cited_by_count:desc",
      });
    });
  });

  describe("getOpenAccessSources", () => {
    it("should fetch open access sources", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getOpenAccessSources();

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "is_oa:true",
        sort: "works_count:desc",
      });
    });

    it("should handle additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getOpenAccessSources({
        sort: "cited_by_count:desc",
        per_page: 100,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "is_oa:true",
        sort: "cited_by_count:desc",
        per_page: 100,
      });
    });
  });

  describe("getSourcesByCountry", () => {
    it("should fetch sources by country", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesByCountry("GB");

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "country_code:GB",
        sort: "works_count:desc",
      });
    });

    it("should merge with existing filters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesByCountry("GB", {
        filter: { type: "journal" },
        sort: "cited_by_count:desc",
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "type:journal,country_code:GB",
        sort: "cited_by_count:desc",
      });
    });
  });

  describe("getSourceWorks", () => {
    it("should fetch works from a source", async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourceWorks("S4306400886");

      expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
        filter: "primary_location.source.id:S4306400886",
      });
    });

    it("should handle additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourceWorks("S4306400886", {
        sort: "cited_by_count:desc",
        per_page: 25,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
        filter: "primary_location.source.id:S4306400886",
        sort: "cited_by_count:desc",
        per_page: 25,
      });
    });
  });

  describe("getSourceStats", () => {
    it("should fetch source statistics with default fields", async () => {
      const mockSource: Partial<Source> = {
        id: "S4306400886",
        display_name: "Nature",
        cited_by_count: 1000000,
        works_count: 50000,
      };

      mockClient.getById.mockResolvedValue(mockSource as Source);

      const result = await sourcesApi.getSourceStats("S4306400886");

      expect(mockClient.getById).toHaveBeenCalledWith(
        "sources",
        "S4306400886",
        {
          select: [
            "id",
            "display_name",
            "cited_by_count",
            "works_count",
            "summary_stats",
            "counts_by_year",
            "is_oa",
            "type",
            "publisher",
            "country_code",
          ],
        },
      );
      expect(result).toEqual(mockSource);
    });

    it("should use custom select fields", async () => {
      const mockSource: Partial<Source> = {
        id: "S4306400886",
        display_name: "Nature",
      };

      mockClient.getById.mockResolvedValue(mockSource as Source);

      await sourcesApi.getSourceStats("S4306400886", {
        select: ["id", "display_name"],
      });

      expect(mockClient.getById).toHaveBeenCalledWith(
        "sources",
        "S4306400886",
        {
          select: ["id", "display_name"],
        },
      );
    });
  });

  describe("getRandomSources", () => {
    it("should fetch random sources", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getRandomSources(50);

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        sample: 50,
        per_page: 50,
      });
    });

    it("should fetch random sources with filters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      const filters: SourcesFilters = {
        is_oa: true,
        type: "journal",
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getRandomSources(50, filters);

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "is_oa:true,type:journal",
        sample: 50,
        per_page: 50,
      });
    });

    it("should include seed parameter when provided", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getRandomSources(50, {}, 42);

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        sample: 50,
        per_page: 50,
        seed: 42,
      });
    });

    it("should throw error for count over 10000", async () => {
      await expect(sourcesApi.getRandomSources(10001)).rejects.toThrow(
        "Random sample size cannot exceed 10,000",
      );
    });
  });

  describe("getDOAJSources", () => {
    it("should fetch DOAJ sources", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getDOAJSources();

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "is_in_doaj:true",
        sort: "works_count:desc",
      });
    });

    it("should handle additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getDOAJSources({
        sort: "cited_by_count:desc",
        per_page: 100,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "is_in_doaj:true",
        sort: "cited_by_count:desc",
        per_page: 100,
      });
    });
  });

  describe("getSourcesByType", () => {
    it("should fetch sources by type", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesByType("conference");

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "type:conference",
        sort: "works_count:desc",
      });
    });

    it("should handle additional parameters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesByType("conference", {
        sort: "cited_by_count:desc",
        per_page: 50,
      });

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "type:conference",
        sort: "cited_by_count:desc",
        per_page: 50,
      });
    });
  });

  describe("getSourcesWithAPC", () => {
    it("should fetch sources with APC range", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesWithAPC(2000, 5000);

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "apc_usd:2000-5000",
        sort: "apc_usd:desc",
      });
    });

    it("should fetch sources with minimum APC only", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesWithAPC(2000);

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "apc_usd:>2000",
        sort: "apc_usd:desc",
      });
    });

    it("should fetch sources with maximum APC only", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesWithAPC(undefined, 3000);

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "apc_usd:<3000",
        sort: "apc_usd:desc",
      });
    });

    it("should fetch all sources when no APC limits provided", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getSourcesWithAPC();

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        sort: "apc_usd:desc",
      });
    });
  });

  describe("getTopCitedSources", () => {
    it("should fetch top cited sources", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getTopCitedSources();

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        sort: "cited_by_count:desc",
        per_page: 25,
      });
    });

    it("should handle custom limit and filters", async () => {
      const mockResponse: OpenAlexResponse<Source> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 50,
        },
      };

      const filters: SourcesFilters = {
        type: "journal",
        is_oa: true,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await sourcesApi.getTopCitedSources(undefined, 50, filters);

      expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
        filter: "type:journal,is_oa:true",
        sort: "cited_by_count:desc",
        per_page: 50,
      });
    });
  });

  describe("streamSources", () => {
    it("should stream sources", async () => {
      const mockGenerator = async function* () {
        yield [{ id: "S1" }, { id: "S2" }] as Source[];
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = sourcesApi.streamSources();
      const result = await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith("sources", {}, 200);
      expect(result.done).toBe(false);
      expect(result.value).toEqual([{ id: "S1" }, { id: "S2" }]);
    });

    it("should stream sources with filters", async () => {
      const mockGenerator = async function* () {
        yield [{ id: "S1" }] as Source[];
      };

      const filters: SourcesFilters = {
        is_oa: true,
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = sourcesApi.streamSources(filters, 100);
      await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith(
        "sources",
        {
          filter: "is_oa:true",
        },
        100,
      );
    });
  });

  describe("ISSN Support", () => {
    const mockResponse: OpenAlexResponse<Source> = {
      results: [],
      meta: {
        count: 0,
        db_response_time_ms: 50,
        page: 1,
        per_page: 25,
      },
    };

    describe("getSource with ISSN detection", () => {
      it("should resolve standard ISSN format via getSource", async () => {
        mockClient.getResponse.mockResolvedValue({
          ...mockResponse,
          results: [
            {
              id: "S4306400886",
              display_name: "Nature",
              issn_l: "0028-0836",
            } as Source,
          ],
        });

        const result = await sourcesApi.getSource("0028-0836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
          per_page: 1,
        });
        expect(result.display_name).toBe("Nature");
      });

      it("should resolve ISSN with prefix via getSource", async () => {
        mockClient.getResponse.mockResolvedValue({
          ...mockResponse,
          results: [
            {
              id: "S4306400886",
              display_name: "Nature",
              issn_l: "0028-0836",
            } as Source,
          ],
        });

        const result = await sourcesApi.getSource("ISSN 0028-0836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
          per_page: 1,
        });
        expect(result.display_name).toBe("Nature");
      });

      it("should resolve ISSN with colon notation via getSource", async () => {
        mockClient.getResponse.mockResolvedValue({
          ...mockResponse,
          results: [
            {
              id: "S4306400886",
              display_name: "Nature",
              issn_l: "0028-0836",
            } as Source,
          ],
        });

        const result = await sourcesApi.getSource("issn:0028-0836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
          per_page: 1,
        });
        expect(result.display_name).toBe("Nature");
      });

      it("should resolve bare 8-digit ISSN via getSource", async () => {
        mockClient.getResponse.mockResolvedValue({
          ...mockResponse,
          results: [
            {
              id: "S4306400886",
              display_name: "Nature",
              issn_l: "0028-0836",
            } as Source,
          ],
        });

        const result = await sourcesApi.getSource("00280836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
          per_page: 1,
        });
        expect(result.display_name).toBe("Nature");
      });

      it("should handle X check digit in ISSN", async () => {
        mockClient.getResponse.mockResolvedValue({
          ...mockResponse,
          results: [
            {
              id: "S137773608",
              display_name: "Nature Communications",
              issn_l: "2041-172X",
            } as Source,
          ],
        });

        const result = await sourcesApi.getSource("issn 2041-172x");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:2041-172X",
          per_page: 1,
        });
        expect(result.display_name).toBe("Nature Communications");
      });

      it("should throw error for invalid ISSN format", async () => {
        await expect(sourcesApi.getSource("issn:invalid")).rejects.toThrow(
          "Invalid ISSN format: issn:invalid",
        );
      });

      it("should throw error when no source found for valid ISSN", async () => {
        mockClient.getResponse.mockResolvedValue({
          ...mockResponse,
          results: [],
        });

        await expect(sourcesApi.getSource("1234-5678")).rejects.toThrow(
          "No source found for ISSN: 1234-5678",
        );
      });

      it("should fallback to standard getById for OpenAlex IDs", async () => {
        const mockSource: Partial<Source> = {
          id: "S4306400886",
          display_name: "Nature",
        };

        mockClient.getById.mockResolvedValue(mockSource as Source);

        const result = await sourcesApi.getSource("S4306400886");

        expect(mockClient.getById).toHaveBeenCalledWith(
          "sources",
          "S4306400886",
          {},
        );
        expect(result).toEqual(mockSource);
      });
    });

    describe("getSourcesByISSN with format support", () => {
      it("should fetch sources by standard ISSN format", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByISSN("0028-0836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
        });
      });

      it("should normalize ISSN with prefix", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByISSN("ISSN 0028-0836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
        });
      });

      it("should normalize ISSN with colon notation", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByISSN("issn:0028-0836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
        });
      });

      it("should normalize bare 8-digit ISSN format", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByISSN("00280836");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
        });
      });

      it("should handle electronic ISSN format", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByISSN("eissn:1476-4687");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:1476-4687",
        });
      });

      it("should handle X check digit properly", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByISSN("2041-172x");

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:2041-172X",
        });
      });

      it("should handle additional parameters", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByISSN("0028-0836", {
          per_page: 50,
          sort: "works_count:desc",
        });

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836",
          per_page: 50,
          sort: "works_count:desc",
        });
      });

      it("should throw error for invalid ISSN format", async () => {
        await expect(
          sourcesApi.getSourcesByISSN("invalid-issn"),
        ).rejects.toThrow("Invalid ISSN format: invalid-issn");
      });

      it("should throw error for empty ISSN", async () => {
        await expect(sourcesApi.getSourcesByISSN("")).rejects.toThrow(
          "Invalid ISSN format: ",
        );
      });

      it("should throw error for null ISSN", async () => {
        await expect(
          sourcesApi.getSourcesByISSN(null as unknown as string),
        ).rejects.toThrow("Invalid ISSN format: null");
      });
    });

    describe("ISSN Format Validation", () => {
      // Test private methods through public interface behavior
      it("should accept various valid ISSN formats", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        const validFormats = [
          "0028-0836",
          "ISSN 0028-0836",
          "ISSN: 0028-0836",
          "issn:0028-0836",
          "EISSN 1476-4687",
          "eissn:1476-4687",
          "00280836",
          "14764687",
          "2041-172X",
          "2041172X",
          "issn 2041-172x",
        ];

        for (const format of validFormats) {
          // Should not throw an error
          await expect(
            sourcesApi.getSourcesByISSN(format),
          ).resolves.toBeDefined();
        }
      });

      it("should reject invalid ISSN formats", async () => {
        const invalidFormats = [
          "invalid",
          "123-456",
          "12345678901",
          "abcd-efgh",
          "0028-08367",
          "002-0836",
          "S4306400886", // OpenAlex ID format
          "10.1038/nature", // DOI format
        ];

        for (const format of invalidFormats) {
          await expect(sourcesApi.getSourcesByISSN(format)).rejects.toThrow(
            `Invalid ISSN format: ${format}`,
          );
        }
      });
    });

    describe("validateISSN utility method", () => {
      it("should validate standard ISSN format", () => {
        const result = sourcesApi.validateISSN("0028-0836");
        expect(result).toEqual({
          isValid: true,
          normalized: "0028-0836",
          format: "standard",
        });
      });

      it("should validate ISSN with prefix", () => {
        const result = sourcesApi.validateISSN("ISSN 0028-0836");
        expect(result).toEqual({
          isValid: true,
          normalized: "0028-0836",
          format: "with_prefix",
        });
      });

      it("should validate ISSN with scheme notation", () => {
        const result = sourcesApi.validateISSN("issn:0028-0836");
        expect(result).toEqual({
          isValid: true,
          normalized: "0028-0836",
          format: "scheme_notation",
        });
      });

      it("should validate bare ISSN format", () => {
        const result = sourcesApi.validateISSN("00280836");
        expect(result).toEqual({
          isValid: true,
          normalized: "0028-0836",
          format: "bare",
        });
      });

      it("should return error for invalid ISSN", () => {
        const result = sourcesApi.validateISSN("invalid");
        expect(result).toEqual({
          isValid: false,
          error: "Invalid ISSN format",
        });
      });

      it("should return error for empty string", () => {
        const result = sourcesApi.validateISSN("");
        expect(result).toEqual({
          isValid: false,
          error: "ISSN must be a non-empty string",
        });
      });
    });

    describe("getSourcesByMultipleISSNs", () => {
      it("should fetch sources for multiple ISSNs", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByMultipleISSNs([
          "0028-0836",
          "ISSN 2041-1723",
          "eissn:1476-4687",
        ]);

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836|2041-1723|1476-4687",
        });
      });

      it("should handle additional parameters", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByMultipleISSNs(["0028-0836", "2041-1723"], {
          per_page: 50,
          sort: "works_count:desc",
        });

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836|2041-1723",
          per_page: 50,
          sort: "works_count:desc",
        });
      });

      it("should throw error for empty array", async () => {
        await expect(sourcesApi.getSourcesByMultipleISSNs([])).rejects.toThrow(
          "ISSN array must be non-empty",
        );
      });

      it("should throw error when no valid ISSNs found", async () => {
        await expect(
          sourcesApi.getSourcesByMultipleISSNs(["invalid1", "invalid2"]),
        ).rejects.toThrow("No valid ISSNs found in: invalid1, invalid2");
      });

      it("should filter out invalid ISSNs and proceed with valid ones", async () => {
        mockClient.getResponse.mockResolvedValue(mockResponse);

        await sourcesApi.getSourcesByMultipleISSNs([
          "0028-0836", // valid
          "invalid", // invalid
          "2041-1723", // valid
        ]);

        expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
          filter: "ids.issn:0028-0836|2041-1723",
        });
      });
    });
  });

  describe("buildFilterParams", () => {
    it("should handle empty filters", () => {
      const params = { per_page: 25 };
      const result = (
        sourcesApi as unknown as {
          buildFilterParams: (params: unknown) => unknown;
        }
      ).buildFilterParams(params);

      expect(result).toEqual({ per_page: 25 });
    });

    it("should handle undefined filter", () => {
      const params = { filter: undefined, per_page: 25 };
      const result = (
        sourcesApi as unknown as {
          buildFilterParams: (params: unknown) => unknown;
        }
      ).buildFilterParams(params);

      expect(result).toEqual({ per_page: 25 });
    });

    it("should build filter string from object", () => {
      const params = {
        filter: {
          is_oa: true,
          type: "journal",
          country_code: "US",
        },
        per_page: 25,
      };

      const result = (
        sourcesApi as unknown as {
          buildFilterParams: (params: unknown) => unknown;
        }
      ).buildFilterParams(params);

      expect(result).toEqual({
        filter: "is_oa:true,type:journal,country_code:US",
        per_page: 25,
      });
    });

    it("should handle array values", () => {
      const params = {
        filter: {
          type: ["journal", "conference"],
          is_oa: true,
        },
      };

      const result = (
        sourcesApi as unknown as {
          buildFilterParams: (params: unknown) => unknown;
        }
      ).buildFilterParams(params);

      expect(result).toEqual({
        filter: "type:journal|conference,is_oa:true",
      });
    });

    it("should skip null and undefined values", () => {
      const params = {
        filter: {
          is_oa: true,
          type: null,
          country_code: undefined,
        },
      };

      const result = (
        sourcesApi as unknown as {
          buildFilterParams: (params: unknown) => unknown;
        }
      ).buildFilterParams(params);

      expect(result).toEqual({
        filter: "is_oa:true",
      });
    });
  });
});
