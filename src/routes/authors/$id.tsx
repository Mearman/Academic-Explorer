import { createFileRoute } from '@tanstack/react-router';
import React, { useMemo } from 'react';

import { TwoPaneLayout, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphActions } from '@/components';
import { AuthorDisplay } from '@/components/entity-displays/AuthorDisplay';
import { EntityGraphVisualization } from '@/components/organisms/entity-graph-visualization';
import type { EntityData, EntityError as EntityErrorType } from '@/hooks/use-entity-data';
import { useEntityData } from '@/hooks/use-entity-data';
import { useEntityGraphStats } from '@/hooks/use-entity-graph-stats';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';
import type { EntityGraphVertex } from '@/types/entity-graph';

function AuthorPageContent({ entity }: { entity: EntityData }) {
  // Get graph tracking and stats 
  const graphStats = useEntityGraphStats();
  const { trackEntityData } = useEntityGraphTracking();

  // Track this entity visit
  React.useEffect(() => {
    if (entity) {
      trackEntityData(entity, EntityType.AUTHOR, entity.id);
    }
  }, [entity, trackEntityData]);

  // Create a functional graph visualization with real author data and graph component
  const graphPane = (
    <div>
      {/* Graph statistics header */}
      <div style={{ 
        padding: '0.75rem 1rem', 
        background: '#2a2a2a', 
        color: 'white', 
        borderRadius: '8px 8px 0 0',
        border: '1px solid #333',
        borderBottom: 'none',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{ margin: 0, color: '#4a9eff' }}>🔗 Author Network</h3>
        <div style={{ fontSize: '0.9rem', color: '#888' }}>
          {graphStats ? `${graphStats.totalVertices} entities, ${graphStats.totalEdges} connections` : 'Loading...'}
        </div>
      </div>

      {/* Interactive Graph Visualization */}
      {graphStats && graphStats.totalVertices > 0 ? (
        <EntityGraphVisualization
          height={400}
          showControls={true}
          showLegend={true}
          onVertexClick={(vertex: EntityGraphVertex) => {
            // Navigate to clicked entity
            window.location.hash = `#/${vertex.entityType}s/${vertex.id}`;
          }}
        />
      ) : (
        <div style={{ 
          padding: '2rem', 
          background: '#1a1a1a', 
          color: 'white', 
          minHeight: '400px', 
          borderRadius: '0 0 8px 8px',
          border: '1px solid #333',
          borderTop: 'none',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#4a9eff' }}>Building Your Research Network</div>
          <div style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', maxWidth: '400px' }}>
            Visit more authors, institutions, and works to see how they connect. 
            Your browsing history creates a personalized academic network graph.
          </div>
          
          {/* Author info preview */}
          <div style={{ 
            marginTop: '2rem',
            padding: '1rem', 
            background: '#2a4a6a', 
            borderRadius: '8px',
            textAlign: 'center',
            border: '2px solid #4a9eff',
            maxWidth: '300px'
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {(entity as Author).display_name}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#ccc', marginBottom: '0.5rem' }}>
              Current Author Node
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
              <div>{(entity as Author).works_count} works</div>
              <div>{(entity as Author).cited_by_count} citations</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render the author component with full two-pane layout
  return (
    <AuthorDisplay 
      entity={entity as Author} 
      useTwoPaneLayout={true}
      graphPane={graphPane}
    />
  );
}

function AuthorPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.AUTHOR);
  
  // Memoize tracking metadata to prevent unnecessary re-renders
  const trackingMetadata = useMemo(() => ({
    route: '/authors/$id',
    urlType: 'authors',
  }), []);
  
  const { 
    data: entity, 
    loading, 
    error, 
    retry 
  } = useEntityData({
    entityId: id, 
    entityType: EntityType.AUTHOR, 
    options: {
      enabled: !!id && !isRedirecting,
      refetchOnWindowFocus: true,
      staleTime: 10 * 60 * 1000 // 10 minutes
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.AUTHOR}
        />
      </EntityErrorBoundary>
    );
  }

  // Show entity data
  if (entity) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <AuthorPageContent entity={entity} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="authors" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.AUTHOR}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/authors/$id')({
  component: AuthorPage,
});