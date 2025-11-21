/**
 * Contract: Entity Metadata Structure
 *
 * This contract defines the metadata structure for each entity type.
 * Metadata includes display names, colors, icons, ID prefixes, and routing paths.
 *
 * Location: packages/types/src/entities/entity-metadata.ts
 */

import type { EntityType } from "./entity-type.contract"

/**
 * Metadata entry for a single entity type
 *
 * @remarks
 * Contains all UI-relevant metadata for displaying and routing entities.
 * Used by components, routing, entity detection, and visualization.
 */
export interface EntityMetadataEntry {
  /**
   * Singular display name (capitalized)
   * @example "Work", "Author", "Institution"
   */
  displayName: string

  /**
   * Plural display name (capitalized)
   * @example "Works", "Authors", "Institutions"
   */
  plural: string

  /**
   * Human-readable description of the entity type
   * @example "Research outputs including articles, books, datasets, and more"
   */
  description: string

  /**
   * Hex color code for UI visualization
   * @example "#3b82f6" (blue for works)
   * @remarks Must be WCAG AA accessible against white and dark backgrounds
   */
  color: string

  /**
   * Icon identifier (Tabler icon name)
   * @example "IconFileText", "IconUser", "IconBuilding"
   * @see https://tabler.io/icons
   */
  icon: string

  /**
   * OpenAlex ID prefix (single uppercase letter)
   * @example "W" for works, "A" for authors, "S" for sources
   */
  idPrefix: string

  /**
   * URL route path segment (lowercase plural)
   * @example "/works", "/authors", "/institutions"
   */
  routePath: string

  /**
   * Lowercase singular form (for text generation)
   * @example "work", "author", "institution"
   */
  singularForm: string
}

/**
 * Complete metadata mapping for all entity types
 *
 * @remarks
 * - Record type ensures exhaustive coverage (all EntityType members must have metadata)
 * - TypeScript enforces compile-time completeness checking
 * - Runtime constant (cannot be modified after initialization)
 *
 * @example
 * ```typescript
 * const metadata = ENTITY_METADATA.works
 * console.log(metadata.displayName)  // "Work"
 * console.log(metadata.color)        // "#3b82f6"
 * console.log(metadata.idPrefix)     // "W"
 * ```
 */
export const ENTITY_METADATA: Record<EntityType, EntityMetadataEntry>

/**
 * Helper function to get metadata for an entity type
 *
 * @param entityType - The entity type to get metadata for
 * @returns Metadata entry for the entity type
 * @throws Error if entityType is not a valid EntityType
 *
 * @example
 * ```typescript
 * const metadata = getEntityMetadata("works")
 * console.log(metadata.displayName)  // "Work"
 * ```
 */
export function getEntityMetadata(entityType: EntityType): EntityMetadataEntry

/**
 * Helper function to convert entity type to singular form
 *
 * @param entityType - The entity type to convert
 * @returns Singular form of the entity type
 *
 * @example
 * ```typescript
 * toSingularForm("works")  // "work"
 * toSingularForm("authors")  // "author"
 * ```
 */
export function toSingularForm(entityType: EntityType): string

/**
 * Helper function to detect entity type from OpenAlex ID
 *
 * @param id - OpenAlex ID (e.g., "W1234567890", "A9876543210")
 * @returns Detected entity type or undefined if invalid ID
 *
 * @example
 * ```typescript
 * detectEntityType("W1234567890")  // "works"
 * detectEntityType("A9876543210")  // "authors"
 * detectEntityType("invalid")      // undefined
 * ```
 */
export function detectEntityType(id: string): EntityType | undefined

/**
 * Helper function to convert plural entity type to singular
 *
 * @param plural - Plural entity type string
 * @returns Singular entity type or undefined if not a valid type
 *
 * @example
 * ```typescript
 * toEntityType("works")  // "works" (already plural, returns as-is)
 * toEntityType("work")   // "works" (converts singular to plural)
 * ```
 */
export function toEntityType(plural: string): EntityType | undefined
