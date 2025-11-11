/**
 * Catalogue feature constants
 *
 * Centralized configuration for entity type labels, colors, and limits
 * used throughout the catalogue system.
 *
 * Feature: 004-fix-failing-tests
 * Created: 2025-11-11
 */

import type { EntityType } from '../types/catalogue';

/**
 * Human-readable labels for entity types
 */
export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  work: 'Work',
  author: 'Author',
  institution: 'Institution',
  source: 'Source',
  topic: 'Topic',
  funder: 'Funder',
  publisher: 'Publisher',
  concept: 'Concept',
};

/**
 * Mantine color names for entity type badges
 */
export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  work: 'blue',
  author: 'green',
  institution: 'orange',
  source: 'violet',
  topic: 'pink',
  funder: 'yellow',
  publisher: 'red',
  concept: 'gray',
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
