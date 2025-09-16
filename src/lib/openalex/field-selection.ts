/**
 * Type-safe OpenAlex API field selection system
 * Prevents runtime errors by enforcing valid field paths at compile time
 */

import type { Work, Author, Source, Institution, Topic, Concept, Publisher, Funder } from "./types";

/**
 * Utility type to extract valid field paths from a type
 * Supports nested objects and arrays but enforces OpenAlex API limitations
 */
type ValidFieldPaths<T> = {
  [K in keyof T]: K extends string
    ? T[K] extends Array<infer _U>
      ? K // Array fields can only be selected as whole arrays (OpenAlex limitation)
      : T[K] extends object
      ? K // Object fields can only be selected as whole objects (OpenAlex limitation)
      : K // Primitive fields can be selected directly
    : never;
}[keyof T];

/**
 * Type-safe field selection for Work entities
 * Only allows valid top-level fields from the Work interface
 */
export type WorkFieldSelection = ValidFieldPaths<Work>;

/**
 * Type-safe field selection for Author entities
 * Only allows valid top-level fields from the Author interface
 */
export type AuthorFieldSelection = ValidFieldPaths<Author>;

/**
 * Type-safe field selection for Source entities
 * Only allows valid top-level fields from the Source interface
 */
export type SourceFieldSelection = ValidFieldPaths<Source>;

/**
 * Type-safe field selection for Institution entities
 * Only allows valid top-level fields from the Institution interface
 */
export type InstitutionFieldSelection = ValidFieldPaths<Institution>;

/**
 * Type-safe field selection for Topic entities
 * Only allows valid top-level fields from the Topic interface
 */
export type TopicFieldSelection = ValidFieldPaths<Topic>;

/**
 * Type-safe field selection for Concept entities
 * Only allows valid top-level fields from the Concept interface
 */
export type ConceptFieldSelection = ValidFieldPaths<Concept>;

/**
 * Type-safe field selection for Publisher entities
 * Only allows valid top-level fields from the Publisher interface
 */
export type PublisherFieldSelection = ValidFieldPaths<Publisher>;

/**
 * Type-safe field selection for Funder entities
 * Only allows valid top-level fields from the Funder interface
 */
export type FunderFieldSelection = ValidFieldPaths<Funder>;

/**
 * Mapping of entity types to their valid field selections
 */
export interface EntityFieldSelections {
  works: WorkFieldSelection[];
  authors: AuthorFieldSelection[];
  sources: SourceFieldSelection[];
  institutions: InstitutionFieldSelection[];
  topics: TopicFieldSelection[];
  concepts: ConceptFieldSelection[];
  publishers: PublisherFieldSelection[];
  funders: FunderFieldSelection[];
  keywords: string[]; // Keywords don't have a dedicated type yet
}

/**
 * Type-safe field selection for any entity type
 */
export type EntityFieldSelection<T extends keyof EntityFieldSelections> = EntityFieldSelections[T];

/**
 * Predefined field selections for common use cases
 * These are guaranteed to be valid at compile time
 */
export const COMMON_FIELD_SELECTIONS = {
	works: {
		/** Minimal fields for relationship detection */
		minimal: ["id", "display_name", "authorships", "primary_location", "referenced_works"] as const satisfies WorkFieldSelection[],

		/** Basic fields for display */
		basic: ["id", "display_name", "publication_year", "type", "open_access"] as const satisfies WorkFieldSelection[],

		/** Extended fields for detailed view */
		extended: [
			"id",
			"display_name",
			"publication_year",
			"publication_date",
			"type",
			"authorships",
			"primary_location",
			"best_oa_location",
			"open_access",
			"cited_by_count",
			"referenced_works",
			"abstract_inverted_index"
		] as const satisfies WorkFieldSelection[],
	},

	authors: {
		/** Minimal fields for relationship detection */
		minimal: ["id", "display_name", "affiliations"] as const satisfies AuthorFieldSelection[],

		/** Basic fields for display */
		basic: ["id", "display_name", "works_count", "cited_by_count"] as const satisfies AuthorFieldSelection[],

		/** Extended fields for detailed view */
		extended: [
			"id",
			"display_name",
			"works_count",
			"cited_by_count",
			"affiliations",
			"last_known_institutions",
			"orcid"
		] as const satisfies AuthorFieldSelection[],
	},

	sources: {
		/** Minimal fields for relationship detection */
		minimal: ["id", "display_name", "publisher"] as const satisfies SourceFieldSelection[],

		/** Basic fields for display */
		basic: ["id", "display_name", "type", "issn"] as const satisfies SourceFieldSelection[],
	},

	institutions: {
		/** Minimal fields for relationship detection */
		minimal: ["id", "display_name", "lineage"] as const satisfies InstitutionFieldSelection[],

		/** Basic fields for display */
		basic: ["id", "display_name", "type", "country_code"] as const satisfies InstitutionFieldSelection[],
	},

	concepts: {
		/** Minimal fields for relationship detection */
		minimal: ["id", "display_name", "level"] as const satisfies ConceptFieldSelection[],

		/** Basic fields for display */
		basic: ["id", "display_name", "level", "works_count"] as const satisfies ConceptFieldSelection[],
	},
} as const;

/**
 * Type-safe function to create field selections
 * Ensures only valid fields can be selected at compile time
 */
export function createFieldSelection<T extends keyof EntityFieldSelections>(
	entityType: T,
	fields: EntityFieldSelection<T>
): EntityFieldSelection<T> {
	return fields;
}

/**
 * Type-safe function to get predefined field selections
 */
export function getCommonFieldSelection<
  T extends keyof typeof COMMON_FIELD_SELECTIONS,
  S extends keyof typeof COMMON_FIELD_SELECTIONS[T]
>(entityType: T, selectionType: S): typeof COMMON_FIELD_SELECTIONS[T][S] {
	return COMMON_FIELD_SELECTIONS[entityType][selectionType];
}