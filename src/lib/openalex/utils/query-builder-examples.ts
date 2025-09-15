/**
 * OpenAlex Query Builder Examples
 *
 * This module provides practical examples of using the OpenAlex Query Builder utilities.
 * These examples demonstrate common filter patterns and best practices for academic research queries.
 *
 * @see https://docs.openalex.org/how-to-use-the-api/get-lists-of-entities/filter-entity-lists
 */

import {
	QueryBuilder,
	buildFilterString,
	buildSortString,
	buildSelectString,
	SORT_FIELDS,
	SELECT_PRESETS
} from "./query-builder";
import type { WorksFilters, AuthorsFilters, SourcesFilters, InstitutionsFilters } from "../types";

/**
 * Basic Filter Examples
 */
export const basicFilters = {
	/**
	 * Simple works search by title keyword
	 */
	searchByTitle: (): WorksFilters => ({
		"title.search": "machine learning"
	}),

	/**
	 * Find open access works from recent years
	 */
	recentOpenAccessWorks: (): WorksFilters => ({
		"is_oa": true,
		"publication_year": "2020-2024"
	}),

	/**
	 * Search for highly cited authors in computer science
	 */
	topComputerScienceAuthors: (): AuthorsFilters => ({
		"topics.id": "https://openalex.org/T11413", // Computer Science topic
		"cited_by_count": ">1000"
	})
};

/**
 * Advanced Filter Examples
 */
export const advancedFilters = {
	/**
	 * Multi-institutional collaboration works
	 */
	collaborativeResearch: (): WorksFilters => ({
		"authorships.institutions.country_code": ["US", "GB", "DE"],
		"publication_year": "2020-2024",
		"is_oa": true
	}),

	/**
	 * Find works by specific author with DOI
	 */
	authorWorksWithDOI: (authorId: string): WorksFilters => ({
		"authorships.author.id": authorId,
		"has_doi": true,
		"type": "journal-article"
	}),

	/**
	 * Cross-disciplinary research detection
	 */
	interdisciplinaryWorks: (): WorksFilters => ({
		"topics.id": [
			"https://openalex.org/T11413", // Computer Science
			"https://openalex.org/T10687"  // Machine Learning
		],
		"cited_by_count": ">50",
		"publication_year": "2018-2024"
	})
};

/**
 * Research Impact Analysis Examples
 */
export const impactAnalysis = {
	/**
	 * Find breakthrough papers (highly cited recent works)
	 */
	breakthroughPapers: (): WorksFilters => ({
		"publication_year": "2022-2024",
		"cited_by_count": ">100",
		"type": "journal-article"
	}),

	/**
	 * Institutional impact comparison
	 */
	institutionComparison: (institutionIds: string[]): InstitutionsFilters => ({
		"works_count": ">1000"
	}),

	/**
	 * Journal quality assessment
	 */
	topJournalsByField: (topicId: string): SourcesFilters => ({
		"topics.id": topicId,
		"type": "journal",
		"works_count": ">100"
	})
};

/**
 * Temporal Analysis Examples
 */
export const temporalAnalysis = {
	/**
	 * Track research trends over time
	 */
	researchTrends: (topic: string): WorksFilters => ({
		"title.search": topic,
		"publication_year": "2010-2024"
	}),

	/**
	 * Author productivity over career
	 */
	authorCareerTrajectory: (authorId: string): WorksFilters => ({
		"authorships.author.id": authorId
	}),

	/**
	 * Publication surge detection
	 */
	publicationSurge: (year: number): WorksFilters => ({
		"publication_year": year.toString(),
		"type": "journal-article"
	})
};

/**
 * Filter String Building Examples
 */
export const filterExamples = {
	/**
	 * Complex author search filter
	 */
	complexAuthorFilter: (): string => {
		const filters: AuthorsFilters = {
			"display_name.search": "Smith",
			"last_known_institution.country_code": "US",
			"works_count": ">20",
			"cited_by_count": ">500"
		};

		return buildFilterString(filters);
	},

	/**
	 * Multi-criteria works filter
	 */
	multiCriteriaWorksFilter: (): string => {
		const filters: WorksFilters = {
			"authorships.institutions.type": "education",
			"is_oa": true,
			"language": "en",
			"publication_year": "2020-2024",
			"cited_by_count": ">10"
		};

		return buildFilterString(filters);
	},

	/**
	 * Date range validation example
	 */
	dateRangeFilter: (): string => {
		const filters: WorksFilters = {
			"publication_date": "2023-01-01:2023-12-31",
			"from_created_date": "2023-01-01"
		};

		return buildFilterString(filters);
	}
};

/**
 * Sort and Selection Examples
 */
export const sortingExamples = {
	/**
	 * Multiple sort criteria
	 */
	multipleSortFields: (): string => {
		return buildSortString([
			{ field: SORT_FIELDS.CITED_BY_COUNT, direction: "desc" },
			{ field: SORT_FIELDS.PUBLICATION_DATE, direction: "desc" }
		]);
	},

	/**
	 * Custom field selection
	 */
	customFieldSelection: (): string => {
		return buildSelectString([
			"id",
			"display_name",
			"publication_year",
			"authorships.author.display_name",
			"primary_location.source.display_name",
			"concepts.display_name"
		]);
	}
};

/**
 * Complete Query Examples with Builder Pattern
 */
export const builderPatternExamples = {
	/**
	 * Comprehensive academic research query
	 */
	comprehensiveResearchQuery: () => {
		const builder = new QueryBuilder<WorksFilters>();

		return builder
			.addFilter("title.search", "artificial intelligence")
			.addFilter("publication_year", "2020-2024")
			.addFilter("is_oa", true)
			.addFilter("authorships.institutions.type", "education")
			.build();
	},

	/**
	 * Citation network discovery
	 */
	citationNetworkQuery: (seedWorkId: string) => {
		const builder = new QueryBuilder<WorksFilters>();

		return builder
			.addFilter("referenced_works", seedWorkId)
			.addFilter("publication_year", "2015-2024")
			.addFilter("cited_by_count", ">5", ">")
			.build();
	},

	/**
	 * Emerging research topics
	 */
	emergingTopicsQuery: () => {
		const builder = new QueryBuilder<WorksFilters>();

		return builder
			.addFilter("publication_year", "2023-2024")
			.addFilter("cited_by_count", 20, ">")
			.addFilter("type", "journal-article")
			.build();
	}
};

/**
 * Error Handling Examples
 */
export const errorHandlingExamples = {
	/**
	 * Safe filter building with validation
	 */
	safeFilterBuilder: (userInput: unknown): WorksFilters => {
		const filters: WorksFilters = {};

		// Validate user input before using in query
		if (typeof userInput === "string" && userInput.length >= 2) {
			filters["title.search"] = userInput;
		}

		return filters;
	},

	/**
	 * Graceful filter handling
	 */
	robustFilterBuilder: (filters: Partial<WorksFilters>): string => {
		const safeFilters: WorksFilters = {};

		// Only add valid filters
		if (filters.publication_year && typeof filters.publication_year === "string") {
			safeFilters.publication_year = filters.publication_year;
		}

		if (typeof filters.is_oa === "boolean") {
			safeFilters.is_oa = filters.is_oa;
		}

		if (filters["title.search"] && typeof filters["title.search"] === "string") {
			safeFilters["title.search"] = filters["title.search"];
		}

		return buildFilterString(safeFilters);
	}
};