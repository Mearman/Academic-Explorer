import { describe, it, expect, beforeEach, vi } from "vitest";
import { SamplingApi } from "./sampling";
import type { OpenAlexBaseClient } from "../client";
import type { OpenAlexResponse } from "../types";

// Mock the logger
vi.mock('../internal/logger', () => ({
	logger: {
		warn: vi.fn(),
		debug: vi.fn(),
		error: vi.fn()
	}
}));

import { logger } from '../internal/logger';

// Mock the client
const mockClient = {
	getResponse: vi.fn(),
} as unknown as jest.Mocked<OpenAlexBaseClient>;

describe("SamplingApi", () => {
	let samplingApi: SamplingApi;

	beforeEach(() => {
		vi.clearAllMocks();
		samplingApi = new SamplingApi(mockClient);
	});

	describe("randomSample", () => {
		it("should get random sample with default parameters", async () => {
			const mockResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [
					{ id: "W1", display_name: "Sample Work 1" },
					{ id: "W2", display_name: "Sample Work 2" },
				],
				meta: { count: 1000, db_response_time_ms: 50, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			const result = await samplingApi.randomSample("works");

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sort: "random",
				per_page: 25,
			});

			expect(result.results).toHaveLength(2);
			expect(result.meta.count).toBe(1000);
		});

		it("should apply seed for reproducible sampling", async () => {
			const mockResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [{ id: "A1", display_name: "Author 1" }],
				meta: { count: 500, db_response_time_ms: 30, page: 1, per_page: 10 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			const params = {
				sample_size: 10,
				seed: 12345,
				filter: "works_count:>10",
			};

			await samplingApi.randomSample("authors", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("authors", {
				filter: "works_count:>10",
				sort: "random",
				per_page: 10,
				seed: 12345,
			});
		});

		it("should limit sample size to maximum per page", async () => {
			const mockResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 20, page: 1, per_page: 200 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await samplingApi.randomSample("works", { sample_size: 500 });

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				sort: "random",
				per_page: 200, // Should be capped at 200
			});
		});
	});

	describe("stratifiedSample", () => {
		it("should perform stratified sampling with proportional allocation", async () => {
			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 300, db_response_time_ms: 40, page: 1, per_page: 100 },
				group_by: [
					{ key: "2020", key_display_name: "2020", count: 150 },
					{ key: "2021", key_display_name: "2021", count: 100 },
					{ key: "2022", key_display_name: "2022", count: 50 },
				],
			};

			const mockSampleResponse1: OpenAlexResponse<{ id: string; publication_year: number }> = {
				results: [
					{ id: "W1", publication_year: 2020 },
					{ id: "W2", publication_year: 2020 },
				],
				meta: { count: 150, db_response_time_ms: 25, page: 1, per_page: 50 },
			};

			const mockSampleResponse2: OpenAlexResponse<{ id: string; publication_year: number }> = {
				results: [{ id: "W3", publication_year: 2021 }],
				meta: { count: 100, db_response_time_ms: 30, page: 1, per_page: 33 },
			};

			const mockSampleResponse3: OpenAlexResponse<{ id: string; publication_year: number }> = {
				results: [{ id: "W4", publication_year: 2022 }],
				meta: { count: 50, db_response_time_ms: 20, page: 1, per_page: 17 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockResolvedValueOnce(mockSampleResponse1)
				.mockResolvedValueOnce(mockSampleResponse2)
				.mockResolvedValueOnce(mockSampleResponse3);

			const result = await samplingApi.stratifiedSample("works", "publication_year", {
				sample_size: 100,
				seed: 54321,
			});

			expect(result.samples).toHaveLength(4);
			expect(result.strata_info).toHaveLength(3);
			expect(result.strata_info[0]).toEqual({
				stratum: "2020",
				count: 150,
				sample_count: 2,
			});

			// Verify stratified sampling calls
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "works", {
				seed: 54325, // seed + key length
				filter: "publication_year:2020",
				sort: "random",
				per_page: 50,
			});
		});

		it("should fallback to regular sample when grouping not supported", async () => {
			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 100, db_response_time_ms: 30, page: 1, per_page: 100 },
				// group_by is undefined - not supported
			};

			const mockFallbackResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [
					{ id: "A1", display_name: "Author 1" },
					{ id: "A2", display_name: "Author 2" },
				],
				meta: { count: 100, db_response_time_ms: 40, page: 1, per_page: 50 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockResolvedValueOnce(mockFallbackResponse);

			const result = await samplingApi.stratifiedSample("authors", "unsupported_field", {
				sample_size: 50,
			});

			expect(result.samples).toHaveLength(2);
			expect(result.strata_info).toEqual([{
				stratum: "all",
				count: 100,
				sample_count: 2,
			}]);
		});

		it("should handle sampling errors gracefully", async () => {
			const loggerWarnSpy = vi.mocked(logger.warn);

			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 100, db_response_time_ms: 30, page: 1, per_page: 100 },
				group_by: [
					{ key: "error-stratum", key_display_name: "Error Stratum", count: 100 },
				],
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockRejectedValueOnce(new Error("Sampling API Error"));

			const result = await samplingApi.stratifiedSample("works", "type", {
				sample_size: 10,
			});

			expect(loggerWarnSpy).toHaveBeenCalledWith(
				"Failed to sample from stratum error-stratum",
				expect.objectContaining({
					stratumKey: "error-stratum",
					error: expect.any(Error)
				})
			);
			expect(result.samples).toEqual([]);
			expect(result.strata_info[0].sample_count).toBe(0);

			loggerWarnSpy.mockClear();
		});
	});

	describe("temporallyDiverseSample", () => {
		it("should create temporally diverse sample across periods", async () => {
			const mockRecentResponse: OpenAlexResponse<{ id: string; publication_year: number }> = {
				results: [{ id: "W1", publication_year: 2023 }],
				meta: { count: 1000, db_response_time_ms: 30, page: 1, per_page: 25 },
			};

			const mockModernResponse: OpenAlexResponse<{ id: string; publication_year: number }> = {
				results: [{ id: "W2", publication_year: 2015 }],
				meta: { count: 800, db_response_time_ms: 35, page: 1, per_page: 25 },
			};

			const mockEarlyResponse: OpenAlexResponse<{ id: string; publication_year: number }> = {
				results: [{ id: "W3", publication_year: 2005 }],
				meta: { count: 500, db_response_time_ms: 40, page: 1, per_page: 25 },
			};

			const mockHistoricalResponse: OpenAlexResponse<{ id: string; publication_year: number }> = {
				results: [{ id: "W4", publication_year: 1995 }],
				meta: { count: 200, db_response_time_ms: 45, page: 1, per_page: 25 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockRecentResponse)
				.mockResolvedValueOnce(mockModernResponse)
				.mockResolvedValueOnce(mockEarlyResponse)
				.mockResolvedValueOnce(mockHistoricalResponse);

			const result = await samplingApi.temporallyDiverseSample("works", {
				sample_size: 100,
				filter: "is_oa:true",
			});

			expect(result.samples).toHaveLength(4);
			expect(result.temporal_distribution).toHaveLength(4);
			expect(result.temporal_distribution[0]).toEqual({
				period: "Recent (2020-now)",
				count: 1000,
				sample_count: 1,
			});

			// Verify temporal filter construction for works
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(1, "works", {
				filter: "is_oa:true,publication_year:2020-2025",
				sort: "random",
				per_page: 25,
			});
		});

		it("should use created_date filters for non-works entities", async () => {
			const mockResponse: OpenAlexResponse<{ id: string; created_date: string }> = {
				results: [{ id: "A1", created_date: "2020-05-15" }],
				meta: { count: 100, db_response_time_ms: 25, page: 1, per_page: 25 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await samplingApi.temporallyDiverseSample("authors", { sample_size: 40 });

			// Check first call uses created_date filter for authors
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(1, "authors", {
				filter: "from_created_date:2020-01-01,to_created_date:2025-12-31",
				sort: "random",
				per_page: 10,
			});
		});

		it("should handle period sampling errors gracefully", async () => {
			const loggerWarnSpy = vi.mocked(logger.warn);

			mockClient.getResponse
				.mockRejectedValueOnce(new Error("Period 1 error"))
				.mockResolvedValueOnce({
					results: [{ id: "W1", publication_year: 2015 }],
					meta: { count: 100, db_response_time_ms: 30, page: 1, per_page: 25 },
				})
				.mockRejectedValueOnce(new Error("Period 3 error"))
				.mockResolvedValueOnce({
					results: [{ id: "W2", publication_year: 1995 }],
					meta: { count: 50, db_response_time_ms: 40, page: 1, per_page: 25 },
				});

			const result = await samplingApi.temporallyDiverseSample("works", { sample_size: 40 });

			expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
			expect(result.samples).toHaveLength(2);
			expect(result.temporal_distribution[0]).toEqual({
				period: "Recent (2020-now)",
				count: 0,
				sample_count: 0,
			});

			loggerWarnSpy.mockClear();
		});
	});

	describe("citationWeightedSample", () => {
		it("should create citation-weighted sample with 70/30 split", async () => {
			const mockHighCitedResponse: OpenAlexResponse<{ id: string; cited_by_count: number }> = {
				results: [
					{ id: "W1", cited_by_count: 100 },
					{ id: "W2", cited_by_count: 200 },
					{ id: "W3", cited_by_count: 150 },
				],
				meta: { count: 500, db_response_time_ms: 40, page: 1, per_page: 35 },
			};

			const mockRegularResponse: OpenAlexResponse<{ id: string; cited_by_count: number }> = {
				results: [
					{ id: "W4", cited_by_count: 5 },
					{ id: "W5", cited_by_count: 2 },
				],
				meta: { count: 2000, db_response_time_ms: 30, page: 1, per_page: 15 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockHighCitedResponse)
				.mockResolvedValueOnce(mockRegularResponse);

			const result = await samplingApi.citationWeightedSample("works", {
				sample_size: 50,
				seed: 99999,
			});

			expect(result.results).toHaveLength(5);
			expect(result.meta.count).toBe(2500); // Combined counts

			// Verify highly cited sample call
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(1, "works", {
				seed: 99999,
				filter: "cited_by_count:>10",
				sort: "random",
				per_page: 35,
			});

			// Verify regular sample call
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "works", {
				seed: 100999, // seed + 1000
				sort: "random",
				per_page: 15,
			});
		});

		it("should combine existing filter with citation filter", async () => {
			const mockHighCitedResponse: OpenAlexResponse<{ id: string }> = {
				results: [{ id: "A1" }],
				meta: { count: 100, db_response_time_ms: 30, page: 1, per_page: 7 },
			};

			const mockRegularResponse: OpenAlexResponse<{ id: string }> = {
				results: [{ id: "A2" }],
				meta: { count: 200, db_response_time_ms: 25, page: 1, per_page: 3 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockHighCitedResponse)
				.mockResolvedValueOnce(mockRegularResponse);

			await samplingApi.citationWeightedSample("authors", {
				sample_size: 10,
				filter: "works_count:>5",
			});

			// Verify combined filter for highly cited
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(1, "authors", {
				filter: "works_count:>5,cited_by_count:>10",
				sort: "random",
				per_page: 7,
			});

			// Verify regular sample without citation filter
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "authors", {
				filter: "works_count:>5",
				sort: "random",
				per_page: 3,
			});
		});
	});

	describe("abTestSample", () => {
		it("should create two independent sample groups and detect overlap", async () => {
			const mockGroupAResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [
					{ id: "W1", display_name: "Work 1" },
					{ id: "W2", display_name: "Work 2" },
					{ id: "W3", display_name: "Work 3" },
				],
				meta: { count: 1000, db_response_time_ms: 30, page: 1, per_page: 50 },
			};

			const mockGroupBResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [
					{ id: "W2", display_name: "Work 2" }, // Overlap with Group A
					{ id: "W4", display_name: "Work 4" },
					{ id: "W5", display_name: "Work 5" },
				],
				meta: { count: 1000, db_response_time_ms: 35, page: 1, per_page: 100 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupAResponse)
				.mockResolvedValueOnce(mockGroupBResponse);

			const result = await samplingApi.abTestSample(
				"works",
				{ sample_size: 50, seed: 1 },
				{ sample_size: 100, seed: 2 }
			);

			expect(result.groupA.results).toHaveLength(3);
			expect(result.groupB.results).toHaveLength(3);
			expect(result.overlap).toHaveLength(1);
			expect(result.overlap[0].id).toBe("W2");

			// Verify both sampling calls
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(1, "works", {
				seed: 1,
				sort: "random",
				per_page: 50,
			});

			expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "works", {
				seed: 2,
				sort: "random",
				per_page: 100,
			});
		});

		it("should handle no overlap between groups", async () => {
			const mockGroupAResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [{ id: "W1", display_name: "Work 1" }],
				meta: { count: 500, db_response_time_ms: 20, page: 1, per_page: 25 },
			};

			const mockGroupBResponse: OpenAlexResponse<{ id: string; display_name: string }> = {
				results: [{ id: "W2", display_name: "Work 2" }],
				meta: { count: 500, db_response_time_ms: 25, page: 1, per_page: 25 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupAResponse)
				.mockResolvedValueOnce(mockGroupBResponse);

			const result = await samplingApi.abTestSample(
				"works",
				{ sample_size: 25 },
				{ sample_size: 25 }
			);

			expect(result.overlap).toEqual([]);
		});
	});

	describe("qualitySample", () => {
		it("should apply quality filters for works", async () => {
			const mockResponse: OpenAlexResponse<{ id: string; has_doi: boolean; is_oa: boolean }> = {
				results: [{ id: "W1", has_doi: true, is_oa: true }],
				meta: { count: 100, db_response_time_ms: 25, page: 1, per_page: 20 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await samplingApi.qualitySample("works", { sample_size: 20 });

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "has_doi:true,is_oa:true",
				sort: "random",
				per_page: 20,
			});
		});

		it("should apply quality filters for authors", async () => {
			const mockResponse: OpenAlexResponse<{ id: string; works_count: number }> = {
				results: [{ id: "A1", works_count: 10 }],
				meta: { count: 50, db_response_time_ms: 30, page: 1, per_page: 15 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await samplingApi.qualitySample("authors", { sample_size: 15 });

			expect(mockClient.getResponse).toHaveBeenCalledWith("authors", {
				filter: "works_count:>5",
				sort: "random",
				per_page: 15,
			});
		});

		it("should combine existing filter with quality filters", async () => {
			const mockResponse: OpenAlexResponse<{ id: string }> = {
				results: [{ id: "S1" }],
				meta: { count: 25, db_response_time_ms: 35, page: 1, per_page: 10 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await samplingApi.qualitySample("sources", {
				sample_size: 10,
				filter: "is_oa:true",
			});

			expect(mockClient.getResponse).toHaveBeenCalledWith("sources", {
				filter: "is_oa:true,works_count:>100",
				sort: "random",
				per_page: 10,
			});
		});

		it("should apply default quality filters for unknown entity types", async () => {
			const mockResponse: OpenAlexResponse<{ id: string }> = {
				results: [{ id: "X1" }],
				meta: { count: 10, db_response_time_ms: 20, page: 1, per_page: 5 },
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			// Use unknown entity type to test default case
			await samplingApi.qualitySample("concepts" as "works", { sample_size: 5 });

			expect(mockClient.getResponse).toHaveBeenCalledWith("concepts", {
				filter: "works_count:>1",
				sort: "random",
				per_page: 5,
			});
		});
	});

	describe("shuffleArray", () => {
		it("should shuffle array deterministically with seed", () => {
			// Access private method through type assertion for testing
			const samplingApiWithPrivateMethods = samplingApi as unknown as {
        shuffleArray: <T>(array: T[], seed?: number) => void;
        seededRandom: (seed: number) => () => number;
      };

			const originalArray = [1, 2, 3, 4, 5];
			const testArray1 = [...originalArray];
			const testArray2 = [...originalArray];

			samplingApiWithPrivateMethods.shuffleArray(testArray1, 12345);
			samplingApiWithPrivateMethods.shuffleArray(testArray2, 12345);

			// Same seed should produce same shuffle
			expect(testArray1).toEqual(testArray2);
			// But result should be different from original
			expect(testArray1).not.toEqual(originalArray);
		});

		it("should shuffle array randomly without seed", () => {
			const samplingApiWithPrivateMethods = samplingApi as unknown as {
        shuffleArray: <T>(array: T[], seed?: number) => void;
      };

			const originalArray = [1, 2, 3, 4, 5];
			const testArray = [...originalArray];

			samplingApiWithPrivateMethods.shuffleArray(testArray);

			// Should still have same elements
			expect(testArray.sort()).toEqual(originalArray.sort());
		});
	});

	describe("seededRandom", () => {
		it("should generate reproducible random numbers", () => {
			const samplingApiWithPrivateMethods = samplingApi as unknown as {
        seededRandom: (seed: number) => () => number;
      };

			const random1 = samplingApiWithPrivateMethods.seededRandom(54321);
			const random2 = samplingApiWithPrivateMethods.seededRandom(54321);

			const sequence1 = [random1(), random1(), random1()];
			const sequence2 = [random2(), random2(), random2()];

			expect(sequence1).toEqual(sequence2);
			expect(sequence1.every(n => n >= 0 && n < 1)).toBe(true);
		});

		it("should generate different sequences for different seeds", () => {
			const samplingApiWithPrivateMethods = samplingApi as unknown as {
        seededRandom: (seed: number) => () => number;
      };

			const random1 = samplingApiWithPrivateMethods.seededRandom(11111);
			const random2 = samplingApiWithPrivateMethods.seededRandom(22222);

			const sequence1 = [random1(), random1(), random1()];
			const sequence2 = [random2(), random2(), random2()];

			expect(sequence1).not.toEqual(sequence2);
		});
	});

	describe("getQualityFilters", () => {
		it("should return correct quality filters for each entity type", () => {
			// Access private method through type assertion for testing
			const samplingApiWithPrivateMethods = samplingApi as unknown as {
        getQualityFilters: (entityType: string) => string;
      };

			expect(samplingApiWithPrivateMethods.getQualityFilters("works")).toBe("has_doi:true,is_oa:true");
			expect(samplingApiWithPrivateMethods.getQualityFilters("authors")).toBe("works_count:>5");
			expect(samplingApiWithPrivateMethods.getQualityFilters("sources")).toBe("works_count:>100");
			expect(samplingApiWithPrivateMethods.getQualityFilters("institutions")).toBe("works_count:>50");
			expect(samplingApiWithPrivateMethods.getQualityFilters("unknown")).toBe("works_count:>1");
		});
	});
});