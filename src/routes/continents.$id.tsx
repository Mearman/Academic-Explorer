import { createFileRoute } from '@tanstack/react-router';
import type { Continent } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useContinentData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';

function ContinentDisplay({ continent }: { continent: Continent }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-2.5 py-0.5 rounded">Continent</span>
          <span className="text-gray-500 text-sm font-mono">{continent.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{continent.display_name || 'Unknown Continent'}</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{continent.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{continent.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {continent.wikidata && (
            <a href={`https://www.wikidata.org/wiki/${continent.wikidata}`} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Wikidata</a>
          )}
          <a href={`https://openalex.org/${continent.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

function ContinentPage() {
  const { id } = Route.useParams();
  
  const { 
    data: continent, 
    loading, 
    error, 
    retry 
  } = useContinentData(id, {
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Continent fetch error:', error);
    }
  });

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONTINENT} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.CONTINENT}
        />
      </EntityErrorBoundary>
    );
  }

  // Show continent data
  if (continent) {
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <ContinentDisplay continent={continent} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="continents" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.CONTINENT}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/continents/$id')({
  component: ContinentPage,
});