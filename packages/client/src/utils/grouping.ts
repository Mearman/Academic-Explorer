/**
 * OpenAlex Grouping Operations API
 * Provides advanced grouping and aggregation functionality
 */

import { OpenAlexBaseClient } from "../client";
import type { EntityType, QueryParams, GroupParams } from "../types";
import { logger } from "../internal/logger";
import { extractProperty } from "../internal/type-helpers";

/**
 * Raw group item from OpenAlex API response
 */
export interface GroupItem {
  key: string;
  key_display_name?: string;
  count: number;
  cited_by_count?: number;
  works_count?: number;
  h_index?: number;
}

/**
 * Group result with enhanced metadata
 */
export interface GroupResult {
  key: string;
  key_display_name: string;
  count: number;
  cited_by_count?: number;
  works_count?: number;
  h_index?: number;
  percentage: number;
}

/**
 * Advanced grouping options
 */
export interface AdvancedGroupParams extends GroupParams {
  /** Include citation statistics */
  include_citation_stats?: boolean;
  /** Include temporal trends */
  include_temporal_trends?: boolean;
  /** Minimum count threshold */
  min_count?: number;
  /** Calculate percentiles */
  calculate_percentiles?: boolean;
}

/**
 * Multi-dimensional grouping parameters
 */
export interface MultiDimensionalGroupParams extends GroupParams {
  /** Primary grouping field */
  primary_group_by: string;
  /** Secondary grouping field */
  secondary_group_by?: string;
  /** Tertiary grouping field */
  tertiary_group_by?: string;
  /** Maximum groups per dimension */
  max_groups_per_dimension?: number;
}

/**
 * Grouping API class providing advanced aggregation methods
 */
export class GroupingApi {
	constructor(private client: OpenAlexBaseClient) {}

	/**
	 * Type guard to check if value is a valid performer record
	 */
	private isPerformerRecord(value: unknown): value is Record<string, unknown> {
		return typeof value === "object" && value !== null && !Array.isArray(value);
	}

	/**
	 * Type guard to check if value is a number
	 */
	private isNumber(value: unknown): value is number {
		return typeof value === "number" && !isNaN(value);
	}

	/**
   * Group entities by a specified field
   *
   * @param entityType - Type of entity to group
   * @param groupBy - Field to group by
   * @param params - Grouping parameters
   * @returns Promise resolving to grouped results
   *
   * @example
   * ```typescript
   * const groups = await groupingApi.groupBy('works', 'publication_year', {
   *   group_limit: 20,
   *   filter: 'cited_by_count:>10'
   * });
   * ```
   */
	async groupBy(
		entityType: EntityType,
		groupBy: string,
		params: AdvancedGroupParams = {}
	): Promise<{
    groups: GroupResult[];
    total_count: number;
    ungrouped_count: number;
    meta: {
      processing_time_ms: number;
      group_by_field: string;
      total_groups: number;
    };
  }> {
		const {
			group_limit = 100,
			min_count = 1,
			...queryParams
		} = params;

		const groupParams: QueryParams = {
			...queryParams,
			group_by: groupBy,
			per_page: 1, // We only need the grouping results
		};

		const response = await this.client.getResponse<{ group_by?: GroupItem[] }>(entityType, groupParams);

		if (!response.group_by) {
			throw new Error(`Grouping not supported for entity type: ${entityType} with field: ${groupBy}`);
		}

		const totalCount = response.group_by.reduce((sum: number, group: GroupItem) => sum + group.count, 0);
		const filteredGroups = response.group_by
			.filter((group: GroupItem) => group.count >= min_count)
			.slice(0, group_limit);

		const groups: GroupResult[] = filteredGroups.map((group: GroupItem) => ({
			key: group.key,
			key_display_name: group.key_display_name ?? group.key,
			count: group.count,
			...(group.cited_by_count !== undefined && { cited_by_count: group.cited_by_count }),
			...(group.works_count !== undefined && { works_count: group.works_count }),
			...(group.h_index !== undefined && { h_index: group.h_index }),
			percentage: (group.count / totalCount) * 100,
		}));

		const ungroupedCount = response.meta.count - totalCount;

		return {
			groups,
			total_count: totalCount,
			ungrouped_count: Math.max(0, ungroupedCount),
			meta: {
				processing_time_ms: response.meta.db_response_time_ms,
				group_by_field: groupBy,
				total_groups: response.group_by.length,
			},
		};
	}

