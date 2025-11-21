/**
 * Catalogue feature constants
 *
 * Centralized configuration for entity type labels, colors, and limits
 * used throughout the catalogue system.
 *
 * Feature: 004-fix-failing-tests
 * Created: 2025-11-11
 * Updated: Uses centralized ENTITY_METADATA for labels and colors
 */

import type { EntityType } from '@academic-explorer/types';
import { ENTITY_METADATA } from '@academic-explorer/types';

/**
 * Human-readable labels for entity types
 * @deprecated Import directly from ENTITY_METADATA - maintained for backward compatibility
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  works: ENTITY_METADATA.works.displayName,
  authors: ENTITY_METADATA.authors.displayName,
  institutions: ENTITY_METADATA.institutions.displayName,
  sources: ENTITY_METADATA.sources.displayName,
  topics: ENTITY_METADATA.topics.displayName,
  funders: ENTITY_METADATA.funders.displayName,
  publishers: ENTITY_METADATA.publishers.displayName,
  concepts: ENTITY_METADATA.concepts.displayName,
  domains: ENTITY_METADATA.domains.displayName,
  fields: ENTITY_METADATA.fields.displayName,
  subfields: ENTITY_METADATA.subfields.displayName,
  keywords: ENTITY_METADATA.keywords.displayName,
};

/**
 * Mantine color names for entity type badges
 * @deprecated Import directly from ENTITY_METADATA - maintained for backward compatibility
 */
export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  works: ENTITY_METADATA.works.color,
  authors: ENTITY_METADATA.authors.color,
  institutions: ENTITY_METADATA.institutions.color,
  sources: ENTITY_METADATA.sources.color,
  topics: ENTITY_METADATA.topics.color,
  funders: ENTITY_METADATA.funders.color,
  publishers: ENTITY_METADATA.publishers.color,
  concepts: ENTITY_METADATA.concepts.color,
  domains: ENTITY_METADATA.domains.color,
  fields: ENTITY_METADATA.fields.color,
  subfields: ENTITY_METADATA.subfields.color,
  keywords: ENTITY_METADATA.keywords.color,
};

/**
 * Maximum length for list title
 */
export const MAX_LIST_TITLE_LENGTH = 200;

/**
 * Maximum length for list description
 */
export const MAX_LIST_DESCRIPTION_LENGTH = 1000;

/**
 * Maximum length for entity note
 */
export const MAX_ENTITY_NOTE_LENGTH = 5000;

/**
 * Maximum number of entities per list
 */
export const MAX_ENTITIES_PER_LIST = 10000;

/**
 * Export format version identifier
 */
export const EXPORT_FORMAT_VERSION = '1.0';
