import { createFileRoute } from '@tanstack/react-router';

import { EntityPageWithGraph, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { useInstitutionData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { InstitutionDisplay } from '@/components/entity-displays/InstitutionDisplay';

function InstitutionPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.INSTITUTION);
  
  const { 
    data: institution, 
    loading, 
    error, 
    retry 
  } = useInstitutionData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error(`Institution fetch error:`, error);
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <EntitySkeleton entityType={EntityType.INSTITUTION} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
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
    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <InstitutionDisplay entity={institution} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="institutions" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.INSTITUTION}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/institutions/$id')({
  component: InstitutionPage,
});