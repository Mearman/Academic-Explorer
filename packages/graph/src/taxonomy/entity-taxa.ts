/**
 * Entity and relation taxonomy definitions for Academic Explorer
 * Provides structured metadata for all entity and relation types
 */

import type { EntityType } from "../types/core";
import { RelationType } from "../types/core";

/**
 * Taxonomy entry for entities and relations
 */
export interface Taxon {
  /** Human-readable display name */
  displayName: string;
  /** Detailed description */
  description: string;
  /** UI color identifier */
  color: string;
  /** Plural form for display */
  plural: string;
}

/**
 * Taxonomy definitions for all entity types
 */
export const ENTITY_TAXONOMY: Record<EntityType, Taxon> = {
  works: {
    displayName: "Work",
    description:
      "Academic publications, articles, books, and other scholarly outputs",
    color: "blue",
    plural: "Works",
  },
  authors: {
    displayName: "Author",
    description: "Researchers, scholars, and contributors to academic works",
    color: "green",
    plural: "Authors",
  },
  sources: {
    displayName: "Source",
    description: "Journals, conferences, books, and other publication venues",
    color: "purple",
    plural: "Sources",
  },
  institutions: {
    displayName: "Institution",
    description: "Universities, research centers, and academic organizations",
    color: "orange",
    plural: "Institutions",
  },
  publishers: {
    displayName: "Publisher",
    description: "Publishing companies and organizations",
    color: "teal",
    plural: "Publishers",
  },
  funders: {
    displayName: "Funder",
    description: "Funding agencies and research sponsors",
    color: "cyan",
    plural: "Funders",
  },
  topics: {
    displayName: "Topic",
    description: "Research topics and subject areas",
    color: "red",
    plural: "Topics",
  },
  concepts: {
    displayName: "Concept",
    description: "Semantic concepts and research areas from OpenAlex",
    color: "pink",
    plural: "Concepts",
  },
  keywords: {
    displayName: "Keyword",
    description: "User-defined keywords and tags",
    color: "gray",
    plural: "Keywords",
  },
};

/**
 * Taxonomy definitions for all relation types
 */
export const RELATION_TAXONOMY: Record<RelationType, Taxon> = {
  [RelationType.AUTHORED]: {
    displayName: "Authored",
    description: "Author contributed to or created the work",
    color: "green",
    plural: "Authored",
  },
  [RelationType.AFFILIATED]: {
    displayName: "Affiliated",
    description: "Author is affiliated with an institution",
    color: "orange",
    plural: "Affiliated",
  },
  [RelationType.PUBLISHED_IN]: {
    displayName: "Published In",
    description: "Work was published in a source",
    color: "purple",
    plural: "Published In",
  },
  [RelationType.FUNDED_BY]: {
    displayName: "Funded By",
    description: "Work received funding from a funder",
    color: "cyan",
    plural: "Funded By",
  },
  [RelationType.REFERENCES]: {
    displayName: "References",
    description: "Work cites or references another work",
    color: "blue",
    plural: "References",
  },
  [RelationType.SOURCE_PUBLISHED_BY]: {
    displayName: "Published By",
    description: "Source is published by a publisher",
    color: "teal",
    plural: "Published By",
  },
  [RelationType.INSTITUTION_CHILD_OF]: {
    displayName: "Child Of",
    description:
      "Institution is a subsidiary or department of another institution",
    color: "orange",
    plural: "Children Of",
  },
  [RelationType.PUBLISHER_CHILD_OF]: {
    displayName: "Child Of",
    description: "Publisher is a subsidiary of another publisher",
    color: "teal",
    plural: "Children Of",
  },
  [RelationType.WORK_HAS_TOPIC]: {
    displayName: "Has Topic",
    description: "Work is associated with a research topic",
    color: "red",
    plural: "Has Topics",
  },
  [RelationType.WORK_HAS_KEYWORD]: {
    displayName: "Has Keyword",
    description: "Work is tagged with a keyword",
    color: "gray",
    plural: "Has Keywords",
  },
  [RelationType.AUTHOR_RESEARCHES]: {
    displayName: "Researches",
    description: "Author conducts research in a topic area",
    color: "red",
    plural: "Researches",
  },
  [RelationType.INSTITUTION_LOCATED_IN]: {
    displayName: "Located In",
    description: "Institution is located in a geographic area",
    color: "yellow",
    plural: "Located In",
  },
  [RelationType.FUNDER_LOCATED_IN]: {
    displayName: "Located In",
    description: "Funder is located in a geographic area",
    color: "yellow",
    plural: "Located In",
  },
  [RelationType.TOPIC_PART_OF_FIELD]: {
    displayName: "Part Of Field",
    description: "Topic belongs to a broader research field",
    color: "red",
    plural: "Parts Of Fields",
  },
  [RelationType.RELATED_TO]: {
    displayName: "Related To",
    description: "General relationship between entities",
    color: "gray",
    plural: "Related To",
  },
};

/**
 * Icon mappings for entity types using Tabler icon names
 */
export const ENTITY_ICON_MAP: Record<EntityType, string> = {
  works: "IconFileText",
  authors: "IconUser",
  sources: "IconBook",
  institutions: "IconBuilding",
  publishers: "IconPrinter",
  funders: "IconCoin",
  topics: "IconTag",
  concepts: "IconBulb",
  keywords: "IconHash",
};

/**
 * Helper function to get taxonomy information for an entity type
 */
export function getEntityTaxon(entityType: EntityType): Taxon {
  return ENTITY_TAXONOMY[entityType];
}

/**
 * Helper function to get taxonomy information for a relation type
 */
export function getRelationTaxon(relationType: RelationType): Taxon {
  return RELATION_TAXONOMY[relationType];
}

/**
 * Helper function to get the icon name for an entity type
 */
export function getEntityIcon(entityType: EntityType): string {
  return ENTITY_ICON_MAP[entityType];
}

/**
 * Helper function to get the color for an entity type
 */
export function getEntityColor(entityType: EntityType): string {
  return ENTITY_TAXONOMY[entityType].color;
}

/**
 * Helper function to get the display name for an entity type
 */
export function getEntityDisplayName(entityType: EntityType): string {
  return ENTITY_TAXONOMY[entityType].displayName;
}

/**
 * Helper function to get the plural form for an entity type
 */
export function getEntityPlural(entityType: EntityType): string {
  return ENTITY_TAXONOMY[entityType].plural;
}

/**
 * Helper function to get the color for a relation type
 */
export function getRelationColor(relationType: RelationType): string {
  return RELATION_TAXONOMY[relationType].color;
}