	/**
   * Get temporal trends for grouped data
   *
   * @param entityType - Type of entity to analyze
   * @param groupBy - Field to group by
   * @param timeField - Time field for trends (e.g., 'publication_year', 'created_date')
   * @param params - Parameters
   * @returns Promise resolving to temporal trends
   *
   * @example
   * ```typescript
   * const trends = await groupingApi.getTemporalTrends('works', 'type', 'publication_year', {
   *   from_year: 2010,
   *   to_year: 2023
   * });
   * ```
   */
	async getTemporalTrends(
		entityType: EntityType,
		groupBy: string,
		timeField: string = "publication_year",
		params: AdvancedGroupParams & {
      from_year?: number;
      to_year?: number;
    } = {}
	): Promise<{
    trends: Array<{
      group: string;
      group_display_name: string;
      temporal_data: Array<{
        year: number;
        count: number;
        percentage_of_group: number;
      }>;
      total_count: number;
      growth_rate?: number; // Year-over-year growth rate
    }>;
    overall_trend: Array<{
      year: number;
      total_count: number;
    }>;
  }> {
		const { from_year = 2010, to_year = new Date().getFullYear(), group_limit = 10 } = params;

		// First get the main groups
		const mainGroups = await this.groupBy(entityType, groupBy, {
			...params,
			group_limit,
		});

		const trends: Array<{
      group: string;
      group_display_name: string;
      temporal_data: Array<{
        year: number;
        count: number;
        percentage_of_group: number;
      }>;
      total_count: number;
      growth_rate?: number;
    }> = [];

		// For each major group, get temporal breakdown
		for (const group of mainGroups.groups.slice(0, group_limit)) {
			try {
				const timeFilter = timeField === "publication_year"
					? `publication_year:${from_year.toString()}-${to_year.toString()}`
					: `from_created_date:${from_year.toString()}-01-01,to_created_date:${to_year.toString()}-12-31`;

				const groupFilter = `${groupBy}:${group.key}`;
				const combinedFilter = params.filter
					? `${params.filter},${groupFilter},${timeFilter}`
					: `${groupFilter},${timeFilter}`;

				const temporalBreakdown = await this.groupBy(entityType, timeField, {
					filter: combinedFilter,
					group_limit: to_year - from_year + 1,
				});

				const temporalData = temporalBreakdown.groups.map(yearGroup => ({
					year: parseInt(yearGroup.key),
					count: yearGroup.count,
					percentage_of_group: (yearGroup.count / group.count) * 100,
				}));

				// Calculate growth rate (simple year-over-year)
				let growthRate: number | undefined;
				if (temporalData.length >= 2) {
					const recent = temporalData.slice(-3); // Last 3 years
					const early = temporalData.slice(0, 3); // First 3 years
					const recentAvg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
					const earlyAvg = early.reduce((sum, d) => sum + d.count, 0) / early.length;
					if (earlyAvg > 0) {
						growthRate = ((recentAvg - earlyAvg) / earlyAvg) * 100;
					}
				}

				trends.push({
					group: group.key,
					group_display_name: group.key_display_name,
					temporal_data: temporalData.sort((a, b) => a.year - b.year),
					total_count: group.count,
					...(growthRate !== undefined && { growth_rate: growthRate }),
				});
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				logger.warn(`[GroupingApi] Failed to get temporal trends for group ${group.key}`, { groupKey: group.key, error: errorMessage });
			}
		}

		// Get overall temporal trend
		const overallTemporal = await this.groupBy(entityType, timeField, {
			...params,
			group_limit: to_year - from_year + 1,
		});

		const overallTrend = overallTemporal.groups
			.map(group => ({
				year: parseInt(group.key),
				total_count: group.count,
			}))
			.sort((a, b) => a.year - b.year);

		return {
			trends,
			overall_trend: overallTrend,
		};
	}

