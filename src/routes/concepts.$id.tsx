import { createFileRoute } from '@tanstack/react-router';
import type { Concept } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useConceptData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';

function ConceptDisplay({ concept }: { concept: Concept }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-teal-100 text-teal-800 text-sm font-medium px-2.5 py-0.5 rounded">Concept</span>
          <span className="text-gray-500 text-sm font-mono">{concept.id}</span>
          <span className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded">Level {concept.level}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{concept.display_name || 'Unknown Concept'}</h1>
        {concept.description && <p className="text-gray-600">{concept.description}</p>}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{concept.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{concept.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-teal-600">{concept.level}</div>
          <div className="text-sm text-gray-600">Level</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">{concept.ancestors?.length || 0}</div>
          <div className="text-sm text-gray-600">Ancestors</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {concept.wikidata && (
            <a href={`https://www.wikidata.org/wiki/${concept.wikidata}`} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Wikidata</a>
          )}
          <a href={`https://openalex.org/${concept.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

function ConceptPage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.CONCEPT);
  
  const { 
    data: concept, 
    loading, 
    error, 
    retry 
  } = useConceptData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Concept fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONCEPT} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntitySkeleton entityType={EntityType.CONCEPT} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.CONCEPT}
        />
      </EntityErrorBoundary>
    );
  }

  // Show concept data
  if (concept) {
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <ConceptDisplay concept={concept} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="concepts" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.CONCEPT}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/concepts/$id')({
  component: ConceptPage,
});