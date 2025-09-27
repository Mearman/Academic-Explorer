/**
 * Tests for Works API entity methods
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorksApi } from "./works";
import { OpenAlexBaseClient } from "../client";
import type { Work, OpenAlexResponse } from "../types";

// Mock the base client
vi.mock("../client");

describe("WorksApi", () => {
	let worksApi: WorksApi;
	let mockClient: vi.Mocked<OpenAlexBaseClient>;

	beforeEach(() => {
		mockClient = {
			getById: vi.fn(),
			getResponse: vi.fn(),
			stream: vi.fn(),
			getAll: vi.fn(),
		} as unknown as vi.Mocked<OpenAlexBaseClient>;

		worksApi = new WorksApi(mockClient);
	});

	describe("getWork", () => {
		it("should fetch a single work by ID", async () => {
			const mockWork: Partial<Work> = {
				id: "W2741809807",
				display_name: "Test Work",
				publication_year: 2023,
				cited_by_count: 42,
			};

			mockClient.getById.mockResolvedValue(mockWork as Work);

			const result = await worksApi.getWork("W2741809807");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W2741809807", {});
			expect(result).toEqual(mockWork);
		});

		it("should pass query parameters to the client", async () => {
			const mockWork: Partial<Work> = { id: "W123", display_name: "Test" };
			mockClient.getById.mockResolvedValue(mockWork as Work);

			await worksApi.getWork("W123", { select: ["id", "display_name"] });

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W123", {
				select: ["id", "display_name"],
			});
		});

		it("should fetch a single work by PMID with lowercase prefix", async () => {
			const mockWork: Partial<Work> = {
				id: "W2741809807",
				display_name: "Test Work from PubMed",
				publication_year: 2023,
				cited_by_count: 42,
			};

			mockClient.getById.mockResolvedValue(mockWork as Work);

			const result = await worksApi.getWork("pmid:12345678");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "pmid:12345678", {});
			expect(result).toEqual(mockWork);
		});

		it("should fetch a single work by PMID with uppercase prefix", async () => {
			const mockWork: Partial<Work> = {
				id: "W2741809807",
				display_name: "Test Work from PubMed",
				publication_year: 2023,
				cited_by_count: 42,
			};

			mockClient.getById.mockResolvedValue(mockWork as Work);

			const result = await worksApi.getWork("PMID:12345678");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "pmid:12345678", {});
			expect(result).toEqual(mockWork);
		});

		it("should fetch a single work by bare numeric PMID", async () => {
			const mockWork: Partial<Work> = {
				id: "W2741809807",
				display_name: "Test Work from PubMed",
				publication_year: 2023,
				cited_by_count: 42,
			};

			mockClient.getById.mockResolvedValue(mockWork as Work);

			const result = await worksApi.getWork("12345678");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "pmid:12345678", {});
			expect(result).toEqual(mockWork);
		});

		it("should handle invalid PMID formats gracefully", async () => {
			const mockWork: Partial<Work> = { id: "invalid123", display_name: "Test" };
			mockClient.getById.mockResolvedValue(mockWork as Work);

			// Invalid PMIDs should be passed through as-is (no normalization)
			const result = await worksApi.getWork("invalid123");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "invalid123", {});
			expect(result).toEqual(mockWork);
		});
	});

	describe("getWorks", () => {
		it("should fetch multiple works with default parameters", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [
          { id: "W1", display_name: "Work 1" } as Work,
          { id: "W2", display_name: "Work 2" } as Work,
				],
				meta: {
					count: 2,
					db_response_time_ms: 10,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			const result = await worksApi.getWorks();

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {});
			expect(result).toEqual(mockResponse);
		});

		it("should convert filters to filter string", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getWorks({
				filter: {
					"publication_year": 2023,
					"is_oa": true,
					"authorships.author.id": ["A123", "A456"],
				},
				sort: "cited_by_count",
				per_page: 50,
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "publication_year:2023,is_oa:true,authorships.author.id:A123|A456",
				sort: "cited_by_count",
				per_page: 50,
			});
		});
	});

	describe("searchWorks", () => {
		it("should search works with query string", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.searchWorks("machine learning", {
				filters: { "publication_year": 2023 },
				sort: "relevance_score",
				per_page: 25,
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "publication_year:2023",
				search: "machine learning",
				sort: "relevance_score",
				per_page: 25,
			});
		});

		it("should use default sort when not specified", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.searchWorks("query");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: "query",
				sort: "relevance_score",
			});
		});
	});

	describe("getWorksByAuthor", () => {
		it("should filter works by author ID", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getWorksByAuthor("A5017898742", {
				sort: "cited_by_count",
				per_page: 20,
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.author.id:A5017898742",
				sort: "cited_by_count",
				per_page: 20,
			});
		});

		it("should merge author filter with existing filters", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getWorksByAuthor("A123", {
				filter: { "publication_year": 2023 },
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.author.id:A123,publication_year:2023",
			});
		});
	});

	describe("getWorksByInstitution", () => {
		it("should filter works by institution ID", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getWorksByInstitution("I27837315");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.institutions.id:I27837315",
			});
		});
	});

	describe("getWorksBySource", () => {
		it("should filter works by source ID", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getWorksBySource("S137773608");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "primary_location.source.id:S137773608",
			});
		});
	});

	describe("getCitedWorks", () => {
		it("should find works that cite the specified work", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getCitedWorks("W2741809807");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "referenced_works:W2741809807",
			});
		});
	});

	describe("getReferencedWorks", () => {
		it("should fetch referenced works from a work", async () => {
			const mockWork: Partial<Work> = {
				id: "W123",
				referenced_works: ["W456", "W789"],
			};

			const mockReferencedResponse: OpenAlexResponse<Work> = {
				results: [
          { id: "W456", display_name: "Ref Work 1" } as Work,
          { id: "W789", display_name: "Ref Work 2" } as Work,
				],
				meta: { count: 2, db_response_time_ms: 10, page: 1, per_page: 2 },
			};

			mockClient.getById.mockResolvedValue(mockWork as Work);
			mockClient.getResponse.mockResolvedValue(mockReferencedResponse);

			const result = await worksApi.getReferencedWorks("W123");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W123", {
				select: ["referenced_works"],
			});
			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456|W789",
				per_page: 2,
			});
			expect(result).toEqual(mockReferencedResponse.results);
		});

		it("should return empty array if no referenced works", async () => {
			const mockWork: Partial<Work> = {
				id: "W123",
				referenced_works: [],
			};

			mockClient.getById.mockResolvedValue(mockWork as Work);

			const result = await worksApi.getReferencedWorks("W123");

			expect(result).toEqual([]);
			expect(mockClient.getResponse).not.toHaveBeenCalled();
		});

		it("should limit results when specified", async () => {
			const mockWork: Partial<Work> = {
				id: "W123",
				referenced_works: ["W456", "W789", "W111"],
			};

			const mockReferencedResponse: OpenAlexResponse<Work> = {
				results: [{ id: "W456", display_name: "Ref Work 1" } as Work],
				meta: { count: 1, db_response_time_ms: 10, page: 1, per_page: 1 },
			};

			mockClient.getById.mockResolvedValue(mockWork as Work);
			mockClient.getResponse.mockResolvedValue(mockReferencedResponse);

			const result = await worksApi.getReferencedWorks("W123", { limit: 1 });

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456",
				per_page: 1,
			});
			expect(result).toEqual(mockReferencedResponse.results);
		});
	});

	describe("getRandomWorks", () => {
		it("should fetch random works", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [{ id: "W1", display_name: "Random Work" } as Work],
				meta: { count: 1, db_response_time_ms: 10, page: 1, per_page: 1 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			const result = await worksApi.getRandomWorks(5);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sample: 5,
				seed: expect.any(Number),
			});
			expect(result).toEqual(mockResponse.results);
		});

		it("should throw error for count > 10000", async () => {
			await expect(worksApi.getRandomWorks(10001)).rejects.toThrow(
				"Maximum sample size is 10,000 works"
			);
		});

		it("should include filters when provided", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getRandomWorks(10, {
				filter: { "is_oa": true },
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sample: 10,
				seed: expect.any(Number),
				filter: "is_oa:true",
			});
		});
	});

	describe("getWorksByYearRange", () => {
		it("should filter works by year range", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getWorksByYearRange(2020, 2023);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "publication_year:2020-2023",
			});
		});
	});

	describe("getOpenAccessWorks", () => {
		it("should filter for open access works", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getOpenAccessWorks();

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "is_oa:true",
			});
		});
	});

	describe("getHighlyCitedWorks", () => {
		it("should filter for highly cited works", async () => {
			const mockResponse: OpenAlexResponse<Work> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await worksApi.getHighlyCitedWorks(100);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "cited_by_count:>100",
				sort: "cited_by_count",
			});
		});
	});

	describe("buildFilterString", () => {
		it("should handle various filter types correctly", () => {
			const filters = {
				"publication_year": 2023,
				"is_oa": true,
				"authorships.author.id": ["A123", "A456"],
				"title.search": "machine learning",
			};

			// Access the private method through type assertion for testing
			const filterString = (worksApi as unknown as { buildFilterString: (filters: unknown) => string }).buildFilterString(filters);

			expect(filterString).toBe(
				"publication_year:2023,is_oa:true,authorships.author.id:A123|A456,title.search:machine learning"
			);
		});

		it("should handle null and undefined values", () => {
			const filters = {
				"publication_year": 2023,
				"is_oa": null,
				"title.search": undefined,
			};

			const filterString = (worksApi as unknown as { buildFilterString: (filters: unknown) => string }).buildFilterString(filters);

			expect(filterString).toBe("publication_year:2023");
		});
	});
});