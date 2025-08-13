import { createFileRoute } from '@tanstack/react-router';
import type { Keyword } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useKeywordData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';

function KeywordDisplay({ keyword }: { keyword: Keyword }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-pink-100 text-pink-800 text-sm font-medium px-2.5 py-0.5 rounded">Keyword</span>
          <span className="text-gray-500 text-sm font-mono">{keyword.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">&ldquo;{keyword.display_name || 'Unknown Keyword'}&rdquo;</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{keyword.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{keyword.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        {keyword.score && (
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-pink-600">{keyword.score.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Score</div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          <a href={keyword.works_api_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">View Works (API)</a>
          <a href={`https://openalex.org/${keyword.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

function KeywordPage() {
  const { id } = Route.useParams();
  
  const { 
    data: keyword, 
    loading, 
    error, 
    retry 
  } = useKeywordData(id, {
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Keyword fetch error:', error);
    }
  });

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <EntitySkeleton entityType={EntityType.KEYWORD} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.KEYWORD}
        />
      </EntityErrorBoundary>
    );
  }

  // Show keyword data
  if (keyword) {
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <KeywordDisplay keyword={keyword} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="keywords" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.KEYWORD}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/keywords/$id')({
  component: KeywordPage,
});