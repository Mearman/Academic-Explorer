import { createFileRoute } from '@tanstack/react-router';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { InstitutionDisplay } from '@/components/entity-displays/InstitutionDisplay';
import { useInstitutionData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

function InstitutionPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.INSTITUTION);
  
  // Use the institution data hook
  const { data: institution, loading, error, retry } = useInstitutionData(
    !isRedirecting ? id : null
  );

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
    return (
      <EntityErrorBoundary entityType="institution" entityId={id}>
        <InstitutionDisplay 
          entity={institution} 
          useTwoPaneLayout={true}
          graphPane={<EntityGraphVisualization />}
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

export const Route = createFileRoute('/institutions_/$id')({
  component: InstitutionPage,
});