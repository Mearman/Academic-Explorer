'use client';

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

import { useParams } from 'next/navigation';
import type { Work } from '@/lib/openalex/types';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useWorkData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';



function WorkDisplay({ work }: { work: Work }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded">
            Work
          </span>
          <span className="text-gray-500 text-sm font-mono">
            {work.id}
          </span>
          {work.type && (
            <span className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded">
              {work.type.replace('-', ' ')}
            </span>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          {work.display_name || work.title || 'Untitled Work'}
        </h1>
        
        {work.authorships && work.authorships.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-600">By:</span>
            {work.authorships.slice(0, 10).map((authorship, index) => (
              <span key={authorship.author.id} className="text-blue-600 hover:underline">
                {authorship.author.display_name}
                {index < work.authorships.length - 1 && index < 9 ? ',' : ''}
                {index === 9 && work.authorships.length > 10 && '...'}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">
            {work.cited_by_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {work.publication_year || 'N/A'}
          </div>
          <div className="text-sm text-gray-600">Published</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">
            {work.authorships?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Authors</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">
            {work.open_access.is_oa ? 'Open' : 'Closed'}
          </div>
          <div className="text-sm text-gray-600">Access</div>
        </div>
      </div>

      {/* Publication Details */}
      <div className="bg-white p-6 rounded-lg border space-y-4">
        <h2 className="text-xl font-semibold">Publication Details</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {work.primary_location?.source && (
            <div>
              <dt className="font-medium text-gray-700">Source</dt>
              <dd className="text-gray-900">{work.primary_location.source.display_name}</dd>
            </div>
          )}
          
          {work.publication_date && (
            <div>
              <dt className="font-medium text-gray-700">Publication Date</dt>
              <dd className="text-gray-900">{work.publication_date}</dd>
            </div>
          )}
          
          {work.ids.doi && (
            <div>
              <dt className="font-medium text-gray-700">DOI</dt>
              <dd className="text-gray-900">
                <a 
                  href={`https://doi.org/${work.ids.doi}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {work.ids.doi}
                </a>
              </dd>
            </div>
          )}
          
          {work.language && (
            <div>
              <dt className="font-medium text-gray-700">Language</dt>
              <dd className="text-gray-900">{work.language}</dd>
            </div>
          )}
        </div>
      </div>

      {/* Abstract */}
      {work.abstract_inverted_index && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Abstract</h2>
          <div className="text-gray-700 leading-relaxed">
            {/* Note: In a real implementation, you'd reconstruct the abstract from the inverted index */}
            <p className="italic text-gray-600">
              Abstract available (inverted index format). 
              Implementation needed to reconstruct full text.
            </p>
          </div>
        </div>
      )}

      {/* Topics */}
      {work.topics && work.topics.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Topics</h2>
          <div className="flex flex-wrap gap-2">
            {work.topics.map((topic) => (
              <span
                key={topic.id}
                className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm"
              >
                {topic.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Links */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {work.primary_location?.landing_page_url && (
            <a
              href={work.primary_location.landing_page_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              Publisher Page
            </a>
          )}
          
          {work.best_oa_location?.pdf_url && (
            <a
              href={work.best_oa_location.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-green-600 hover:underline"
            >
              Free PDF Access
            </a>
          )}
          
          <a
            href={`https://openalex.org/${work.id}`}
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

export default function WorksPage() {
  const params = useParams();
  const workId = params?.id as string;

  const { 
    data: work, 
    loading, 
    error, 
    retry 
  } = useWorkData(workId, {
    enabled: !!workId,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error) => {
      console.error('Work fetch error:', error);
    }
  });

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType="works" entityId={workId}>
        <EntitySkeleton entityType={EntityType.WORK} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="works" entityId={workId}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={workId} 
          entityType={EntityType.WORK}
        />
      </EntityErrorBoundary>
    );
  }

  // Show work data
  if (work) {
    return (
      <EntityErrorBoundary entityType="works" entityId={workId}>
        <WorkDisplay work={work} />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="works" entityId={workId}>
      <EntityFallback 
        onRetry={retry} 
        entityId={workId} 
        entityType={EntityType.WORK}
      />
    </EntityErrorBoundary>
  );
}