	/**
   * Multi-dimensional grouping (cross-tabulation)
   *
   * @param entityType - Type of entity to group
   * @param params - Multi-dimensional grouping parameters
   * @returns Promise resolving to cross-tabulated results
   *
   * @example
   * ```typescript
   * const crossTab = await groupingApi.multiDimensionalGroup('works', {
   *   primary_group_by: 'type',
   *   secondary_group_by: 'is_oa',
   *   max_groups_per_dimension: 5
   * });
   * ```
   */
	async multiDimensionalGroup(
		entityType: EntityType,
		params: MultiDimensionalGroupParams
	): Promise<{
    dimensions: {
      primary: GroupResult[];
      secondary?: GroupResult[];
      tertiary?: GroupResult[];
    };
    cross_tabulation: Array<{
      primary_key: string;
      secondary_key?: string;
      tertiary_key?: string;
      count: number;
      percentage_of_total: number;
      percentage_of_primary: number;
    }>;
    totals: {
      grand_total: number;
      primary_totals: Record<string, number>;
    };
  }> {
		const {
			primary_group_by,
			secondary_group_by,
			tertiary_group_by: _tertiary_group_by,
			max_groups_per_dimension = 10,
			...baseParams
		} = params;

		// Get primary dimension
		const primary = await this.groupBy(entityType, primary_group_by, {
			...baseParams,
			group_limit: max_groups_per_dimension,
		});

		const dimensions: { primary: GroupResult[]; secondary?: GroupResult[] } = { primary: primary.groups };
		const crossTabulation: Array<{
      primary_key: string;
      secondary_key: string;
      tertiary_key?: string;
      count: number;
      percentage_of_total: number;
      percentage_of_primary: number;
    }> = [];
		const primaryTotals: Record<string, number> = {};

		// Process secondary dimension if specified
		if (secondary_group_by) {
			const secondary = await this.groupBy(entityType, secondary_group_by, {
				...baseParams,
				group_limit: max_groups_per_dimension,
			});
			dimensions.secondary = secondary.groups;

			// Cross-tabulate primary x secondary
			for (const primaryGroup of primary.groups.slice(0, 5)) { // Limit to avoid too many API calls
				primaryTotals[primaryGroup.key] = primaryGroup.count;

				for (const secondaryGroup of secondary.groups.slice(0, 5)) {
					try {
						const combinedFilter = `${primary_group_by}:${primaryGroup.key},${secondary_group_by}:${secondaryGroup.key}`;
						const fullFilter = baseParams.filter
							? `${baseParams.filter},${combinedFilter}`
							: combinedFilter;

						const crossResult = await this.client.getResponse<{ meta: { count: number } }>(entityType, {
							filter: fullFilter,
							per_page: 1,
						});

						const {count} = crossResult.meta;

						crossTabulation.push({
							primary_key: primaryGroup.key,
							secondary_key: secondaryGroup.key,
							count,
							percentage_of_total: (count / primary.total_count) * 100,
							percentage_of_primary: (count / primaryGroup.count) * 100,
						});
					} catch (error: unknown) {
						const errorMessage = error instanceof Error ? error.message : String(error);
						logger.warn(`[GroupingApi] Failed cross-tabulation for ${primaryGroup.key} x ${secondaryGroup.key}`, { primaryKey: primaryGroup.key, secondaryKey: secondaryGroup.key, error: errorMessage });
					}
				}
			}
		}

		return {
			dimensions,
			cross_tabulation: crossTabulation,
			totals: {
				grand_total: primary.total_count,
				primary_totals: primaryTotals,
			},
		};
	}

