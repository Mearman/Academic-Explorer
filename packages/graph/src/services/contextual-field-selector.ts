/**
 * ContextualFieldSelector - Intelligent field selection based on usage context
 * Provides context-aware field selection for OpenAlex API calls to optimize performance
 * and reduce bandwidth while ensuring all necessary data is retrieved for different use cases.
 */

import type { EntityType } from '../types/core';
import { CacheContext } from './cache-types.js';

// Field mapping configuration for each entity type and context
type FieldMapping = Record<EntityType, Record<CacheContext, string[]>>;

// Core fields that every entity type must have
const CORE_FIELDS = ['id', 'display_name'];

// Base field mappings for all entity types
const FIELD_MAPPINGS: FieldMapping = {
  works: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'authorships.author.id',
      'authorships.author.display_name',
      'authorships.institutions.id',
      'authorships.institutions.display_name',
      'primary_location.source.id',
      'primary_location.source.display_name',
      'referenced_works',
      'related_works',
      'concepts.id',
      'concepts.display_name',
      'concepts.level',
      'topics.id',
      'topics.display_name',
      'grants.funder.id',
      'grants.funder.display_name'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'publication_year',
      'publication_date',
      'cited_by_count',
      'counts_by_year',
      'cited_by_api_url',
      'topics.score',
      'concepts.score',
      'is_oa',
      'oa_date',
      'authorships.author_position',
      'authorships.is_corresponding',
      'primary_location.is_oa',
      'locations.is_oa',
      'sustainable_development_goals',
      'mesh',
      'type'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'title',
      'publication_year',
      'cited_by_count',
      'authorships.author.display_name',
      'authorships.institutions.display_name',
      'primary_location.source.display_name',
      'primary_location.source.host_organization_name',
      'open_access.is_oa',
      'topics.display_name',
      'concepts.display_name',
      'type',
      'doi',
      'language'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'title',
      'publication_year',
      'cited_by_count',
      'authorships.author.display_name',
      'primary_location.source.display_name',
      'doi',
      'type'
    ]
  },
  authors: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'affiliations.institution.id',
      'affiliations.institution.display_name',
      'works_api_url',
      'concepts.id',
      'concepts.display_name',
      'topics.id',
      'topics.display_name'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year',
      'h_index',
      'i10_index',
      'most_cited_work',
      'summary_stats',
      'affiliations.years',
      'topics.count',
      'topics.score',
      'concepts.score'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'orcid',
      'works_count',
      'cited_by_count',
      'h_index',
      'affiliations.institution.display_name',
      'affiliations.institution.country_code',
      'last_known_institution.display_name',
      'most_cited_work'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'orcid',
      'works_count',
      'cited_by_count',
      'affiliations.institution.display_name',
      'last_known_institution.display_name'
    ]
  },
  sources: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'host_organization.id',
      'host_organization.display_name',
      'works_api_url',
      'concepts.id',
      'concepts.display_name',
      'topics.id',
      'topics.display_name'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year',
      'summary_stats',
      'is_oa',
      'is_in_doaj',
      'h_index',
      'i10_index',
      'apc_prices',
      'apc_usd'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'issn_l',
      'issn',
      'host_organization_name',
      'works_count',
      'cited_by_count',
      'is_oa',
      'type',
      'homepage_url'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'issn_l',
      'issn',
      'host_organization_name',
      'works_count',
      'type'
    ]
  },
  institutions: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'associated_institutions.id',
      'associated_institutions.display_name',
      'works_api_url',
      'concepts.id',
      'concepts.display_name',
      'topics.id',
      'topics.display_name'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year',
      'summary_stats',
      'repositories',
      'topics.count',
      'concepts.score'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'ror',
      'country_code',
      'type',
      'homepage_url',
      'image_url',
      'image_thumbnail_url',
      'works_count',
      'cited_by_count'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'ror',
      'country_code',
      'type',
      'works_count'
    ]
  },
  publishers: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'parent_publisher.id',
      'parent_publisher.display_name',
      'sources_api_url',
      'works_api_url'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year',
      'sources_count',
      'summary_stats'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'alternate_titles',
      'country_codes',
      'hierarchy_level',
      'works_count',
      'sources_count',
      'homepage_url',
      'image_url'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'alternate_titles',
      'country_codes',
      'works_count',
      'sources_count'
    ]
  },
  funders: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'works_api_url',
      'grants.id'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year',
      'grants_count',
      'summary_stats'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'alternate_titles',
      'country_code',
      'description',
      'works_count',
      'grants_count',
      'homepage_url',
      'image_url'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'alternate_titles',
      'country_code',
      'works_count',
      'grants_count'
    ]
  },
  topics: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'subfields.id',
      'subfields.display_name',
      'field.id',
      'field.display_name',
      'domain.id',
      'domain.display_name',
      'works_api_url'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year',
      'summary_stats',
      'keywords'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'description',
      'keywords',
      'works_count',
      'cited_by_count',
      'subfields.display_name',
      'field.display_name',
      'domain.display_name'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'description',
      'keywords',
      'works_count',
      'field.display_name'
    ]
  },
  concepts: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'ancestors.id',
      'ancestors.display_name',
      'related_concepts.id',
      'related_concepts.display_name',
      'works_api_url'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year',
      'level',
      'summary_stats'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'description',
      'level',
      'works_count',
      'cited_by_count',
      'image_url',
      'image_thumbnail_url'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'description',
      'level',
      'works_count'
    ]
  },
  keywords: {
    [CacheContext.TRAVERSAL]: [
      ...CORE_FIELDS,
      'works_api_url'
    ],
    [CacheContext.ANALYSIS]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count',
      'counts_by_year'
    ],
    [CacheContext.UI_DISPLAY]: [
      ...CORE_FIELDS,
      'works_count',
      'cited_by_count'
    ],
    [CacheContext.EXPORT]: [
      '*' // All fields for complete export
    ],
    [CacheContext.SEARCH]: [
      ...CORE_FIELDS,
      'works_count'
    ]
  }
};

