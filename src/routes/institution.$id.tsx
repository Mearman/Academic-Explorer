import { createFileRoute } from '@tanstack/react-router';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { InstitutionDisplay } from '@/components/entity-displays/InstitutionDisplay';
import { useInstitutionData, EntityError as EntityErrorType } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function InstitutionPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.INSTITUTION);
  
  const { 
    data: institution, 
    loading, 
    error, 
    retry 
  } = useInstitutionData({
    institutionId: id,
    options: {
      enabled: !!id && !isRedirecting,
      refetchOnWindowFocus: true,
      staleTime: 10 * 60 * 1000, // 10 minutes
      onError: (error: EntityErrorType) => {
        console.error(`Institution fetch error:`, error);
      }
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="institution" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="institution" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="institution" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.INSTITUTION}
        />
      </EntityErrorBoundary>
    );
  }

  // Show institution data
  if (institution) {
    const graphPane = (
      <EntityGraphVisualization />
    );

    return (
      <EntityErrorBoundary entityType="institution" entityId={id}>
        <InstitutionDisplay 
          entity={institution} 
          useTwoPaneLayout={true}
          graphPane={graphPane}
        />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="institution" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.INSTITUTION}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/institution/$id')({
  component: InstitutionPage,
});