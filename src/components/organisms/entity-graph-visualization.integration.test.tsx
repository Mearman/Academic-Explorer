/**
 * TDD Integration Test: Entity Graph Visualization with Real Author Data
 * 
 * This test reproduces the exact scenario happening in the browser:
 * 1. User navigates to author page
 * 2. Author data loads
 * 3. Entity tracking system processes the data
 * 4. Graph visualization should show related entities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { EdgeType } from '@/types/entity-graph';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import { EntityGraphVisualization } from './entity-graph-visualization';

// Mock the graph interaction hooks
vi.mock('./hooks/use-graph-interactions', () => ({
  useGraphInteractions: () => ({
    svgRef: { current: null },
    zoom: 1,
    pan: { x: 0, y: 0 },
    tooltip: null,
    handleZoomIn: vi.fn(),
    handleZoomOut: vi.fn(),
    handleZoomReset: vi.fn(),
    handleMouseDown: vi.fn(),
    handleMouseMove: vi.fn(),
    handleMouseUp: vi.fn(),
    showTooltip: vi.fn(),
    hideTooltip: vi.fn(),
  }),
}));

// Mock the keyboard shortcuts hook
vi.mock('@/hooks/use-graph-keyboard-shortcuts', () => ({
  useGraphKeyboardShortcuts: vi.fn(),
}));

// Real author data that should create relationships
const realAuthorData: Author = {
  id: 'A5017898742',
  display_name: 'S. Hättenschwiler',
  orcid: 'https://orcid.org/0000-0003-1613-5981',
  works_count: 100,
  cited_by_count: 3000,
  // These should create relationships
  affiliations: [
    {
      institution: {
        id: 'I1286329397',
        display_name: 'University of Basel',
        ror: 'https://ror.org/02s6k3f65',
        country_code: 'CH',
        type: 'education',
      },
      years: [2019, 2020, 2021]
    }
  ],
  last_known_institutions: [],
  topics: [
    {
      id: 'T10075',
      display_name: 'Ecology',
      keywords: ['ecology', 'environment'],
      works_count: 50000,
      cited_by_count: 200000,
      ids: { openalex: 'T10075', wikipedia: 'https://en.wikipedia.org/wiki/Ecology' },
      works_api_url: 'https://api.openalex.org/works?filter=topics.id:T10075',
      subfield: { id: 'S2302', display_name: 'Ecology' },
      field: { id: 'F2302', display_name: 'Environmental Science' },
      domain: { id: 'D3', display_name: 'Physical Sciences' },
      updated_date: '2023-12-01',
      created_date: '2023-01-01'
    }
  ],
  // Required fields for Author type
  ids: { openalex: 'A5017898742', orcid: 'https://orcid.org/0000-0003-1613-5981' },
  summary_stats: { '2yr_mean_citedness': 2.1, h_index: 25, i10_index: 50 },
  counts_by_year: [],
  updated_date: '2023-12-01',
  created_date: '2023-01-01',
  works_api_url: 'https://api.openalex.org/works?filter=author.id:A5017898742',
};

describe('Entity Graph Visualization - Real Browser Scenario (TDD)', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useEntityGraphStore());
    act(() => {
      result.current.clearGraph();
    });
  });

  it('FAILING TEST: should show related entities in graph when author data is tracked', async () => {
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    
    // Step 1: Initialize store (mimics app startup)
    await act(async () => {
      await storeResult.current.hydrateFromIndexedDB();
    });

    // Step 2: Simulate visiting the author (mimics trackEntityData call)
    await act(async () => {
      await storeResult.current.visitEntity({
        entityId: realAuthorData.id,
        entityType: EntityType.AUTHOR,
        displayName: realAuthorData.display_name,
        timestamp: new Date().toISOString(),
        source: 'direct',
        metadata: {
          citedByCount: realAuthorData.cited_by_count,
          worksCount: realAuthorData.works_count,
        }
      });
    });

    // Step 3: Simulate relationship extraction (this is what trackEntityData should do)
    await act(async () => {
      // Institution affiliation relationship
      if (realAuthorData.affiliations?.[0]?.institution) {
        const institution = realAuthorData.affiliations[0].institution;
        await storeResult.current.addRelationship({
          sourceEntityId: realAuthorData.id,
          targetEntityId: institution.id,
          relationshipType: EdgeType.AFFILIATED_WITH,
          timestamp: new Date().toISOString(),
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.INSTITUTION,
            targetDisplayName: institution.display_name,
            context: `Years: ${realAuthorData.affiliations[0].years?.join(', ')}`,
          }
        });
      }

      // Topic relationship  
      if (realAuthorData.topics?.[0]) {
        const topic = realAuthorData.topics[0];
        await storeResult.current.addRelationship({
          sourceEntityId: realAuthorData.id,
          targetEntityId: topic.id,
          relationshipType: EdgeType.RELATED_TO_TOPIC,
          timestamp: new Date().toISOString(),
          source: 'openalex',
          metadata: {
            targetEntityType: EntityType.TOPIC,
            targetDisplayName: topic.display_name,
            context: 'Author research area',
          }
        });
      }
    });

    // Step 4: Verify the graph state is correct
    expect(storeResult.current.graph.vertices.size).toBe(3); // Author + Institution + Topic
    expect(storeResult.current.graph.edges.size).toBe(2); // 2 relationships
    
    const filteredVertices = storeResult.current.getFilteredVertices();
    const filteredEdges = storeResult.current.getFilteredEdges();
    
    console.log('🔍 Graph state before rendering visualization:');
    console.log('Vertices:', filteredVertices.map(v => `${v.entityType}:${v.id}:${v.displayName}`));
    console.log('Edges:', filteredEdges.map(e => `${e.edgeType}:${e.sourceId}→${e.targetId}`));

    // Step 5: Render the graph visualization
    render(<EntityGraphVisualization />);

    // Step 6: Wait for the visualization to process the data
    await waitFor(() => {
      // The graph should not show "No entities to display"
      expect(screen.queryByText('No entities to display')).not.toBeInTheDocument();
    });

    // Step 7: The visualization should show information about the entities
    // This is where the test should PASS but currently FAILS
    await waitFor(() => {
      // Check if the graph shows it has entities (look for graph info panel or similar)
      const graphContainer = screen.getByRole('application', { name: /interactive entity graph visualization/i });
      expect(graphContainer).toBeInTheDocument();
      
      // The screen reader description should reflect the correct counts
      expect(screen.getByText(/Graph showing 3 entities and 2 relationships/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('should show empty state when no entities are in the graph', () => {
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    
    // Ensure graph is empty
    act(() => {
      storeResult.current.clearGraph();
    });

    render(<EntityGraphVisualization />);

    expect(screen.getByText('No entities to display')).toBeInTheDocument();
    expect(screen.getByText('Visit some entities to see them appear in the graph')).toBeInTheDocument();
  });

  it('should update when entities are added to the store', async () => {
    const { result: storeResult } = renderHook(() => useEntityGraphStore());
    
    // Start with empty graph
    act(() => {
      storeResult.current.clearGraph();
    });

    const { rerender } = render(<EntityGraphVisualization />);

    // Initially should show empty state
    expect(screen.getByText('No entities to display')).toBeInTheDocument();

    // Add an entity
    await act(async () => {
      await storeResult.current.hydrateFromIndexedDB();
      await storeResult.current.visitEntity({
        entityId: 'A123',
        entityType: EntityType.AUTHOR,
        displayName: 'Test Author',
        timestamp: new Date().toISOString(),
        source: 'direct',
        metadata: {}
      });
    });

    // Rerender to trigger update
    rerender(<EntityGraphVisualization />);

    // Should now show the graph
    await waitFor(() => {
      expect(screen.queryByText('No entities to display')).not.toBeInTheDocument();
      expect(screen.getByRole('application')).toBeInTheDocument();
    });
  });
});