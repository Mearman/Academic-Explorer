/**
 * Comprehensive Unit Tests for Works API Entity Class
 * Tests WorksApi class methods with complete mock coverage and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WorksApi, type WorksQueryParams, type SearchWorksOptions, type RelatedWorksOptions } from "./works";
import { OpenAlexBaseClient } from "../client";
import { OpenAlexApiError, OpenAlexRateLimitError } from "../client";
import type { Work, OpenAlexResponse, WorksFilters, QueryParams } from "../types";

// Mock only the base client, not the error classes
vi.mock("../client", async () => {
	const actual = await vi.importActual("../client");
	return {
		...actual,
		OpenAlexBaseClient: vi.fn()
	};
});

describe("WorksApi Unit Tests", () => {
	let worksApi: WorksApi;
	let mockClient: vi.Mocked<OpenAlexBaseClient>;

	beforeEach(() => {
		// Reset all mocks before each test
		vi.clearAllMocks();

		// Create a properly mocked client with all required methods
		mockClient = {
			getById: vi.fn(),
			getResponse: vi.fn(),
			get: vi.fn(),
			stream: vi.fn(),
			getAll: vi.fn(),
			makeRequest: vi.fn(),
			buildUrl: vi.fn(),
			updateConfig: vi.fn(),
			getRateLimitStatus: vi.fn(),
		} as unknown as vi.Mocked<OpenAlexBaseClient>;

		worksApi = new WorksApi(mockClient);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("Constructor", () => {
		it("should create WorksApi instance with client dependency", () => {
			expect(worksApi).toBeInstanceOf(WorksApi);
			expect(worksApi["client"]).toBe(mockClient);
		});
	});

	describe("getWork", () => {
		const mockWork: Work = {
			id: "W2741809807",
			display_name: "Machine Learning Applications in Healthcare",
			doi: "https://doi.org/10.1234/test",
			publication_year: 2023,
			publication_date: "2023-05-15",
			cited_by_count: 42,
			is_retracted: false,
			is_paratext: false,
			type: "journal-article",
			open_access: {
				is_oa: true,
				oa_date: "2023-05-15",
				oa_url: "https://example.com/paper.pdf",
				any_repository_has_fulltext: true,
			},
			authorships: [],
			biblio: {
				volume: "15",
				issue: "3",
				first_page: "123",
				last_page: "145",
			},
			concepts: [],
			mesh: [],
			locations: [],
			best_oa_location: null,
			sustainable_development_goals: [],
			grants: [],
			referenced_works: [],
			related_works: [],
			abstract_inverted_index: null,
			cited_by_api_url: "https://api.openalex.org/works?filter=cites:W2741809807",
			counts_by_year: [],
			updated_date: "2023-12-01",
			created_date: "2023-05-15",
		};

		it("should fetch a single work by OpenAlex ID", async () => {
			mockClient.getById.mockResolvedValue(mockWork);

			const result = await worksApi.getWork("W2741809807");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W2741809807", {});
			expect(mockClient.getById).toHaveBeenCalledTimes(1);
			expect(result).toEqual(mockWork);
		});

		it("should fetch a single work by DOI", async () => {
			mockClient.getById.mockResolvedValue(mockWork);

			const result = await worksApi.getWork("https://doi.org/10.7717/peerj.4375");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "https://doi.org/10.7717/peerj.4375", {});
			expect(result).toEqual(mockWork);
		});

		it("should pass query parameters to client", async () => {
			mockClient.getById.mockResolvedValue(mockWork);
			const params: QueryParams = {
				select: ["id", "display_name", "publication_year"],
				format: "json"
			};

			await worksApi.getWork("W2741809807", params);

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W2741809807", params);
		});

		it("should handle client errors properly", async () => {
			const error = new OpenAlexApiError("Work not found", 404);
			// Test that the error is constructed properly first
			expect(error.message).toBe("Work not found");
			expect(error.statusCode).toBe(404);

			mockClient.getById.mockRejectedValue(error);

			await expect(worksApi.getWork("W999999999")).rejects.toThrow("Work not found");
			expect(mockClient.getById).toHaveBeenCalledWith("works", "W999999999", {});
		});

		it("should handle network errors", async () => {
			const error = new Error("Network timeout");
			mockClient.getById.mockRejectedValue(error);

			await expect(worksApi.getWork("W2741809807")).rejects.toThrow("Network timeout");
		});

		it("should handle undefined params gracefully", async () => {
			mockClient.getById.mockResolvedValue(mockWork);

			await worksApi.getWork("W2741809807", undefined);

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W2741809807", {});
		});
	});

	describe("getWorks", () => {
		const mockResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Work 1", publication_year: 2023 } as Work,
        { id: "W2", display_name: "Work 2", publication_year: 2022 } as Work,
			],
			meta: {
				count: 2,
				db_response_time_ms: 15,
				page: 1,
				per_page: 25,
			},
		};

		it("should fetch multiple works with default parameters", async () => {
			mockClient.getResponse.mockResolvedValue(mockResponse);

			const result = await worksApi.getWorks();

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {});
			expect(mockClient.getResponse).toHaveBeenCalledTimes(1);
			expect(result).toEqual(mockResponse);
		});

		it("should pass through non-filter parameters directly", async () => {
			mockClient.getResponse.mockResolvedValue(mockResponse);
			const params: WorksQueryParams = {
				sort: "cited_by_count",
				per_page: 50,
				page: 2,
				select: ["id", "display_name", "cited_by_count"],
				search: "machine learning",
			};

			await worksApi.getWorks(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", params);
		});

		it("should convert filters object to filter string", async () => {
			mockClient.getResponse.mockResolvedValue(mockResponse);
			const params: WorksQueryParams = {
				filter: {
					"publication_year": 2023,
					"is_oa": true,
					"authorships.author.id": ["A123", "A456"],
					"type": "journal-article",
				},
				sort: "publication_date",
			};

			await worksApi.getWorks(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "publication_year:2023,is_oa:true,authorships.author.id:A123|A456,type:journal-article",
				sort: "publication_date",
			});
		});

		it("should handle empty filters object", async () => {
			mockClient.getResponse.mockResolvedValue(mockResponse);
			const params: WorksQueryParams = { filter: {} };

			await worksApi.getWorks(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", { filter: "" });
		});

		it("should handle rate limit errors from client", async () => {
			const rateLimitError = new OpenAlexRateLimitError("Rate limit exceeded", 60);
			mockClient.getResponse.mockRejectedValue(rateLimitError);

			await expect(worksApi.getWorks()).rejects.toThrow("Rate limit exceeded");
			await expect(worksApi.getWorks()).rejects.toBeInstanceOf(OpenAlexRateLimitError);
		});

		it("should handle server errors from client", async () => {
			const serverError = new OpenAlexApiError("Internal server error", 500);
			mockClient.getResponse.mockRejectedValue(serverError);

			await expect(worksApi.getWorks()).rejects.toThrow("Internal server error");
		});
	});

	describe("searchWorks", () => {
		const mockSearchResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "ML Paper 1", publication_year: 2023 } as Work,
        { id: "W2", display_name: "ML Paper 2", publication_year: 2022 } as Work,
			],
			meta: {
				count: 2,
				db_response_time_ms: 25,
				page: 1,
				per_page: 25,
			},
		};

		it("should search works with query string and default options", async () => {
			mockClient.getResponse.mockResolvedValue(mockSearchResponse);

			const result = await worksApi.searchWorks("machine learning");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: "machine learning",
				sort: "relevance_score",
			});
			expect(result).toEqual(mockSearchResponse);
		});

		it("should apply search options correctly", async () => {
			mockClient.getResponse.mockResolvedValue(mockSearchResponse);
			const options: SearchWorksOptions = {
				filters: { "publication_year": 2023, "is_oa": true },
				sort: "cited_by_count",
				page: 2,
				per_page: 50,
				select: ["id", "display_name", "cited_by_count"],
			};

			await worksApi.searchWorks("deep learning", options);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: "deep learning",
				sort: "cited_by_count",
				page: 2,
				per_page: 50,
				select: ["id", "display_name", "cited_by_count"],
				filter: "publication_year:2023,is_oa:true",
			});
		});

		it("should handle empty search query", async () => {
			mockClient.getResponse.mockResolvedValue(mockSearchResponse);

			await worksApi.searchWorks("");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: "",
				sort: "publication_date", // Empty queries should use publication_date sort
				page: undefined,
				per_page: undefined,
				select: undefined,
				filter: undefined
			});
		});

		it("should handle special characters in search query", async () => {
			mockClient.getResponse.mockResolvedValue(mockSearchResponse);
			const specialQuery = 'machine learning & AI: "neural networks"';

			await worksApi.searchWorks(specialQuery);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: specialQuery,
				sort: "relevance_score",
			});
		});

		it("should override default sort when specified", async () => {
			mockClient.getResponse.mockResolvedValue(mockSearchResponse);

			await worksApi.searchWorks("AI", { sort: "publication_date" });

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: "AI",
				sort: "publication_date",
			});
		});
	});

	describe("getWorksByAuthor", () => {
		const mockAuthorWorksResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Author Work 1" } as Work,
        { id: "W2", display_name: "Author Work 2" } as Work,
			],
			meta: {
				count: 2,
				db_response_time_ms: 20,
				page: 1,
				per_page: 25,
			},
		};

		it("should filter works by author OpenAlex ID", async () => {
			mockClient.getResponse.mockResolvedValue(mockAuthorWorksResponse);

			const result = await worksApi.getWorksByAuthor("A5017898742");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.author.id:A5017898742",
			});
			expect(result).toEqual(mockAuthorWorksResponse);
		});

		it("should filter works by ORCID", async () => {
			mockClient.getResponse.mockResolvedValue(mockAuthorWorksResponse);

			await worksApi.getWorksByAuthor("0000-0003-1613-5981");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.author.id:0000-0003-1613-5981",
			});
		});

		it("should merge author filter with existing filters", async () => {
			mockClient.getResponse.mockResolvedValue(mockAuthorWorksResponse);
			const params: WorksQueryParams = {
				filter: {
					"publication_year": 2023,
					"is_oa": true,
					"type": "journal-article",
				},
				sort: "cited_by_count",
				per_page: 20,
			};

			await worksApi.getWorksByAuthor("A123", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.author.id:A123,publication_year:2023,is_oa:true,type:journal-article",
				sort: "cited_by_count",
				per_page: 20,
			});
		});

		it("should handle additional query parameters", async () => {
			mockClient.getResponse.mockResolvedValue(mockAuthorWorksResponse);

			await worksApi.getWorksByAuthor("A123", {
				select: ["id", "display_name", "publication_year"],
				sort: "publication_date",
				per_page: 100,
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.author.id:A123",
				select: ["id", "display_name", "publication_year"],
				sort: "publication_date",
				per_page: 100,
			});
		});
	});

	describe("getWorksByInstitution", () => {
		const mockInstitutionWorksResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Institution Work 1" } as Work,
			],
			meta: {
				count: 1,
				db_response_time_ms: 18,
				page: 1,
				per_page: 25,
			},
		};

		it("should filter works by institution OpenAlex ID", async () => {
			mockClient.getResponse.mockResolvedValue(mockInstitutionWorksResponse);

			const result = await worksApi.getWorksByInstitution("I27837315");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.institutions.id:I27837315",
			});
			expect(result).toEqual(mockInstitutionWorksResponse);
		});

		it("should filter works by ROR ID", async () => {
			mockClient.getResponse.mockResolvedValue(mockInstitutionWorksResponse);

			await worksApi.getWorksByInstitution("https://ror.org/01234567");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.institutions.id:https://ror.org/01234567",
			});
		});

		it("should merge institution filter with existing filters", async () => {
			mockClient.getResponse.mockResolvedValue(mockInstitutionWorksResponse);
			const params: WorksQueryParams = {
				filter: { "publication_year": "2020-2023", "is_oa": true },
				sort: "publication_date",
			};

			await worksApi.getWorksByInstitution("I27837315", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.institutions.id:I27837315,publication_year:2020-2023,is_oa:true",
				sort: "publication_date",
			});
		});
	});

	describe("getWorksBySource", () => {
		const mockSourceWorksResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Journal Article 1" } as Work,
			],
			meta: {
				count: 1,
				db_response_time_ms: 22,
				page: 1,
				per_page: 25,
			},
		};

		it("should filter works by source OpenAlex ID", async () => {
			mockClient.getResponse.mockResolvedValue(mockSourceWorksResponse);

			const result = await worksApi.getWorksBySource("S137773608");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "primary_location.source.id:S137773608",
			});
			expect(result).toEqual(mockSourceWorksResponse);
		});

		it("should filter works by ISSN", async () => {
			mockClient.getResponse.mockResolvedValue(mockSourceWorksResponse);

			await worksApi.getWorksBySource("1234-5678");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "primary_location.source.id:1234-5678",
			});
		});

		it("should merge source filter with existing filters", async () => {
			mockClient.getResponse.mockResolvedValue(mockSourceWorksResponse);
			const params: WorksQueryParams = {
				filter: { "publication_year": "2020-2023" },
				sort: "cited_by_count",
			};

			await worksApi.getWorksBySource("S137773608", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "primary_location.source.id:S137773608,publication_year:2020-2023",
				sort: "cited_by_count",
			});
		});
	});

	describe("getCitedWorks", () => {
		const mockCitingWorksResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Citing Work 1" } as Work,
        { id: "W2", display_name: "Citing Work 2" } as Work,
			],
			meta: {
				count: 2,
				db_response_time_ms: 28,
				page: 1,
				per_page: 25,
			},
		};

		it("should find works that cite the specified work", async () => {
			mockClient.getResponse.mockResolvedValue(mockCitingWorksResponse);

			const result = await worksApi.getCitedWorks("W2741809807");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "referenced_works:W2741809807",
			});
			expect(result).toEqual(mockCitingWorksResponse);
		});

		it("should merge citation filter with existing filters", async () => {
			mockClient.getResponse.mockResolvedValue(mockCitingWorksResponse);
			const params: WorksQueryParams = {
				filter: { "publication_year": "2023", "is_oa": true },
				sort: "publication_date",
				per_page: 100,
			};

			await worksApi.getCitedWorks("W2741809807", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "referenced_works:W2741809807,publication_year:2023,is_oa:true",
				sort: "publication_date",
				per_page: 100,
			});
		});
	});

	describe("getReferencedWorks", () => {
		const mockWorkWithReferences: Work = {
			id: "W123",
			display_name: "Source Work",
			referenced_works: ["W456", "W789", "W111"],
		} as Work;

		const mockReferencedResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W456", display_name: "Reference 1" } as Work,
        { id: "W789", display_name: "Reference 2" } as Work,
        { id: "W111", display_name: "Reference 3" } as Work,
			],
			meta: {
				count: 3,
				db_response_time_ms: 35,
				page: 1,
				per_page: 3,
			},
		};

		it("should fetch referenced works from a work", async () => {
			mockClient.getById.mockResolvedValue(mockWorkWithReferences);
			mockClient.getResponse.mockResolvedValue(mockReferencedResponse);

			const result = await worksApi.getReferencedWorks("W123");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W123", {
				select: ["referenced_works"],
			});
			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456|W789|W111",
				per_page: 3,
			});
			expect(result).toEqual(mockReferencedResponse.results);
		});

		it("should return empty array if no referenced works", async () => {
			const mockWorkNoRefs: Work = {
				id: "W123",
				display_name: "Work Without References",
				referenced_works: [],
			} as Work;

			mockClient.getById.mockResolvedValue(mockWorkNoRefs);

			const result = await worksApi.getReferencedWorks("W123");

			expect(result).toEqual([]);
			expect(mockClient.getResponse).not.toHaveBeenCalled();
		});

		it("should handle undefined referenced_works", async () => {
			const mockWorkUndefinedRefs: Work = {
				id: "W123",
				display_name: "Work With Undefined References",
				referenced_works: undefined,
			} as Work;

			mockClient.getById.mockResolvedValue(mockWorkUndefinedRefs);

			const result = await worksApi.getReferencedWorks("W123");

			expect(result).toEqual([]);
			expect(mockClient.getResponse).not.toHaveBeenCalled();
		});

		it("should limit results when specified", async () => {
			mockClient.getById.mockResolvedValue(mockWorkWithReferences);
			const limitedResponse: OpenAlexResponse<Work> = {
				results: [
          { id: "W456", display_name: "Reference 1" } as Work,
          { id: "W789", display_name: "Reference 2" } as Work,
				],
				meta: { count: 2, db_response_time_ms: 20, page: 1, per_page: 2 },
			};
			mockClient.getResponse.mockResolvedValue(limitedResponse);

			const options: RelatedWorksOptions = { limit: 2 };
			const result = await worksApi.getReferencedWorks("W123", options);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456|W789",
				per_page: 2,
			});
			expect(result).toEqual(limitedResponse.results);
		});

		it("should apply select option", async () => {
			mockClient.getById.mockResolvedValue(mockWorkWithReferences);
			mockClient.getResponse.mockResolvedValue(mockReferencedResponse);

			const options: RelatedWorksOptions = {
				select: ["id", "display_name", "publication_year"],
			};
			await worksApi.getReferencedWorks("W123", options);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456|W789|W111",
				select: ["id", "display_name", "publication_year"],
				per_page: 3,
			});
		});

		it("should merge with additional filters", async () => {
			mockClient.getById.mockResolvedValue(mockWorkWithReferences);
			mockClient.getResponse.mockResolvedValue(mockReferencedResponse);

			const options: RelatedWorksOptions = {
				filters: { "is_oa": true, "publication_year": "2020-2023" },
			};
			await worksApi.getReferencedWorks("W123", options);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456|W789|W111,is_oa:true,publication_year:2020-2023",
				per_page: 3,
			});
		});
	});

	describe("getRelatedWorks", () => {
		const mockWorkWithRelated: Work = {
			id: "W123",
			display_name: "Source Work",
			related_works: ["W456", "W789"],
		} as Work;

		const mockRelatedResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W456", display_name: "Related Work 1" } as Work,
        { id: "W789", display_name: "Related Work 2" } as Work,
			],
			meta: {
				count: 2,
				db_response_time_ms: 30,
				page: 1,
				per_page: 2,
			},
		};

		it("should fetch related works from a work", async () => {
			mockClient.getById.mockResolvedValue(mockWorkWithRelated);
			mockClient.getResponse.mockResolvedValue(mockRelatedResponse);

			const result = await worksApi.getRelatedWorks("W123");

			expect(mockClient.getById).toHaveBeenCalledWith("works", "W123", {
				select: ["related_works"],
			});
			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456|W789",
				per_page: 2,
			});
			expect(result).toEqual(mockRelatedResponse.results);
		});

		it("should return empty array if no related works", async () => {
			const mockWorkNoRelated: Work = {
				id: "W123",
				display_name: "Work Without Related Works",
				related_works: [],
			} as Work;

			mockClient.getById.mockResolvedValue(mockWorkNoRelated);

			const result = await worksApi.getRelatedWorks("W123");

			expect(result).toEqual([]);
			expect(mockClient.getResponse).not.toHaveBeenCalled();
		});

		it("should handle undefined related_works", async () => {
			const mockWorkUndefinedRelated: Work = {
				id: "W123",
				display_name: "Work With Undefined Related",
				related_works: undefined,
			} as Work;

			mockClient.getById.mockResolvedValue(mockWorkUndefinedRelated);

			const result = await worksApi.getRelatedWorks("W123");

			expect(result).toEqual([]);
		});

		it("should limit results when specified", async () => {
			const mockWorkManyRelated: Work = {
				id: "W123",
				related_works: ["W456", "W789", "W111", "W222"],
			} as Work;

			mockClient.getById.mockResolvedValue(mockWorkManyRelated);
			mockClient.getResponse.mockResolvedValue(mockRelatedResponse);

			const _result = await worksApi.getRelatedWorks("W123", { limit: 2 });

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456|W789",
				per_page: 2,
			});
		});
	});

	describe("getRandomWorks", () => {
		const mockRandomResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Random Work 1" } as Work,
        { id: "W2", display_name: "Random Work 2" } as Work,
			],
			meta: {
				count: 2,
				db_response_time_ms: 25,
				page: 1,
				per_page: 25,
			},
		};

		it("should fetch random works with specified count", async () => {
			mockClient.getResponse.mockResolvedValue(mockRandomResponse);

			const result = await worksApi.getRandomWorks(5);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sample: 5,
				seed: expect.any(Number),
			});
			expect(result).toEqual(mockRandomResponse.results);
		});

		it("should throw error for count > 10000", async () => {
			await expect(worksApi.getRandomWorks(10001)).rejects.toThrow(
				"Maximum sample size is 10,000 works"
			);

			expect(mockClient.getResponse).not.toHaveBeenCalled();
		});

		it("should include filters when provided", async () => {
			mockClient.getResponse.mockResolvedValue(mockRandomResponse);
			const params: WorksQueryParams = {
				filter: { "is_oa": true, "has_abstract": true },
				select: ["id", "display_name", "abstract_inverted_index"],
			};

			const result = await worksApi.getRandomWorks(10, params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sample: 10,
				seed: expect.any(Number),
				filter: "is_oa:true,has_abstract:true",
				select: ["id", "display_name", "abstract_inverted_index"],
			});
			expect(result).toEqual(mockRandomResponse.results);
		});

		it("should handle edge case of count = 0", async () => {
			mockClient.getResponse.mockResolvedValue({ ...mockRandomResponse, results: [] });

			const result = await worksApi.getRandomWorks(0);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sample: 0,
				seed: expect.any(Number),
			});
			expect(result).toEqual([]);
		});

		it("should handle maximum allowed count", async () => {
			mockClient.getResponse.mockResolvedValue(mockRandomResponse);

			await worksApi.getRandomWorks(10000);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sample: 10000,
				seed: expect.any(Number),
			});
		});
	});

	describe("streamWorks", () => {
		it("should stream works using client stream method", async () => {
			const mockBatch1 = [{ id: "W1" } as Work, { id: "W2" } as Work];
			const mockBatch2 = [{ id: "W3" } as Work];

			// Create an async generator mock
			const mockGenerator = async function* () {
				yield mockBatch1;
				yield mockBatch2;
			};

			mockClient.stream.mockReturnValue(mockGenerator());

			const batches: Work[][] = [];
			for await (const batch of worksApi.streamWorks()) {
				batches.push(batch);
			}

			expect(mockClient.stream).toHaveBeenCalledWith("works", { per_page: 200 }, 200);
			expect(batches).toEqual([mockBatch1, mockBatch2]);
		});

		it("should pass filters to streaming", async () => {
			const mockGenerator = async function* () {
				yield [{ id: "W1" } as Work];
			};

			mockClient.stream.mockReturnValue(mockGenerator());

			const params: WorksQueryParams = {
				filter: { "publication_year": 2023 },
				select: ["id", "display_name"],
			};

			const batches: Work[][] = [];
			for await (const batch of worksApi.streamWorks(params, 100)) {
				batches.push(batch);
			}

			expect(mockClient.stream).toHaveBeenCalledWith("works", {
				filter: "publication_year:2023",
				select: ["id", "display_name"],
				per_page: 100,
			}, 100);
		});

		it("should use custom batch size", async () => {
			const mockGenerator = async function* () {
				yield [{ id: "W1" } as Work];
			};

			mockClient.stream.mockReturnValue(mockGenerator());

			const batches: Work[][] = [];
			for await (const batch of worksApi.streamWorks({}, 50)) {
				batches.push(batch);
			}

			expect(mockClient.stream).toHaveBeenCalledWith("works", { per_page: 50 }, 50);
		});
	});

	describe("getAllWorks", () => {
		const mockWorks = [
      { id: "W1", display_name: "Work 1" } as Work,
      { id: "W2", display_name: "Work 2" } as Work,
      { id: "W3", display_name: "Work 3" } as Work,
		];

		it("should get all works using client getAll method", async () => {
			mockClient.getAll.mockResolvedValue(mockWorks);

			const result = await worksApi.getAllWorks();

			expect(mockClient.getAll).toHaveBeenCalledWith("works", {}, undefined);
			expect(result).toEqual(mockWorks);
		});

		it("should pass filters and maxResults to client", async () => {
			mockClient.getAll.mockResolvedValue(mockWorks.slice(0, 2));
			const params: WorksQueryParams = {
				filter: { "is_oa": true },
				sort: "cited_by_count",
			};

			const _result = await worksApi.getAllWorks(params, 1000);

			expect(mockClient.getAll).toHaveBeenCalledWith("works", {
				filter: "is_oa:true",
				sort: "cited_by_count",
			}, 1000);
		});

		it("should handle empty results", async () => {
			mockClient.getAll.mockResolvedValue([]);

			const result = await worksApi.getAllWorks();

			expect(result).toEqual([]);
		});
	});

	describe("getWorksStats", () => {
		const mockStatsResponse: OpenAlexResponse<Work> = {
			results: [], // Stats requests typically return empty results
			meta: {
				count: 12345,
				db_response_time_ms: 40,
				page: 1,
				per_page: 0,
				groups_count: 5,
			},
			group_by: [
				{ key: "2023", key_display_name: "2023", count: 5000 },
				{ key: "2022", key_display_name: "2022", count: 4500 },
				{ key: "2021", key_display_name: "2021", count: 2845 },
			],
		};

		it("should get works statistics without grouping", async () => {
			mockClient.getResponse.mockResolvedValue(mockStatsResponse);

			const result = await worksApi.getWorksStats();

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				per_page: 0,
			});
			expect(result).toEqual(mockStatsResponse);
		});

		it("should get works statistics with grouping", async () => {
			mockClient.getResponse.mockResolvedValue(mockStatsResponse);
			const params: WorksQueryParams = {
				filter: { "authorships.author.id": "A5017898742" },
			};

			const result = await worksApi.getWorksStats(params, "publication_year");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "authorships.author.id:A5017898742",
				per_page: 0,
				group_by: "publication_year",
			});
			expect(result).toEqual(mockStatsResponse);
		});

		it("should handle filters in stats request", async () => {
			mockClient.getResponse.mockResolvedValue(mockStatsResponse);

			await worksApi.getWorksStats({
				filter: { "is_oa": true, "type": "journal-article" },
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "is_oa:true,type:journal-article",
				per_page: 0,
			});
		});
	});

	describe("getWorksByYearRange", () => {
		const mockYearRangeResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Recent Work 1", publication_year: 2023 } as Work,
        { id: "W2", display_name: "Recent Work 2", publication_year: 2022 } as Work,
			],
			meta: {
				count: 2,
				db_response_time_ms: 35,
				page: 1,
				per_page: 25,
			},
		};

		it("should filter works by year range", async () => {
			mockClient.getResponse.mockResolvedValue(mockYearRangeResponse);

			const result = await worksApi.getWorksByYearRange(2020, 2023);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "publication_year:2020-2023",
			});
			expect(result).toEqual(mockYearRangeResponse);
		});

		it("should merge year range with existing filters", async () => {
			mockClient.getResponse.mockResolvedValue(mockYearRangeResponse);
			const params: WorksQueryParams = {
				filter: { "is_oa": true, "type": "journal-article" },
				sort: "cited_by_count",
			};

			await worksApi.getWorksByYearRange(2021, 2023, params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "publication_year:2021-2023,is_oa:true,type:journal-article",
				sort: "cited_by_count",
			});
		});

		it("should handle single year range", async () => {
			mockClient.getResponse.mockResolvedValue(mockYearRangeResponse);

			await worksApi.getWorksByYearRange(2023, 2023);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "publication_year:2023-2023",
			});
		});
	});

	describe("getOpenAccessWorks", () => {
		const mockOAResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "OA Work 1", open_access: { is_oa: true } } as Work,
			],
			meta: {
				count: 1,
				db_response_time_ms: 20,
				page: 1,
				per_page: 25,
			},
		};

		it("should filter for open access works", async () => {
			mockClient.getResponse.mockResolvedValue(mockOAResponse);

			const result = await worksApi.getOpenAccessWorks();

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "is_oa:true",
			});
			expect(result).toEqual(mockOAResponse);
		});

		it("should merge OA filter with existing filters", async () => {
			mockClient.getResponse.mockResolvedValue(mockOAResponse);
			const params: WorksQueryParams = {
				filter: { "publication_year": 2023, "type": "journal-article" },
				sort: "cited_by_count",
			};

			await worksApi.getOpenAccessWorks(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "is_oa:true,publication_year:2023,type:journal-article",
				sort: "cited_by_count",
			});
		});
	});

	describe("getHighlyCitedWorks", () => {
		const mockHighlyCitedResponse: OpenAlexResponse<Work> = {
			results: [
        { id: "W1", display_name: "Highly Cited Work", cited_by_count: 150 } as Work,
			],
			meta: {
				count: 1,
				db_response_time_ms: 30,
				page: 1,
				per_page: 25,
			},
		};

		it("should filter for highly cited works", async () => {
			mockClient.getResponse.mockResolvedValue(mockHighlyCitedResponse);

			const result = await worksApi.getHighlyCitedWorks(100);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "cited_by_count:>100",
				sort: "cited_by_count",
			});
			expect(result).toEqual(mockHighlyCitedResponse);
		});

		it("should merge citation filter with existing filters", async () => {
			mockClient.getResponse.mockResolvedValue(mockHighlyCitedResponse);
			const params: WorksQueryParams = {
				filter: { "publication_year": "2020-2023", "is_oa": true },
			};

			await worksApi.getHighlyCitedWorks(50, params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "cited_by_count:>50,publication_year:2020-2023,is_oa:true",
				sort: "cited_by_count",
			});
		});

		it("should handle zero minimum citations", async () => {
			mockClient.getResponse.mockResolvedValue(mockHighlyCitedResponse);

			await worksApi.getHighlyCitedWorks(0);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "cited_by_count:>0",
				sort: "cited_by_count",
			});
		});
	});

	describe("buildFilterString (private method)", () => {
		// Testing private method through public interface
		const testBuildFilterString = (filters: WorksFilters): string => {
			// Access private method for testing
			return (worksApi as unknown as { buildFilterString: (filters: WorksFilters) => string })
				.buildFilterString(filters);
		};

		it("should handle string values", () => {
			const filters: WorksFilters = {
				"title.search": "machine learning",
				"type": "journal-article",
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe("title.search:machine learning,type:journal-article");
		});

		it("should handle number values", () => {
			const filters: WorksFilters = {
				"publication_year": 2023,
				"cited_by_count": 42,
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe("publication_year:2023,cited_by_count:42");
		});

		it("should handle boolean values", () => {
			const filters: WorksFilters = {
				"is_oa": true,
				"is_retracted": false,
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe("is_oa:true,is_retracted:false");
		});

		it("should handle array values with OR logic", () => {
			const filters: WorksFilters = {
				"authorships.author.id": ["A123", "A456", "A789"],
				"type": ["journal-article", "book-chapter"],
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe("authorships.author.id:A123|A456|A789,type:journal-article|book-chapter");
		});

		it("should handle mixed value types", () => {
			const filters: WorksFilters = {
				"publication_year": 2023,
				"is_oa": true,
				"authorships.author.id": ["A123", "A456"],
				"title.search": "neural networks",
				"cited_by_count": ">100",
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe(
				"publication_year:2023,is_oa:true,authorships.author.id:A123|A456,title.search:neural networks,cited_by_count:>100"
			);
		});

		it("should skip null and undefined values", () => {
			const filters = {
				"publication_year": 2023,
				"is_oa": null,
				"title.search": undefined,
				"type": "journal-article",
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe("publication_year:2023,type:journal-article");
		});

		it("should handle empty array values", () => {
			const filters: WorksFilters = {
				"publication_year": 2023,
				"authorships.author.id": [],
				"type": "journal-article",
			};

			const result = testBuildFilterString(filters);

			// Empty arrays should be treated as falsy and skipped
			expect(result).toBe("publication_year:2023,authorships.author.id:,type:journal-article");
		});

		it("should handle empty filters object", () => {
			const filters: WorksFilters = {};

			const result = testBuildFilterString(filters);

			expect(result).toBe("");
		});

		it("should handle special characters in values", () => {
			const filters: WorksFilters = {
				"title.search": "COVID-19 & SARS-CoV-2: A review",
				"doi": "https://doi.org/10.1234/test.2023",
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe("title.search:COVID-19 & SARS-CoV-2: A review,doi:https://doi.org/10.1234/test.2023");
		});

		it("should handle range values", () => {
			const filters: WorksFilters = {
				"publication_year": "2020-2023",
				"cited_by_count": ">50",
				"publication_date": "<2023-12-31",
			};

			const result = testBuildFilterString(filters);

			expect(result).toBe("publication_year:2020-2023,cited_by_count:>50,publication_date:<2023-12-31");
		});
	});

	describe("Error handling scenarios", () => {
		it("should propagate client errors in getWork", async () => {
			const error = new Error("Network failure");
			mockClient.getById.mockRejectedValue(error);

			await expect(worksApi.getWork("W123")).rejects.toThrow("Network failure");
		});

		it("should propagate API errors in getWorks", async () => {
			const apiError = new OpenAlexApiError("Invalid filter parameter", 400);
			mockClient.getResponse.mockRejectedValue(apiError);

			await expect(worksApi.getWorks({
				filter: { "publication_year": "invalid_value" } as Record<string, unknown>
			})).rejects.toThrow("Invalid filter parameter");
		});

		it("should propagate rate limit errors in searchWorks", async () => {
			const rateLimitError = new OpenAlexRateLimitError("Rate limit exceeded", 300);
			mockClient.getResponse.mockRejectedValue(rateLimitError);

			await expect(worksApi.searchWorks("test query")).rejects.toBeInstanceOf(OpenAlexRateLimitError);
		});

		it("should handle errors in getReferencedWorks when fetching main work fails", async () => {
			const error = new OpenAlexApiError("Work not found", 404);
			mockClient.getById.mockRejectedValue(error);

			await expect(worksApi.getReferencedWorks("W999999999")).rejects.toThrow("Work not found");
		});

		it("should handle errors in getReferencedWorks when fetching references fails", async () => {
			const mockWork: Work = {
				id: "W123",
				referenced_works: ["W456", "W789"],
			} as Work;

			mockClient.getById.mockResolvedValue(mockWork);
			const error = new OpenAlexApiError("Server error", 500);
			mockClient.getResponse.mockRejectedValue(error);

			await expect(worksApi.getReferencedWorks("W123")).rejects.toThrow("Server error");
		});

		it("should handle streaming errors", async () => {
			const error = new Error("Stream interrupted");
			mockClient.stream.mockImplementation(() => {
				throw error;
			});

			const generator = worksApi.streamWorks();
			await expect(generator.next()).rejects.toThrow("Stream interrupted");
		});
	});

	describe("Edge cases and boundary conditions", () => {
		it("should handle very large filter objects", async () => {
			const largeFilters: WorksFilters = {};
			for (let i = 0; i < 100; i++) {
				largeFilters[`field_${String(i)}`] = `value_${String(i)}`;
			}

			mockClient.getResponse.mockResolvedValue({
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			});

			await worksApi.getWorks({ filter: largeFilters });

			expect(mockClient.getResponse).toHaveBeenCalled();
			const callArgs = mockClient.getResponse.mock.calls[0];
			expect(callArgs[1]?.filter).toContain("field_0:value_0");
			expect(callArgs[1]?.filter).toContain("field_99:value_99");
		});

		it("should handle empty search query in searchWorks", async () => {
			mockClient.getResponse.mockResolvedValue({
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			});

			await worksApi.searchWorks("");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: "",
				sort: "publication_date", // Empty queries should use publication_date sort
				page: undefined,
				per_page: undefined,
				select: undefined,
				filter: undefined
			});
		});

		it("should handle maximum pagination parameters", async () => {
			mockClient.getResponse.mockResolvedValue({
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			});

			await worksApi.getWorks({
				page: 999999,
				per_page: 200, // OpenAlex maximum
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				page: 999999,
				per_page: 200,
			});
		});

		it("should handle zero results in streaming", async () => {
			/* eslint-disable-next-line require-yield */
			const mockEmptyGenerator = async function* (): AsyncGenerator<Work[], void, unknown> {
				// Generator that yields nothing - this is intentional for testing empty results
				return;
			};

			mockClient.stream.mockReturnValue(mockEmptyGenerator());

			const batches: Work[][] = [];
			for await (const batch of worksApi.streamWorks()) {
				batches.push(batch);
			}

			expect(batches).toHaveLength(0);
		});
	});

	describe("Method parameter validation", () => {
		it("should pass through all valid SearchWorksOptions", async () => {
			mockClient.getResponse.mockResolvedValue({
				results: [],
				meta: { count: 0, db_response_time_ms: 5, page: 1, per_page: 25 },
			});

			const options: SearchWorksOptions = {
				filters: { "is_oa": true },
				sort: "cited_by_count",
				page: 3,
				per_page: 100,
				select: ["id", "display_name", "cited_by_count", "open_access"],
			};

			await worksApi.searchWorks("test query", options);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				search: "test query",
				filter: "is_oa:true",
				sort: "cited_by_count",
				page: 3,
				per_page: 100,
				select: ["id", "display_name", "cited_by_count", "open_access"],
			});
		});

		it("should pass through all valid RelatedWorksOptions", async () => {
			const mockWork: Work = {
				id: "W123",
				referenced_works: ["W456"],
			} as Work;

			mockClient.getById.mockResolvedValue(mockWork);
			mockClient.getResponse.mockResolvedValue({
				results: [{ id: "W456" } as Work],
				meta: { count: 1, db_response_time_ms: 10, page: 1, per_page: 1 },
			});

			const options: RelatedWorksOptions = {
				limit: 5,
				filters: { "is_oa": true, "publication_year": "2020-2023" },
				select: ["id", "display_name", "publication_year"],
			};

			await worksApi.getReferencedWorks("W123", options);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "ids.openalex:W456,is_oa:true,publication_year:2020-2023",
				select: ["id", "display_name", "publication_year"],
				per_page: 1,
			});
		});
	});
});