// Relationship field mappings for graph traversal
const RELATIONSHIP_FIELDS: Record<EntityType, string[]> = {
  works: [
    'authorships.author.id',
    'authorships.institutions.id',
    'primary_location.source.id',
    'referenced_works',
    'related_works',
    'concepts.id',
    'topics.id',
    'grants.funder.id'
  ],
  authors: [
    'affiliations.institution.id',
    'concepts.id',
    'topics.id'
  ],
  sources: [
    'host_organization.id',
    'concepts.id',
    'topics.id'
  ],
  institutions: [
    'associated_institutions.id',
    'concepts.id',
    'topics.id'
  ],
  publishers: [
    'parent_publisher.id'
  ],
  funders: [
    'grants.id'
  ],
  topics: [
    'subfields.id',
    'field.id',
    'domain.id'
  ],
  concepts: [
    'ancestors.id',
    'related_concepts.id'
  ],
  keywords: []
};

/**
 * ContextualFieldSelector provides intelligent field selection based on usage context
 */
export class ContextualFieldSelector {
  private static instance: ContextualFieldSelector;

  private constructor() {}

  static getInstance(): ContextualFieldSelector {
    if (!ContextualFieldSelector.instance) {
      ContextualFieldSelector.instance = new ContextualFieldSelector();
    }
    return ContextualFieldSelector.instance;
  }

  /**
   * Get required fields for an entity type and context
   */
  getRequiredFields(entityType: EntityType, context: CacheContext): string[] {
    const fields = FIELD_MAPPINGS[entityType]?.[context] ?? [];

    // Handle wildcard for export context
    if (fields.includes('*')) {
      return ['*'];
    }

    return Array.from(new Set(fields)); // Remove duplicates
  }

  /**
   * Get minimal fields for basic entity identification
   */
  getMinimalFields(entityType: EntityType): string[] {
    return [...CORE_FIELDS];
  }

  /**
   * Get fields appropriate for a specific traversal depth
   * @param depth - Traversal depth (0 = minimal, 1 = basic relationships, 2+ = extended)
   * @param context - Cache context for field selection
   */
  getFieldsForDepth(depth: number, context: CacheContext): string[] {
    if (depth === 0) {
      return CORE_FIELDS;
    }

    // For depth 1+, combine core fields with context-specific fields
    const baseFields = context === CacheContext.TRAVERSAL ?
      [...CORE_FIELDS] :
      this.getRequiredFields('works', context); // Use works as default for mixed entity queries

    return Array.from(new Set(baseFields));
  }

  /**
   * Determine context from operation string
   */
  determineContext(operation: string): CacheContext {
    const op = operation.toLowerCase();

    if (op.includes('search') || op.includes('query')) {
      return CacheContext.SEARCH;
    }

    if (op.includes('export') || op.includes('download')) {
      return CacheContext.EXPORT;
    }

    if (op.includes('analyz') || op.includes('metric') || op.includes('stat')) {
      return CacheContext.ANALYSIS;
    }

    if (op.includes('display') || op.includes('render') || op.includes('show')) {
      return CacheContext.UI_DISPLAY;
    }

    if (op.includes('traversal') || op.includes('graph') || op.includes('relation')) {
      return CacheContext.TRAVERSAL;
    }

    // Default to UI display for unknown operations
    return CacheContext.UI_DISPLAY;
  }

  /**
   * Get important relationship fields for graph traversal
   */
  getImportantRelationships(entityType: EntityType): string[] {
    return RELATIONSHIP_FIELDS[entityType] ?? [];
  }

  /**
   * Get analysis-specific fields for metrics and statistics
   */
  getAnalysisFields(entityType: EntityType): string[] {
    return this.getRequiredFields(entityType, CacheContext.ANALYSIS);
  }

  /**
   * Get display-specific fields for UI rendering
   */
  getDisplayFields(entityType: EntityType): string[] {
    return this.getRequiredFields(entityType, CacheContext.UI_DISPLAY);
  }

