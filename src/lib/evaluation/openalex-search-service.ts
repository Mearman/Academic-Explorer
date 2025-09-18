/**
 * OpenAlex Search Service for STAR Evaluation
 * Converts Academic Explorer search functionality to WorkReference format for comparison engine
 */

import { openAlex } from "@/lib/openalex";
import type { Work } from "@/lib/openalex";
import type { SearchWorksOptions } from "@/lib/openalex/entities/works";
import type { WorkReference, STARDataset } from "./types";
import { logError, logger } from "@/lib/logger";

/**
 * Type guard to check if filters is a string record
 */
function isStringRecord(value: unknown): value is Record<string, string> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Configuration for Academic Explorer search behavior
 */
export interface AcademicExplorerSearchConfig {
  maxResults?: number;
  sortBy?: "relevance_score" | "cited_by_count" | "publication_date";
  yearRange?: {
    start?: number;
    end?: number;
  };
  includePreprints?: boolean;
  minimumCitations?: number;
}

/**
 * Default search configuration optimized for systematic review comparison
 */
export const DEFAULT_SEARCH_CONFIG: AcademicExplorerSearchConfig = {
	maxResults: 200, // Reasonable upper limit for systematic reviews
	sortBy: "relevance_score",
	includePreprints: true,
	minimumCitations: 0 // Include all papers regardless of citation count
};

/**
 * Convert OpenAlex Work entity to WorkReference format for comparison
 */
export function convertWorkToReference(work: Work): WorkReference {
	// Extract authors from authorships
	const authors = work.authorships
		.map(authorship => authorship.author.display_name)
		.filter((name): name is string => typeof name === "string" && name.length > 0);

	// Get source name from primary location
	const source = work.primary_location?.source?.display_name ||
                 work.best_oa_location?.source?.display_name ||
                 "Unknown Source";

	return {
		title: work.display_name || work.title || "Untitled",
		authors,
		doi: work.doi || work.ids.doi,
		openalexId: work.id,
		publicationYear: work.publication_year,
		source,
		citedByCount: work.cited_by_count,
		abstract: work.abstract_inverted_index ? "Abstract available" : undefined
	};
}

/**
 * Extract search keywords and criteria from STAR dataset metadata
 */
export function extractSearchCriteriaFromDataset(dataset: STARDataset): {
  query: string;
  filters: SearchWorksOptions;
} {
	// Use the review topic as the primary query
	let query = dataset.reviewTopic;

	// Try to extract additional keywords from search strategy
	if (dataset.searchStrategy.keywords.length > 0) {
		// Combine review topic with key search terms
		const additionalTerms = dataset.searchStrategy.keywords
			.filter(keyword => !query.toLowerCase().includes(keyword.toLowerCase()))
			.slice(0, 3); // Limit to prevent overly complex queries

		if (additionalTerms.length > 0) {
			query += ` ${additionalTerms.join(" ")}`;
		}
	}

	// Build filters based on dataset criteria
	const filters: SearchWorksOptions = {
		sort: "relevance_score",
		per_page: 25, // Reasonable page size for API efficiency
		filters: {}
	};

	// Apply date range if available
	if (dataset.searchStrategy.dateRange.start || dataset.searchStrategy.dateRange.end) {
		const dateFilter: Record<string, string> = {};

		if (dataset.searchStrategy.dateRange.start) {
			dateFilter["publication_year"] = `>${String(dataset.searchStrategy.dateRange.start.getFullYear() - 1)}`;
		}

		if (dataset.searchStrategy.dateRange.end) {
			const endYear = dataset.searchStrategy.dateRange.end.getFullYear();
			const startFilter = dateFilter["publication_year"] || "";
			dateFilter["publication_year"] = startFilter ?
				`${startFilter},<${String(endYear + 1)}` :
				`<${String(endYear + 1)}`;
		}

		filters.filters = dateFilter;
	}

	return { query, filters };
}

/**
 * Perform Academic Explorer search using OpenAlex API
 * This replaces the mock search function in the comparison engine
 */
