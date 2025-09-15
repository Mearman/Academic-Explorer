/**
 * OpenAlex Utilities Export Index
 *
 * Centralized exports for all OpenAlex utility functions and classes.
 * This allows clean imports from the utils directory.
 */

// Query Builder exports
export {
	QueryBuilder,
	buildFilterString,
	buildSortString,
	buildSelectString,
	validateDateRange,
	escapeFilterValue,
	createWorksQuery,
	createAuthorsQuery,
	createSourcesQuery,
	createInstitutionsQuery,
	createTopicsQuery,
	createPublishersQuery,
	createFundersQuery,
	SORT_FIELDS,
	SELECT_PRESETS
} from "./query-builder";

// Autocomplete API exports
export { AutocompleteApi } from "./autocomplete";

// Text Analysis API exports
export { TextAnalysisApi } from "./text-analysis";
export type {
	TextAnalysisOptions,
	BatchTextAnalysisOptions,
} from "./text-analysis";

// Sampling API exports
export { SamplingApi } from "./sampling";
export type {
	AdvancedSampleParams,
} from "./sampling";

// Grouping API exports
export { GroupingApi } from "./grouping";
export type {
	GroupResult,
	AdvancedGroupParams,
	MultiDimensionalGroupParams,
} from "./grouping";

// Statistics API exports
export { StatisticsApi } from "./statistics";
export type {
	DatabaseStats,
	EntityAnalytics,
	ImpactMetrics,
} from "./statistics";

// Transformers exports
export {
	reconstructAbstract,
	getAbstractStats,
	hasAbstract,
	extractKeywords,
	formatCitation,
	analyzeReadability,
} from "./transformers";

// Re-export types for convenience
export type {
	SortOptions,
	LogicalOperator,
	FilterExpression,
	FilterCondition,
	DateRangeValidation
} from "./query-builder";

// Example usage exports (for documentation and testing)
export * as QueryBuilderExamples from "./query-builder-examples";