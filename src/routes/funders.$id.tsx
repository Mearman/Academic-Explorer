import { createFileRoute } from '@tanstack/react-router';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { FunderDisplay } from '@/components/entity-displays/FunderDisplay';
import { useFunderData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function FunderPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.FUNDER);
  
  const { 
    data: funder, 
    loading, 
    error, 
    retry 
  } = useFunderData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error(`Funder fetch error:`, error);
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <EntitySkeleton entityType={EntityType.FUNDER} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <EntitySkeleton entityType={EntityType.FUNDER} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.FUNDER}
        />
      </EntityErrorBoundary>
    );
  }

  // Show funder data
  if (funder) {
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <FunderDisplay entity={funder} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="funders" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.FUNDER}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/funders/$id')({
  component: FunderPage,
});