export async function performAcademicExplorerSearch(
	query: string,
	config: AcademicExplorerSearchConfig = DEFAULT_SEARCH_CONFIG
): Promise<WorkReference[]> {
	try {
		const searchOptions: SearchWorksOptions = {
			sort: config.sortBy || "relevance_score",
			per_page: Math.min(config.maxResults || 200, 200), // OpenAlex max is typically 200 per page
			filters: {}
		};

		// Apply year range filter if specified
		if (config.yearRange?.start || config.yearRange?.end) {
			const yearFilters: string[] = [];

			if (config.yearRange.start) {
				yearFilters.push(`>${String(config.yearRange.start - 1)}`);
			}

			if (config.yearRange.end) {
				yearFilters.push(`<${String(config.yearRange.end + 1)}`);
			}

			if (yearFilters.length > 0) {
				if (!searchOptions.filters) {
					searchOptions.filters = {};
				}
				// Safely ensure filters is a Record<string, string>
				if (isStringRecord(searchOptions.filters)) {
					searchOptions.filters["publication_year"] = yearFilters.join(",");
				}
			}
		}

		// Apply citation filter if specified
		if (config.minimumCitations && config.minimumCitations > 0) {
			if (!searchOptions.filters) {
				searchOptions.filters = {};
			}
			if (isStringRecord(searchOptions.filters)) {
				searchOptions.filters["cited_by_count"] = `>${String(config.minimumCitations - 1)}`;
			}
		}

		// Filter out preprints if not desired
		if (!config.includePreprints) {
			if (!searchOptions.filters) {
				searchOptions.filters = {};
			}
			if (isStringRecord(searchOptions.filters)) {
				searchOptions.filters["type"] = "journal-article|book-chapter|book|dataset|dissertation|proceedings-article";
			}
		}

		logger.debug("api", "Performing Academic Explorer search", {
			query,
			options: searchOptions
		}, "OpenAlexSearchService");

		// Perform the search
		const response = await openAlex.works.searchWorks(query, searchOptions);

		logger.debug("api", `OpenAlex search returned ${String(response.results.length)} results (${String(response.meta.count)} total available)`, {
			resultCount: response.results.length,
			totalAvailable: response.meta.count
		}, "OpenAlexSearchService");

		// Convert all results to WorkReference format
		const workReferences = response.results
			.map(convertWorkToReference)
			.filter(ref => ref.title && ref.title.length > 0); // Filter out works without titles

		return workReferences;

	} catch (error) {
		logError("Academic Explorer search failed", error, "OpenAlexSearchService", "api");
		throw new Error(`Academic Explorer search failed: ${error instanceof Error ? error.message : "Unknown error"}`);
	}
}

/**
 * Perform optimized search based on STAR dataset criteria
 * Uses the dataset's own search strategy to inform the OpenAlex query
 */
export async function searchBasedOnSTARDataset(
	dataset: STARDataset,
	config: AcademicExplorerSearchConfig = DEFAULT_SEARCH_CONFIG
): Promise<WorkReference[]> {
	const { query } = extractSearchCriteriaFromDataset(dataset);

	// Merge dataset-extracted filters with config filters
	const mergedConfig: AcademicExplorerSearchConfig = {
		...config,
		// Use dataset date range if available, otherwise fall back to config
		yearRange: (dataset.searchStrategy.dateRange.start || dataset.searchStrategy.dateRange.end)
			? {
				start: dataset.searchStrategy.dateRange.start?.getFullYear(),
				end: dataset.searchStrategy.dateRange.end?.getFullYear()
			}
			: config.yearRange
	};

	logger.debug("api", "Searching based on STAR dataset", {
		datasetName: dataset.name,
		extractedQuery: query,
		dateRange: mergedConfig.yearRange,
		originalPaperCount: dataset.originalPaperCount
	});

	return performAcademicExplorerSearch(query, mergedConfig);
}

/**
 * Utility function to estimate search completeness
 * Compares the number of results found vs. the original STAR dataset size
 */
export function calculateSearchCoverage(
	academicExplorerResults: WorkReference[],
	starDataset: STARDataset
): {
  coverage: number;
  expectedCount: number;
  actualCount: number;
  recommendation: string;
} {
	const expectedCount = starDataset.originalPaperCount;
	const actualCount = academicExplorerResults.length;
	const coverage = expectedCount > 0 ? actualCount / expectedCount : 0;

	let recommendation: string;

	if (coverage < 0.5) {
		recommendation = "Consider broadening search terms or expanding date range";
	} else if (coverage > 2.0) {
		recommendation = "Consider narrowing search terms or adding more specific filters";
	} else {
		recommendation = "Search coverage appears reasonable for comparison";
	}

	return {
		coverage,
		expectedCount,
		actualCount,
		recommendation
	};
}