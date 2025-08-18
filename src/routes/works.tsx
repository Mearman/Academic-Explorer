import { Text } from '@mantine/core';
import { createFileRoute } from '@tanstack/react-router';
import { useMemo } from 'react';

import { PageWithPanes, WorksOverview, EntityGraphVisualization, EntityPageHeader } from '@/components';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function WorksLayout() {
  const { graph } = useEntityGraphStore();
  
  // Filter graph to show work-related vertices and their connections
  const worksGraphData = useMemo(() => {
    const workVertices = Array.from(graph.vertices.values())
      .filter(vertex => vertex.entityType === EntityType.WORK);
    
    const workIds = new Set(workVertices.map(v => v.id));
    const relevantEdges = Array.from(graph.edges.values())
      .filter(edge => workIds.has(edge.sourceId) || workIds.has(edge.targetId));
    
    // Include connected vertices (authors, institutions, etc.)
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
  
  const rightPane = worksGraphData.hasData ? (
    <EntityGraphVisualization />
  ) : (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <Text c="dimmed">No works data to visualise yet. Start exploring works to see connections here.</Text>
    </div>
  );

  const headerContent = (
    <EntityPageHeader
      title="Works"
      subtitle="Academic papers, articles, and publications"
      entityType={EntityType.WORK}
      entityId="works-overview"
    />
  );
  
  return (
    <PageWithPanes
      headerContent={headerContent}
      leftPane={
        <WorksOverview />
      }
      rightPane={rightPane}
      twoPaneLayoutProps={{
        stateKey: "works-layout",
        defaultSplit: 65,
        mobileTabLabels: { left: 'Works', right: 'Graph' },
      }}
      paneControlLabels={{ left: 'Works Overview', right: 'Graph View' }}
    />
  );
}

export const Route = createFileRoute('/works')({
  component: WorksLayout,
});