  /**
   * Smart field selection based on multiple contexts
   * Combines fields from multiple contexts with deduplication
   */
  getFieldsForMultipleContexts(entityType: EntityType, contexts: CacheContext[]): string[] {
    const allFields = new Set<string>();

    for (const context of contexts) {
      const fields = this.getRequiredFields(entityType, context);

      // If any context requires all fields, return wildcard
      if (fields.includes('*')) {
        return ['*'];
      }

      fields.forEach(field => allFields.add(field));
    }

    return Array.from(allFields);
  }

  /**
   * Get progressive field loading strategy
   * Returns field sets for incremental loading based on priority
   */
  getProgressiveFields(entityType: EntityType, context: CacheContext): {
    priority1: string[]; // Essential fields loaded first
    priority2: string[]; // Important fields loaded second
    priority3: string[]; // Nice-to-have fields loaded last
  } {
    const allFields = this.getRequiredFields(entityType, context);

    if (allFields.includes('*')) {
      return {
        priority1: CORE_FIELDS,
        priority2: this.getImportantRelationships(entityType),
        priority3: ['*']
      };
    }

    const coreFields = CORE_FIELDS;
    const relationshipFields = this.getImportantRelationships(entityType);
    const remainingFields = allFields.filter(
      field => !coreFields.includes(field) && !relationshipFields.includes(field)
    );

    return {
      priority1: coreFields,
      priority2: relationshipFields,
      priority3: remainingFields
    };
  }

  /**
   * Validate that required fields are present in a field array
   */
  validateFieldSelection(entityType: EntityType, fields: string[], context: CacheContext): {
    valid: boolean;
    missing: string[];
    suggestions: string[];
  } {
    const requiredFields = this.getRequiredFields(entityType, context);

    // If wildcard is present, selection is always valid
    if (fields.includes('*') || requiredFields.includes('*')) {
      return { valid: true, missing: [], suggestions: [] };
    }

    const missing = requiredFields.filter(field => !fields.includes(field));
    const suggestions = missing.length > 0 ?
      this.getMinimalFields(entityType).filter(field => !fields.includes(field)) :
      [];

    return {
      valid: missing.length === 0,
      missing,
      suggestions
    };
  }

  /**
   * Get field dependencies - fields that should be included when certain fields are selected
   */
  getFieldDependencies(entityType: EntityType, selectedFields: string[]): string[] {
    const dependencies = new Set<string>();

    for (const field of selectedFields) {
      // Add core dependencies
      if (field.includes('.id') && !field.includes('.display_name')) {
        const displayNameField = field.replace('.id', '.display_name');
        dependencies.add(displayNameField);
      }

      // Add entity-specific dependencies
      if (entityType === 'works') {
        if (field === 'authorships.author.id') {
          dependencies.add('authorships.author.display_name');
        }
        if (field === 'primary_location.source.id') {
          dependencies.add('primary_location.source.display_name');
        }
      }

      if (entityType === 'authors') {
        if (field === 'affiliations.institution.id') {
          dependencies.add('affiliations.institution.display_name');
        }
      }
    }

    return Array.from(dependencies).filter(dep => !selectedFields.includes(dep));
  }

  /**
   * Optimize field selection by removing redundant fields and adding dependencies
   */
  optimizeFieldSelection(entityType: EntityType, fields: string[]): string[] {
    // If wildcard is present, return as-is
    if (fields.includes('*')) {
      return ['*'];
    }

    const optimized = new Set(fields);

    // Add dependencies
    const dependencies = this.getFieldDependencies(entityType, fields);
    dependencies.forEach(dep => optimized.add(dep));

    // Ensure core fields are always included
    CORE_FIELDS.forEach(field => optimized.add(field));

    return Array.from(optimized).sort();
  }

  /**
   * Get context-specific field recommendations for incomplete selections
   */
  getFieldRecommendations(entityType: EntityType, currentFields: string[], targetContext: CacheContext): {
    recommended: string[];
    reasons: Record<string, string>;
  } {
    const targetFields = this.getRequiredFields(entityType, targetContext);
    const missing = targetFields.filter(field =>
      field !== '*' && !currentFields.includes(field) && !currentFields.includes('*')
    );

    const reasons: Record<string, string> = {};

    missing.forEach(field => {
      if (CORE_FIELDS.includes(field)) {
        reasons[field] = 'Essential for entity identification';
      } else if (this.getImportantRelationships(entityType).includes(field)) {
        reasons[field] = 'Important for graph traversal and relationships';
      } else if (targetContext === CacheContext.ANALYSIS) {
        reasons[field] = 'Required for analytics and metrics';
      } else if (targetContext === CacheContext.UI_DISPLAY) {
        reasons[field] = 'Needed for proper UI display';
      } else {
        reasons[field] = `Required for ${targetContext} operations`;
      }
    });

    return {
      recommended: missing,
      reasons
    };
  }
}

// Export the singleton instance for convenience
export const contextualFieldSelector = ContextualFieldSelector.getInstance();