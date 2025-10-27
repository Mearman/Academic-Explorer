import type {
  Author,
  Concept,
  EntityType,
  Funder,
  InstitutionEntity,
  Publisher,
  Source,
  Topic,
  Work,
} from "@academic-explorer/types"

export interface EntityGridItem {
  id: string
  displayName: string
  entityType: EntityType
  worksCount?: number
  citedByCount?: number
  description?: string
  tags?: Array<{ label: string; color?: string }>
}

// EntityListItem type alias for EntityGridItem
export type EntityListItem = EntityGridItem

/**
 * Base entity mapper that provides common transformation logic
 */
export function createBaseEntityMapper<T extends Work | Author | InstitutionEntity | Source | Publisher | Funder | Topic | Concept>(
  entity: T,
  entityType: EntityType,
): EntityGridItem {
  const baseItem = {
    id: entity.id.replace("https://openalex.org/", ""),
    displayName: entity.display_name,
    entityType,
    worksCount: (entity as { works_count?: number }).works_count, // Some entities like Concept don't have works_count
    citedByCount: entity.cited_by_count,
  }

  return baseItem
}

/**
 * Specialized entity mappers for each type
 */
export const entityMappers = {
  works: (entity: Work): EntityGridItem => {
    const base = createBaseEntityMapper(entity, "works")
    return {
      ...base,
      description: entity.abstract_inverted_index ? "Abstract available" : undefined,
    }
  },

  authors: (entity: Author): EntityGridItem => {
    const base = createBaseEntityMapper(entity, "authors")
    return {
      ...base,
      description: entity.orcid ? `ORCID: ${entity.orcid}` : undefined,
      tags: entity.orcid ? [{ label: "ORCID", color: "green" }] : undefined,
    }
  },

  institutions: (entity: InstitutionEntity): EntityGridItem => {
    return createBaseEntityMapper(entity, "institutions")
  },

  sources: (entity: Source): EntityGridItem => {
    const base = createBaseEntityMapper(entity, "sources")
    const tags: Array<{ label: string; color?: string }> = []

    if (entity.is_oa) {
      tags.push({ label: "Open Access", color: "green" })
    }
    if (entity.type) {
      tags.push({ label: entity.type, color: "gray" })
    }

    return {
      ...base,
      description: entity.publisher ? `Publisher: ${entity.publisher}` : undefined,
      tags: tags.length > 0 ? tags : undefined,
    }
  },

  publishers: (entity: Publisher): EntityGridItem => {
    return createBaseEntityMapper(entity, "publishers")
  },

  funders: (entity: Funder): EntityGridItem => {
    return createBaseEntityMapper(entity, "funders")
  },

  topics: (entity: Topic): EntityGridItem => {
    return createBaseEntityMapper(entity, "topics")
  },

  concepts: (entity: Concept): EntityGridItem => {
    return createBaseEntityMapper(entity, "concepts")
  },
} as const

/**
 * Generic entity transformation function
 */
export function transformEntityToGridItem<T extends Work | Author | InstitutionEntity | Source | Publisher | Funder | Topic | Concept>(
  entity: T,
  entityType: EntityType,
): EntityGridItem {
  const mapper = entityMappers[entityType as keyof typeof entityMappers]
  if (!mapper) {
    throw new Error(`Unsupported entity type: ${entityType}`)
  }
  // Use type assertion with `any` as intermediate to avoid type mismatch
  // The mapper functions are properly typed but TypeScript can't narrow the union type
  return mapper(entity as never)
}

/**
 * Transform entity to list item (currently same as grid item)
 */
export function transformEntityToListItem<T extends Work | Author | InstitutionEntity | Source | Publisher | Funder | Topic | Concept>(
  entity: T,
  entityType: EntityType,
): EntityListItem {
  return transformEntityToGridItem(entity, entityType)
}