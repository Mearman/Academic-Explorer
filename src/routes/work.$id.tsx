import { createFileRoute } from '@tanstack/react-router';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { WorkDisplay } from '@/components/entity-displays/WorkDisplay';
import { useWorkData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function WorkPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.WORK);
  
  const { 
    data: work, 
    loading, 
    error, 
    retry 
  } = useWorkData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error(`Work fetch error:`, error);
    }
  });

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
    const graphPane = (
      <EntityGraphVisualization />
    );

    return (
      <EntityErrorBoundary entityType="work" entityId={id}>
        <WorkDisplay 
          entity={work} 
          useTwoPaneLayout={true}
          graphPane={graphPane}
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

export const Route = createFileRoute('/work/$id')({
  component: WorkPage,
});