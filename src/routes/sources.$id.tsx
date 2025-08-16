import { createFileRoute } from '@tanstack/react-router';

import { EntityPageWithGraph, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { useSourceData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { SourceDisplay } from '@/components/entity-displays/SourceDisplay';

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
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
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
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <SourceDisplay entity={source} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="sources" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.SOURCE}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/sources/$id')({
  component: SourcePage,
});