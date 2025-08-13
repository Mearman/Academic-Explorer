'use client';

import { useParams } from 'next/navigation';
import type { Author } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useAuthorData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible author IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}



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
        
        {author.display_name_alternatives && author.display_name_alternatives.length > 0 && (
          <div className="text-gray-600">
            <span className="text-sm">Also known as: </span>
            {author.display_name_alternatives.slice(0, 3).join(', ')}
            {author.display_name_alternatives.length > 3 && '...'}
          </div>
        )}
        
        {author.last_known_institutions && author.last_known_institutions.length > 0 && (
          <div className="text-lg text-gray-700">
            {author.last_known_institutions[0].display_name}
            {author.last_known_institutions[0].country_code && (
              <span className="ml-2 text-sm text-gray-500">
                ({author.last_known_institutions[0].country_code})
              </span>
            )}
          </div>
        )}
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">
            {author.works_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Publications</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
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

      {/* Summary Stats */}
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

      {/* Affiliations History */}
      {author.affiliations && author.affiliations.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Affiliation History</h2>
          <div className="space-y-4">
            {author.affiliations.map((affiliation, index) => (
              <div key={index} className="border-l-4 border-blue-200 pl-4">
                <h3 className="font-medium text-gray-900">
                  {affiliation.institution.display_name}
                </h3>
                <p className="text-sm text-gray-600">
                  {affiliation.institution.type && (
                    <span className="capitalize">{affiliation.institution.type}</span>
                  )}
                  {affiliation.institution.country_code && (
                    <span className="ml-2">({affiliation.institution.country_code})</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  Years: {affiliation.years.join(', ')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Research Topics */}
      {author.topics && author.topics.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Research Areas</h2>
          <div className="flex flex-wrap gap-2">
            {author.topics.slice(0, 10).map((topic) => (
              <span
                key={topic.id}
                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                {topic.display_name}
              </span>
            ))}
            {author.topics.length > 10 && (
              <span className="text-gray-500 text-sm px-3 py-1">
                +{author.topics.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Citation Timeline */}
      {author.counts_by_year && author.counts_by_year.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Publication & Citation Timeline</h2>
          <div className="space-y-2">
            {author.counts_by_year
              .slice(-10) // Show last 10 years
              .reverse()
              .map((yearData) => (
              <div key={yearData.year} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                <span className="font-medium text-gray-700">{yearData.year}</span>
                <div className="flex space-x-4 text-sm">
                  <span className="text-blue-600">
                    {yearData.works_count} publications
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
          {author.orcid && (
            <a
              href={`https://orcid.org/${author.orcid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-orange-600 hover:underline"
            >
              ORCID Profile: {author.orcid}
            </a>
          )}
          
          <a
            href={author.works_api_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-600 hover:underline"
          >
            View Publications (API)
          </a>
          
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

export default function AuthorsPage() {
  const params = useParams();
  const authorId = params?.id as string;

  const { 
    data: author, 
    loading, 
    error, 
    retry 
  } = useAuthorData(authorId, {
    enabled: !!authorId,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Author fetch error:', error);
    }
  });

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={authorId}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={authorId}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={authorId} 
          entityType={EntityType.AUTHOR}
        />
      </EntityErrorBoundary>
    );
  }

  // Show author data
  if (author) {
    return (
      <EntityErrorBoundary entityType="authors" entityId={authorId}>
        <AuthorDisplay author={author} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="authors" entityId={authorId}>
      <EntityFallback 
        onRetry={retry} 
        entityId={authorId} 
        entityType={EntityType.AUTHOR}
      />
    </EntityErrorBoundary>
  );
}

