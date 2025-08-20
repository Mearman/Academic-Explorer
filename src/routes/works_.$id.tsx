import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { WorkDisplay } from '@/components/entity-displays/WorkDisplay';
import { useWorkData } from '@/hooks/use-entity-data';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function WorkPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.WORK);
  
  // Entity graph tracking
  const { trackEntityData } = useEntityGraphTracking({
    autoTrack: true,
    extractRelationships: true,
  });
  
  // Use the work data hook
  const { data: work, loading, error, retry } = useWorkData({
    workId: !isRedirecting ? id : null
  });

  // Track entity data when work loads
  useEffect(() => {
    if (work && id && !isRedirecting) {
      trackEntityData(work, EntityType.WORK, id);
    }
  }, [work, id, isRedirecting, trackEntityData]);

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="work" entityId={id}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="work" entityId={id}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="work" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.WORK}
        />
      </EntityErrorBoundary>
    );
  }

  // Show work data
  if (work) {
    return (
      <EntityErrorBoundary entityType="work" entityId={id}>
        <WorkDisplay 
          entity={work} 
          useTwoPaneLayout={true}
          graphPane={<EntityGraphVisualization />}
        />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="work" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.WORK}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/works_/$id')({
  component: WorkPage,
});