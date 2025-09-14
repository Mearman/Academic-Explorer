import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatisticsApi } from './statistics';
import type { OpenAlexBaseClient } from '../client';
import type { OpenAlexResponse } from '../types';

// Mock the client
const mockClient = {
  getResponse: vi.fn(),
} as unknown as jest.Mocked<OpenAlexBaseClient>;

describe('StatisticsApi', () => {
  let statisticsApi: StatisticsApi;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient.getResponse.mockReset();
    statisticsApi = new StatisticsApi(mockClient);
  });

  describe('getDatabaseStats', () => {
    it('should get comprehensive database statistics with entity counts', async () => {
      // Mock basic response for entity counts and other calls
      const mockBasicResponse: OpenAlexResponse<unknown> = {
        results: [],
        meta: { count: 1000, db_response_time_ms: 25, page: 1, per_page: 1 },
      };

      const mockCitationsResponse: OpenAlexResponse<{ cited_by_count?: number }> = {
        results: [
          { cited_by_count: 1000 },
          { cited_by_count: 500 },
          { cited_by_count: 100 },
        ],
        meta: { count: 100000, db_response_time_ms: 50, page: 1, per_page: 100 },
      };

      const mockTemporalResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; count: number }> }> = {
        results: [],
        meta: { count: 250000, db_response_time_ms: 40, page: 1, per_page: 1 },
        group_by: [
          { key: '2020', count: 50000 },
          { key: '2021', count: 52000 },
          { key: '2022', count: 55000 },
        ],
      };

      const mockGeoResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
        results: [],
        meta: { count: 50000, db_response_time_ms: 45, page: 1, per_page: 1 },
        group_by: [
          { key: 'US', key_display_name: 'United States', count: 15000 },
          { key: 'CN', key_display_name: 'China', count: 12000 },
        ],
      };

      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.getResponse.mockReset();

      // For specific metric calls, override when we know they're coming
      mockClient.getResponse.mockImplementation((entityType, params) => {
        // If it's a citation sample request
        if (params && 'sort' in params && params.sort === 'cited_by_count:desc') {
          return Promise.resolve(mockCitationsResponse);
        }
        // If it's a temporal grouping request
        if (params && 'group_by' in params && params.group_by === 'publication_year') {
          return Promise.resolve(mockTemporalResponse);
        }
        // If it's a geographic grouping request (institutions endpoint with country_code)
        if (entityType === 'institutions' && params && 'group_by' in params && params.group_by === 'country_code') {
          return Promise.resolve(mockGeoResponse);
        }
        // Default to basic response
        return Promise.resolve(mockBasicResponse);
      });

      const result = await statisticsApi.getDatabaseStats();

      expect(result.total_entities.works).toBe(1000);
      expect(result.total_entities.authors).toBe(1000);
      expect(result.total_entities.sources).toBe(1000);

      expect(result.growth_rates.works).toEqual({
        yearly_growth: expect.any(Number),
        monthly_growth: expect.any(Number),
        total_added_last_year: expect.any(Number),
      });

      expect(result.coverage_metrics).toEqual({
        works_with_doi: expect.any(Number),
        works_open_access: expect.any(Number),
        authors_with_orcid: expect.any(Number),
        institutions_with_ror: expect.any(Number),
      });

      expect(result.citation_metrics).toEqual({
        total_citations: expect.any(Number),
        avg_citations_per_work: expect.any(Number),
        top_percentile_threshold: expect.any(Number),
      });

      expect(result.temporal_distribution).toEqual({
        oldest_work_year: expect.any(Number),
        newest_work_year: expect.any(Number),
        peak_publication_years: expect.arrayContaining([expect.any(Number)]),
      });

      expect(result.geographic_distribution).toEqual({
        'United States': 15000,
        'China': 12000,
      });
    });

    it('should handle entity count errors gracefully', async () => {
      // Mock some successful and some failed entity count calls
      mockClient.getResponse
        .mockResolvedValueOnce({ results: [], meta: { count: 100, db_response_time_ms: 20, page: 1, per_page: 1 } })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValue({ results: [], meta: { count: 50, db_response_time_ms: 20, page: 1, per_page: 1 } });

      const result = await statisticsApi.getDatabaseStats();

      expect(result.total_entities.works).toBe(100);
      expect(result.total_entities.authors).toBe(0); // Should default to 0 on error
    });
  });

  describe('getEntityAnalytics', () => {
    it('should get detailed analytics for works entity type', async () => {
      const mockDistributionResponse: OpenAlexResponse<{ cited_by_count?: number }> = {
        results: [
          { cited_by_count: 1000 },
          { cited_by_count: 100 },
          { cited_by_count: 10 },
          { cited_by_count: 1 },
        ],
        meta: { count: 10000, db_response_time_ms: 30, page: 1, per_page: 100 },
      };

      const mockTrendResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; count: number }> }> = {
        results: [],
        meta: { count: 50000, db_response_time_ms: 35, page: 1, per_page: 1 },
        group_by: [
          { key: '2020', count: 10000 },
          { key: '2021', count: 12000 },
          { key: '2022', count: 15000 },
          { key: '2023', count: 13000 },
        ],
      };

      const mockCollabResponse: OpenAlexResponse<{ authorships?: Array<{ author: { id: string } }> }> = {
        results: [
          { authorships: [{ author: { id: 'A1' } }, { author: { id: 'A2' } }] },
          { authorships: [{ author: { id: 'A3' } }, { author: { id: 'A4' } }, { author: { id: 'A5' } }] },
        ],
        meta: { count: 1000, db_response_time_ms: 40, page: 1, per_page: 100 },
      };

      mockClient.getResponse
        .mockResolvedValueOnce(mockDistributionResponse) // Distribution analysis
        .mockResolvedValueOnce(mockTrendResponse) // Trend analysis
        .mockResolvedValueOnce(mockCollabResponse); // Collaboration metrics

      const result = await statisticsApi.getEntityAnalytics('works');

      expect(result.distribution_analysis).toEqual({
        citation_distribution: {
          quartiles: expect.any(Array),
          deciles: expect.any(Array),
          highly_cited_threshold: expect.any(Number),
        },
        activity_distribution: {
          very_active: expect.any(Number),
          moderately_active: expect.any(Number),
          low_activity: expect.any(Number),
          inactive: expect.any(Number),
        },
      });

      expect(result.trend_analysis).toEqual({
        recent_growth: expect.any(Number),
        publication_trends: expect.arrayContaining([
          expect.objectContaining({
            year: expect.any(Number),
            count: expect.any(Number),
            cumulative_count: expect.any(Number),
          }),
        ]),
      });

      expect(result.collaboration_metrics).toEqual({
        avg_authors_per_work: expect.any(Number),
        international_collaboration_rate: expect.any(Number),
        institutional_diversity_index: expect.any(Number),
      });
    });

    it('should handle entity types without collaboration metrics', async () => {
      const mockDistributionResponse: OpenAlexResponse<{ cited_by_count?: number }> = {
        results: [],
        meta: { count: 1000, db_response_time_ms: 25, page: 1, per_page: 100 },
      };

      const mockTrendResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; count: number }> }> = {
        results: [],
        meta: { count: 1000, db_response_time_ms: 30, page: 1, per_page: 1 },
        group_by: [{ key: '2023', count: 1000 }],
      };

      mockClient.getResponse
        .mockResolvedValueOnce(mockDistributionResponse)
        .mockResolvedValueOnce(mockTrendResponse);

      const result = await statisticsApi.getEntityAnalytics('sources');

      expect(result.collaboration_metrics).toBeUndefined();
    });
  });

  describe('getImpactMetrics', () => {
    it('should get impact metrics for entity type', async () => {
      const mockHIndexResponse: OpenAlexResponse<{ h_index?: number }> = {
        results: [
          { h_index: 100 },
          { h_index: 50 },
          { h_index: 25 },
          { h_index: 10 },
        ],
        meta: { count: 10000, db_response_time_ms: 30, page: 1, per_page: 100 },
      };

      const mockFieldResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number; cited_by_count?: number }> }> = {
        results: [],
        meta: { count: 100000, db_response_time_ms: 40, page: 1, per_page: 1 },
        group_by: [
          { key: 'computer-science', key_display_name: 'Computer Science', count: 20000, cited_by_count: 500000 },
          { key: 'biology', key_display_name: 'Biology', count: 30000, cited_by_count: 600000 },
        ],
      };

      const mockTemporalImpactResponse: OpenAlexResponse<{ publication_year?: number; cited_by_count?: number }> = {
        results: [
          { publication_year: 2020, cited_by_count: 100 },
          { publication_year: 2021, cited_by_count: 80 },
          { publication_year: 2022, cited_by_count: 60 },
        ],
        meta: { count: 5000, db_response_time_ms: 35, page: 1, per_page: 100 },
      };

      mockClient.getResponse
        .mockResolvedValueOnce(mockHIndexResponse) // H-index distribution
        .mockResolvedValueOnce(mockFieldResponse) // Field-normalized metrics
        .mockResolvedValueOnce(mockTemporalImpactResponse); // Temporal impact

      const result = await statisticsApi.getImpactMetrics('authors');

      expect(result.h_index_distribution).toEqual({
        median_h_index: expect.any(Number),
        top_1_percent_threshold: expect.any(Number),
        top_10_percent_threshold: expect.any(Number),
      });

      expect(result.field_normalized_metrics).toEqual({
        avg_field_citation_ratio: expect.any(Number),
        top_fields_by_impact: expect.arrayContaining([
          expect.objectContaining({
            field: expect.any(String),
            avg_citations: expect.any(Number),
            total_works: expect.any(Number),
          }),
        ]),
      });

      expect(result.temporal_impact).toEqual({
        citation_half_life: expect.any(Number),
        immediate_impact_rate: expect.any(Number),
        sustained_impact_rate: expect.any(Number),
      });
    });
  });

  describe('getComparativeStats', () => {
    it('should get comparative statistics between entity groups', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.getResponse.mockReset();

      const mockGroupResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number; cited_by_count?: number }> }> = {
        results: [],
        meta: { count: 100000, db_response_time_ms: 40, page: 1, per_page: 1 },
        group_by: [
          { key: 'journal-article', key_display_name: 'Journal Article', count: 80000, cited_by_count: 2000000 },
          { key: 'book', key_display_name: 'Book', count: 15000, cited_by_count: 300000 },
          { key: 'preprint', key_display_name: 'Preprint', count: 5000, cited_by_count: 50000 },
        ],
      };

      const mockSampleResponse: OpenAlexResponse<{ cited_by_count?: number }> = {
        results: [
          { cited_by_count: 100 },
          { cited_by_count: 50 },
          { cited_by_count: 25 },
          { cited_by_count: 10 },
        ],
        meta: { count: 10000, db_response_time_ms: 30, page: 1, per_page: 100 },
      };

      // Set up specific implementation for this test
      mockClient.getResponse.mockImplementation((entityType, params) => {
        // First call: main grouping request
        if (params && 'group_by' in params && params.group_by === 'type' && params.per_page === 1) {
          return Promise.resolve(mockGroupResponse);
        }
        // Subsequent calls: sample data for each group
        return Promise.resolve(mockSampleResponse);
      });

      const result = await statisticsApi.getComparativeStats('works', 'type');

      expect(result.groups).toHaveLength(3);
      expect(result.groups[0]).toEqual({
        group: 'journal-article',
        group_display_name: 'Journal Article',
        metrics: {
          total_count: 80000,
          avg_citations: expect.any(Number),
          median_citations: expect.any(Number),
          growth_rate: expect.any(Number),
          market_share: expect.any(Number),
        },
        rankings: {
          by_count: expect.any(Number),
          by_citations: expect.any(Number),
          by_growth: expect.any(Number),
        },
      });

      expect(result.overall_metrics).toEqual({
        total_entities: expect.any(Number),
        total_citations: expect.any(Number),
        diversity_index: expect.any(Number),
      });
    });

    it('should handle unsupported grouping gracefully', async () => {
      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.getResponse.mockReset();

      const mockEmptyResponse: OpenAlexResponse<{ group_by?: Array<{ key: string; key_display_name: string; count: number }> }> = {
        results: [],
        meta: { count: 0, db_response_time_ms: 20, page: 1, per_page: 1 },
        // group_by is undefined - not supported
      };

      // Set up specific implementation for unsupported grouping
      mockClient.getResponse.mockImplementation((entityType, params) => {
        if (params && 'group_by' in params && params.group_by === 'invalid_field') {
          return Promise.resolve(mockEmptyResponse);
        }
        return Promise.resolve(mockEmptyResponse);
      });

      await expect(statisticsApi.getComparativeStats('works', 'invalid_field')).rejects.toThrow(
        'Grouping not supported for works by invalid_field'
      );
    });
  });

  describe('private method coverage', () => {
    it('should test private methods through public interface', async () => {
      // This test ensures private methods are covered by testing them through the public methods
      // that call them, which is the standard approach for testing private methods

      // Clear any previous implementations
      vi.clearAllMocks();
      mockClient.getResponse.mockReset();

      // Test getCoverageMetrics through getDatabaseStats
      const mockBasicResponse = { results: [], meta: { count: 100, db_response_time_ms: 20, page: 1, per_page: 1 } };
      mockClient.getResponse.mockResolvedValue(mockBasicResponse);

      const result = await statisticsApi.getDatabaseStats();

      expect(result.coverage_metrics).toBeDefined();
      expect(result.citation_metrics).toBeDefined();
      expect(result.temporal_distribution).toBeDefined();
      expect(result.geographic_distribution).toBeDefined();

      // Test distribution analysis through getEntityAnalytics
      const analytics = await statisticsApi.getEntityAnalytics('works');
      expect(analytics.distribution_analysis).toBeDefined();
      expect(analytics.trend_analysis).toBeDefined();
    });
  });
});