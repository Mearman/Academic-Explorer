import { createFileRoute } from '@tanstack/react-router';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useAuthorData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';

function AuthorDisplay({ author }: { author: Author }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-green-100 text-green-800 text-sm font-medium px-2.5 py-0.5 rounded">
            Author
          </span>
          <span className="text-gray-500 text-sm font-mono">
            {author.id}
          </span>
          {author.orcid && (
            <a
              href={`https://orcid.org/${author.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-100 text-orange-700 text-sm px-2 py-0.5 rounded hover:bg-orange-200"
            >
              ORCID
            </a>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          {author.display_name || 'Unknown Author'}
        </h1>
        
        {author.affiliations && author.affiliations.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-medium text-gray-700">Affiliations</h3>
            <div className="space-y-1">
              {author.affiliations.slice(0, 3).map((affiliation, index) => (
                <div key={index} className="text-gray-600">
                  <span className="font-medium">{affiliation.institution?.display_name}</span>
                  {affiliation.years && (
                    <span className="text-sm text-gray-500 ml-2">
                      ({Math.min(...affiliation.years)}-{Math.max(...affiliation.years)})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {author.works_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">
            {author.cited_by_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">
            {author.summary_stats.h_index}
          </div>
          <div className="text-sm text-gray-600">h-index</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">
            {author.summary_stats.i10_index}
          </div>
          <div className="text-sm text-gray-600">i10-index</div>
        </div>
      </div>

      {/* Research Metrics */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Research Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <dt className="font-medium text-gray-700">2-Year Mean Citedness</dt>
            <dd className="text-gray-900 text-lg">
              {author.summary_stats['2yr_mean_citedness'].toFixed(2)}
            </dd>
          </div>
          
          <div>
            <dt className="font-medium text-gray-700">h-index</dt>
            <dd className="text-gray-900 text-lg">{author.summary_stats.h_index}</dd>
          </div>
          
          <div>
            <dt className="font-medium text-gray-700">i10-index</dt>
            <dd className="text-gray-900 text-lg">{author.summary_stats.i10_index}</dd>
          </div>
        </div>
      </div>

      {/* External Links */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {author.orcid && (
            <a 
              href={`https://orcid.org/${author.orcid}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="block text-blue-600 hover:underline"
            >
              ORCID Profile
            </a>
          )}
          <a 
            href={`https://openalex.org/${author.id}`} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="block text-gray-600 hover:underline"
          >
            View on OpenAlex
          </a>
        </div>
      </div>
    </div>
  );
}

function AuthorPage() {
  const { id } = Route.useParams();
  
  const { 
    data: author, 
    loading, 
    error, 
    retry 
  } = useAuthorData(id, {
    enabled: !!id,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Author fetch error:', error);
    }
  });

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
        <AuthorDisplay author={author} />
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