	/**
   * Get top performers by group
   *
   * @param entityType - Type of entity to analyze
   * @param groupBy - Field to group by
   * @param metric - Metric to rank by ('cited_by_count', 'works_count', etc.)
   * @param params - Parameters
   * @returns Promise resolving to top performers
   *
   * @example
   * ```typescript
   * const topPerformers = await groupingApi.getTopPerformersByGroup(
   *   'authors',
   *   'last_known_institution.country_code',
   *   'cited_by_count',
   *   { top_n: 3, group_limit: 10 }
   * );
   * ```
   */
	async getTopPerformersByGroup(
		entityType: EntityType,
		groupBy: string,
		metric: string = "cited_by_count",
		params: AdvancedGroupParams & { top_n?: number } = {}
	): Promise<{
    groups: Array<{
      group: string;
      group_display_name: string;
      group_total: number;
      top_performers: Array<{
        id: string;
        display_name: string;
        metric_value: number;
        rank_in_group: number;
      }>;
    }>;
  }> {
		const { top_n = 5, group_limit = 10 } = params;

		// Get main groups
		const groups = await this.groupBy(entityType, groupBy, {
			...params,
			group_limit,
		});

		const result: Array<{
      group: string;
      group_display_name: string;
      group_total: number;
      top_performers: Array<{
        id: string;
        display_name: string;
        metric_value: number;
        rank_in_group: number;
      }>;
    }> = [];

		// For each group, get top performers
		for (const group of groups.groups) {
			try {
				const groupFilter = `${groupBy}:${group.key}`;
				const fullFilter = params.filter
					? `${params.filter},${groupFilter}`
					: groupFilter;

				const topPerformers = await this.client.getResponse<{ results: Array<{ id: string; display_name: string; [key: string]: unknown }> }>(entityType, {
					filter: fullFilter,
					sort: metric,
					per_page: top_n,
					select: ["id", "display_name", metric],
				});

				const resultsArray = topPerformers.results;
				const performersWithRank = resultsArray.map((performer, index: number) => {
					if (!this.isPerformerRecord(performer)) {
						throw new Error("Invalid performer record structure");
					}

					// Extract properties with explicit type checking using helper
					const idValue = extractProperty(performer, "id");
					const displayNameValue = extractProperty(performer, "display_name");
					const metricValue = extractProperty(performer, metric);

					const id = typeof idValue === "string" ? idValue : "";
					const displayName = typeof displayNameValue === "string" ? displayNameValue : "";
					const metric_value = this.isNumber(metricValue) ? metricValue : 0;

					return {
						id,
						display_name: displayName,
						metric_value,
						rank_in_group: index + 1,
					};
				});

				result.push({
					group: group.key,
					group_display_name: group.key_display_name,
					group_total: group.count,
					top_performers: performersWithRank,
				});
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				logger.warn(`[GroupingApi] Failed to get top performers for group ${group.key}`, { groupKey: group.key, error: errorMessage });
			}
		}

		return { groups: result };
	}

