/**
 * Advanced Field Selection - Minimal stub implementation
 */

export interface AdvancedEntityFieldSelections {
  works: { minimal: string[] };
  authors: { minimal: string[] };
  sources: { minimal: string[] };
  institutions: { minimal: string[] };
  topics: { minimal: string[] };
  concepts: { minimal: string[] };
  publishers: { minimal: string[] };
  funders: { minimal: string[] };
}

export const ADVANCED_FIELD_SELECTIONS: AdvancedEntityFieldSelections = {
  works: {
    minimal: ['id', 'display_name', 'publication_year', 'type', 'open_access']
  },
  authors: {
    minimal: ['id', 'display_name', 'works_count', 'last_known_institutions']
  },
  sources: {
    minimal: ['id', 'display_name', 'type', 'publisher']
  },
  institutions: {
    minimal: ['id', 'display_name', 'country_code', 'type']
  },
  topics: {
    minimal: ['id', 'display_name', 'keywords']
  },
  concepts: {
    minimal: ['id', 'display_name', 'keywords']
  },
  publishers: {
    minimal: ['id', 'display_name', 'works_count']
  },
  funders: {
    minimal: ['id', 'display_name', 'works_count']
  }
};

export function createAdvancedFieldSelection(entityType: keyof AdvancedEntityFieldSelections): string[] {
  return ADVANCED_FIELD_SELECTIONS[entityType]?.minimal || ['id', 'display_name'];
}