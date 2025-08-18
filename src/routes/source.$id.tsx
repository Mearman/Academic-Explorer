import { createFileRoute } from '@tanstack/react-router';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { SourceDisplay } from '@/components/entity-displays/SourceDisplay';
import { useSourceData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function SourcePage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.SOURCE);
  
  const { 
    data: source, 
    loading, 
    error, 
    retry 
  } = useSourceData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error(`Source fetch error:`, error);
    }
  });

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
    const graphPane = (
      <EntityGraphVisualization />
    );

    return (
      <EntityErrorBoundary entityType="source" entityId={id}>
        <SourceDisplay 
          entity={source} 
          useTwoPaneLayout={true}
          graphPane={graphPane}
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

export const Route = createFileRoute('/source/$id')({
  component: SourcePage,
});