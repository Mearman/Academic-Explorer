import { createFileRoute } from '@tanstack/react-router';

import { EntityPageWithGraph, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { usePublisherData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { PublisherDisplay } from '@/components/entity-displays/PublisherDisplay';

function PublisherPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.PUBLISHER);
  
  const { 
    data: publisher, 
    loading, 
    error, 
    retry 
  } = usePublisherData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error(`Publisher fetch error:`, error);
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <EntitySkeleton entityType={EntityType.PUBLISHER} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <EntitySkeleton entityType={EntityType.PUBLISHER} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.PUBLISHER}
        />
      </EntityErrorBoundary>
    );
  }

  // Show publisher data
  if (publisher) {
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <PublisherDisplay entity={publisher} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="publishers" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.PUBLISHER}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/publishers/$id')({
  component: PublisherPage,
});