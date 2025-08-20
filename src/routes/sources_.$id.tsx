import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { SourceDisplay } from '@/components/entity-displays/SourceDisplay';
import { useSourceData } from '@/hooks/use-entity-data';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function SourcePage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.SOURCE);
  
  // Entity graph tracking
  const { trackEntityData } = useEntityGraphTracking({
    autoTrack: true,
    extractRelationships: true,
  });
  
  // Use the source data hook
  const { data: source, loading, error, retry } = useSourceData({
    sourceId: !isRedirecting ? id : null
  });

  // Track entity data when source loads
  useEffect(() => {
    if (source && id && !isRedirecting) {
      trackEntityData(source, EntityType.SOURCE, id);
    }
  }, [source, id, isRedirecting, trackEntityData]);

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="source" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="source" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="source" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.SOURCE}
        />
      </EntityErrorBoundary>
    );
  }

  // Show source data
  if (source) {
    return (
      <EntityErrorBoundary entityType="source" entityId={id}>
        <SourceDisplay 
          entity={source} 
          useTwoPaneLayout={true}
          graphPane={<EntityGraphVisualization />}
        />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="source" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.SOURCE}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/sources_/$id')({
  component: SourcePage,
});