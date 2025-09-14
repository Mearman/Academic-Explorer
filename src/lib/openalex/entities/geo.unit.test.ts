/**
 * Comprehensive unit tests for GeoApi entity class
 * Tests all methods including CRUD, search, filtering, and streaming
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeoApi, SearchGeoOptions } from "./geo";
import { OpenAlexBaseClient } from "../client";
import type {
	Geo,
	OpenAlexResponse
} from "../types";

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

describe("GeoApi", () => {
	let geoApi: GeoApi;
	let mockClient: vi.Mocked<OpenAlexBaseClient>;

	beforeEach(() => {
		mockClient = {
			getById: vi.fn(),
			getResponse: vi.fn(),
			stream: vi.fn(),
			getAll: vi.fn(),
		} as unknown as vi.Mocked<OpenAlexBaseClient>;

		geoApi = new GeoApi(mockClient);
	});

	describe("getGeo", () => {
		it("should fetch a single geo entity by ID", async () => {
			const mockGeo: Partial<Geo> = {
				id: "G123456789",
				display_name: "United States",
				country_code: "US",
				continent: "North America",
				works_count: 1000000,
				cited_by_count: 5000000,
			};

			mockClient.getById.mockResolvedValue(mockGeo as Geo);

			const result = await geoApi.getGeo("G123456789");

			expect(mockClient.getById).toHaveBeenCalledWith("geo", "G123456789", {});
			expect(result).toEqual(mockGeo);
		});

		it("should pass additional parameters to client", async () => {
			const mockGeo: Partial<Geo> = {
				id: "G123456789",
				display_name: "United States",
			};

			const params = { select: ["id", "display_name"] };
			mockClient.getById.mockResolvedValue(mockGeo as Geo);

			await geoApi.getGeo("G123456789", params);

			expect(mockClient.getById).toHaveBeenCalledWith("geo", "G123456789", params);
		});
	});

	describe("getGeos", () => {
		it("should fetch geo entities without parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			const result = await geoApi.getGeos();

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {});
			expect(result).toEqual(mockResponse);
		});

		it("should fetch geo entities with parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const params = {
				filter: "continent:Europe",
				sort: "works_count:desc",
				per_page: 50,
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getGeos(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", params);
		});
	});

	describe("searchGeos", () => {
		it("should search geo entities with query and default options", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.searchGeos("United States");

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				search: "United States",
				filter: "",
				sort: "relevance_score",
				page: 1,
				per_page: 25,
				select: undefined,
			});
		});

		it("should search geo entities with custom options", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const options: SearchGeoOptions = {
				filters: { continent: "Europe" },
				sort: "works_count",
				page: 2,
				per_page: 50,
				select: ["id", "display_name", "works_count"],
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.searchGeos("research", options);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				search: "research",
				filter: "continent:Europe",
				sort: "works_count",
				page: 2,
				per_page: 50,
				select: ["id", "display_name", "works_count"],
			});
		});
	});

	describe("getGeosByContinent", () => {
		it("should get geo entities by continent", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getGeosByContinent("Europe");

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				filter: "continent:Europe",
			});
		});

		it("should get geo entities by continent with additional parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const params = { sort: "works_count", per_page: 50 };
			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getGeosByContinent("Asia", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				sort: "works_count",
				per_page: 50,
				filter: "continent:Asia",
			});
		});
	});

	describe("getGeosByCountryCode", () => {
		it("should get geo entities by country code", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getGeosByCountryCode("US");

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				filter: "country_code:US",
			});
		});

		it("should get geo entities by country code with additional parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const params = { sort: "works_count", per_page: 25 };
			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getGeosByCountryCode("GB", params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				sort: "works_count",
				per_page: 25,
				filter: "country_code:GB",
			});
		});
	});

	describe("getContinents", () => {
		it("should get continents", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getContinents();

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				filter: "",
				sort: "works_count",
			});
		});

		it("should get continents with parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const params = { select: ["id", "display_name", "works_count"] };
			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getContinents(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				select: ["id", "display_name", "works_count"],
				filter: "",
				sort: "works_count",
			});
		});
	});

	describe("getTopResearchCountries", () => {
		it("should get top research countries", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getTopResearchCountries();

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				filter: "works_count:>1000",
				sort: "works_count",
			});
		});

		it("should get top research countries with parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const params = { per_page: 20, select: ["id", "display_name", "works_count"] };
			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getTopResearchCountries(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				per_page: 20,
				select: ["id", "display_name", "works_count"],
				filter: "works_count:>1000",
				sort: "works_count",
			});
		});
	});

	describe("getRandomGeos", () => {
		it("should get random geo entities", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getRandomGeos();

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				sort: "random",
			});
		});

		it("should get random geo entities with parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const params = { per_page: 10, select: ["id", "display_name", "continent"] };
			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getRandomGeos(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				per_page: 10,
				select: ["id", "display_name", "continent"],
				sort: "random",
			});
		});
	});

	describe("streamGeos", () => {
		it("should stream geo entities", async () => {
			const mockBatch: Geo[] = [
        {
        	id: "G1",
        	display_name: "United States",
        	country_code: "US",
        	continent: "North America",
        	works_count: 1000000,
        	cited_by_count: 5000000,
        } as Geo,
			];

			async function* mockStreamGenerator() {
				yield mockBatch;
			}

			mockClient.stream = vi.fn().mockReturnValue(mockStreamGenerator());

			const batches = [];
			for await (const batch of geoApi.streamGeos()) {
				batches.push(batch);
			}

			expect(mockClient.stream).toHaveBeenCalledWith("geo", {});
			expect(batches).toEqual([mockBatch]);
		});

		it("should stream geo entities with parameters", async () => {
			const mockBatch: Geo[] = [
        {
        	id: "G1",
        	display_name: "United Kingdom",
        	country_code: "GB",
        	continent: "Europe",
        	works_count: 500000,
        	cited_by_count: 2500000,
        } as Geo,
			];

			async function* mockStreamGenerator() {
				yield mockBatch;
			}

			mockClient.stream = vi.fn().mockReturnValue(mockStreamGenerator());

			const params = { filter: "continent:Europe" };
			const batches = [];
			for await (const batch of geoApi.streamGeos(params)) {
				batches.push(batch);
			}

			expect(mockClient.stream).toHaveBeenCalledWith("geo", params);
			expect(batches).toEqual([mockBatch]);
		});
	});

	describe("getAllGeos", () => {
		it("should get all geo entities", async () => {
			const mockGeos: Geo[] = [
        {
        	id: "G1",
        	display_name: "United States",
        	country_code: "US",
        	continent: "North America",
        	works_count: 1000000,
        	cited_by_count: 5000000,
        } as Geo,
			];

			mockClient.getAll.mockResolvedValue(mockGeos);

			const result = await geoApi.getAllGeos();

			expect(mockClient.getAll).toHaveBeenCalledWith("geo", {}, undefined);
			expect(result).toEqual(mockGeos);
		});

		it("should get all geo entities with parameters and limit", async () => {
			const mockGeos: Geo[] = [
        {
        	id: "G1",
        	display_name: "United States",
        	works_count: 1000000,
        } as Geo,
			];

			mockClient.getAll.mockResolvedValue(mockGeos);

			const params = { filter: "continent:Europe" };
			await geoApi.getAllGeos(params, 100);

			expect(mockClient.getAll).toHaveBeenCalledWith("geo", params, 100);
		});
	});

	describe("getGeoStatsByContinent", () => {
		it("should calculate geo statistics by continent", async () => {
			const mockGeos: Geo[] = [
        {
        	id: "G1",
        	continent: "Europe",
        	works_count: 100,
        	cited_by_count: 500,
        } as Geo,
        {
        	id: "G2",
        	continent: "Europe",
        	works_count: 200,
        	cited_by_count: 800,
        } as Geo,
        {
        	id: "G3",
        	continent: "Asia",
        	works_count: 300,
        	cited_by_count: 1200,
        } as Geo,
			];

			mockClient.getAll.mockResolvedValue(mockGeos);

			const result = await geoApi.getGeoStatsByContinent();

			expect(mockClient.getAll).toHaveBeenCalledWith("geo", {}, 1000);
			expect(result).toEqual({
				Europe: {
					count: 2,
					total_works: 300,
					total_citations: 1300,
					avg_works_per_region: 150,
				},
				Asia: {
					count: 1,
					total_works: 300,
					total_citations: 1200,
					avg_works_per_region: 300,
				},
			});
		});

		it("should handle geo entities without continent", async () => {
			const mockGeos: Geo[] = [
        {
        	id: "G1",
        	continent: null,
        	works_count: 100,
        	cited_by_count: 500,
        } as Geo,
			];

			mockClient.getAll.mockResolvedValue(mockGeos);

			const result = await geoApi.getGeoStatsByContinent();

			expect(result).toEqual({
				Unknown: {
					count: 1,
					total_works: 100,
					total_citations: 500,
					avg_works_per_region: 100,
				},
			});
		});

		it("should pass parameters to getAllGeos", async () => {
			const mockGeos: Geo[] = [];
			mockClient.getAll.mockResolvedValue(mockGeos);

			const params = { filter: "works_count:>100" };
			await geoApi.getGeoStatsByContinent(params);

			expect(mockClient.getAll).toHaveBeenCalledWith("geo", params, 1000);
		});
	});

	describe("getGeosByWorksCount", () => {
		it("should get geo entities by minimum works count", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getGeosByWorksCount(500);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				filter: "works_count:>=500",
			});
		});

		it("should get geo entities by works count with additional parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const params = { sort: "works_count", per_page: 30 };
			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getGeosByWorksCount(1000, params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				sort: "works_count",
				per_page: 30,
				filter: "works_count:>=1000",
			});
		});
	});

	describe("getEmergingResearchRegions", () => {
		it("should get emerging research regions", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
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

			await geoApi.getEmergingResearchRegions();

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				filter: `works_count:>50,from_created_date:${currentYear - 5}-01-01`,
				sort: "works_count",
			});
		});

		it("should get emerging research regions with parameters", async () => {
			const mockResponse: OpenAlexResponse<Geo> = {
				results: [],
				meta: {
					count: 0,
					db_response_time_ms: 50,
					page: 1,
					per_page: 25,
				},
			};

			const currentYear = new Date().getFullYear();
			const params = { per_page: 15, sort: "works_count" };
			mockClient.getResponse.mockResolvedValue(mockResponse);

			await geoApi.getEmergingResearchRegions(params);

			expect(mockClient.getResponse).toHaveBeenCalledWith("geo", {
				per_page: 15,
				sort: "works_count",
				filter: `works_count:>50,from_created_date:${currentYear - 5}-01-01`,
			});
		});
	});

	describe("buildFilterString", () => {
		it("should handle empty filters", () => {
			const api = geoApi as unknown as { buildFilterString: (filters: Record<string, unknown>) => string };
			const result = api.buildFilterString({});
			expect(result).toBe("");
		});

		it("should handle single filter", () => {
			const api = geoApi as unknown as { buildFilterString: (filters: Record<string, unknown>) => string };
			const result = api.buildFilterString({ continent: "Europe" });
			expect(result).toBe("continent:Europe");
		});

		it("should handle multiple filters", () => {
			const api = geoApi as unknown as { buildFilterString: (filters: Record<string, unknown>) => string };
			const result = api.buildFilterString({
				continent: "Europe",
				"works_count": ">100",
			});
			expect(result).toBe("continent:Europe,works_count:>100");
		});

		it("should handle array values", () => {
			const api = geoApi as unknown as { buildFilterString: (filters: Record<string, unknown>) => string };
			const result = api.buildFilterString({
				continent: ["Europe", "Asia"],
				"works_count": ">100",
			});
			expect(result).toBe("continent:Europe|Asia,works_count:>100");
		});

		it("should handle boolean values", () => {
			const api = geoApi as unknown as { buildFilterString: (filters: Record<string, unknown>) => string };
			const result = api.buildFilterString({
				is_global: true,
				has_fulltext: false,
			});
			expect(result).toBe("is_global:true,has_fulltext:false");
		});

		it("should skip undefined and null values", () => {
			const api = geoApi as unknown as { buildFilterString: (filters: Record<string, unknown>) => string };
			const result = api.buildFilterString({
				continent: "Europe",
				country: undefined,
				region: null,
				"works_count": ">100",
			});
			expect(result).toBe("continent:Europe,works_count:>100");
		});
	});
});