/**
 * Integration test for entity graph tracking hook - TDD for actual author page scenario
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { EdgeType } from '@/types/entity-graph';
import { useEntityGraphTracking } from './use-entity-graph-tracking';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

// Mock author data from the real API - A5017898742
const mockAuthor: Author = {
  id: 'A5017898742',
  display_name: 'S. Hättenschwiler',
  orcid: 'https://orcid.org/0000-0003-1613-5981',
  works_count: 100,
  cited_by_count: 3000,
  affiliations: [
    {
      institution: {
        id: 'I1286329397',
        display_name: 'University of Basel',
        ror: 'https://ror.org/02s6k3f65',
        country_code: 'CH',
        type: 'education'
      },
      years: [2019, 2020, 2021]
    }
  ],
  last_known_institutions: [
    {
      id: 'I1286329397',
      display_name: 'University of Basel',
      ror: 'https://ror.org/02s6k3f65',
      country_code: 'CH',
      type: 'education',
      type_id: '1',
      ids: { openalex: 'I1286329397', ror: 'https://ror.org/02s6k3f65' },
      works_count: 1000,
      cited_by_count: 5000,
      summary_stats: { '2yr_mean_citedness': 2.5, h_index: 50, i10_index: 100 },
      geo: { city: 'Basel', country_code: 'CH', country: 'Switzerland' },
      international: { display_name: { en: 'University of Basel' } },
      repositories: [],
      lineage: ['I1286329397'],
      associated_institutions: [],
      topics: [],
      counts_by_year: [],
      updated_date: '2023-12-01',
      created_date: '2023-01-01',
      works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I1286329397'
    }
  ],
  topics: [
    {
      id: 'T10075',
      display_name: 'Ecology',
      keywords: ['ecology', 'environment'],
      works_count: 50000,
      cited_by_count: 200000,
      ids: { openalex: 'T10075', wikipedia: 'https://en.wikipedia.org/wiki/Ecology' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T10075',
      subfield: { id: 'subfields/2302', display_name: 'Ecology' },
      field: { id: 'fields/23', display_name: 'Environmental Science' },
      domain: { id: 'domains/3', display_name: 'Physical Sciences' },
      updated_date: '2023-12-01',
      created_date: '2023-01-01'
    },
    {
      id: 'T10522',
      display_name: 'Botany',
      keywords: ['botany', 'plants'],
      works_count: 30000,
      cited_by_count: 150000,
      ids: { openalex: 'T10522', wikipedia: 'https://en.wikipedia.org/wiki/Botany' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T10522',
      subfield: { id: 'subfields/1110', display_name: 'Plant Science' },
      field: { id: 'fields/11', display_name: 'Agricultural and Biological Sciences' },
      domain: { id: 'domains/1', display_name: 'Life Sciences' },
      updated_date: '2023-12-01',
      created_date: '2023-01-01'
    }
  ],
  // Required Author fields
  ids: { openalex: 'A5017898742', orcid: 'https://orcid.org/0000-0003-1613-5981' },
  summary_stats: { '2yr_mean_citedness': 2.1, h_index: 25, i10_index: 50 },
  counts_by_year: [],
  updated_date: '2023-12-01',
  created_date: '2023-01-01',
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A5017898742'
};

describe('Entity Graph Tracking Hook - Real Author Page Scenario (TDD)', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    act(() => {
      storeResult.current.clearGraph();
    });
  });

  it('should track author data and create related entities like in real author page', async () => {
    // Setup: Initialize both hooks
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    const { result: trackingResult } = renderHook(() => useEntityGraphTracking({
      autoTrack: true,
      extractRelationships: true,
    }));

    // Initialize store
    await act(async () => {
      await storeResult.current.hydrateFromIndexedDB();
    });

    // Act: Track author data (this mimics what AuthorPage does)
    await act(async () => {
      await trackingResult.current.trackEntityData(
        mockAuthor, 
        EntityType.AUTHOR, 
        mockAuthor.id
      );
    });

    // Assert: Verify the author was tracked
    expect(storeResult.current.hasVertex(mockAuthor.id)).toBe(true);
    const authorVertex = storeResult.current.graph.vertices.get(mockAuthor.id);
    expect(authorVertex?.displayName).toBe('S. Hättenschwiler');
    expect(authorVertex?.directlyVisited).toBe(true);

    // Assert: Verify related entities were created
    expect(storeResult.current.hasVertex('I1286329397')).toBe(true); // University of Basel
    expect(storeResult.current.hasVertex('T10075')).toBe(true); // Ecology topic
    expect(storeResult.current.hasVertex('T10522')).toBe(true); // Botany topic

    // Assert: Verify relationships were created
    expect(storeResult.current.hasEdge(mockAuthor.id, 'I1286329397', EdgeType.AFFILIATED_WITH)).toBe(true);
    expect(storeResult.current.hasEdge(mockAuthor.id, 'T10075', EdgeType.RELATED_TO_TOPIC)).toBe(true);
    expect(storeResult.current.hasEdge(mockAuthor.id, 'T10522', EdgeType.RELATED_TO_TOPIC)).toBe(true);

    // Assert: Verify graph statistics
    const stats = storeResult.current.getGraphStatistics();
    expect(stats.totalVertices).toBe(4); // Author + Institution + 2 Topics
    expect(stats.totalEdges).toBe(3); // 1 affiliation + 2 topic relationships
    expect(stats.directlyVisitedCount).toBe(1); // Only author directly visited

    // Most importantly: Verify getFilteredVertices returns all entities for visualization
    const filteredVertices = storeResult.current.getFilteredVertices();
    expect(filteredVertices.length).toBe(4);
    
    const filteredEdges = storeResult.current.getFilteredEdges();
    expect(filteredEdges.length).toBe(3);

    // Debug: Log what the graph visualization would see
    console.log('🔍 Graph visualization would see:');
    console.log('Vertices:', filteredVertices.map(v => `${v.entityType}:${v.id}:${v.displayName}:${v.directlyVisited ? 'visited' : 'discovered'}`));
    console.log('Edges:', filteredEdges.map(e => `${e.edgeType}:${e.sourceId}→${e.targetId}`));
  });

  it('should handle the filter options that might hide related entities', async () => {
    // Setup
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    const { result: trackingResult } = renderHook(() => useEntityGraphTracking({
      autoTrack: true,
      extractRelationships: true,
    }));

    await act(async () => {
      await storeResult.current.hydrateFromIndexedDB();
    });

    // Track author data
    await act(async () => {
      await trackingResult.current.trackEntityData(
        mockAuthor, 
        EntityType.AUTHOR, 
        mockAuthor.id
      );
    });

    // Test: Default filter should show all entities
    let filteredVertices = storeResult.current.getFilteredVertices();
    expect(filteredVertices.length).toBe(4);

    // Test: Filter by directlyVisitedOnly should hide related entities
    act(() => {
      storeResult.current.updateFilter({ directlyVisitedOnly: true });
    });

    filteredVertices = storeResult.current.getFilteredVertices();
    expect(filteredVertices.length).toBe(1); // Only the author
    expect(filteredVertices[0].directlyVisited).toBe(true);

    // Test: Reset filter to show all entities again
    act(() => {
      storeResult.current.updateFilter({ directlyVisitedOnly: false });
    });

    filteredVertices = storeResult.current.getFilteredVertices();
    expect(filteredVertices.length).toBe(4); // All entities visible again

    // Test: Filter by entity type
    act(() => {
      storeResult.current.updateFilter({ entityTypes: [EntityType.TOPIC] });
    });

    filteredVertices = storeResult.current.getFilteredVertices();
    expect(filteredVertices.length).toBe(2); // Only the two topics
    expect(filteredVertices.every(v => v.entityType === EntityType.TOPIC)).toBe(true);

    // Reset filter
    act(() => {
      storeResult.current.resetFilters();
    });

    filteredVertices = storeResult.current.getFilteredVertices();
    expect(filteredVertices.length).toBe(4); // All entities visible again
  });
});