/**
 * TDD Test: URL vs ID Bug in Entity Graph Tracking
 * 
 * The OpenAlex API returns full URLs like "https://openalex.org/I161548249"
 * but our system expects just the ID part like "I161548249"
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import { useEntityGraphTracking } from './use-entity-graph-tracking';

// Mock useLocation to avoid router dependency
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/authors/A123' }),
}));

// Real author data with FULL URLs (as returned by OpenAlex API)
const realAuthorWithUrls: Author = {
  id: 'A5017898742',
  display_name: 'Joseph Mearman',
  works_count: 9,
  cited_by_count: 41,
  // CRITICAL: These use full URLs, not just IDs
  affiliations: [
    {
      institution: {
        id: 'https://openalex.org/I161548249', // <- FULL URL!
        display_name: 'Bangor University',
        ror: 'https://ror.org/006jb1a24',
        country_code: 'GB',
        type: 'education',
        lineage: ['https://openalex.org/I161548249']
      },
      years: [2021, 2016, 2015, 2014]
    }
  ],
  last_known_institutions: [
    {
      id: 'https://openalex.org/I161548249', // <- FULL URL!
      display_name: 'Bangor University',
      ror: 'https://ror.org/006jb1a24',
      country_code: 'GB',
      type: 'education',
      // Required fields for Institution type
      type_id: '1',
      ids: { openalex: 'https://openalex.org/I161548249', ror: 'https://ror.org/006jb1a24' },
      works_count: 1000,
      cited_by_count: 5000,
      summary_stats: { '2yr_mean_citedness': 2.5, h_index: 50, i10_index: 100 },
      geo: { city: 'Bangor', geonames_city_id: '2656173', region: undefined, country_code: 'GB', country: 'United Kingdom', latitude: 53.2282, longitude: -4.1291 },
      international: { display_name: { en: 'Bangor University' } },
      repositories: [],
      homepage_url: 'https://www.bangor.ac.uk/',
      image_url: undefined,
      image_thumbnail_url: undefined,
      lineage: ['https://openalex.org/I161548249'],
      associated_institutions: [],
      topics: [],
      counts_by_year: [],
      updated_date: '2023-12-01',
      created_date: '2023-01-01',
      works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I161548249'
    }
  ],
  topics: [
    {
      id: 'https://openalex.org/T10888', // <- FULL URL!
      display_name: 'Augmented Reality Applications',
      subfield: { id: 'https://openalex.org/subfields/1707', display_name: 'Computer Vision and Pattern Recognition' },
      field: { id: 'https://openalex.org/fields/17', display_name: 'Computer Science' },
      domain: { id: 'https://openalex.org/domains/3', display_name: 'Physical Sciences' },
      keywords: ['augmented reality', 'computer vision'],
      works_count: 15000,
      cited_by_count: 75000,
      ids: { openalex: 'T10888', wikipedia: 'https://en.wikipedia.org/wiki/Augmented_reality' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T10888',
      updated_date: '2023-12-01',
      created_date: '2023-01-01'
    }
  ],
  // Required fields
  ids: { openalex: 'A5017898742', orcid: undefined },
  summary_stats: { '2yr_mean_citedness': 2.1, h_index: 25, i10_index: 50 },
  counts_by_year: [],
  updated_date: '2023-12-01',
  created_date: '2023-01-01',
  orcid: undefined,
  works_api_url: '',
};

describe('Entity Graph Tracking - URL vs ID Bug (TDD)', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useEntityGraphStore());
    act(() => {
      result.current.clearGraph();
    });
  });

  it('FAILING TEST: should handle full OpenAlex URLs correctly', async () => {
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    const { result: trackingResult } = renderHook(() => useEntityGraphTracking({
      autoTrack: true,
      extractRelationships: true,
    }));

    await act(async () => {
      await storeResult.current.hydrateFromIndexedDB();
    });

    console.log('🔍 Testing with REAL OpenAlex API data structure (full URLs):');
    console.log('Institution ID:', realAuthorWithUrls.affiliations?.[0]?.institution.id);
    console.log('Topic ID:', realAuthorWithUrls.topics?.[0]?.id);

    // This should create relationships but might fail due to URL handling
    await act(async () => {
      await trackingResult.current.trackEntityData(
        realAuthorWithUrls,
        EntityType.AUTHOR,
        realAuthorWithUrls.id
      );
    });

    const filteredVertices = storeResult.current.getFilteredVertices();
    const filteredEdges = storeResult.current.getFilteredEdges();

    console.log('📊 Results:');
    console.log('Vertices found:', filteredVertices.map(v => `${v.entityType}:${v.id}:${v.displayName}`));
    console.log('Edges found:', filteredEdges.map(e => `${e.edgeType}:${e.sourceId}→${e.targetId}`));

    // This test might FAIL if our system doesn't handle URLs correctly
    expect(filteredVertices.length).toBeGreaterThan(1); // Should have author + related entities
    expect(filteredEdges.length).toBeGreaterThan(0); // Should have relationships

    // Specific checks for the relationships that should be created
    const institutionVertex = filteredVertices.find(v => 
      v.displayName === 'Bangor University' && v.entityType === EntityType.INSTITUTION
    );
    expect(institutionVertex).toBeDefined();

    const topicVertex = filteredVertices.find(v => 
      v.displayName === 'Augmented Reality Applications' && v.entityType === EntityType.TOPIC
    );
    expect(topicVertex).toBeDefined();

    // Check that the IDs are handled correctly (should be just "I161548249", not the full URL)
    console.log('🔍 Institution vertex ID:', institutionVertex?.id);
    console.log('🔍 Topic vertex ID:', topicVertex?.id);

    // The IDs should be clean (without the https://openalex.org/ prefix)
    expect(institutionVertex?.id).not.toContain('https://');
    expect(topicVertex?.id).not.toContain('https://');
  });

  it('should extract clean IDs from OpenAlex URLs', () => {
    // Test helper function to extract clean IDs from URLs
    const extractIdFromUrl = (url: string): string => {
      if (url.startsWith('https://openalex.org/')) {
        return url.replace('https://openalex.org/', '');
      }
      return url;
    };

    expect(extractIdFromUrl('https://openalex.org/I161548249')).toBe('I161548249');
    expect(extractIdFromUrl('https://openalex.org/T10888')).toBe('T10888');
    expect(extractIdFromUrl('I161548249')).toBe('I161548249'); // Already clean
    expect(extractIdFromUrl('T10888')).toBe('T10888'); // Already clean
  });
});