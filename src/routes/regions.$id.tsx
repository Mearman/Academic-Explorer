import { createFileRoute } from '@tanstack/react-router';
import type { Region } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useRegionData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';

function RegionDisplay({ region }: { region: Region }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-cyan-100 text-cyan-800 text-sm font-medium px-2.5 py-0.5 rounded">Region</span>
          <span className="text-gray-500 text-sm font-mono">{region.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{region.display_name || 'Unknown Region'}</h1>
        {region.description && <p className="text-gray-600">{region.description}</p>}
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{region.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{region.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {region.wikidata && (
            <a href={`https://www.wikidata.org/wiki/${region.wikidata}`} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Wikidata</a>
          )}
          <a href={`https://openalex.org/${region.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

function RegionPage() {
  const { id } = Route.useParams();
  
  const { 
    data: region, 
    loading, 
    error, 
    retry 
  } = useRegionData(id, {
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Region fetch error:', error);
    }
  });

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <EntitySkeleton entityType={EntityType.REGION} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.REGION}
        />
      </EntityErrorBoundary>
    );
  }

  // Show region data
  if (region) {
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <RegionDisplay region={region} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="regions" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.REGION}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/regions/$id')({
  component: RegionPage,
});