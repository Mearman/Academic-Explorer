/**
 * Unit tests for comparison store functionality
 * Following TDD principles - write failing tests first
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import type { Author, Work, Institution } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useComparisonStore, type ComparisonEntity, type ComparisonState } from './comparison-store';

// Mock data for testing
const mockAuthor1: Author = {
  id: 'https://openalex.org/A123456789',
  orcid: 'https://orcid.org/0000-0001-0000-0001',
  display_name: 'John Smith',
  display_name_alternatives: ['J. Smith', 'Smith, John'],
  works_count: 150,
  cited_by_count: 2500,
  summary_stats: {
    '2yr_mean_citedness': 2.5,
    h_index: 25,
    i10_index: 40,
  },
  ids: {
    openalex: 'https://openalex.org/A123456789',
    orcid: 'https://orcid.org/0000-0001-0000-0001',
  },
  affiliations: [
    {
      institution: {
        id: 'https://openalex.org/I86987016',
        ror: 'https://ror.org/03vek6s52',
        display_name: 'Harvard University',
        country_code: 'US',
        type: 'education',
        lineage: ['https://openalex.org/I86987016'],
      },
      years: [2020, 2021, 2022, 2023, 2024],
    },
  ],
  last_known_institutions: [],
  topics: [],
  counts_by_year: [
    { year: 2024, works_count: 10, cited_by_count: 200 },
    { year: 2023, works_count: 15, cited_by_count: 350 },
  ],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A123456789',
  updated_date: '2024-01-15T00:00:00.000000',
  created_date: '2020-01-01T00:00:00.000000'
};

const mockAuthor2: Author = {
  id: 'https://openalex.org/A987654321',
  orcid: 'https://orcid.org/0000-0002-0000-0002',
  display_name: 'Jane Doe',
  display_name_alternatives: ['J. Doe', 'Doe, Jane'],
  works_count: 95,
  cited_by_count: 1800,
  summary_stats: {
    '2yr_mean_citedness': 1.8,
    h_index: 18,
    i10_index: 25,
  },
  ids: {
    openalex: 'https://openalex.org/A987654321',
    orcid: 'https://orcid.org/0000-0002-0000-0002',
  },
  affiliations: [
    {
      institution: {
        id: 'https://openalex.org/I5017898742',
        ror: 'https://ror.org/02jbv0t02',
        display_name: 'MIT',
        country_code: 'US',
        type: 'education',
        lineage: ['https://openalex.org/I5017898742'],
      },
      years: [2020, 2021, 2022, 2023, 2024],
    },
  ],
  last_known_institutions: [],
  topics: [],
  counts_by_year: [
    { year: 2024, works_count: 8, cited_by_count: 150 },
    { year: 2023, works_count: 12, cited_by_count: 280 },
  ],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A987654321',
  updated_date: '2024-01-10T00:00:00.000000',
  created_date: '2019-01-01T00:00:00.000000'
};

const mockWork1: Work = {
  id: 'https://openalex.org/W123456789',
  doi: 'https://doi.org/10.1000/182',
  display_name: 'Machine Learning Applications in Research',
  title: 'Machine Learning Applications in Research',
  publication_year: 2023,
  publication_date: '2023-06-15',
  ids: {
    openalex: 'https://openalex.org/W123456789',
    doi: 'https://doi.org/10.1000/182',
  },
  language: 'en',
  primary_location: undefined,
  type: 'article',
  type_crossref: 'journal-article',
  indexed_in: ['crossref'],
  open_access: {
    is_oa: true,
    oa_status: 'gold',
    oa_url: 'https://example.com/paper1.pdf',
    any_repository_has_fulltext: true
  },
  authorships: [],
  countries_distinct_count: 1,
  institutions_distinct_count: 2,
  corresponding_author_ids: [],
  corresponding_institution_ids: [],
  apc_list: undefined,
  apc_paid: undefined,
  fwci: 1.2,
  has_fulltext: true,
  cited_by_count: 45,
  cited_by_percentile_year: {
    min: 75,
    max: 85
  },
  biblio: {
    volume: '15',
    issue: '3',
    first_page: '123',
    last_page: '145'
  },
  is_retracted: false,
  is_paratext: false,
  primary_topic: undefined,
  topics: [],
  keywords: [],
  concepts: [],
  mesh: [],
  locations: [],
  locations_count: 0,
  best_oa_location: undefined,
  sustainable_development_goals: [],
  grants: [],
  abstract_inverted_index: {},
  related_works: [],
  referenced_works_count: 35,
  referenced_works: [],
  cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W123456789',
  counts_by_year: [],
  updated_date: '2024-01-15T00:00:00.000000',
  created_date: '2023-06-15T00:00:00.000000'
};

const mockWork2: Work = {
  id: 'https://openalex.org/W987654321',
  doi: 'https://doi.org/10.1000/183',
  display_name: 'Data Science in Healthcare',
  title: 'Data Science in Healthcare',
  publication_year: 2022,
  publication_date: '2022-08-20',
  ids: {
    openalex: 'https://openalex.org/W987654321',
    doi: 'https://doi.org/10.1000/183',
  },
  language: 'en',
  primary_location: undefined,
  type: 'article',
  type_crossref: 'journal-article',
  indexed_in: ['crossref'],
  open_access: {
    is_oa: false,
    oa_status: 'closed',
    oa_url: undefined,
    any_repository_has_fulltext: false
  },
  authorships: [],
  countries_distinct_count: 2,
  institutions_distinct_count: 3,
  corresponding_author_ids: [],
  corresponding_institution_ids: [],
  apc_list: undefined,
  apc_paid: undefined,
  fwci: 0.8,
  has_fulltext: false,
  cited_by_count: 28,
  cited_by_percentile_year: {
    min: 60,
    max: 70
  },
  biblio: {
    volume: '12',
    issue: '2',
    first_page: '78',
    last_page: '92'
  },
  is_retracted: false,
  is_paratext: false,
  primary_topic: undefined,
  topics: [],
  keywords: [],
  concepts: [],
  mesh: [],
  locations: [],
  locations_count: 0,
  best_oa_location: undefined,
  sustainable_development_goals: [],
  grants: [],
  abstract_inverted_index: {},
  related_works: [],
  referenced_works_count: 42,
  referenced_works: [],
  cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W987654321',
  counts_by_year: [],
  updated_date: '2024-01-10T00:00:00.000000',
  created_date: '2022-08-20T00:00:00.000000'
};

describe('useComparisonStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useComparisonStore());
    act(() => {
      result.current.clearComparison();
    });
  });

  describe('Initial State', () => {
    it('should have empty initial state', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      expect(result.current.entities).toEqual([]);
      expect(result.current.comparisonType).toBeNull();
      expect(result.current.activeView).toBe('overview');
      expect(result.current.isComparing).toBe(false);
      expect(result.current.maxEntities).toBe(5);
    });
  });

  describe('Entity Management', () => {
    it('should add first entity and set comparison type', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
      });

      expect(result.current.entities).toHaveLength(1);
      expect(result.current.entities[0]).toEqual({
        data: mockAuthor1,
        type: EntityType.AUTHOR,
        addedAt: expect.any(Number),
        id: 'A123456789'
      });
      expect(result.current.comparisonType).toBe(EntityType.AUTHOR);
      expect(result.current.isComparing).toBe(false); // Still false with only 1 entity
    });

    it('should add second entity of same type and enable comparison', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
        result.current.addEntity(mockAuthor2, EntityType.AUTHOR);
      });

      expect(result.current.entities).toHaveLength(2);
      expect(result.current.isComparing).toBe(true);
      expect(result.current.comparisonType).toBe(EntityType.AUTHOR);
    });

    it('should reject entity of different type', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
        result.current.addEntity(mockWork1, EntityType.WORK);
      });

      expect(result.current.entities).toHaveLength(1);
      expect(result.current.comparisonType).toBe(EntityType.AUTHOR);
    });

    it('should reject duplicate entities', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
      });

      expect(result.current.entities).toHaveLength(1);
    });

    it('should reject entity when at max capacity', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      // Add 5 entities (max)
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
        for (let i = 2; i <= 5; i++) {
          const mockAuthor = {
            ...mockAuthor1,
            id: `https://openalex.org/A${i}`,
            display_name: `Author ${i}`
          };
          result.current.addEntity(mockAuthor, EntityType.AUTHOR);
        }
      });

      expect(result.current.entities).toHaveLength(5);

      // Try to add 6th entity
      act(() => {
        const extraAuthor = {
          ...mockAuthor1,
          id: 'https://openalex.org/A6',
          display_name: 'Extra Author'
        };
        result.current.addEntity(extraAuthor, EntityType.AUTHOR);
      });

      expect(result.current.entities).toHaveLength(5);
    });

    it('should remove entity by ID', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
        result.current.addEntity(mockAuthor2, EntityType.AUTHOR);
      });

      expect(result.current.entities).toHaveLength(2);

      act(() => {
        result.current.removeEntity('A123456789');
      });

      expect(result.current.entities).toHaveLength(1);
      expect(result.current.entities[0].id).toBe('A987654321');
    });

    it('should clear comparison type when last entity is removed', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
      });

      expect(result.current.comparisonType).toBe(EntityType.AUTHOR);

      act(() => {
        result.current.removeEntity('A123456789');
      });

      expect(result.current.entities).toHaveLength(0);
      expect(result.current.comparisonType).toBeNull();
      expect(result.current.isComparing).toBe(false);
    });

    it('should update comparison status when entities change', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
      });
      expect(result.current.isComparing).toBe(false);

      act(() => {
        result.current.addEntity(mockAuthor2, EntityType.AUTHOR);
      });
      expect(result.current.isComparing).toBe(true);

      act(() => {
        result.current.removeEntity('A987654321');
      });
      expect(result.current.isComparing).toBe(false);
    });
  });

  describe('View Management', () => {
    it('should change active view', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.setActiveView('metrics');
      });

      expect(result.current.activeView).toBe('metrics');
    });

    it('should only accept valid view types', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.setActiveView('timeline');
      });

      expect(result.current.activeView).toBe('timeline');

      // Invalid view should not change state
      act(() => {
        // @ts-expect-error - Testing invalid view type
        result.current.setActiveView('invalid');
      });

      expect(result.current.activeView).toBe('timeline');
    });
  });

  describe('Utility Functions', () => {
    it('should check if entity can be added', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      // Initially can add any entity
      expect(result.current.canAddEntity(mockAuthor1, EntityType.AUTHOR)).toBe(true);
      expect(result.current.canAddEntity(mockWork1, EntityType.WORK)).toBe(true);

      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
      });

      // Can add same type
      expect(result.current.canAddEntity(mockAuthor2, EntityType.AUTHOR)).toBe(true);
      
      // Cannot add different type
      expect(result.current.canAddEntity(mockWork1, EntityType.WORK)).toBe(false);
      
      // Cannot add duplicate
      expect(result.current.canAddEntity(mockAuthor1, EntityType.AUTHOR)).toBe(false);
    });

    it('should check if entity is in comparison', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      expect(result.current.hasEntity('A123456789')).toBe(false);

      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
      });

      expect(result.current.hasEntity('A123456789')).toBe(true);
      expect(result.current.hasEntity('A987654321')).toBe(false);
    });

    it('should get entities by type', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
        result.current.addEntity(mockAuthor2, EntityType.AUTHOR);
      });

      const authors = result.current.getEntitiesByType(EntityType.AUTHOR);
      expect(authors).toHaveLength(2);
      expect(authors[0].data).toEqual(mockAuthor1);
      expect(authors[1].data).toEqual(mockAuthor2);

      const works = result.current.getEntitiesByType(EntityType.WORK);
      expect(works).toHaveLength(0);
    });

    it('should clear all entities and reset state', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      act(() => {
        result.current.addEntity(mockAuthor1, EntityType.AUTHOR);
        result.current.addEntity(mockAuthor2, EntityType.AUTHOR);
        result.current.setActiveView('metrics');
      });

      expect(result.current.entities).toHaveLength(2);
      expect(result.current.activeView).toBe('metrics');

      act(() => {
        result.current.clearComparison();
      });

      expect(result.current.entities).toHaveLength(0);
      expect(result.current.comparisonType).toBeNull();
      expect(result.current.activeView).toBe('overview');
      expect(result.current.isComparing).toBe(false);
    });
  });

  describe('Persistence', () => {
    it('should maintain state across component re-renders', () => {
      let result1 = renderHook(() => useComparisonStore()).result;
      
      act(() => {
        result1.current.addEntity(mockAuthor1, EntityType.AUTHOR);
      });

      // Simulate component re-render by creating new hook instance
      let result2 = renderHook(() => useComparisonStore()).result;
      
      expect(result2.current.entities).toHaveLength(1);
      expect(result2.current.entities[0].data).toEqual(mockAuthor1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid entity data gracefully', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      const invalidEntity = {
        id: '',
        display_name: ''
      };

      act(() => {
        // @ts-expect-error - Testing invalid entity type
        result.current.addEntity(invalidEntity, EntityType.AUTHOR);
      });

      expect(result.current.entities).toHaveLength(0);
    });

    it('should handle malformed entity IDs', () => {
      const { result } = renderHook(() => useComparisonStore());
      
      const entityWithBadId = {
        ...mockAuthor1,
        id: 'invalid-id-format'
      };

      act(() => {
        result.current.addEntity(entityWithBadId, EntityType.AUTHOR);
      });

      // Should still add but with cleaned ID
      expect(result.current.entities).toHaveLength(1);
    });
  });
});