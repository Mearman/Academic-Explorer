/**
 * Comprehensive unit tests for InstitutionsApi entity class
 * Tests all methods including CRUD, search, filtering, and relationships
 */

import { describe, it, expect, vi, beforeEach, type Mocked } from "vitest";
import { InstitutionsApi, InstitutionSearchOptions } from "./institutions";
import { OpenAlexBaseClient } from "../client";
import type {
  InstitutionEntity,
  OpenAlexResponse,
  Work,
  Author,
} from "../types";

// Mock the base client
vi.mock("../client");

describe("InstitutionsApi", () => {
  let institutionsApi: InstitutionsApi;
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

    institutionsApi = new InstitutionsApi(mockClient);
  });

  describe("getInstitution", () => {
    it("should fetch a single institution by OpenAlex ID", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
        country_code: "US",
        type: "education",
        works_count: 250000,
        cited_by_count: 5000000,
      };

      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      const result = await institutionsApi.getInstitution("I33213144");

      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "I33213144",
        {},
      );
      expect(result).toEqual(mockInstitution);
    });

    it("should fetch a single institution by bare ROR ID", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
        ror: "https://ror.org/01an7q238",
      };

      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      const result = await institutionsApi.getInstitution("01an7q238");

      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "https://ror.org/01an7q238",
        {},
      );
      expect(result).toEqual(mockInstitution);
    });

    it("should fetch a single institution by ROR ID with ror: prefix", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
        ror: "https://ror.org/01an7q238",
      };

      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      const result = await institutionsApi.getInstitution("ror:01an7q238");

      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "https://ror.org/01an7q238",
        {},
      );
      expect(result).toEqual(mockInstitution);
    });

    it("should fetch a single institution by ROR URL", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
        ror: "https://ror.org/01an7q238",
      };

      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      const result = await institutionsApi.getInstitution(
        "https://ror.org/01an7q238",
      );

      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "https://ror.org/01an7q238",
        {},
      );
      expect(result).toEqual(mockInstitution);
    });

    it("should fetch a single institution by ROR domain format", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
        ror: "https://ror.org/01an7q238",
      };

      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      const result = await institutionsApi.getInstitution("ror.org/01an7q238");

      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "https://ror.org/01an7q238",
        {},
      );
      expect(result).toEqual(mockInstitution);
    });

    it("should handle ROR IDs case insensitively", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
        ror: "https://ror.org/01an7q238",
      };

      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      await institutionsApi.getInstitution("01AN7Q238");
      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "https://ror.org/01an7q238",
        {},
      );

      await institutionsApi.getInstitution("ROR:01AN7Q238");
      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "https://ror.org/01an7q238",
        {},
      );
    });

    it("should throw error for invalid ROR IDs", async () => {
      // Invalid ROR IDs that should fail validation
      const invalidRorIds = [
        "05dxps05", // Too short
        "05dxps0555", // Too long
        "05dxpsi55", // Contains invalid character 'i'
        "123456789", // All numbers, no letters
        "ror:", // Empty ROR after prefix
      ];

      for (const invalidRor of invalidRorIds) {
        await expect(
          institutionsApi.getInstitution(invalidRor),
        ).rejects.toThrow();
      }
    });

    it("should throw error for empty or null ID", async () => {
      // Empty string should be caught by type validation first
      await expect(institutionsApi.getInstitution("")).rejects.toThrow(
        "Institution ID is required and must be a string",
      );
      await expect(institutionsApi.getInstitution("   ")).rejects.toThrow(
        "Institution ID cannot be empty",
      );
      await expect(institutionsApi.getInstitution(null as any)).rejects.toThrow(
        "Institution ID is required and must be a string",
      );
      await expect(
        institutionsApi.getInstitution(undefined as any),
      ).rejects.toThrow("Institution ID is required and must be a string");
    });

    it("should pass additional parameters to client", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
      };

      const params = {
        select: ["id", "display_name", "country_code", "works_count"],
      };
      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      await institutionsApi.getInstitution("I33213144", params);

      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "I33213144",
        params,
      );
    });

    it("should pass additional parameters when using ROR ID", async () => {
      const mockInstitution: Partial<InstitutionEntity> = {
        id: "I33213144",
        display_name: "Harvard University",
        ror: "https://ror.org/01an7q238",
      };

      const params = { select: ["id", "display_name", "ror", "works_count"] };
      mockClient.getById.mockResolvedValue(
        mockInstitution as InstitutionEntity,
      );

      await institutionsApi.getInstitution("ror:01an7q238", params);

      expect(mockClient.getById).toHaveBeenCalledWith(
        "institutions",
        "https://ror.org/01an7q238",
        params,
      );
    });
  });

  describe("getInstitutions", () => {
    it("should fetch institutions without options", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      const result = await institutionsApi.getInstitutions();

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {});
      expect(result).toEqual(mockResponse);
    });

    it("should fetch institutions with filters", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: {
          country_code: "US",
          type: "education",
        },
        sort: "cited_by_count",
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutions(options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "country_code:US,type:education",
        sort: "cited_by_count",
        per_page: 50,
      });
    });

    it("should handle array filter values", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: {
          type: ["education", "healthcare"],
          country_code: "US",
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutions(options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "type:education|healthcare,country_code:US",
      });
    });
  });

  describe("searchInstitutions", () => {
    it("should search institutions with query", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.searchInstitutions("harvard");

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        search: "harvard",
      });
    });

    it("should search institutions with query and options", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: { country_code: "US" },
        per_page: 10,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.searchInstitutions("harvard", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        search: "harvard",
        filter: "country_code:US",
        per_page: 10,
      });
    });
  });

  describe("getInstitutionsByCountry", () => {
    it("should fetch institutions by country", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsByCountry("US");

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "country_code:US",
      });
    });

    it("should merge with existing filters", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: { type: "education" },
        sort: "works_count",
        per_page: 100,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsByCountry("US", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "type:education,country_code:US",
        sort: "works_count",
        per_page: 100,
      });
    });
  });

  describe("getInstitutionsByType", () => {
    it("should fetch institutions by type", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsByType("education");

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "type:education",
      });
    });

    it("should merge with existing options", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: { country_code: "US" },
        sort: "cited_by_count",
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsByType("education", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "country_code:US,type:education",
        sort: "cited_by_count",
      });
    });
  });

  describe("getInstitutionWorks", () => {
    it("should fetch works from an institution", async () => {
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

      await institutionsApi.getInstitutionWorks("I136199984");

      expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
        filter: "authorships.institutions.id:I136199984",
      });
    });

    it("should handle additional options", async () => {
      const mockResponse: OpenAlexResponse<Work> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        sort: "cited_by_count",
        per_page: 100,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionWorks("I136199984", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
        filter: "authorships.institutions.id:I136199984",
        sort: "cited_by_count",
        per_page: 100,
      });
    });
  });

  describe("getInstitutionAuthors", () => {
    it("should fetch authors from an institution", async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionAuthors("I121332964");

      expect(mockClient.getResponse).toHaveBeenCalledWith("authors", {
        filter: "last_known_institution.id:I121332964",
      });
    });

    it("should handle additional options", async () => {
      const mockResponse: OpenAlexResponse<Author> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        sort: "cited_by_count",
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionAuthors("I121332964", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("authors", {
        filter: "last_known_institution.id:I121332964",
        sort: "cited_by_count",
        per_page: 50,
      });
    });
  });

  describe("getAssociatedInstitutions", () => {
    it("should fetch associated institutions", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getAssociatedInstitutions("I33213144");

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "associated_institutions.id:I33213144",
      });
    });

    it("should merge with existing filters", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: { country_code: "US" },
        per_page: 25,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getAssociatedInstitutions("I33213144", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "country_code:US,associated_institutions.id:I33213144",
        per_page: 25,
      });
    });
  });

  describe("getRandomInstitutions", () => {
    it("should fetch random institutions", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getRandomInstitutions();

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        sample: 10,
        seed: expect.any(Number),
      });
    });

    it("should fetch random institutions with count and filters", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: {
          type: "education",
          country_code: "US",
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getRandomInstitutions(50, options, 42);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "type:education,country_code:US",
        sample: 50,
        seed: 42,
      });
    });

    it("should limit sample size to 200", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 10,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getRandomInstitutions(300);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        sample: 200,
        seed: expect.any(Number),
      });
    });
  });

  describe("getGlobalSouthInstitutions", () => {
    it("should fetch Global South institutions", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getGlobalSouthInstitutions();

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "is_global_south:true",
      });
    });

    it("should merge with existing filters", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: { type: "education" },
        sort: "works_count",
        per_page: 100,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getGlobalSouthInstitutions(options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "type:education,is_global_south:true",
        sort: "works_count",
        per_page: 100,
      });
    });
  });

  describe("getInstitutionsWithRor", () => {
    it("should fetch institutions with ROR IDs", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsWithRor();

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "has_ror:true",
      });
    });

    it("should merge with existing options", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: { country_code: "US" },
        sort: "cited_by_count",
        per_page: 200,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsWithRor(options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "country_code:US,has_ror:true",
        sort: "cited_by_count",
        per_page: 200,
      });
    });
  });

  describe("getInstitutionsByLineage", () => {
    it("should fetch institutions by lineage", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsByLineage("I33213144");

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "lineage:I33213144",
      });
    });

    it("should handle additional options", async () => {
      const mockResponse: OpenAlexResponse<InstitutionEntity> = {
        results: [],
        meta: {
          count: 0,
          db_response_time_ms: 50,
          page: 1,
          per_page: 25,
        },
      };

      const options: InstitutionSearchOptions = {
        filters: { type: "education" },
        per_page: 50,
      };

      mockClient.getResponse.mockResolvedValue(mockResponse);

      await institutionsApi.getInstitutionsByLineage("I33213144", options);

      expect(mockClient.getResponse).toHaveBeenCalledWith("institutions", {
        filter: "type:education,lineage:I33213144",
        per_page: 50,
      });
    });
  });

  describe("streamInstitutions", () => {
    it("should stream institutions", async () => {
      const mockGenerator = async function* () {
        yield [{ id: "I1" }, { id: "I2" }] as InstitutionEntity[];
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = institutionsApi.streamInstitutions();
      const result = await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith("institutions", {});
      expect(result.done).toBe(false);
      expect(result.value).toEqual([{ id: "I1" }, { id: "I2" }]);
    });

    it("should stream institutions with options", async () => {
      const mockGenerator = async function* () {
        yield [{ id: "I1" }] as InstitutionEntity[];
      };

      const options: InstitutionSearchOptions = {
        filters: { country_code: "US" },
      };

      mockClient.stream.mockReturnValue(mockGenerator());

      const generator = institutionsApi.streamInstitutions(options);
      await generator.next();

      expect(mockClient.stream).toHaveBeenCalledWith("institutions", {
        filter: "country_code:US",
      });
    });
  });

  describe("getAllInstitutions", () => {
    it("should get all institutions", async () => {
      const mockInstitutions = [
        { id: "I1", display_name: "Institution 1" },
        { id: "I2", display_name: "Institution 2" },
      ] as InstitutionEntity[];

      mockClient.getAll.mockResolvedValue(mockInstitutions);

      const result = await institutionsApi.getAllInstitutions();

      expect(mockClient.getAll).toHaveBeenCalledWith(
        "institutions",
        {},
        undefined,
      );
      expect(result).toEqual(mockInstitutions);
    });

    it("should get all institutions with options and max results", async () => {
      const mockInstitutions = [
        { id: "I1", display_name: "Institution 1" },
      ] as InstitutionEntity[];

      const options: InstitutionSearchOptions = {
        filters: { country_code: "CH", type: "education" },
      };

      mockClient.getAll.mockResolvedValue(mockInstitutions);

      await institutionsApi.getAllInstitutions(options, 500);

      expect(mockClient.getAll).toHaveBeenCalledWith(
        "institutions",
        {
          filter: "country_code:CH,type:education",
        },
        500,
      );
    });
  });

  describe("buildQueryParams", () => {
    it("should handle empty options", () => {
      const result = (
        institutionsApi as unknown as {
          buildQueryParams: (options: InstitutionSearchOptions) => unknown;
        }
      ).buildQueryParams({});
      expect(result).toEqual({});
    });

    it("should build query params with filters", () => {
      const options: InstitutionSearchOptions = {
        filters: {
          country_code: "US",
          type: "education",
        },
        sort: "cited_by_count",
        page: 2,
        per_page: 50,
        select: ["id", "display_name"],
      };

      const result = (
        institutionsApi as unknown as {
          buildQueryParams: (options: InstitutionSearchOptions) => unknown;
        }
      ).buildQueryParams(options);

      expect(result).toEqual({
        filter: "country_code:US,type:education",
        sort: "cited_by_count",
        page: 2,
        per_page: 50,
        select: ["id", "display_name"],
      });
    });

    it("should handle array filter values", () => {
      const options: InstitutionSearchOptions = {
        filters: {
          type: ["education", "healthcare"],
          country_code: "US",
        },
      };

      const result = (
        institutionsApi as unknown as {
          buildQueryParams: (options: InstitutionSearchOptions) => unknown;
        }
      ).buildQueryParams(options);

      expect(result).toEqual({
        filter: "type:education|healthcare,country_code:US",
      });
    });

    it("should exclude empty filters", () => {
      const options: InstitutionSearchOptions = {
        filters: {},
        sort: "cited_by_count",
      };

      const result = (
        institutionsApi as unknown as {
          buildQueryParams: (options: InstitutionSearchOptions) => unknown;
        }
      ).buildQueryParams(options);

      expect(result).toEqual({
        sort: "cited_by_count",
      });
    });
  });
});
