/**
 * Integration test to verify entity graph hydration works correctly
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useEntityGraphHydration } from '@/hooks/use-entity-graph-hydration';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

// Mock router to avoid dependencies
vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: '/authors/A123' }),
}));

const mockAuthor: Author = {
  id: 'A5017898742',
  display_name: 'Test Author',
  works_count: 10,
  cited_by_count: 100,
  affiliations: [
    {
      institution: {
        id: 'I123456',
        display_name: 'Test University',
        country_code: 'US',
        type: 'education',
      },
      years: [2020, 2021, 2022]
    }
  ],
  last_known_institutions: [],
  topics: [
    {
      id: 'T12345',
      display_name: 'Computer Science',
      keywords: ['computer science'],
      works_count: 10000,
      cited_by_count: 50000,
      ids: { openalex: 'T12345' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T12345',
      subfield: { id: 'S1701', display_name: 'Computer Science Applications' },
      field: { id: 'F17', display_name: 'Computer Science' },
      domain: { id: 'D3', display_name: 'Physical Sciences' },
      updated_date: '2023-12-01',
      created_date: '2023-01-01'
    }
  ],
  ids: { openalex: 'A5017898742' },
  summary_stats: { '2yr_mean_citedness': 2.5, h_index: 25, i10_index: 50 },
  counts_by_year: [],
  updated_date: '2023-12-01',
  created_date: '2023-01-01',
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A5017898742'
};

describe('Entity Graph Hydration Integration Test', () => {
  beforeEach(() => {
    // Clear store before each test
    const { result } = renderHook(() => useEntityGraphStore());
    act(() => {
      result.current.clearGraph();
    });
  });

  it('should hydrate store on app startup and then show entities immediately', async () => {
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    const { result: trackingResult } = renderHook(() => useEntityGraphTracking({
      autoTrack: true,
      extractRelationships: true,
    }));

    // Step 1: Simulate first visit - track some entities
    await act(async () => {
      await trackingResult.current.trackEntityData(
        mockAuthor,
        EntityType.AUTHOR,
        mockAuthor.id
      );
    });

    // Verify entities are stored (4 entities due to mock router creating A123 + our test creating A5017898742, I123456, T12345)
    expect(storeResult.current.getFilteredVertices().length).toBe(4); // 2 Authors + Institution + Topic
    expect(storeResult.current.getFilteredEdges().length).toBe(2); // Affiliation + Topic edges

    // Step 2: Clear in-memory store (simulating app restart)
    act(() => {
      storeResult.current.clearGraph();
    });

    // Store should be empty now
    expect(storeResult.current.getFilteredVertices().length).toBe(0);
    expect(storeResult.current.getFilteredEdges().length).toBe(0);
    expect(storeResult.current.isHydrated).toBe(false);

    // Step 3: Simulate app startup - use hydration hook
    renderHook(() => useEntityGraphHydration());

    // Wait for hydration to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Step 4: Verify entities are restored from IndexedDB
    expect(storeResult.current.isHydrated).toBe(true);
    const hydratedVertices = storeResult.current.getFilteredVertices();
    const hydratedEdges = storeResult.current.getFilteredEdges();

    console.log('✅ Hydration Test Results:');
    console.log('Vertices:', hydratedVertices.map(v => `${v.entityType}:${v.id}:${v.displayName}`));
    console.log('Edges:', hydratedEdges.map(e => `${e.edgeType}:${e.sourceId}→${e.targetId}`));

    // The store should have restored the entities from IndexedDB
    expect(hydratedVertices.length).toBeGreaterThan(0);
    expect(hydratedEdges.length).toBeGreaterThan(0);

    // Should find our specific entities
    const authorVertex = hydratedVertices.find(v => v.id === 'A5017898742');
    const institutionVertex = hydratedVertices.find(v => v.id === 'I123456');
    const topicVertex = hydratedVertices.find(v => v.id === 'T12345');

    expect(authorVertex).toBeDefined();
    expect(institutionVertex).toBeDefined();
    expect(topicVertex).toBeDefined();

    console.log('🎉 Hydration fix is working! Store loads entities from IndexedDB on app startup.');
  });
});