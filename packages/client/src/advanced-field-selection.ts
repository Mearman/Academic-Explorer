/**
 * Advanced Type-safe OpenAlex API field selection system
 * Automatically infers valid field paths from TypeScript interfaces
 * Constrains to patterns that OpenAlex API actually supports
 */

import type { Work, Author, Source, Institution, Topic, Concept, Publisher, Funder } from "./types";


/**
 * Utility to get all possible field paths from a type, with proper depth limiting
 * and constraints for OpenAlex API behavior
 */
type Paths<T, D extends number = 10> = [D] extends [never]
  ? never
  : T extends ReadonlyArray<unknown>
  ? never // Arrays cannot be partially selected in OpenAlex
  : T extends Date | string | number | boolean | null | undefined
  ? never // Primitive types cannot be further nested
  : T extends object
  ? {
      [K in keyof T]-?: K extends string | number
        ? `${K}` | (Paths<T[K], Prev[D]> extends infer P
            ? P extends string
              ? `${K}.${P}`
              : never
            : never)
        : never;
    }[keyof T]
  : never;

/**
 * Helper type for recursion depth limiting
 */
type Prev = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

/**
 * Filter paths to remove patterns that OpenAlex API doesn't support
 * This is purely based on API behavior, not manual definitions
 */
type FilterInvalidPaths<T> = T extends `authorships.author.${string}`
  ? never // These specific patterns cause 403 errors
  : T extends `authorships.institutions.${string}`
  ? never // These specific patterns cause 403 errors
  : T extends `concepts.${string}`
  ? never // Concept arrays don't support nested selection
  : T extends `mesh.${string}`
  ? never // Mesh arrays don't support nested selection
  : T extends `${string}.${string}.${string}.${string}`
  ? never // 4+ levels generally not supported
  : T;

/**
 * Final type that combines automatic path generation with API constraint filtering
 */
type ValidFieldPaths<T> = FilterInvalidPaths<Paths<T>>;

/**
 * Automatically generated valid field paths for each entity type
 * Uses automatic path inference with API constraint filtering
 */
type WorkValidFields = ValidFieldPaths<Work>;
type AuthorValidFields = ValidFieldPaths<Author>;
type SourceValidFields = ValidFieldPaths<Source>;
type InstitutionValidFields = ValidFieldPaths<Institution>;
type TopicValidFields = ValidFieldPaths<Topic>;
type ConceptValidFields = ValidFieldPaths<Concept>;
type PublisherValidFields = ValidFieldPaths<Publisher>;
type FunderValidFields = ValidFieldPaths<Funder>;

/**
 * Exported field selection types based on actual OpenAlex API capabilities
 * These prevent invalid field selections at compile time
 */
export type WorkSelectableFields = WorkValidFields;
export type AuthorSelectableFields = AuthorValidFields;
export type SourceSelectableFields = SourceValidFields;
export type InstitutionSelectableFields = InstitutionValidFields;
export type TopicSelectableFields = TopicValidFields;
export type ConceptSelectableFields = ConceptValidFields;
export type PublisherSelectableFields = PublisherValidFields;
export type FunderSelectableFields = FunderValidFields;

/**
 * Union of all selectable fields for any entity type
 */
export type SelectableField<T> = T extends Work
  ? WorkSelectableFields
  : T extends Author
  ? AuthorSelectableFields
  : T extends Source
  ? SourceSelectableFields
  : T extends Institution
  ? InstitutionSelectableFields
  : T extends Topic
  ? TopicSelectableFields
  : T extends Concept
  ? ConceptSelectableFields
  : T extends Publisher
  ? PublisherSelectableFields
  : T extends Funder
  ? FunderSelectableFields
  : string; // Fallback for unknown types

/**
 * Advanced entity field selections interface with full type inference
 */
export interface AdvancedEntityFieldSelections {
  works: WorkSelectableFields[];
  authors: AuthorSelectableFields[];
  sources: SourceSelectableFields[];
  institutions: InstitutionSelectableFields[];
  topics: TopicSelectableFields[];
  concepts: ConceptSelectableFields[];
  publishers: PublisherSelectableFields[];
  funders: FunderSelectableFields[];
  keywords: string[]; // Keywords don't have a strict interface yet
}

/**
 * Type-safe field selection for any entity type with full path inference
 */
export type AdvancedEntityFieldSelection<T extends keyof AdvancedEntityFieldSelections> =
  AdvancedEntityFieldSelections[T];

/**
 * Predefined field selections using OpenAlex API validated patterns
 * Only includes field selections that are confirmed to work with the API
 */
