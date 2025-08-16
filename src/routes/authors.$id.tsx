import { createFileRoute } from '@tanstack/react-router';

import { EntityPageWithGraph, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { useAuthorData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { AuthorDisplay } from '@/components/entity-displays/AuthorDisplay';

function AuthorPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.AUTHOR);
  
  // Use the author data hook
  const { data: author, loading, error, retry } = useAuthorData(id && !isRedirecting ? id : null);

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.AUTHOR}
        />
      </EntityErrorBoundary>
    );
  }

  // Show author data
  if (author) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={id}>
        <AuthorDisplay entity={author} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="authors" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.AUTHOR}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/authors/$id')({
  component: AuthorPage,
});