	/**
   * Calculate distribution statistics for grouped data
   *
   * @param entityType - Type of entity to analyze
   * @param groupBy - Field to group by
   * @param metric - Metric to analyze distribution of
   * @param params - Parameters
   * @returns Promise resolving to distribution statistics
   *
   * @example
   * ```typescript
   * const distribution = await groupingApi.getDistributionStats(
   *   'works',
   *   'type',
   *   'cited_by_count',
   *   { calculate_percentiles: true }
   * );
   * ```
   */
	async getDistributionStats(
		entityType: EntityType,
		groupBy: string,
		metric: string = "cited_by_count",
		params: AdvancedGroupParams = {}
	): Promise<{
    groups: Array<{
      group: string;
      group_display_name: string;
      count: number;
      stats: {
        total: number;
        mean: number;
        median?: number;
        percentiles?: {
          p25: number;
          p75: number;
          p90: number;
          p95: number;
          p99: number;
        };
      };
    }>;
    overall_stats: {
      total_entities: number;
      grand_total_metric: number;
      overall_mean: number;
    };
  }> {
		const { calculate_percentiles = false, group_limit = 20 } = params;

		const groups = await this.groupBy(entityType, groupBy, {
			...params,
			group_limit,
			include_citation_stats: true,
		});

		const result: Array<{
      group: string;
      group_display_name: string;
      count: number;
      stats: {
        total: number;
        mean: number;
        median?: number;
        percentiles?: {
          p25: number;
          p75: number;
          p90: number;
          p95: number;
          p99: number;
        };
      };
    }> = [];
		let grandTotalMetric = 0;
		const totalEntities = groups.groups.reduce((sum, group) => sum + group.count, 0);

		for (const group of groups.groups) {
			// Extract metric value with proper type checking
			const groupRecord: Record<string, unknown> = { ...group };
			const totalMetric = this.isNumber(groupRecord[metric]) ? groupRecord[metric] : 0;

			const stats: {
        total: number;
        mean: number;
        percentiles?: {
          p25: number;
          p50: number;
          p75: number;
          p90: number;
        };
      } = {
      	total: totalMetric,
      	mean: group.count > 0 ? totalMetric / group.count : 0,
      };

			// Calculate percentiles if requested (simplified approximation)
			if (calculate_percentiles && group.count > 10) {
				try {
					// Get a sample to estimate percentiles
					const groupFilter = `${groupBy}:${group.key}`;
					const fullFilter = params.filter
						? `${params.filter},${groupFilter}`
						: groupFilter;

					const sample = await this.client.getResponse<{ results: Array<Record<string, unknown>> }>(entityType, {
						filter: fullFilter,
						sort: metric,
						per_page: Math.min(100, group.count),
						select: [metric],
					});

					const values = sample.results
						.map((item: Record<string, unknown>) => {
							const value = item[metric];
							return this.isNumber(value) ? value : 0;
						})
						.sort((a: number, b: number) => a - b);

					if (values.length > 0) {
						stats.percentiles = {
							p25: this.percentile(values, 25),
							p50: this.percentile(values, 50),
							p75: this.percentile(values, 75),
							p90: this.percentile(values, 90),
						};
						// stats.median is already included in percentiles as p50
					}
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : String(error);
					logger.warn(`[GroupingApi] Failed to calculate percentiles for group ${group.key}`, { groupKey: group.key, error: errorMessage });
				}
			}

			result.push({
				group: group.key,
				group_display_name: group.key_display_name,
				count: group.count,
				stats: {
					total: stats.total,
					mean: stats.mean,
					...(stats.percentiles?.p50 !== undefined && { median: stats.percentiles.p50 }),
					...(stats.percentiles && {
						percentiles: {
							p25: stats.percentiles.p25,
							p75: stats.percentiles.p75,
							p90: stats.percentiles.p90,
							p95: stats.percentiles.p90, // Use p90 as approximation
							p99: stats.percentiles.p90, // Use p90 as approximation
						}
					}),
				},
			});

			grandTotalMetric += stats.total;
		}

		return {
			groups: result,
			overall_stats: {
				total_entities: totalEntities,
				grand_total_metric: grandTotalMetric,
				overall_mean: totalEntities > 0 ? grandTotalMetric / totalEntities : 0,
			},
		};
	}

	/**
   * Calculate percentile from sorted array
   */
	private percentile(sortedArray: number[], percentile: number): number {
		if (sortedArray.length === 0) return 0;

		const index = (percentile / 100) * (sortedArray.length - 1);
		const lower = Math.floor(index);
		const upper = Math.ceil(index);
		const weight = index - lower;

		if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1] ?? 0;
		if (lower < 0) return sortedArray[0] ?? 0;

		const lowerValue = sortedArray[lower] ?? 0;
		const upperValue = sortedArray[upper] ?? 0;
		return lowerValue * (1 - weight) + upperValue * weight;
	}
}