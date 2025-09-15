/**
 * OpenAlex Geo API Entity Methods
 * Provides methods for interacting with Geo entities (continents, countries, regions) through the OpenAlex API
 */

import {
	Geo,
	GeoFilters,
	QueryParams,
	OpenAlexResponse,
} from "../types";
import { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";

/**
 * Extended query parameters specific to Geo API
 * Note: Uses string filter to maintain compatibility with base QueryParams
 */
export type GeoQueryParams = QueryParams;

/**
 * Options for searching geo entities
 */
export interface SearchGeoOptions {
  filters?: GeoFilters;
  sort?: "relevance_score" | "cited_by_count" | "works_count" | "created_date";
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * Geo API class providing methods for geographic region operations
 */
export class GeoApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
   * Get a single geo entity by its OpenAlex ID
   *
   * @param id - The geo ID
   * @param params - Additional query parameters
   * @returns Promise resolving to a geo entity
   *
   * @example
   * ```typescript
   * const geo = await geoApi.getGeo('G123456789');
   * ```
   */
	async getGeo(id: string, params: QueryParams = {}): Promise<Geo> {
		return this.client.getById<Geo>("geo", id, params);
	}

	/**
   * Get a list of geo entities with optional filtering and pagination
   *
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving to a paginated response of geo entities
   *
   * @example
   * ```typescript
   * const response = await geoApi.getGeos({
   *   filter: { 'continent': 'Europe' },
   *   page: 1,
   *   per_page: 25
   * });
   * ```
   */
	async getGeos(params: GeoQueryParams = {}): Promise<OpenAlexResponse<Geo>> {
		return this.client.getResponse<Geo>("geo", params);
	}

	/**
   * Search for geo entities using text search
   *
   * @param query - Search query string
   * @param options - Search options including filters and pagination
   * @returns Promise resolving to search results
   *
   * @example
   * ```typescript
   * const results = await geoApi.searchGeos('United States', {
   *   sort: 'works_count',
   *   per_page: 10
   * });
   * ```
   */
	async searchGeos(
		query: string,
		options: SearchGeoOptions = {}
	): Promise<OpenAlexResponse<Geo>> {
		const { filters = {}, sort = "relevance_score", page = 1, per_page = 25, select } = options;

		const params: GeoQueryParams = {
			search: query,
			filter: buildFilterString(filters),
			sort,
			page,
			per_page,
			select,
		};

		return this.getGeos(params);
	}

	/**
   * Get geo entities by continent
   *
   * @param continent - Continent name
   * @param params - Additional query parameters
   * @returns Promise resolving to geo entities in the continent
   *
   * @example
   * ```typescript
   * const europeanCountries = await geoApi.getGeosByContinent('Europe', {
   *   sort: 'works_count',
   *   per_page: 50
   * });
   * ```
   */
	async getGeosByContinent(
		continent: string,
		params: GeoQueryParams = {}
	): Promise<OpenAlexResponse<Geo>> {
		const filters: GeoFilters = {
			"continent": continent,
		};

		return this.getGeos({
			...params,
			filter: this.buildFilterString(filters),
		});
	}

	/**
   * Get geo entities by country code
   *
   * @param countryCode - ISO country code (e.g., 'US', 'GB', 'DE')
   * @param params - Additional query parameters
   * @returns Promise resolving to geo entities for the country
   *
   * @example
   * ```typescript
   * const usRegions = await geoApi.getGeosByCountryCode('US', {
   *   sort: 'works_count',
   *   per_page: 25
   * });
   * ```
   */
	async getGeosByCountryCode(
		countryCode: string,
		params: GeoQueryParams = {}
	): Promise<OpenAlexResponse<Geo>> {
		const filters: GeoFilters = {
			"country_code": countryCode,
		};

		return this.getGeos({
			...params,
			filter: this.buildFilterString(filters),
		});
	}

	/**
   * Get all continents
   *
   * @param params - Additional query parameters
   * @returns Promise resolving to continent geo entities
   *
   * @example
   * ```typescript
   * const continents = await geoApi.getContinents({
   *   sort: 'works_count',
   *   select: ['id', 'display_name', 'works_count', 'cited_by_count']
   * });
   * ```
   */
	async getContinents(params: GeoQueryParams = {}): Promise<OpenAlexResponse<Geo>> {
		const filters: GeoFilters = {
			// Continents typically don't have country codes - exclude items with country codes
			// Note: OpenAlex may not support negation, so this might need adjustment
		};

		return this.getGeos({
			...params,
			filter: this.buildFilterString(filters),
			sort: "works_count",
		});
	}

	/**
   * Get countries with most research output
   *
   * @param params - Additional query parameters
   * @returns Promise resolving to top research countries
   *
   * @example
   * ```typescript
   * const topResearchCountries = await geoApi.getTopResearchCountries({
   *   per_page: 20,
   *   select: ['id', 'display_name', 'country_code', 'works_count']
   * });
   * ```
   */
	async getTopResearchCountries(params: GeoQueryParams = {}): Promise<OpenAlexResponse<Geo>> {
		const filters: GeoFilters = {
			"works_count": ">1000",
		};

		return this.getGeos({
			...params,
			filter: this.buildFilterString(filters),
			sort: "works_count",
		});
	}

	/**
   * Get random geo entities
   *
   * @param params - Query parameters
   * @returns Promise resolving to random geo entities
   *
   * @example
   * ```typescript
   * const randomGeos = await geoApi.getRandomGeos({
   *   per_page: 10,
   *   select: ['id', 'display_name', 'continent', 'works_count']
   * });
   * ```
   */
	async getRandomGeos(params: GeoQueryParams = {}): Promise<OpenAlexResponse<Geo>> {
		return this.getGeos({
			...params,
			sort: "random",
		});
	}

	/**
   * Stream all geo entities using cursor pagination
   *
   * @param params - Query parameters for filtering
   * @yields Batches of geo entities
   *
   * @example
   * ```typescript
   * for await (const geoBatch of geoApi.streamGeos({ filter: { 'works_count': '>100' } })) {
   *   logger.info("api", `Processing ${geoBatch.length} geo entities`);
   * }
   * ```
   */
	async *streamGeos(params: GeoQueryParams = {}): AsyncGenerator<Geo[], void, unknown> {
		yield* this.client.stream<Geo>("geo", params);
	}

	/**
   * Get all geo entities (use with caution for large datasets)
   *
   * @param params - Query parameters for filtering
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to array of all matching geo entities
   *
   * @example
   * ```typescript
   * const allCountries = await geoApi.getAllGeos({
   *   filter: { 'continent': 'Europe' }
   * }, 100);
   * ```
   */
	async getAllGeos(
		params: GeoQueryParams = {},
		maxResults?: number
	): Promise<Geo[]> {
		return this.client.getAll<Geo>("geo", params, maxResults);
	}

	/**
   * Get geo statistics by continent
   *
   * @param params - Query parameters for filtering
   * @returns Promise resolving to aggregated statistics by continent
   *
   * @example
   * ```typescript
   * const continentStats = await geoApi.getGeoStatsByContinent();
   * ```
   */
	async getGeoStatsByContinent(params: GeoQueryParams = {}): Promise<{
    [continent: string]: {
      count: number;
      total_works: number;
      total_citations: number;
      avg_works_per_region: number;
    };
  }> {
		const allGeos = await this.getAllGeos(params, 1000);
		const statsByContinent: Record<string, {
      count: number;
      total_works: number;
      total_citations: number;
      avg_works_per_region: number;
    }> = {};

		for (const geo of allGeos) {
			const continent = geo.continent || "Unknown";

			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (!statsByContinent[continent]) {
				statsByContinent[continent] = {
					count: 0,
					total_works: 0,
					total_citations: 0,
					avg_works_per_region: 0,
				};
			}

			statsByContinent[continent].count += 1;
			statsByContinent[continent].total_works += geo.works_count;
			statsByContinent[continent].total_citations += geo.cited_by_count;
		}

		// Calculate averages
		for (const continent in statsByContinent) {
			const stats = statsByContinent[continent];
			stats.avg_works_per_region = stats.total_works / stats.count;
		}

		return statsByContinent;
	}

	/**
   * Get geo entities with minimum works count
   *
   * @param minWorksCount - Minimum number of works
   * @param params - Additional query parameters
   * @returns Promise resolving to filtered geo entities
   *
   * @example
   * ```typescript
   * const activeRegions = await geoApi.getGeosByWorksCount(500, {
   *   sort: 'works_count',
   *   per_page: 30
   * });
   * ```
   */
	async getGeosByWorksCount(
		minWorksCount: number,
		params: GeoQueryParams = {}
	): Promise<OpenAlexResponse<Geo>> {
		const filters: GeoFilters = {
			"works_count": `>=${String(minWorksCount)}`,
		};

		return this.getGeos({
			...params,
			filter: this.buildFilterString(filters),
		});
	}

	/**
   * Get emerging research regions (regions with growing research output)
   *
   * @param params - Additional query parameters
   * @returns Promise resolving to emerging geo entities
   *
   * @example
   * ```typescript
   * const emerging = await geoApi.getEmergingResearchRegions({
   *   per_page: 15,
   *   sort: 'works_count'
   * });
   * ```
   */
	async getEmergingResearchRegions(params: GeoQueryParams = {}): Promise<OpenAlexResponse<Geo>> {
		const currentYear = new Date().getFullYear();

		const filters: GeoFilters = {
			"works_count": ">50",
			"from_created_date": `${String(currentYear - 5)}-01-01`, // Last 5 years
		};

		return this.getGeos({
			...params,
			filter: this.buildFilterString(filters),
			sort: "works_count",
		});
	}

	/**
   * Build filter string from GeoFilters object
   * @private
   */
	private buildFilterString(filters: GeoFilters): string {
		const filterParts: string[] = [];
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (Array.isArray(value)) {
					// Handle array values (OR logic)
					filterParts.push(`${key}:${value.join("|")}`);
				} else if (typeof value === "boolean") {
					// Handle boolean values
					filterParts.push(`${key}:${String(value)}`);
				} else {
					// Handle string/number values
					filterParts.push(`${key}:${String(value)}`);
				}
			}
		});
		return filterParts.join(",");
	}
}