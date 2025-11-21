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

import type { EntityType } from '../types/catalogue';
import { ENTITY_METADATA } from '@academic-explorer/types';

/**
 * Human-readable labels for entity types
 * @deprecated Import directly from ENTITY_METADATA - maintained for backward compatibility
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  work: ENTITY_METADATA.works.displayName,
  author: ENTITY_METADATA.authors.displayName,
  institution: ENTITY_METADATA.institutions.displayName,
  source: ENTITY_METADATA.sources.displayName,
  topic: ENTITY_METADATA.topics.displayName,
  funder: ENTITY_METADATA.funders.displayName,
  publisher: ENTITY_METADATA.publishers.displayName,
  concept: ENTITY_METADATA.concepts.displayName,
  domain: ENTITY_METADATA.domains.displayName,
  field: ENTITY_METADATA.fields.displayName,
  subfield: ENTITY_METADATA.subfields.displayName,
};

/**
 * Mantine color names for entity type badges
 * @deprecated Import directly from ENTITY_METADATA - maintained for backward compatibility
 */
export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  work: ENTITY_METADATA.works.color,
  author: ENTITY_METADATA.authors.color,
  institution: ENTITY_METADATA.institutions.color,
  source: ENTITY_METADATA.sources.color,
  topic: ENTITY_METADATA.topics.color,
  funder: ENTITY_METADATA.funders.color,
  publisher: ENTITY_METADATA.publishers.color,
  concept: ENTITY_METADATA.concepts.color,
  domain: ENTITY_METADATA.domains.color,
  field: ENTITY_METADATA.fields.color,
  subfield: ENTITY_METADATA.subfields.color,
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
