/**
 * Advanced Field Selection - Minimal stub implementation
 */

export interface AdvancedEntityFieldSelections {
  works: string[];
  authors: string[];
  sources: string[];
  institutions: string[];
  topics: string[];
  publishers: string[];
  funders: string[];
}

export const ADVANCED_FIELD_SELECTIONS: AdvancedEntityFieldSelections = {
  works: ['id', 'display_name', 'publication_year', 'type', 'open_access'],
  authors: ['id', 'display_name', 'works_count', 'last_known_institutions'],
  sources: ['id', 'display_name', 'type', 'publisher'],
  institutions: ['id', 'display_name', 'country_code', 'type'],
  topics: ['id', 'display_name', 'keywords'],
  publishers: ['id', 'display_name', 'works_count'],
  funders: ['id', 'display_name', 'works_count']
};

export function createAdvancedFieldSelection(entityType: keyof AdvancedEntityFieldSelections): string[] {
  return ADVANCED_FIELD_SELECTIONS[entityType] || ['id', 'display_name'];
}