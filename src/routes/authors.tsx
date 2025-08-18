import { createFileRoute, Outlet } from '@tanstack/react-router';
import { TwoPaneLayout, EntityGraphVisualization } from '@/components';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import { useMemo } from 'react';
import { Text } from '@mantine/core';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function AuthorsLayout() {
  const { graph } = useEntityGraphStore();
  
  // Filter graph to show author-related vertices and their connections
  const authorsGraphData = useMemo(() => {
    const authorVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === EntityType.AUTHOR);
    
    const authorIds = new Set(authorVertices.map(v => v.id));
    const relevantEdges = Array.from(graph.edges.values())
      .filter(edge => authorIds.has(edge.sourceId) || authorIds.has(edge.targetId));
    
    // Include connected vertices (works, institutions, co-authors, etc.)
    const connectedVertexIds = new Set<string>();
    relevantEdges.forEach(edge => {
      connectedVertexIds.add(edge.sourceId);
      connectedVertexIds.add(edge.targetId);
    });
    
    const allRelevantVertices = Array.from(graph.vertices.values())
      .filter(vertex => connectedVertexIds.has(vertex.id));
    
    return {
      vertices: allRelevantVertices,
      edges: relevantEdges,
      hasData: allRelevantVertices.length > 0
    };
  }, [graph]);
  
  const rightPane = authorsGraphData.hasData ? (
    <EntityGraphVisualization />
  ) : (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <Text c="dimmed">No authors data to visualise yet. Start exploring authors to see their collaboration networks here.</Text>
    </div>
  );
  
  return (
    <TwoPaneLayout
      leftPane={<Outlet />}
      rightPane={rightPane}
      stateKey="authors-layout"
      defaultSplit={65}
      mobileTabLabels={{ left: 'Authors', right: 'Network' }}
      showHeaders={false}
    />
  );
}

export const Route = createFileRoute('/authors')({
  component: AuthorsLayout,
});