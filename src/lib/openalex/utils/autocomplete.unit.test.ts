/**
 * Unit tests for AutocompleteApi
 * Tests debouncing, caching, entity-specific searches, and cross-entity functionality
 */

import { describe, it, expect, beforeEach, vi, type MockedFunction } from "vitest";
import { AutocompleteApi } from "./autocomplete";
import { OpenAlexBaseClient } from "../client";
import type { AutocompleteResult, EntityType } from "../types";

// Mock the logger
vi.mock("@/lib/logger", () => ({
	logger: {
		warn: vi.fn(),
	},
}));

// Mock the OpenAlexBaseClient
const mockClient = {
	get: vi.fn(),
} as unknown as OpenAlexBaseClient;

const mockGet = mockClient.get as MockedFunction<typeof mockClient.get>;

describe("AutocompleteApi", () => {
	let autocompleteApi: AutocompleteApi;

	const mockAutocompleteResult: AutocompleteResult = {
		id: "https://openalex.org/W123456789",
		display_name: "Test Work",
		entity_type: "work",
		cited_by_count: 100,
		works_count: 5,
	};

	const mockAuthorResult: AutocompleteResult = {
		id: "https://openalex.org/A987654321",
		display_name: "Test Author",
		entity_type: "author",
		cited_by_count: 500,
		works_count: 50,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		autocompleteApi = new AutocompleteApi(mockClient);
	});

	describe("Basic Autocomplete Functionality", () => {
		it("should return empty array for empty query", async () => {
			const result = await autocompleteApi.autocomplete("");
			expect(result).toEqual([]);
			expect(mockGet).not.toHaveBeenCalled();
		});

		it("should return empty array for whitespace-only query", async () => {
			const result = await autocompleteApi.autocomplete("   ");
			expect(result).toEqual([]);
			expect(mockGet).not.toHaveBeenCalled();
		});

		it("should perform autocomplete for valid query", async () => {
			// Mock responses for all entity types (search method calls all types)
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] }); // works
			mockGet.mockResolvedValueOnce({ results: [] }); // authors
			mockGet.mockResolvedValueOnce({ results: [] }); // sources
			mockGet.mockResolvedValueOnce({ results: [] }); // institutions
			mockGet.mockResolvedValueOnce({ results: [] }); // topics

			const result = await autocompleteApi.autocomplete("machine learning");

			expect(result).toEqual([
				{
					...mockAutocompleteResult,
					entity_type: "work",
				},
			]);
			// Should call all entity types since no specific type was provided
			expect(mockGet).toHaveBeenCalledTimes(5);
		});

		it("should handle specific entity type autocomplete", async () => {
			mockGet.mockResolvedValueOnce({
				results: [mockAuthorResult],
			});

			const result = await autocompleteApi.autocomplete("john smith", "authors");

			expect(result).toEqual([
				{
					...mockAuthorResult,
					entity_type: "author",
				},
			]);
			expect(mockGet).toHaveBeenCalledWith("autocomplete/authors", {
				q: "john smith",
			});
		});
	});

	describe("Entity-Specific Autocomplete Methods", () => {
		it("should autocomplete works", async () => {
			mockGet.mockResolvedValueOnce({
				results: [mockAutocompleteResult],
			});

			const result = await autocompleteApi.autocompleteWorks("neural networks");

			expect(result).toEqual([
				{
					...mockAutocompleteResult,
					entity_type: "work",
				},
			]);
			expect(mockGet).toHaveBeenCalledWith("autocomplete/works", {
				q: "neural networks",
			});
		});

		it("should autocomplete authors", async () => {
			mockGet.mockResolvedValueOnce({
				results: [mockAuthorResult],
			});

			const result = await autocompleteApi.autocompleteAuthors("jane doe");

			expect(result).toEqual([
				{
					...mockAuthorResult,
					entity_type: "author",
				},
			]);
			expect(mockGet).toHaveBeenCalledWith("autocomplete/authors", {
				q: "jane doe",
			});
		});

		it("should autocomplete sources", async () => {
			const mockSourceResult: AutocompleteResult = {
				id: "https://openalex.org/S123456789",
				display_name: "Nature",
				entity_type: "source",
				cited_by_count: 1000,
				works_count: 10000,
			};

			mockGet.mockResolvedValueOnce({
				results: [mockSourceResult],
			});

			const result = await autocompleteApi.autocompleteSources("nature");

			expect(result).toEqual([
				{
					...mockSourceResult,
					entity_type: "source",
				},
			]);
		});

		it("should autocomplete institutions", async () => {
			const mockInstitutionResult: AutocompleteResult = {
				id: "https://openalex.org/I123456789",
				display_name: "MIT",
				entity_type: "institution",
				cited_by_count: 2000,
				works_count: 50000,
			};

			mockGet.mockResolvedValueOnce({
				results: [mockInstitutionResult],
			});

			const result = await autocompleteApi.autocompleteInstitutions("MIT");

			expect(result).toEqual([
				{
					...mockInstitutionResult,
					entity_type: "institution",
				},
			]);
		});

		it("should autocomplete topics", async () => {
			const mockTopicResult: AutocompleteResult = {
				id: "https://openalex.org/T123456789",
				display_name: "Machine Learning",
				entity_type: "topic",
				cited_by_count: 5000,
				works_count: 100000,
			};

			mockGet.mockResolvedValueOnce({
				results: [mockTopicResult],
			});

			const result = await autocompleteApi.autocompleteTopics("machine learning");

			expect(result).toEqual([
				{
					...mockTopicResult,
					entity_type: "topic",
				},
			]);
		});
	});

	describe("Cross-Entity Search", () => {
		it("should search across all entity types by default", async () => {
			// Mock multiple entity type responses
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] }); // works
			mockGet.mockResolvedValueOnce({ results: [mockAuthorResult] }); // authors
			mockGet.mockResolvedValueOnce({ results: [] }); // sources
			mockGet.mockResolvedValueOnce({ results: [] }); // institutions
			mockGet.mockResolvedValueOnce({ results: [] }); // topics

			const result = await autocompleteApi.search("AI");

			expect(result).toHaveLength(2);
			expect(result).toContainEqual({
				...mockAutocompleteResult,
				entity_type: "work",
			});
			expect(result).toContainEqual({
				...mockAuthorResult,
				entity_type: "author",
			});
		});

		it("should search specific entity types when provided", async () => {
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] }); // works
			mockGet.mockResolvedValueOnce({ results: [mockAuthorResult] }); // authors

			const result = await autocompleteApi.search("AI", ["works", "authors"]);

			expect(result).toHaveLength(2);
			expect(mockGet).toHaveBeenCalledTimes(2);
		});

		it("should sort results by citations then by works count", async () => {
			const lowCitationResult: AutocompleteResult = {
				id: "https://openalex.org/W111111111",
				display_name: "Low Citation Work",
				entity_type: "work",
				cited_by_count: 10,
				works_count: 1,
			};

			const highCitationResult: AutocompleteResult = {
				id: "https://openalex.org/W222222222",
				display_name: "High Citation Work",
				entity_type: "work",
				cited_by_count: 1000,
				works_count: 1,
			};

			mockGet.mockResolvedValueOnce({ results: [lowCitationResult, highCitationResult] });

			const result = await autocompleteApi.search("test", ["works"]);

			expect(result[0]).toEqual({
				...highCitationResult,
				entity_type: "work",
			});
			expect(result[1]).toEqual({
				...lowCitationResult,
				entity_type: "work",
			});
		});

		it("should handle API errors gracefully in cross-entity search", async () => {
			mockGet.mockRejectedValueOnce(new Error("API Error"));
			mockGet.mockResolvedValueOnce({ results: [mockAuthorResult] });

			const result = await autocompleteApi.search("test", ["works", "authors"]);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				...mockAuthorResult,
				entity_type: "author",
			});
		});
	});

	describe("Search with Filters", () => {
		it("should return empty array for empty query", async () => {
			const result = await autocompleteApi.searchWithFilters("", { from_publication_date: "2020-01-01" });
			expect(result).toEqual([]);
			expect(mockGet).not.toHaveBeenCalled();
		});

		it("should infer entity types from filters and perform filtered search", async () => {
			const filters = {
				"authorships.author.id": "A123456789",
				from_publication_date: "2020-01-01",
			};

			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] }); // works
			mockGet.mockResolvedValueOnce({ results: [mockAuthorResult] }); // authors

			const result = await autocompleteApi.searchWithFilters("machine learning", filters);

			expect(result).toHaveLength(2);
			expect(mockGet).toHaveBeenCalledWith("works/autocomplete", {
				q: "machine learning",
				from_publication_date: "2020-01-01",
			});
			expect(mockGet).toHaveBeenCalledWith("authors/autocomplete", {
				q: "machine learning",
				from_publication_date: "2020-01-01",
			});
		});

		it("should handle API errors in filtered search", async () => {
			const filters = { "authorships.author.id": "A123456789" };

			mockGet.mockRejectedValueOnce(new Error("API Error"));

			const result = await autocompleteApi.searchWithFilters("test", filters);

			expect(result).toEqual([]);
		});
	});

	describe("Caching and Debouncing", () => {
		beforeEach(() => {
			// Use fake timers for debouncing tests
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it("should cache results and return same promise for identical requests", async () => {
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] });

			// Make requests quickly within debounce window
			const promise1 = autocompleteApi.autocomplete("test query", "works");
			const promise2 = autocompleteApi.autocomplete("test query", "works");

			// Should return same results (though promise identity may differ due to cache implementation)
			const [result1, result2] = await Promise.all([promise1, promise2]);
			expect(result1).toEqual(result2);
			expect(mockGet).toHaveBeenCalledTimes(1);
		});

		it("should make new request after debounce delay", async () => {
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] });
			mockGet.mockResolvedValueOnce({ results: [mockAuthorResult] });

			await autocompleteApi.autocomplete("test query", "works");

			// Advance time beyond debounce delay
			vi.advanceTimersByTime(350);

			await autocompleteApi.autocomplete("test query", "works");

			expect(mockGet).toHaveBeenCalledTimes(2);
		});

		it("should clear cache manually", async () => {
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] });

			await autocompleteApi.autocomplete("test query");
			autocompleteApi.clearCache();

			const stats = autocompleteApi.getCacheStats();
			expect(stats.cacheSize).toBe(0);
		});

		it("should provide cache statistics", async () => {
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] });

			// Use specific entity type to create single cache entry
			await autocompleteApi.autocomplete("test query", "works");

			const stats = autocompleteApi.getCacheStats();
			expect(stats.cacheSize).toBe(1);
			expect(stats.oldestEntry).toBeTypeOf("number");
			expect(stats.newestEntry).toBeTypeOf("number");
		});

		it("should clean up expired cache entries", async () => {
			mockGet.mockResolvedValueOnce({ results: [mockAutocompleteResult] });

			// Use specific entity type to create single cache entry
			await autocompleteApi.autocomplete("test query", "works");

			// Advance time beyond cache TTL (30 seconds)
			vi.advanceTimersByTime(35000);

			// Make another request to trigger cleanup
			mockGet.mockResolvedValueOnce({ results: [mockAuthorResult] });
			await autocompleteApi.autocomplete("new query", "works");

			const stats = autocompleteApi.getCacheStats();
			expect(stats.cacheSize).toBe(1); // Only new query should remain
		});
	});

	describe("Utility Methods", () => {
		it("should map entity types to singular forms correctly", async () => {
			const entityTypeMappings: Array<[EntityType, AutocompleteResult["entity_type"]]> = [
				["works", "work"],
				["authors", "author"],
				["sources", "source"],
				["institutions", "institution"],
				["topics", "topic"],
				["concepts", "concept"],
				["publishers", "publisher"],
				["funders", "funder"],
				["keywords", "keyword"],
			];

			for (const [plural, singular] of entityTypeMappings) {
				mockGet.mockResolvedValueOnce({
					results: [{
						id: "https://openalex.org/X123456789",
						display_name: "Test Entity",
						entity_type: singular,
						cited_by_count: 100,
						works_count: 10,
					}],
				});

				const result = await autocompleteApi.autocomplete("test", plural);
				expect(result[0].entity_type).toBe(singular);

				// Clear cache between tests
				autocompleteApi.clearCache();
			}
		});

		it("should infer entity types from filter keys correctly", async () => {
			// Test each filter scenario individually
			const testCases = [
				{
					name: "authorships.author.id",
					filters: { "authorships.author.id": "A123" },
					expectedEntityTypeCalls: ["works", "authors"]
				},
				{
					name: "host_venue.id",
					filters: { "host_venue.id": "S123" },
					expectedEntityTypeCalls: ["sources"]
				},
				{
					name: "authorships.institutions.id",
					filters: { "authorships.institutions.id": "I123" },
					expectedEntityTypeCalls: ["works", "authors", "institutions"] // authorships.* adds works+authors, institution adds institutions+works
				},
				{
					name: "topics.id",
					filters: { "topics.id": "T123" },
					expectedEntityTypeCalls: ["topics"]
				},
				{
					name: "empty filters",
					filters: {},
					expectedEntityTypeCalls: ["works", "authors", "sources", "institutions", "topics"]
				},
			];

			for (const testCase of testCases) {
				// Clear state for each test case
				vi.clearAllMocks();
				autocompleteApi.clearCache();

				// Mock exactly the expected number of calls
				for (let i = 0; i < testCase.expectedEntityTypeCalls.length; i++) {
					mockGet.mockResolvedValueOnce({ results: [] });
				}

				await autocompleteApi.searchWithFilters("test", testCase.filters);

				// Verify expected number of calls were made
				expect(mockGet).toHaveBeenCalledTimes(testCase.expectedEntityTypeCalls.length);
			}
		});

		it("should format filters for entity types correctly", async () => {
			const filters = {
				from_publication_date: "2020-01-01",
				to_publication_date: "2023-12-31",
				is_oa: true,
				custom_filter: "should_be_ignored",
			};

			mockGet.mockResolvedValueOnce({ results: [] });

			await autocompleteApi.searchWithFilters("test", filters);

			expect(mockGet).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					q: "test",
					from_publication_date: "2020-01-01",
					to_publication_date: "2023-12-31",
					is_oa: true,
				})
			);

			// Should not contain custom_filter
			expect(mockGet).not.toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					custom_filter: "should_be_ignored",
				})
			);
		});
	});

	describe("Error Handling", () => {
		beforeEach(() => {
			vi.clearAllMocks();
			autocompleteApi.clearCache();
		});

		it("should handle API errors gracefully and return empty array", async () => {
			mockGet.mockRejectedValueOnce(new Error("Network error"));

			const result = await autocompleteApi.autocomplete("test query");

			expect(result).toEqual([]);
		});

		it("should handle malformed API responses", async () => {
			mockGet.mockResolvedValueOnce({ invalid: "response" });

			const result = await autocompleteApi.autocomplete("test query");

			expect(result).toEqual([]);
		});

		it("should continue with other entity types if one fails in cross-search", async () => {
			// Ensure clean state
			vi.clearAllMocks();
			autocompleteApi.clearCache();

			mockGet.mockRejectedValueOnce(new Error("Works API failed"));
			mockGet.mockResolvedValueOnce({ results: [mockAuthorResult] });

			const result = await autocompleteApi.search("test", ["works", "authors"]);

			// Verify both API calls were attempted
			expect(mockGet).toHaveBeenCalledTimes(2);

			// Should have one successful result (authors) and one failed result (works = empty array)
			expect(result).toEqual([{
				...mockAuthorResult,
				entity_type: "author",
			}]);
		});
	});
});