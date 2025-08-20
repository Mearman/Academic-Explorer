/**
 * Integration tests for entity graph store - TDD for related entity persistence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { EdgeType } from '@/types/entity-graph';
import { useEntityGraphStore } from './entity-graph-store';

// Mock author data with relationships
const mockAuthor: Author = {
  id: 'A5017898742',
  display_name: 'Test Author',
  orcid: 'https://orcid.org/0000-0003-1613-5981',
  works_count: 100,
  cited_by_count: 500,
  affiliations: [
    {
      institution: {
        id: 'I123456789',
        display_name: 'Test University',
        ror: 'https://ror.org/012345678',
        country_code: 'US',
        type: 'education'
      },
      years: [2020, 2021, 2022]
    }
  ],
  last_known_institutions: [
    {
      id: 'I987654321',
      display_name: 'Another University',
      ror: 'https://ror.org/987654321',
      country_code: 'UK',
      type: 'education',
      type_id: '1',
      ids: { openalex: 'I987654321', ror: 'https://ror.org/987654321' },
      works_count: 800,
      cited_by_count: 4000,
      summary_stats: { '2yr_mean_citedness': 2.0, h_index: 40, i10_index: 80 },
      geo: { city: 'London', country_code: 'UK', country: 'United Kingdom' },
      international: { display_name: { en: 'Another University' } },
      repositories: [],
      lineage: ['I987654321'],
      associated_institutions: [],
      topics: [],
      counts_by_year: [],
      updated_date: '2023-12-01',
      created_date: '2023-01-01',
      works_api_url: 'https://api.openalex.org/works?filter=institutions.id:I987654321'
    }
  ],
  topics: [
    {
      id: 'T12345',
      display_name: 'Computer Science',
      keywords: ['computer science', 'computing'],
      works_count: 100000,
      cited_by_count: 500000,
      ids: { openalex: 'T12345', wikipedia: 'https://en.wikipedia.org/wiki/Computer_science' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T12345',
      subfield: { id: 'subfields/1701', display_name: 'Computer Science Applications' },
      field: { id: 'fields/17', display_name: 'Computer Science' },
      domain: { id: 'domains/3', display_name: 'Physical Sciences' },
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

describe('Entity Graph Store - Related Entity Persistence (TDD)', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useEntityGraphStore());
    act(() => {
      result.current.clearGraph();
    });
  });

  it('should persist related entities when visiting an author', async () => {
    const { result } = renderHook(() => useEntityGraphStore());

    // Act: Visit an author (this should trigger relationship extraction)
    await act(async () => {
      await result.current.visitEntity({
        entityId: mockAuthor.id,
        entityType: EntityType.AUTHOR,
        displayName: mockAuthor.display_name,
        timestamp: new Date().toISOString(),
        source: 'direct',
        metadata: {}
      });
    });

    // Assert: Author vertex should exist
    expect(result.current.hasVertex(mockAuthor.id)).toBe(true);
    const authorVertex = result.current.graph.vertices.get(mockAuthor.id);
    expect(authorVertex).toBeDefined();
    expect(authorVertex?.displayName).toBe('Test Author');
    expect(authorVertex?.directlyVisited).toBe(true);

    // Act: Add relationships for the author
    await act(async () => {
      // Add affiliation relationship
      await result.current.addRelationship({
        sourceEntityId: mockAuthor.id,
        targetEntityId: 'I123456789',
        relationshipType: EdgeType.AFFILIATED_WITH,
        timestamp: new Date().toISOString(),
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.INSTITUTION,
          targetDisplayName: 'Test University',
          context: 'Years: 2020, 2021, 2022'
        }
      });

      // Add topic relationship
      await result.current.addRelationship({
        sourceEntityId: mockAuthor.id,
        targetEntityId: 'T12345',
        relationshipType: EdgeType.RELATED_TO_TOPIC,
        timestamp: new Date().toISOString(),
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.TOPIC,
          targetDisplayName: 'Computer Science',
          context: 'Author research area'
        }
      });
    });

    // Assert: Related entities should exist in the graph
    expect(result.current.hasVertex('I123456789')).toBe(true);
    expect(result.current.hasVertex('T12345')).toBe(true);

    const institutionVertex = result.current.graph.vertices.get('I123456789');
    expect(institutionVertex).toBeDefined();
    expect(institutionVertex?.displayName).toBe('Test University');
    expect(institutionVertex?.entityType).toBe(EntityType.INSTITUTION);
    expect(institutionVertex?.directlyVisited).toBe(false); // Should be discovered, not visited

    const topicVertex = result.current.graph.vertices.get('T12345');
    expect(topicVertex).toBeDefined();
    expect(topicVertex?.displayName).toBe('Computer Science');
    expect(topicVertex?.entityType).toBe(EntityType.TOPIC);
    expect(topicVertex?.directlyVisited).toBe(false);

    // Assert: Edges should exist
    expect(result.current.hasEdge({ sourceId: mockAuthor.id, targetId: 'I123456789', edgeType: EdgeType.AFFILIATED_WITH })).toBe(true);
    expect(result.current.hasEdge({ sourceId: mockAuthor.id, targetId: 'T12345', edgeType: EdgeType.RELATED_TO_TOPIC })).toBe(true);

    // Assert: Graph statistics should reflect the relationships
    const stats = result.current.getGraphStatistics();
    expect(stats.totalVertices).toBe(3); // Author + Institution + Topic
    expect(stats.totalEdges).toBe(2); // Affiliation + Topic relationship
    expect(stats.directlyVisitedCount).toBe(1); // Only the author was directly visited
  });

  it('should filter vertices correctly for graph visualization', async () => {
    const { result } = renderHook(() => useEntityGraphStore());

    // Setup: Add entities and relationships
    await act(async () => {
      // Visit author
      await result.current.visitEntity({
        entityId: mockAuthor.id,
        entityType: EntityType.AUTHOR,
        displayName: mockAuthor.display_name,
        timestamp: new Date().toISOString(),
        source: 'direct',
        metadata: {}
      });

      // Add relationships
      await result.current.addRelationship({
        sourceEntityId: mockAuthor.id,
        targetEntityId: 'I123456789',
        relationshipType: EdgeType.AFFILIATED_WITH,
        timestamp: new Date().toISOString(),
        source: 'openalex',
        metadata: {
          targetEntityType: EntityType.INSTITUTION,
          targetDisplayName: 'Test University'
        }
      });
    });

    // Test: getFilteredVertices should return all vertices by default
    const allVertices = result.current.getFilteredVertices();
    expect(allVertices.length).toBe(2); // Author + Institution

    // Test: getFilteredEdges should return all edges by default
    const allEdges = result.current.getFilteredEdges();
    expect(allEdges.length).toBe(1); // Affiliation edge

    // Test: Filter by entity type
    act(() => {
      result.current.updateFilter({ entityTypes: [EntityType.AUTHOR] });
    });

    const authorOnlyVertices = result.current.getFilteredVertices();
    expect(authorOnlyVertices.length).toBe(1);
    expect(authorOnlyVertices[0].entityType).toBe(EntityType.AUTHOR);

    // Test: Filter by directly visited only
    act(() => {
      result.current.updateFilter({ 
        entityTypes: undefined, // Reset entity type filter
        directlyVisitedOnly: true 
      });
    });

    const visitedOnlyVertices = result.current.getFilteredVertices();
    expect(visitedOnlyVertices.length).toBe(1);
    expect(visitedOnlyVertices[0].directlyVisited).toBe(true);
    expect(visitedOnlyVertices[0].id).toBe(mockAuthor.id);
  });

  it('should handle graph state persistence and hydration', async () => {
    const { result } = renderHook(() => useEntityGraphStore());

    // First trigger hydration to initialize the store
    await act(async () => {
      await result.current.hydrateFromIndexedDB();
    });

    // The graph should be marked as hydrated after hydration
    expect(result.current.isHydrated).toBe(true);

    // Setup: Add some graph data
    await act(async () => {
      await result.current.visitEntity({
        entityId: mockAuthor.id,
        entityType: EntityType.AUTHOR,
        displayName: mockAuthor.display_name,
        timestamp: new Date().toISOString(),
        source: 'direct',
        metadata: {}
      });
    });

    expect(result.current.graph.vertices.size).toBe(1);

    // Test: Hydration from storage should work again
    await act(async () => {
      await result.current.hydrateFromIndexedDB();
    });

    // After hydration, data should still be there
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.hasVertex(mockAuthor.id)).toBe(true);
  });
});