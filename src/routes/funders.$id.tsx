import { createFileRoute } from '@tanstack/react-router';
import type { Funder } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useFunderData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';

function FunderDisplay({ funder }: { funder: Funder }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded">Funder</span>
          <span className="text-gray-500 text-sm font-mono">{funder.id}</span>
          {funder.country_code && (
            <span className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded">{funder.country_code}</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{funder.display_name || 'Unknown Funder'}</h1>
        {funder.description && <p className="text-gray-600">{funder.description}</p>}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-yellow-600">{funder.grants_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Grants</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{funder.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{funder.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">{funder.summary_stats.h_index}</div>
          <div className="text-sm text-gray-600">h-index</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {funder.homepage_url && (
            <a href={funder.homepage_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Homepage</a>
          )}
          <a href={`https://openalex.org/${funder.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

function FunderPage() {
  const { id } = Route.useParams();
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
      console.error('Funder fetch error:', error);
    }
  });

  // Show redirection loading state
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
        <FunderDisplay funder={funder} />
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