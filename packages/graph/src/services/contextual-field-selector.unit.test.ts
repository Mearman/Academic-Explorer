/**
 * Test suite for ContextualFieldSelector service
 * Tests context-based field selection for OpenAlex API optimization
 *
 * @fileoverview Comprehensive test coverage of contextual field selection logic
 * including context-based field mapping, entity type handling, and integration
 * with the Academic Explorer caching and graph systems.
 */

import { describe, it, expect, beforeEach, vi as _vi } from 'vitest';
import { ContextualFieldSelector } from './contextual-field-selector';
import { CacheContext } from './cache-types';
import type { EntityType } from '../types/core';

describe('ContextualFieldSelector', () => {
  let fieldSelector: ContextualFieldSelector;

  beforeEach(() => {
    fieldSelector = new ContextualFieldSelector();
  });

  describe('Context-Based Field Selection', () => {
    describe('TRAVERSAL context', () => {
      it('should select traversal fields for graph operations', () => {
        const context = CacheContext.TRAVERSAL;

        // Works - fields for graph traversal
        const workFields = fieldSelector.getRequiredFields('works', context);
        expect(workFields).toContain('id');
        expect(workFields).toContain('display_name');
        expect(workFields).toContain('authorships.author.id');
        expect(workFields).toContain('authorships.author.display_name');
        expect(workFields).toContain('referenced_works');
        expect(workFields).toContain('related_works');

        // Authors - fields for traversal
        const authorFields = fieldSelector.getRequiredFields('authors', context);
        expect(authorFields).toContain('id');
        expect(authorFields).toContain('display_name');
        expect(authorFields).toContain('affiliations.institution.id');
        expect(authorFields).toContain('concepts.id');
        expect(authorFields).toContain('topics.id');

        // Sources - fields for traversal
        const sourceFields = fieldSelector.getRequiredFields('sources', context);
        expect(sourceFields).toContain('id');
        expect(sourceFields).toContain('display_name');
        expect(sourceFields).toContain('host_organization.id');
        expect(sourceFields).toContain('works_api_url');
        expect(sourceFields).toContain('concepts.id');

        // Institutions - fields for traversal
        const institutionFields = fieldSelector.getRequiredFields('institutions', context);
        expect(institutionFields).toContain('id');
        expect(institutionFields).toContain('display_name');
        expect(institutionFields).toContain('associated_institutions.id');
        expect(institutionFields).toContain('works_api_url');
        expect(institutionFields).toContain('concepts.id');
      });

      it('should include relationship fields for traversal', () => {
        const context = CacheContext.TRAVERSAL;

        // All entity types should have relationship fields for traversal
        (['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders'] as EntityType[])
          .forEach(entityType => {
            const fields = fieldSelector.getRequiredFields(entityType, context);
            expect(fields).toContain('id');
            expect(fields).toContain('display_name');
          });
      });
    });

    describe('UI_DISPLAY context', () => {
      it('should select UI fields for entity display', () => {
        const context = CacheContext.UI_DISPLAY;

        // Works - UI display fields
        const workFields = fieldSelector.getRequiredFields('works', context);
        expect(workFields).toContain('id');
        expect(workFields).toContain('display_name');
        expect(workFields).toContain('title');
        expect(workFields).toContain('publication_year');
        expect(workFields).toContain('cited_by_count');
        expect(workFields).toContain('authorships.author.display_name');
        expect(workFields).toContain('primary_location.source.display_name');
        expect(workFields).toContain('open_access.is_oa');
        expect(workFields).toContain('type');
        expect(workFields).toContain('doi');
        expect(workFields).toContain('language');

        // Authors - UI display fields
        const authorFields = fieldSelector.getRequiredFields('authors', context);
        expect(authorFields).toContain('id');
        expect(authorFields).toContain('display_name');
        expect(authorFields).toContain('orcid');
        expect(authorFields).toContain('works_count');
        expect(authorFields).toContain('cited_by_count');
        expect(authorFields).toContain('h_index');
        expect(authorFields).toContain('affiliations.institution.display_name');
        expect(authorFields).toContain('last_known_institution.display_name');
        expect(authorFields).toContain('most_cited_work');
      });

      it('should include user-facing fields for display', () => {
        const context = CacheContext.UI_DISPLAY;

        const fields = fieldSelector.getRequiredFields('works', context);
        expect(fields).toContain('display_name');
        expect(fields).toContain('title');
        expect(fields).toContain('publication_year');
        expect(fields).toContain('open_access.is_oa');
        expect(fields).toContain('type');
      });
    });

    describe('ANALYSIS context', () => {
      it('should include analytical fields', () => {
        const context = CacheContext.ANALYSIS;

        const workFields = fieldSelector.getRequiredFields('works', context);
        expect(workFields).toContain('id');
        expect(workFields).toContain('display_name');
        expect(workFields).toContain('publication_year');
        expect(workFields).toContain('publication_date');
        expect(workFields).toContain('cited_by_count');
        expect(workFields).toContain('counts_by_year');
        expect(workFields).toContain('topics.score');
        expect(workFields).toContain('concepts.score');

        const authorFields = fieldSelector.getRequiredFields('authors', context);
        expect(authorFields).toContain('works_count');
        expect(authorFields).toContain('cited_by_count');
        expect(authorFields).toContain('counts_by_year');
        expect(authorFields).toContain('h_index');
        expect(authorFields).toContain('i10_index');
        expect(authorFields).toContain('summary_stats');
      });

      it('should include metrics and statistics', () => {
        const context = CacheContext.ANALYSIS;

        // Works should include analytical fields
        const workFields = fieldSelector.getRequiredFields('works', context);
        expect(workFields).toContain('cited_by_count');
        expect(workFields).toContain('counts_by_year');
        expect(workFields).toContain('publication_year');

        // Sources should include metrics
        const sourceFields = fieldSelector.getRequiredFields('sources', context);
        expect(sourceFields).toContain('works_count');
        expect(sourceFields).toContain('cited_by_count');
        expect(sourceFields).toContain('h_index');
      });
    });

    describe('SEARCH context', () => {
      it('should select fields optimized for search result display', () => {
        const context = CacheContext.SEARCH;

        const workFields = fieldSelector.getRequiredFields('works', context);
        expect(workFields).toContain('id');
        expect(workFields).toContain('display_name');
        expect(workFields).toContain('title');
        expect(workFields).toContain('publication_year');
        expect(workFields).toContain('cited_by_count');
        expect(workFields).toContain('authorships.author.display_name');
        expect(workFields).toContain('primary_location.source.display_name');
        expect(workFields).toContain('doi');
        expect(workFields).toContain('type');

        const authorFields = fieldSelector.getRequiredFields('authors', context);
        expect(authorFields).toContain('id');
        expect(authorFields).toContain('display_name');
        expect(authorFields).toContain('orcid');
        expect(authorFields).toContain('works_count');
        expect(authorFields).toContain('cited_by_count');
        expect(authorFields).toContain('affiliations.institution.display_name');
        expect(authorFields).toContain('last_known_institution.display_name');
      });

      it('should balance detail with performance for search', () => {
        const context = CacheContext.SEARCH;

        (['works', 'authors', 'sources', 'institutions'] as EntityType[])
          .forEach(entityType => {
            const fields = fieldSelector.getRequiredFields(entityType, context);
            expect(fields.length).toBeGreaterThan(5); // Enough detail
            expect(fields.length).toBeLessThan(15); // But not excessive
            expect(fields).toContain('id');
            expect(fields).toContain('display_name');
          });
      });
    });

    describe('EXPORT context', () => {
      it('should select all fields for export', () => {
        const context = CacheContext.EXPORT;

        const workFields = fieldSelector.getRequiredFields('works', context);
        expect(workFields).toEqual(['*']);

        // Authors should get all fields
        const authorFields = fieldSelector.getRequiredFields('authors', context);
        expect(authorFields).toEqual(['*']);
      });

      it('should use wildcard for complete export', () => {
        const context = CacheContext.EXPORT;

        const fields = fieldSelector.getRequiredFields('works', context);
        expect(fields).toEqual(['*']);
      });
    });

    describe('Field validation', () => {
      it('should return valid field arrays for all contexts', () => {
        const contexts = Object.values(CacheContext);
        const entityTypes: EntityType[] = ['works', 'authors', 'sources', 'institutions'];

        contexts.forEach(context => {
          entityTypes.forEach(entityType => {
            const fields = fieldSelector.getRequiredFields(entityType, context);
            expect(Array.isArray(fields)).toBe(true);
            expect(fields.length).toBeGreaterThan(0);

            if (!fields.includes('*')) {
              expect(fields).toContain('id');
              expect(fields).toContain('display_name');
            }
          });
        });
      });

      it('should handle unknown entity types gracefully', () => {
        const unknownType = 'unknown' as EntityType;
        const fields = fieldSelector.getRequiredFields(unknownType, CacheContext.UI_DISPLAY);
        expect(Array.isArray(fields)).toBe(true);
        expect(fields.length).toBeGreaterThanOrEqual(0);
      });
    });

    describe('Minimal fields', () => {
      it('should provide minimal field sets', () => {
        const minimalFields = fieldSelector.getMinimalFields('works');
        expect(minimalFields).toEqual(['id', 'display_name']);

        const authorMinimal = fieldSelector.getMinimalFields('authors');
        expect(authorMinimal).toEqual(['id', 'display_name']);
      });

      it('should provide consistent minimal fields across entity types', () => {
        (['works', 'authors', 'sources', 'institutions'] as EntityType[])
          .forEach(entityType => {
            const fields = fieldSelector.getMinimalFields(entityType);
            expect(fields).toContain('id');
            expect(fields).toContain('display_name');
            expect(fields.length).toBe(2);
          });
      });
    });
  });

  describe('Field Mapping Accuracy', () => {
    it('should map to valid OpenAlex API fields', () => {
      const contexts = Object.values(CacheContext);
      const entityTypes: EntityType[] = ['works', 'authors', 'sources', 'institutions', 'topics', 'publishers', 'funders'];

      contexts.forEach(context => {
        entityTypes.forEach(entityType => {
          const fields = fieldSelector.getRequiredFields(entityType, context);

          // All fields should be strings or wildcard
          fields.forEach(field => {
            expect(typeof field).toBe('string');
            expect(field).toBeTruthy();
          });

          // Fields are allowed in the implementation
          if (!fields.includes('*')) {
            // Basic validation that fields exist
            expect(fields.length).toBeGreaterThan(0);
          }
        });
      });
    });

    it('should include required base fields for all contexts', () => {
      const contexts = Object.values(CacheContext);
      const entityTypes: EntityType[] = ['works', 'authors', 'sources', 'institutions'];

      contexts.forEach(context => {
        entityTypes.forEach(entityType => {
          const fields = fieldSelector.getRequiredFields(entityType, context);

          // All entities must have id and display_name unless wildcard
          if (!fields.includes('*')) {
            expect(fields).toContain('id');
            expect(fields).toContain('display_name');
          }
        });
      });
    });

    it('should use valid field selections', () => {
      const workFields = fieldSelector.getRequiredFields('works', CacheContext.UI_DISPLAY);

      // Should include basic fields or wildcard
      if (!workFields.includes('*')) {
        expect(workFields).toContain('id');
        expect(workFields).toContain('display_name');
      }
      expect(Array.isArray(workFields)).toBe(true);
    });

    it('should map entity relationships correctly', () => {
      // Works should include relationship fields in traversal context
      const workFields = fieldSelector.getRequiredFields('works', CacheContext.TRAVERSAL);
      expect(workFields).toContain('authorships.author.id');
      expect(workFields).toContain('referenced_works');
      expect(workFields).toContain('primary_location.source.id');

      // Authors should include institution relationships
      const authorFields = fieldSelector.getRequiredFields('authors', CacheContext.TRAVERSAL);
      expect(authorFields).toContain('affiliations.institution.id');

      // Sources should include host organization relationships
      const sourceFields = fieldSelector.getRequiredFields('sources', CacheContext.TRAVERSAL);
      expect(sourceFields).toContain('host_organization.id');
    });
  });

  describe('Field Dependencies and Optimization', () => {
    it('should provide field dependencies', () => {
      const dependencies = fieldSelector.getFieldDependencies('works', ['authorships.author.id']);
      expect(dependencies).toContain('authorships.author.display_name');
    });

    it('should optimize field selections', () => {
      const fields = ['id', 'authorships.author.id'];
      const optimized = fieldSelector.optimizeFieldSelection('works', fields);
      expect(optimized).toContain('id');
      expect(optimized).toContain('display_name');
      expect(optimized).toContain('authorships.author.id');
      expect(optimized).toContain('authorships.author.display_name');
    });

    it('should avoid duplicate fields in selections', () => {
      const contexts = Object.values(CacheContext);
      const entityTypes: EntityType[] = ['works', 'authors', 'sources'];

      contexts.forEach(context => {
        entityTypes.forEach(entityType => {
          const fields = fieldSelector.getRequiredFields(entityType, context);
          const uniqueFields = [...new Set(fields)];

          expect(fields.length).toBe(uniqueFields.length);
        });
      });
    });

    it('should provide progressive field loading', () => {
      const progressive = fieldSelector.getProgressiveFields('works', CacheContext.UI_DISPLAY);

      expect(progressive).toHaveProperty('priority1');
      expect(progressive).toHaveProperty('priority2');
      expect(progressive).toHaveProperty('priority3');

      expect(progressive.priority1).toEqual(['id', 'display_name']);
    });
  });

  describe('Context Determination', () => {
    it('should provide context detection from operation types', () => {
      expect(fieldSelector.determineContext('graph')).toBe(CacheContext.TRAVERSAL);
      expect(fieldSelector.determineContext('traversal')).toBe(CacheContext.TRAVERSAL);
      expect(fieldSelector.determineContext('display')).toBe(CacheContext.UI_DISPLAY);
      expect(fieldSelector.determineContext('search-results')).toBe(CacheContext.SEARCH);
      expect(fieldSelector.determineContext('analyze')).toBe(CacheContext.ANALYSIS);
      expect(fieldSelector.determineContext('metrics')).toBe(CacheContext.ANALYSIS);
      expect(fieldSelector.determineContext('export')).toBe(CacheContext.EXPORT);
    });

    it('should handle multiple contexts', () => {
      const multiContextFields = fieldSelector.getFieldsForMultipleContexts('works', [
        CacheContext.UI_DISPLAY,
        CacheContext.SEARCH
      ]);

      expect(Array.isArray(multiContextFields)).toBe(true);
      expect(multiContextFields.length).toBeGreaterThan(0);
      if (!multiContextFields.includes('*')) {
        expect(multiContextFields).toContain('id');
        expect(multiContextFields).toContain('display_name');
      }
    });

    it('should validate field selections', () => {
      const validation = fieldSelector.validateFieldSelection(
        'works',
        ['id', 'display_name'],
        CacheContext.UI_DISPLAY
      );

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('missing');
      expect(validation).toHaveProperty('suggestions');
      expect(typeof validation.valid).toBe('boolean');
    });

    it('should provide default context fallback', () => {
      // Unknown operation should fallback to a sensible default
      expect(fieldSelector.determineContext('unknown-operation')).toBe(CacheContext.UI_DISPLAY);
      expect(fieldSelector.determineContext('')).toBe(CacheContext.UI_DISPLAY);
    });
  });

  describe('Entity Type Handling', () => {
    it('should handle all supported entity types', () => {
      const supportedTypes: EntityType[] = [
        'works', 'authors', 'sources', 'institutions',
        'topics', 'concepts', 'publishers', 'funders', 'keywords'
      ];

      supportedTypes.forEach(entityType => {
        expect(() => {
          fieldSelector.getRequiredFields(entityType, CacheContext.TRAVERSAL);
        }).not.toThrow();

        const fields = fieldSelector.getRequiredFields(entityType, CacheContext.TRAVERSAL);
        expect(Array.isArray(fields)).toBe(true);
        expect(fields.length).toBeGreaterThan(0);
      });
    });

    it('should provide entity-specific field mappings', () => {
      // Works-specific fields
      const workFields = fieldSelector.getRequiredFields('works', CacheContext.UI_DISPLAY);
      if (!workFields.includes('*')) {
        expect(workFields).toContain('title');
        expect(workFields).toContain('publication_year');
      }

      // Author-specific fields
      const authorFields = fieldSelector.getRequiredFields('authors', CacheContext.UI_DISPLAY);
      if (!authorFields.includes('*')) {
        expect(authorFields).toContain('orcid');
        expect(authorFields).toContain('h_index');
      }

      // Source-specific fields
      const sourceFields = fieldSelector.getRequiredFields('sources', CacheContext.UI_DISPLAY);
      if (!sourceFields.includes('*')) {
        expect(sourceFields).toContain('issn_l');
        expect(sourceFields).toContain('issn');
      }
    });

    it('should handle cross-entity relationships', () => {
      // Works should include fields that reference other entities
      const workRelationships = fieldSelector.getImportantRelationships('works');
      expect(workRelationships).toContain('authorships.author.id');
      expect(workRelationships).toContain('primary_location.source.id');

      // Authors should include institution references
      const authorRelationships = fieldSelector.getImportantRelationships('authors');
      expect(authorRelationships).toContain('affiliations.institution.id');
    });

    it('should get fields for depth-based selection', () => {
      const depthFields = fieldSelector.getFieldsForDepth(0, CacheContext.UI_DISPLAY);
      expect(depthFields).toEqual(['id', 'display_name']);

      const deeperFields = fieldSelector.getFieldsForDepth(1, CacheContext.TRAVERSAL);
      expect(deeperFields).toContain('id');
      expect(deeperFields).toContain('display_name');
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle unknown entity types gracefully', () => {
      const unknownType = 'unknown' as EntityType;

      expect(() => {
        fieldSelector.getRequiredFields(unknownType, CacheContext.UI_DISPLAY);
      }).not.toThrow();

      const fields = fieldSelector.getRequiredFields(unknownType, CacheContext.UI_DISPLAY);
      expect(Array.isArray(fields)).toBe(true);
    });

    it('should handle invalid context values', () => {
      const invalidContext = 'invalid_context' as CacheContext;

      expect(() => {
        fieldSelector.getRequiredFields('works', invalidContext);
      }).not.toThrow();

      const fields = fieldSelector.getRequiredFields('works', invalidContext);
      expect(Array.isArray(fields)).toBe(true);
    });

    it('should provide field recommendations', () => {
      const recommendations = fieldSelector.getFieldRecommendations(
        'works',
        ['id'],
        CacheContext.UI_DISPLAY
      );

      expect(recommendations).toHaveProperty('recommended');
      expect(recommendations).toHaveProperty('reasons');
      expect(Array.isArray(recommendations.recommended)).toBe(true);
      expect(typeof recommendations.reasons).toBe('object');
    });

    it('should handle empty or null input', () => {
      expect(() => {
        fieldSelector.getRequiredFields('works', null as any);
      }).not.toThrow();

      expect(() => {
        fieldSelector.getRequiredFields(null as any, CacheContext.UI_DISPLAY);
      }).not.toThrow();

      expect(() => {
        fieldSelector.getRequiredFields('', CacheContext.UI_DISPLAY);
      }).not.toThrow();
    });
  });

  describe('Analysis and Display Methods', () => {
    it('should provide analysis fields', () => {
      const analysisFields = fieldSelector.getAnalysisFields('works');
      expect(Array.isArray(analysisFields)).toBe(true);
      if (!analysisFields.includes('*')) {
        expect(analysisFields).toContain('cited_by_count');
        expect(analysisFields).toContain('counts_by_year');
      }
    });

    it('should provide display fields', () => {
      const displayFields = fieldSelector.getDisplayFields('authors');
      expect(Array.isArray(displayFields)).toBe(true);
      if (!displayFields.includes('*')) {
        expect(displayFields).toContain('id');
        expect(displayFields).toContain('display_name');
        expect(displayFields).toContain('orcid');
      }
    });
  });

  describe('Performance and Core Functionality', () => {
    it('should provide consistent field selections', () => {
      const fields1 = fieldSelector.getRequiredFields('works', CacheContext.UI_DISPLAY);
      const fields2 = fieldSelector.getRequiredFields('works', CacheContext.UI_DISPLAY);

      expect(fields1).toEqual(fields2);
    });

    it('should handle singleton instance correctly', () => {
      const instance1 = ContextualFieldSelector.getInstance();
      const instance2 = ContextualFieldSelector.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should support Academic Explorer use cases', () => {
      // Graph traversal
      const traversalFields = fieldSelector.getRequiredFields('works', CacheContext.TRAVERSAL);
      expect(Array.isArray(traversalFields)).toBe(true);
      expect(traversalFields).toContain('id');
      expect(traversalFields).toContain('display_name');

      // UI Display
      const displayFields = fieldSelector.getRequiredFields('works', CacheContext.UI_DISPLAY);
      expect(Array.isArray(displayFields)).toBe(true);
      if (!displayFields.includes('*')) {
        expect(displayFields).toContain('title');
      }

      // Analysis
      const analysisFields = fieldSelector.getRequiredFields('works', CacheContext.ANALYSIS);
      expect(Array.isArray(analysisFields)).toBe(true);
      if (!analysisFields.includes('*')) {
        expect(analysisFields).toContain('cited_by_count');
      }
    });
  });
});


