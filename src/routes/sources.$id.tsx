import { createFileRoute } from '@tanstack/react-router';
import type { Source } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useSourceData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';

function SourceDisplay({ source }: { source: Source }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-0.5 rounded">
            Source
          </span>
          <span className="text-gray-500 text-sm font-mono">
            {source.id}
          </span>
          {source.type && (
            <span className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded capitalize">
              {source.type.replace('-', ' ')}
            </span>
          )}
          {source.is_oa && (
            <span className="bg-green-100 text-green-700 text-sm px-2 py-0.5 rounded">
              Open Access
            </span>
          )}
          {source.is_in_doaj && (
            <span className="bg-blue-100 text-blue-700 text-sm px-2 py-0.5 rounded">
              DOAJ
            </span>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          {source.display_name || 'Unknown Source'}
        </h1>
        
        {source.alternate_titles && source.alternate_titles.length > 0 && (
          <div className="text-gray-600">
            <span className="text-sm">Also known as: </span>
            {source.alternate_titles.slice(0, 2).join(', ')}
            {source.alternate_titles.length > 2 && '...'}
          </div>
        )}
        
        {source.host_organization_name && (
          <div className="text-lg text-gray-700">
            Published by {source.host_organization_name}
            {source.country_code && (
              <span className="ml-2 text-sm text-gray-500">
                ({source.country_code})
              </span>
            )}
          </div>
        )}
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">
            {source.works_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {source.cited_by_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">
            {source.summary_stats.h_index}
          </div>
          <div className="text-sm text-gray-600">h-index</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">
            {source.summary_stats['2yr_mean_citedness'].toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">2yr Mean</div>
        </div>
      </div>

      {/* Publication Details */}
      <div className="bg-white p-6 rounded-lg border space-y-4">
        <h2 className="text-xl font-semibold">Source Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {source.issn_l && (
            <div>
              <dt className="font-medium text-gray-700">ISSN-L</dt>
              <dd className="text-gray-900 font-mono">{source.issn_l}</dd>
            </div>
          )}
          
          {source.issn && source.issn.length > 0 && (
            <div>
              <dt className="font-medium text-gray-700">ISSN</dt>
              <dd className="text-gray-900 font-mono">{source.issn.join(', ')}</dd>
            </div>
          )}
          
          {source.type && (
            <div>
              <dt className="font-medium text-gray-700">Type</dt>
              <dd className="text-gray-900 capitalize">{source.type.replace('-', ' ')}</dd>
            </div>
          )}
          
          {source.country_code && (
            <div>
              <dt className="font-medium text-gray-700">Country</dt>
              <dd className="text-gray-900">{source.country_code}</dd>
            </div>
          )}
          
          <div>
            <dt className="font-medium text-gray-700">Access Model</dt>
            <dd className="text-gray-900">
              {source.is_oa ? 'Open Access' : 'Subscription'}
              {source.is_in_doaj && ' (DOAJ Listed)'}
            </dd>
          </div>
          
          {source.apc_usd && (
            <div>
              <dt className="font-medium text-gray-700">APC (USD)</dt>
              <dd className="text-gray-900">${source.apc_usd.toLocaleString()}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Research Areas */}
      {source.topics && source.topics.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Research Areas</h2>
          <div className="flex flex-wrap gap-2">
            {source.topics.slice(0, 10).map((topic) => (
              <span
                key={topic.id}
                className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-sm"
              >
                {topic.display_name}
              </span>
            ))}
            {source.topics.length > 10 && (
              <span className="text-gray-500 text-sm px-3 py-1">
                +{source.topics.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Publication Timeline */}
      {source.counts_by_year && source.counts_by_year.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Publication Timeline</h2>
          <div className="space-y-2">
            {source.counts_by_year
              .slice(-10) // Show last 10 years
              .reverse()
              .map((yearData) => (
              <div key={yearData.year} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span className="font-medium text-gray-700">{yearData.year}</span>
                <div className="flex space-x-4 text-sm">
                  <span className="text-blue-600">
                    {yearData.works_count} works
                  </span>
                  <span className="text-green-600">
                    {yearData.cited_by_count.toLocaleString()} citations
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* External Links */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {source.homepage_url && (
            <a
              href={source.homepage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              Homepage
            </a>
          )}
          
          <a
            href={source.works_api_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-purple-600 hover:underline"
          >
            View Works (API)
          </a>
          
          <a
            href={`https://openalex.org/${source.id}`}
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

function SourcePage() {
  const { id } = Route.useParams();
  const isRedirecting = useNumericIdRedirect(id, EntityType.SOURCE);
  
  const { 
    data: source, 
    loading, 
    error, 
    retry 
  } = useSourceData(id, {
    enabled: !!id && !isRedirecting,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Source fetch error:', error);
    }
  });

  // Show redirection loading state
  if (isRedirecting) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntitySkeleton entityType={EntityType.SOURCE} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.SOURCE}
        />
      </EntityErrorBoundary>
    );
  }

  // Show source data
  if (source) {
    return (
      <EntityErrorBoundary entityType="sources" entityId={id}>
        <SourceDisplay source={source} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="sources" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.SOURCE}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/sources/$id')({
  component: SourcePage,
});