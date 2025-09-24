import { describe, it, expect, beforeEach, vi } from "vitest";
import { GroupingApi } from "./grouping";
import type { OpenAlexBaseClient } from "../client";
import type { OpenAlexResponse } from "../types";

// Mock the client
const mockClient = {
	getResponse: vi.fn(),
} as unknown as jest.Mocked<OpenAlexBaseClient>;

describe("GroupingApi", () => {
	let groupingApi: GroupingApi;

	beforeEach(() => {
		vi.clearAllMocks();
		groupingApi = new GroupingApi(mockClient);
	});

	describe("groupBy", () => {
		it("should group entities by specified field with default parameters", async () => {
			const mockResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 100, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "high-impact", key_display_name: "High Impact", count: 75 },
					{ key: "low-impact", key_display_name: "Low Impact", count: 25 },
				],
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			const result = await groupingApi.groupBy("authors", "impact_level");

			expect(mockClient.getResponse).toHaveBeenCalledWith("authors", {
				group_by: "impact_level",
				per_page: 1,
			});

			expect(result.groups).toHaveLength(2);
			expect(result.groups[0]).toEqual({
				key: "high-impact",
				key_display_name: "High Impact",
				count: 75,
				percentage: 75,
			});
			expect(result.total_count).toBe(100);
		});

		it("should apply min_count filtering and group_limit", async () => {
			const mockResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 200, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "CS", key_display_name: "Computer Science", count: 150 },
					{ key: "Biology", key_display_name: "Biology", count: 50 },
				],
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			const params = {
				filter: "type:journal-article",
				min_count: 40,
				group_limit: 5,
			};

			const result = await groupingApi.groupBy("works", "primary_topic.field.display_name", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("works", {
				filter: "type:journal-article",
				group_by: "primary_topic.field.display_name",
				per_page: 1,
			});

			expect(result.groups).toHaveLength(2);
		});

		it("should handle missing group_by in response", async () => {
			const mockResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 0, db_response_time_ms: 50, page: 1, per_page: 25 },
				// group_by is missing - simulates unsupported grouping
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await expect(groupingApi.groupBy("authors", "unsupported_field")).rejects.toThrow(
				"Grouping not supported for entity type: authors with field: unsupported_field"
			);
		});
	});

	describe("getTemporalTrends", () => {
		it("should get temporal trends with default parameters", async () => {
			const mockMainGroupsResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 100, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "single-group", key_display_name: "Single Group", count: 100 },
				],
			};

			const mockTemporalResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 50, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "2020", key_display_name: "2020", count: 20 },
					{ key: "2021", key_display_name: "2021", count: 30 },
				],
			};

			const mockOverallResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 200, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "2020", key_display_name: "2020", count: 80 },
					{ key: "2021", key_display_name: "2021", count: 120 },
				],
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockMainGroupsResponse)
				.mockResolvedValueOnce(mockTemporalResponse)
				.mockResolvedValueOnce(mockOverallResponse);

			const result = await groupingApi.getTemporalTrends("works", "type", "publication_year");

			expect(result.trends).toHaveLength(1);
			expect(result.trends[0].temporal_data).toEqual([
				{ year: 2020, count: 20, percentage_of_group: 20 },
				{ year: 2021, count: 30, percentage_of_group: 30 },
			]);
			expect(result.overall_trend).toEqual([
				{ year: 2020, total_count: 80 },
				{ year: 2021, total_count: 120 },
			]);
		});

		it("should handle custom year ranges and time fields", async () => {
			const mockMainGroupsResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 50, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "single-group", key_display_name: "Single Group", count: 50 },
				],
			};

			const mockTemporalResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 30, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "2015", key_display_name: "2015", count: 30 },
				],
			};

			const mockOverallResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 100, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "2015", key_display_name: "2015", count: 100 },
				],
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockMainGroupsResponse)
				.mockResolvedValueOnce(mockTemporalResponse)
				.mockResolvedValueOnce(mockOverallResponse);

			const params = {
				from_year: 2015,
				to_year: 2015,
				group_limit: 1,
			};

			await groupingApi.getTemporalTrends("authors", "country", "created_date", params);

			// Check that created_date filter was used instead of publication_year
			expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "authors", {
				filter: "country:single-group,from_created_date:2015-01-01,to_created_date:2015-12-31",
				group_by: "created_date",
				per_page: 1,
			});
		});

		it("should handle errors in temporal breakdown gracefully", async () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const mockMainGroupsResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 100, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "error-group", key_display_name: "Error Group", count: 100 },
				],
			};

			const mockOverallResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 200, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "2020", key_display_name: "2020", count: 200 },
				],
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockMainGroupsResponse)
				.mockRejectedValueOnce(new Error("API Error"))
				.mockResolvedValueOnce(mockOverallResponse);

			const result = await groupingApi.getTemporalTrends("works", "type");

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"[api] Failed to get temporal trends for group error-group",
				expect.objectContaining({
					groupKey: "error-group",
					error: expect.any(Error)
				})
			);
			expect(result.trends).toEqual([]);
			expect(result.overall_trend).toHaveLength(1);

			consoleWarnSpy.mockRestore();
		});
	});

	describe("multiDimensionalGroup", () => {
		it("should perform basic two-dimensional grouping", async () => {
			const mockPrimaryResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 200, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "journal-article", key_display_name: "Journal Article", count: 150 },
					{ key: "book", key_display_name: "Book", count: 50 },
				],
			};

			const mockSecondaryResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 200, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "true", key_display_name: "Open Access", count: 120 },
					{ key: "false", key_display_name: "Closed Access", count: 80 },
				],
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockPrimaryResponse)
				.mockResolvedValueOnce(mockSecondaryResponse)
				.mockResolvedValue({
					results: [],
					meta: { count: 75, db_response_time_ms: 50, page: 1, per_page: 25 },
					group_by: [{ key: "combined", key_display_name: "Combined", count: 75 }],
				});

			const params = {
				primary_group_by: "type",
				secondary_group_by: "is_oa",
				max_groups_per_dimension: 5,
			};

			const result = await groupingApi.multiDimensionalGroup("works", params);

			expect(result.dimensions.primary).toHaveLength(2);
			expect(result.dimensions.secondary).toHaveLength(2);
			expect(result.cross_tabulation).toBeInstanceOf(Array);
			expect(result.totals.grand_total).toBeGreaterThan(0);
		});
	});

	describe("getTopPerformersByGroup", () => {
		it("should get top performers by group with default parameters", async () => {
			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 300, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "CS", key_display_name: "Computer Science", count: 150 },
					{ key: "Biology", key_display_name: "Biology", count: 150 },
				],
			};

			const mockPerformersResponse = {
				results: [
					{ id: "A1", display_name: "Top Author 1", cited_by_count: 500 },
					{ id: "A2", display_name: "Top Author 2", cited_by_count: 400 },
				],
				meta: { count: 2, db_response_time_ms: 50, page: 1, per_page: 5 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockResolvedValue(mockPerformersResponse);

			const result = await groupingApi.getTopPerformersByGroup(
				"authors",
				"field",
				"cited_by_count"
			);

			expect(result.groups).toHaveLength(2);
			expect(result.groups[0]).toEqual({
				group: "CS",
				group_display_name: "Computer Science",
				group_total: 150,
				top_performers: [
					{
						id: "A1",
						display_name: "Top Author 1",
						metric_value: 500,
						rank_in_group: 1,
					},
					{
						id: "A2",
						display_name: "Top Author 2",
						metric_value: 400,
						rank_in_group: 2,
					},
				],
			});
		});

		it("should handle custom parameters and limits", async () => {
			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 200, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "single-group", key_display_name: "Single Group", count: 200 },
				],
			};

			const mockPerformersResponse = {
				results: [
					{ id: "W1", display_name: "Top Work 1", works_count: 100 },
					{ id: "W2", display_name: "Top Work 2", works_count: 90 },
					{ id: "W3", display_name: "Top Work 3", works_count: 80 },
				],
				meta: { count: 3, db_response_time_ms: 50, page: 1, per_page: 3 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockResolvedValueOnce(mockPerformersResponse);

			await groupingApi.getTopPerformersByGroup("works", "type", "works_count", {
				filter: "is_oa:true",
				top_n: 3,
			});

			expect(mockClient.getResponse).toHaveBeenNthCalledWith(2, "works", {
				filter: "is_oa:true,type:single-group",
				sort: "works_count",
				per_page: 3,
				select: ["id", "display_name", "works_count"],
			});
		});

		it("should handle API errors gracefully", async () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
				results: [],
				meta: { count: 100, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "error-group", key_display_name: "Error Group", count: 100 },
				],
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockRejectedValueOnce(new Error("API Error"));

			const result = await groupingApi.getTopPerformersByGroup("authors", "field");

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"[api] Failed to get top performers for group error-group",
				expect.objectContaining({
					groupKey: "error-group",
					error: expect.any(Error)
				})
			);
			expect(result.groups).toHaveLength(0);

			consoleWarnSpy.mockRestore();
		});
	});

	describe("getDistributionStats", () => {
		it("should calculate distribution statistics without percentiles", async () => {
			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number; cited_by_count?: number }> }> = {
				results: [],
				meta: { count: 200, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "high-impact", key_display_name: "High Impact", count: 100, cited_by_count: 5000 },
					{ key: "low-impact", key_display_name: "Low Impact", count: 100, cited_by_count: 10000 },
				],
			};

			mockClient.getResponse.mockResolvedValue(mockGroupResponse);

			const result = await groupingApi.getDistributionStats("authors", "impact_level");

			expect(result.groups).toHaveLength(2);
			expect(result.groups[0]).toEqual({
				group: "high-impact",
				group_display_name: "High Impact",
				count: 100,
				stats: {
					total: 5000,
					mean: 50,
					median: undefined,
					percentiles: undefined,
				},
			});

			expect(result.overall_stats).toEqual({
				total_entities: 200,
				grand_total_metric: 15000,
				overall_mean: 75,
			});
		});

		it("should calculate percentiles when enabled and sufficient data", async () => {
			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number; cited_by_count?: number }> }> = {
				results: [],
				meta: { count: 50, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "large-group", key_display_name: "Large Group", count: 50, cited_by_count: 10000 },
				],
			};

			const mockSampleResponse = {
				results: [
					{ cited_by_count: 100 },
					{ cited_by_count: 150 },
					{ cited_by_count: 200 },
					{ cited_by_count: 250 },
					{ cited_by_count: 300 },
				],
				meta: { count: 5, db_response_time_ms: 50, page: 1, per_page: 50 },
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockResolvedValueOnce(mockSampleResponse);

			const result = await groupingApi.getDistributionStats("authors", "impact_level", "cited_by_count", {
				calculate_percentiles: true,
			});

			expect(result.groups[0].stats.percentiles).toEqual({
				p25: 150, // 25th percentile
				p75: 250, // 75th percentile
				p90: 280, // 90th percentile
				p95: 280, // 95th percentile (approximation)
				p99: 280, // 99th percentile (approximation)
			});

			expect(result.groups[0].stats.median).toBe(200);
		});

		it("should skip percentiles for small groups", async () => {
			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number; cited_by_count?: number }> }> = {
				results: [],
				meta: { count: 5, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "small-group", key_display_name: "Small Group", count: 5, cited_by_count: 500 },
				],
			};

			mockClient.getResponse.mockResolvedValue(mockGroupResponse);

			const result = await groupingApi.getDistributionStats("authors", "impact_level", "cited_by_count", {
				calculate_percentiles: true,
			});

			expect(result.groups[0].stats.percentiles).toBeUndefined();
		});

		it("should handle percentile calculation errors gracefully", async () => {
			const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number; cited_by_count?: number }> }> = {
				results: [],
				meta: { count: 50, db_response_time_ms: 50, page: 1, per_page: 25 },
				group_by: [
					{ key: "error-group", key_display_name: "Error Group", count: 50, cited_by_count: 5000 },
				],
			};

			mockClient.getResponse
				.mockResolvedValueOnce(mockGroupResponse)
				.mockRejectedValueOnce(new Error("Sample fetch error"));

			const result = await groupingApi.getDistributionStats("authors", "impact_level", "cited_by_count", {
				calculate_percentiles: true,
			});

			expect(consoleWarnSpy).toHaveBeenCalledWith(
				"[api] Failed to calculate percentiles for group error-group",
				expect.objectContaining({
					groupKey: "error-group",
					error: expect.any(Error)
				})
			);
			expect(result.groups[0].stats.percentiles).toBeUndefined();

			consoleWarnSpy.mockRestore();
		});
	});

	describe("percentile", () => {
		it("should calculate percentiles correctly", async () => {
			// Access private method through type assertion for testing
			const groupingApiWithPrivateMethods = groupingApi as unknown as {
        percentile: (sortedArray: number[], percentile: number) => number;
      };

			const sortedArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

			expect(groupingApiWithPrivateMethods.percentile(sortedArray, 25)).toBe(3.25);
			expect(groupingApiWithPrivateMethods.percentile(sortedArray, 50)).toBe(5.5);
			expect(groupingApiWithPrivateMethods.percentile(sortedArray, 75)).toBe(7.75);
			expect(groupingApiWithPrivateMethods.percentile(sortedArray, 90)).toBe(9.1);
		});

		it("should handle edge cases in percentile calculation", async () => {
			const groupingApiWithPrivateMethods = groupingApi as unknown as {
        percentile: (sortedArray: number[], percentile: number) => number;
      };

			// Single element array
			expect(groupingApiWithPrivateMethods.percentile([5], 50)).toBe(5);

			// Empty array edge cases
			expect(groupingApiWithPrivateMethods.percentile([1, 2], 0)).toBe(1);
			expect(groupingApiWithPrivateMethods.percentile([1, 2], 100)).toBe(2);
		});
	});
});