import { createFileRoute } from '@tanstack/react-router';
import type { Publisher } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { usePublisherData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';

function PublisherDisplay({ publisher }: { publisher: Publisher }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded">Publisher</span>
          <span className="text-gray-500 text-sm font-mono">{publisher.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{publisher.display_name || 'Unknown Publisher'}</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{publisher.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{publisher.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">{publisher.summary_stats.h_index}</div>
          <div className="text-sm text-gray-600">h-index</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">{publisher.hierarchy_level}</div>
          <div className="text-sm text-gray-600">Level</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {publisher.homepage_url && (
            <a href={publisher.homepage_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Homepage</a>
          )}
          <a href={`https://openalex.org/${publisher.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

function PublisherPage() {
  const { id } = Route.useParams();
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
      console.error('Publisher fetch error:', error);
    }
  });

  // Show redirection loading state
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
        <PublisherDisplay publisher={publisher} />
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