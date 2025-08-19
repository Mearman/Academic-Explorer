/**
 * Unit tests for comparison data hooks
 * Tests data transformation, metric calculation, and comparison analysis
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { Author, Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { 
  useComparisonMetrics, 
  useComparisonAnalysis,
  type ComparisonMetrics,
  type MetricComparison,
  type ComparisonAnalysis
} from './use-comparison-data';

// Mock data for testing
const mockAuthor1: Author = {
  id: 'https://openalex.org/A123456789',
  display_name: 'John Smith',
  display_name_alternatives: ['J. Smith', 'John A. Smith'],
  works_count: 150,
  cited_by_count: 2500,
  summary_stats: {
    '2yr_mean_citedness': 8.5,
    h_index: 25,
    i10_index: 45
  },
  ids: {
    openalex: 'https://openalex.org/A123456789'
  },
  affiliations: [],
  counts_by_year: [
    { year: 2023, works_count: 15, cited_by_count: 120 },
    { year: 2024, works_count: 12, cited_by_count: 85 }
  ],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A123456789',
  updated_date: '2024-01-15T00:00:00.000000',
  created_date: '2020-01-01T00:00:00.000000'
};

const mockAuthor2: Author = {
  id: 'https://openalex.org/A987654321',
  display_name: 'Jane Doe',
  display_name_alternatives: ['J. Doe'],
  works_count: 95,
  cited_by_count: 1800,
  summary_stats: {
    '2yr_mean_citedness': 6.2,
    h_index: 18,
    i10_index: 28
  },
  ids: {
    openalex: 'https://openalex.org/A987654321'
  },
  affiliations: [],
  counts_by_year: [
    { year: 2023, works_count: 8, cited_by_count: 95 },
    { year: 2024, works_count: 6, cited_by_count: 62 }
  ],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A987654321',
  updated_date: '2024-01-10T00:00:00.000000',
  created_date: '2019-03-15T00:00:00.000000'
};

const mockAuthor3: Author = {
  id: 'https://openalex.org/A555666777',
  display_name: 'Bob Wilson',
  display_name_alternatives: [],
  works_count: 220,
  cited_by_count: 3200,
  summary_stats: {
    '2yr_mean_citedness': 12.1,
    h_index: 32,
    i10_index: 68
  },
  ids: {
    openalex: 'https://openalex.org/A555666777'
  },
  affiliations: [],
  counts_by_year: [
    { year: 2023, works_count: 25, cited_by_count: 180 },
    { year: 2024, works_count: 22, cited_by_count: 145 }
  ],
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A555666777',
  updated_date: '2024-01-20T00:00:00.000000',
  created_date: '2018-06-30T00:00:00.000000'
};

const mockWork1: Work = {
  id: 'https://openalex.org/W123456789',
  doi: 'https://doi.org/10.1000/182',
  display_name: 'Machine Learning Applications in Research',
  title: 'Machine Learning Applications in Research',
  publication_year: 2023,
  publication_date: '2023-06-15',
  type: 'article',
  type_crossref: 'journal-article',
  ids: {
    openalex: 'https://openalex.org/W123456789',
    doi: 'https://doi.org/10.1000/182'
  },
  is_retracted: false,
  is_paratext: false,
  locations_count: 1,
  open_access: {
    is_oa: true,
    oa_status: 'gold',
    oa_url: 'https://example.com/paper1.pdf',
    any_repository_has_fulltext: true
  },
  authorships: [],
  biblio: {
    volume: '15',
    issue: '3',
    first_page: '123',
    last_page: '145'
  },
  cited_by_count: 45,
  counts_by_year: [
    { year: 2023, works_count: 1, cited_by_count: 25 },
    { year: 2024, works_count: 0, cited_by_count: 20 }
  ],
  referenced_works_count: 35,
  related_works: [],
  abstract_inverted_index: {},
  concepts: [],
  topics: [],
  keywords: [],
  mesh: [],
  locations: [],
  best_oa_location: undefined,
  primary_location: undefined,
  sustainable_development_goals: [],
  grants: [],
  apc_list: undefined,
  apc_paid: undefined,
  fwci: 1.2,
  has_fulltext: true,
  cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W123456789',
  updated_date: '2024-01-15T00:00:00.000000',
  created_date: '2023-06-15T00:00:00.000000',
  indexed_in: [],
  institutions_distinct_count: 2,
  countries_distinct_count: 1,
  corresponding_author_ids: [],
  corresponding_institution_ids: [],
  language: 'en'
};

const mockWork2: Work = {
  id: 'https://openalex.org/W987654321',
  doi: 'https://doi.org/10.1000/183',
  display_name: 'Data Science in Healthcare',
  title: 'Data Science in Healthcare',
  publication_year: 2022,
  publication_date: '2022-08-20',
  type: 'article',
  type_crossref: 'journal-article',
  ids: {
    openalex: 'https://openalex.org/W987654321',
    doi: 'https://doi.org/10.1000/183'
  },
  is_retracted: false,
  is_paratext: false,
  locations_count: 1,
  open_access: {
    is_oa: false,
    oa_status: 'closed',
    oa_url: undefined,
    any_repository_has_fulltext: false
  },
  authorships: [],
  biblio: {
    volume: '12',
    issue: '2',
    first_page: '78',
    last_page: '92'
  },
  cited_by_count: 28,
  counts_by_year: [
    { year: 2022, works_count: 1, cited_by_count: 15 },
    { year: 2023, works_count: 0, cited_by_count: 10 },
    { year: 2024, works_count: 0, cited_by_count: 3 }
  ],
  referenced_works_count: 42,
  related_works: [],
  abstract_inverted_index: {},
  concepts: [],
  topics: [],
  keywords: [],
  mesh: [],
  locations: [],
  best_oa_location: undefined,
  primary_location: undefined,
  sustainable_development_goals: [],
  grants: [],
  apc_list: undefined,
  apc_paid: undefined,
  fwci: 0.8,
  has_fulltext: false,
  cited_by_api_url: 'https://api.openalex.org/works?filter=cites:W987654321',
  updated_date: '2024-01-10T00:00:00.000000',
  created_date: '2022-08-20T00:00:00.000000',
  indexed_in: [],
  institutions_distinct_count: 3,
  countries_distinct_count: 2,
  corresponding_author_ids: [],
  corresponding_institution_ids: [],
  language: 'en'
};

describe('useComparisonMetrics', () => {
  describe('Empty State', () => {
    it('should return empty metrics for no entities', () => {
      const { result } = renderHook(() => useComparisonMetrics([]));
      
      expect(result.current.comparisonMetrics).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMetrics).toBe(false);
    });
  });

  describe('Single Entity', () => {
    it('should return metrics for single author', () => {
      const entities = [{
        data: mockAuthor1,
        type: EntityType.AUTHOR,
        id: 'A123456789',
        addedAt: Date.now()
      }];

      const { result } = renderHook(() => useComparisonMetrics(entities));
      
      expect(result.current.comparisonMetrics).toHaveLength(1);
      expect(result.current.hasMetrics).toBe(true);
      
      const metrics = result.current.comparisonMetrics[0];
      expect(metrics.entityId).toBe('A123456789');
      expect(metrics.entityName).toBe('John Smith');
      expect(metrics.metrics.worksCount).toEqual({
        value: 150,
        formatted: '150',
        isHighest: true,
        isLowest: true,
        rank: 1,
        percentile: 100
      });
    });

    it('should return metrics for single work', () => {
      const entities = [{
        data: mockWork1,
        type: EntityType.WORK,
        id: 'W123456789',
        addedAt: Date.now()
      }];

      const { result } = renderHook(() => useComparisonMetrics(entities));
      
      expect(result.current.comparisonMetrics).toHaveLength(1);
      
      const metrics = result.current.comparisonMetrics[0];
      expect(metrics.entityId).toBe('W123456789');
      expect(metrics.entityName).toBe('Machine Learning Applications in Research');
      expect(metrics.metrics.citedByCount).toEqual({
        value: 45,
        formatted: '45',
        isHighest: true,
        isLowest: true,
        rank: 1,
        percentile: 100
      });
    });
  });

  describe('Multiple Authors', () => {
    it('should calculate comparative metrics for multiple authors', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 },
        { data: mockAuthor3, type: EntityType.AUTHOR, id: 'A555666777', addedAt: Date.now() + 2 }
      ];

      const { result } = renderHook(() => useComparisonMetrics(entities));
      
      expect(result.current.comparisonMetrics).toHaveLength(3);
      expect(result.current.hasMetrics).toBe(true);

      // Check rankings for works count (220, 150, 95)
      const author3Metrics = result.current.comparisonMetrics.find(m => m.entityId === 'A555666777')!;
      const author1Metrics = result.current.comparisonMetrics.find(m => m.entityId === 'A123456789')!;
      const author2Metrics = result.current.comparisonMetrics.find(m => m.entityId === 'A987654321')!;

      expect(author3Metrics.metrics.worksCount.rank).toBe(1);
      expect(author3Metrics.metrics.worksCount.isHighest).toBe(true);
      expect(author3Metrics.metrics.worksCount.isLowest).toBe(false);
      expect(author3Metrics.metrics.worksCount.percentile).toBe(100);

      expect(author1Metrics.metrics.worksCount.rank).toBe(2);
      expect(author1Metrics.metrics.worksCount.isHighest).toBe(false);
      expect(author1Metrics.metrics.worksCount.isLowest).toBe(false);
      expect(author1Metrics.metrics.worksCount.percentile).toBe(67);

      expect(author2Metrics.metrics.worksCount.rank).toBe(3);
      expect(author2Metrics.metrics.worksCount.isHighest).toBe(false);
      expect(author2Metrics.metrics.worksCount.isLowest).toBe(true);
      expect(author2Metrics.metrics.worksCount.percentile).toBe(33);
    });

    it('should handle missing metrics gracefully', () => {
      const authorWithoutStats = {
        ...mockAuthor1,
        summary_stats: undefined,
        works_count: undefined,
        cited_by_count: undefined
      } as unknown as Author; // Type assertion for testing invalid data

      const entities = [
        { data: authorWithoutStats, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 }
      ];

      const { result } = renderHook(() => useComparisonMetrics(entities));
      
      expect(result.current.comparisonMetrics).toHaveLength(2);
      expect(result.current.error).toBeNull();
    });
  });

  describe('Multiple Works', () => {
    it('should calculate comparative metrics for multiple works', () => {
      const entities = [
        { data: mockWork1, type: EntityType.WORK, id: 'W123456789', addedAt: Date.now() },
        { data: mockWork2, type: EntityType.WORK, id: 'W987654321', addedAt: Date.now() + 1 }
      ];

      const { result } = renderHook(() => useComparisonMetrics(entities));
      
      expect(result.current.comparisonMetrics).toHaveLength(2);

      const work1Metrics = result.current.comparisonMetrics.find(m => m.entityId === 'W123456789')!;
      const work2Metrics = result.current.comparisonMetrics.find(m => m.entityId === 'W987654321')!;

      // Work 1 has higher citations (45 vs 28)
      expect(work1Metrics.metrics.citedByCount.rank).toBe(1);
      expect(work1Metrics.metrics.citedByCount.isHighest).toBe(true);
      expect(work2Metrics.metrics.citedByCount.rank).toBe(2);
      expect(work2Metrics.metrics.citedByCount.isLowest).toBe(true);

      // Work 1 has higher FWCI (1.2 vs 0.8)
      expect(work1Metrics.metrics.fwci?.rank).toBe(1);
      expect(work2Metrics.metrics.fwci?.rank).toBe(2);
    });
  });

  describe('Metric Calculations', () => {
    it('should format numeric values correctly', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() }
      ];

      const { result } = renderHook(() => useComparisonMetrics(entities));
      
      const metrics = result.current.comparisonMetrics[0];
      expect(metrics.metrics.worksCount.formatted).toBe('150');
      expect(metrics.metrics.citedByCount.formatted).toBe('2,500');
    });

    it('should calculate percentiles correctly', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 },
        { data: mockAuthor3, type: EntityType.AUTHOR, id: 'A555666777', addedAt: Date.now() + 2 }
      ];

      const { result } = renderHook(() => useComparisonMetrics(entities));
      
      // With 3 entities, percentiles should be 100, 67, 33
      const metrics = result.current.comparisonMetrics;
      const percentiles = metrics.map(m => m.metrics.worksCount.percentile).sort((a, b) => b - a);
      expect(percentiles).toEqual([100, 67, 33]);
    });
  });
});

describe('useComparisonAnalysis', () => {
  describe('Empty State', () => {
    it('should return empty analysis for no entities', () => {
      const { result } = renderHook(() => useComparisonAnalysis([]));
      
      expect(result.current.analysis).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasAnalysis).toBe(false);
    });

    it('should return null analysis for single entity', () => {
      const entities = [{
        data: mockAuthor1,
        type: EntityType.AUTHOR,
        id: 'A123456789',
        addedAt: Date.now()
      }];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      expect(result.current.analysis).toBeNull();
      expect(result.current.hasAnalysis).toBe(false);
    });
  });

  describe('Multiple Authors', () => {
    it('should generate analysis for multiple authors', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 },
        { data: mockAuthor3, type: EntityType.AUTHOR, id: 'A555666777', addedAt: Date.now() + 2 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      expect(result.current.analysis).not.toBeNull();
      expect(result.current.hasAnalysis).toBe(true);

      const analysis = result.current.analysis!;
      expect(analysis.entityType).toBe(EntityType.AUTHOR);
      expect(analysis.entityCount).toBe(3);
      expect(analysis.summary).toBeDefined();
      expect(analysis.insights).toBeDefined();
      expect(analysis.insights.length).toBeGreaterThan(0);
    });

    it('should identify leading and trailing entities', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 },
        { data: mockAuthor3, type: EntityType.AUTHOR, id: 'A555666777', addedAt: Date.now() + 2 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      const analysis = result.current.analysis!;
      expect(analysis.topPerformers.citedByCount).toBe('A555666777'); // Bob Wilson, 3200 citations
      expect(analysis.insights.some(insight => 
        insight.type === 'leader' && insight.entityId === 'A555666777'
      )).toBe(true);
    });

    it('should calculate spread and variance metrics', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      const analysis = result.current.analysis!;
      expect(analysis.spreads.citedByCount).toBeDefined();
      expect(analysis.spreads.citedByCount.min).toBe(1800);
      expect(analysis.spreads.citedByCount.max).toBe(2500);
      expect(analysis.spreads.citedByCount.range).toBe(700);
      expect(analysis.spreads.citedByCount.ratio).toBeCloseTo(1.39, 2);
    });
  });

  describe('Multiple Works', () => {
    it('should generate analysis for multiple works', () => {
      const entities = [
        { data: mockWork1, type: EntityType.WORK, id: 'W123456789', addedAt: Date.now() },
        { data: mockWork2, type: EntityType.WORK, id: 'W987654321', addedAt: Date.now() + 1 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      expect(result.current.analysis).not.toBeNull();
      expect(result.current.hasAnalysis).toBe(true);

      const analysis = result.current.analysis!;
      expect(analysis.entityType).toBe(EntityType.WORK);
      expect(analysis.entityCount).toBe(2);
      expect(analysis.summary).toBeDefined();
    });

    it('should identify temporal patterns', () => {
      const entities = [
        { data: mockWork1, type: EntityType.WORK, id: 'W123456789', addedAt: Date.now() },
        { data: mockWork2, type: EntityType.WORK, id: 'W987654321', addedAt: Date.now() + 1 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      const analysis = result.current.analysis!;
      expect(analysis.insights.some(insight => insight.type === 'temporal')).toBe(true);
    });
  });

  describe('Insight Generation', () => {
    it('should generate appropriate insights based on data patterns', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 },
        { data: mockAuthor3, type: EntityType.AUTHOR, id: 'A555666777', addedAt: Date.now() + 2 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      const analysis = result.current.analysis!;
      const insightTypes = analysis.insights.map(insight => insight.type);
      
      expect(insightTypes).toContain('leader');
      expect(insightTypes.some(type => ['statistical', 'outlier', 'trend'].includes(type))).toBe(true);
    });

    it('should provide actionable insights', () => {
      const entities = [
        { data: mockAuthor1, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      const analysis = result.current.analysis!;
      analysis.insights.forEach(insight => {
        expect(insight.message).toBeDefined();
        expect(insight.message.length).toBeGreaterThan(0);
        expect(insight.confidence).toBeGreaterThan(0);
        expect(insight.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle entities with missing data', () => {
      const incompleteAuthor = {
        ...mockAuthor1,
        works_count: undefined,
        cited_by_count: undefined,
        summary_stats: undefined
      } as unknown as Author; // Type assertion for testing invalid data

      const entities = [
        { data: incompleteAuthor, type: EntityType.AUTHOR, id: 'A123456789', addedAt: Date.now() },
        { data: mockAuthor2, type: EntityType.AUTHOR, id: 'A987654321', addedAt: Date.now() + 1 }
      ];

      const { result } = renderHook(() => useComparisonAnalysis(entities));
      
      expect(result.current.error).toBeNull();
      expect(result.current.analysis).not.toBeNull();
    });
  });
});