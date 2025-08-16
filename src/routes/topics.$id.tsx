import { createFileRoute } from '@tanstack/react-router';

import { EntityPageWithGraph, EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback } from '@/components';
import { useTopicData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { TopicDisplay } from '@/components/entity-displays/TopicDisplay';

function TopicPage() {
  const { id } = Route.useParams();
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.TOPIC);
  
  const { 
    data: topic, 
    loading, 
    error, 
    retry 
  } = useTopicData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error(`Topic fetch error:`, error);
    }
  });

  // Show loading state for redirection
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <EntitySkeleton entityType={EntityType.TOPIC} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <EntitySkeleton entityType={EntityType.TOPIC} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.TOPIC}
        />
      </EntityErrorBoundary>
    );
  }

  // Show topic data
  if (topic) {
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <TopicDisplay entity={topic} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="topics" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.TOPIC}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/topics/$id')({
  component: TopicPage,
});