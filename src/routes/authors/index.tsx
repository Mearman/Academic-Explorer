import { 
  Card, 
  Text, 
  Title, 
  Grid, 
  Stack, 
  Paper,
  Group,
  Badge,
  Button,
  Alert
} from '@mantine/core';
import { 
  IconUser, 
  IconClock, 
  IconEye,
  IconInfoCircle,
  IconSearch
} from '@tabler/icons-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';

import { EntityLink, EntityBrowser, PageWithPanes, AuthorsOverview, EntityGraphVisualization, EntityPageHeader } from '@/components';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function AuthorsIndexPage() {
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

  const authorCount = authorsGraphData.vertices.filter(v => v.entityType === EntityType.AUTHOR).length;
  const subtitle = authorCount > 0 
    ? `${authorCount.toLocaleString()} authors in exploration graph`
    : 'Author collection and exploration';

  const headerContent = (
    <EntityPageHeader
      title="Authors"
      subtitle={subtitle}
      entityType={EntityType.AUTHOR}
      entityId="authors-overview"
    />
  );
  
  return (
    <PageWithPanes
      headerContent={headerContent}
      leftPane={
        <AuthorsOverview />
      }
      rightPane={rightPane}
      twoPaneLayoutProps={{
        stateKey: "authors-layout",
        defaultSplit: 65,
        mobileTabLabels: { left: 'Authors', right: 'Network' },
      }}
      paneControlLabels={{ left: 'Authors Overview', right: 'Network View' }}
    />
  );
}

export const Route = createFileRoute('/authors/')({
  component: AuthorsIndexPage,
});