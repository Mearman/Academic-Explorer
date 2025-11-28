/**
 * Contract: Canonical EntityType Definition
 *
 * This contract defines the single source of truth for OpenAlex entity types.
 * All packages MUST import EntityType from @bibgraph/types.
 *
 * Location: packages/types/src/entities/entities.ts:223-235
 */

/**
 * Union type of all OpenAlex entity types
 *
 * @remarks
 * - Total members: 12 string literal types
 * - Immutable at compile-time (TypeScript union)
 * - Validated at runtime via isEntityType() type guard
 * - Complete set as of OpenAlex Data Version 2 (Walden)
 *
 * @see https://docs.openalex.org/about-the-data/entity-types
 */
export type EntityType =
  | "works"          // Research works (articles, books, datasets, etc.)
  | "authors"        // Authors and contributors
  | "sources"        // Sources (journals, repositories, conferences)
  | "institutions"   // Organizations and institutions
  | "topics"         // Research topics (replaced concepts in 2024)
  | "concepts"       // Research concepts (deprecated, use topics)
  | "publishers"     // Publishers
  | "funders"        // Funding organizations
  | "keywords"       // Research keywords
  | "domains"        // Top-level taxonomy (highest level)
  | "fields"         // Mid-level taxonomy (within domains)
  | "subfields"      // Low-level taxonomy (within fields)

/**
 * Type guard to validate unknown values as EntityType
 *
 * @param value - Unknown value to validate
 * @returns true if value is a valid EntityType string
 *
 * @example
 * ```typescript
 * const input: unknown = "works"
 * if (isEntityType(input)) {
 *   // input is narrowed to EntityType
 *   const type: EntityType = input
 * }
 * ```
 */
export function isEntityType(value: unknown): value is EntityType {
  return typeof value === "string" && (
    value === "works" ||
    value === "authors" ||
    value === "sources" ||
    value === "institutions" ||
    value === "topics" ||
    value === "concepts" ||
    value === "publishers" ||
    value === "funders" ||
    value === "keywords" ||
    value === "domains" ||
    value === "fields" ||
    value === "subfields"
  )
}

/**
 * Mapping from EntityType string to entity interface
 *
 * @remarks
 * Enables type-safe entity lookups based on entity type string.
 * TypeScript infers the correct entity interface from the type parameter.
 *
 * @example
 * ```typescript
 * function getEntity<T extends EntityType>(type: T): EntityTypeMap[T] {
 *   // Return type is automatically inferred based on T
 *   // If T is "works", return type is Work
 *   // If T is "authors", return type is Author
 * }
 * ```
 */
export type EntityTypeMap = {
  works: Work
  authors: Author
  sources: Source
  institutions: InstitutionEntity
  topics: Topic
  concepts: Concept
  publishers: Publisher
  funders: Funder
  keywords: Keyword
  domains: Domain
  fields: Field
  subfields: Subfield
}

// Re-export entity interfaces (imported from @bibgraph/types)
export type {
  Work,
  Author,
  Source,
  InstitutionEntity,
  Topic,
  Concept,
  Publisher,
  Funder,
  Keyword,
  Domain,
  Field,
  Subfield,
} from "@bibgraph/types"