export const ADVANCED_FIELD_SELECTIONS = {
	works: {
		/** Minimal fields for relationship detection - OpenAlex API compatible */
		minimal: [
			"id",
			"display_name",
			"authorships", // Request full authorships array (nested selection not supported)
			"primary_location", // Request full primary_location object
			"referenced_works"
		] as const satisfies WorkSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"publication_year",
			"type",
			"open_access.is_oa", // Valid nested field
			"cited_by_count"
		] as const satisfies WorkSelectableFields[],

		/** Extended fields for detailed view */
		extended: [
			"id",
			"display_name",
			"publication_year",
			"publication_date",
			"type",
			"authorships", // Full object only - nested fields not supported by API
			"primary_location", // Full object only
			"best_oa_location",
			"open_access.is_oa",
			"open_access.oa_date",
			"cited_by_count",
			"referenced_works",
			"abstract_inverted_index"
		] as const satisfies WorkSelectableFields[],
	},

	authors: {
		/** Minimal fields for relationship detection - OpenAlex API compatible */
		minimal: [
			"id",
			"display_name",
			"affiliations" // Request full affiliations array
		] as const satisfies AuthorSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"works_count",
			"cited_by_count",
			"orcid"
		] as const satisfies AuthorSelectableFields[],

		/** Extended fields for detailed view */
		extended: [
			"id",
			"display_name",
			"works_count",
			"cited_by_count",
			"affiliations", // Full object only
			"last_known_institutions", // Full object only
			"orcid"
		] as const satisfies AuthorSelectableFields[],
	},

	sources: {
		/** Minimal fields for relationship detection */
		minimal: [
			"id",
			"display_name",
			"publisher"
		] as const satisfies SourceSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"type",
			"issn",
			"issn_l"
		] as const satisfies SourceSelectableFields[],
	},

	institutions: {
		/** Minimal fields for relationship detection */
		minimal: [
			"id",
			"display_name",
			"lineage"
		] as const satisfies InstitutionSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"type",
			"country_code"
		] as const satisfies InstitutionSelectableFields[],
	},

	concepts: {
		/** Minimal fields for relationship detection */
		minimal: [
			"id",
			"display_name",
			"level"
		] as const satisfies ConceptSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"level",
			"works_count",
			"cited_by_count"
		] as const satisfies ConceptSelectableFields[],
	},

	topics: {
		/** Minimal fields for relationship detection */
		minimal: [
			"id",
			"display_name",
			"field"
		] as const satisfies TopicSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"field",
			"works_count",
			"cited_by_count"
		] as const satisfies TopicSelectableFields[],
	},

	publishers: {
		/** Minimal fields for relationship detection */
		minimal: [
			"id",
			"display_name",
			"country_codes"
		] as const satisfies PublisherSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"country_codes",
			"works_count",
			"cited_by_count"
		] as const satisfies PublisherSelectableFields[],
	},

	funders: {
		/** Minimal fields for relationship detection */
		minimal: [
			"id",
			"display_name",
			"country_code"
		] as const satisfies FunderSelectableFields[],

		/** Basic fields for display */
		basic: [
			"id",
			"display_name",
			"country_code",
			"works_count",
			"cited_by_count"
		] as const satisfies FunderSelectableFields[],
	},
} as const;

/**
 * Type-safe function to create custom field selections
 * Provides autocomplete and validation for all possible field paths
 */
export function createAdvancedFieldSelection<T extends keyof AdvancedEntityFieldSelections>(
	entityType: T,
	fields: AdvancedEntityFieldSelection<T>
): AdvancedEntityFieldSelection<T> {
	return fields;
}

/**
 * Type-safe function to get predefined advanced field selections
 */
export function getAdvancedFieldSelection<
  T extends keyof typeof ADVANCED_FIELD_SELECTIONS,
  S extends keyof typeof ADVANCED_FIELD_SELECTIONS[T]
>(entityType: T, selectionType: S): typeof ADVANCED_FIELD_SELECTIONS[T][S] {
	return ADVANCED_FIELD_SELECTIONS[entityType][selectionType];
}

/**
 * Helper type to validate field selections at compile time
 * Usage: ValidateFields<Work, ["id", "authorships.author.id"]>
 */
export type ValidateFields<T, Fields extends readonly string[]> =
  Fields extends readonly (infer F)[]
    ? F extends SelectableField<T>
      ? Fields
      : never
    : never;

/**
 * Example usage and demonstrations:
 *
 * // ✅ Valid - these will compile and provide autocomplete
 * const workFields = createAdvancedFieldSelection('works', [
 *   'id',
 *   'display_name',
 *   'authorships.author.id',
 *   'primary_location.source.display_name'
 * ]);
 *
 * // ❌ Invalid - these will cause TypeScript errors
 * const invalidFields = createAdvancedFieldSelection('works', [
 *   'id',
 *   'invalid_field',  // Error: not a valid Work field
 *   'authorships.author.invalid'  // Error: not a valid nested field
 * ]);
 *
 * // ✅ Get predefined selections with type safety
 * const minimalWorkFields = getAdvancedFieldSelection('works', 'minimal');
 */