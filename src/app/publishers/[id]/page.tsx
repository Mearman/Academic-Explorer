
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Publisher } from '@/lib/openalex/types';
import type { PublisherPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchPublisher(id: string): Promise<Publisher> {
  const normalisedId = normaliseEntityId(id, EntityType.PUBLISHER);
  const response = await openAlex.publisher(normalisedId);
  if (!response) throw new Error(`Publisher not found: ${normalisedId}`);
  return response;
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible publisher IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: PublisherPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!validateEntityId(id, EntityType.PUBLISHER) && !/^\d+$/.test(id)) {
      return { title: 'Publisher Not Found - Academic Explorer' };
    }
    const publisher = await fetchPublisher(id);
    return {
      title: `${publisher.display_name || `Publisher ${publisher.id}`} - Academic Explorer`,
      description: `Academic publisher: ${publisher.display_name}. ${publisher.works_count.toLocaleString()} works, ${publisher.cited_by_count.toLocaleString()} citations.`,
    };
  } catch { return { title: 'Publisher - Academic Explorer' }; }
}

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

export default async function PublishersPage({ params }: PublisherPageProps) {
  const { id } = await params;
  if (!validateEntityId(id, EntityType.PUBLISHER) && !/^\d+$/.test(id)) notFound();
  
  try {
    const publisher = await fetchPublisher(id);
    return (
      <EntityErrorBoundary entityType="publishers" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <PublisherDisplay publisher={publisher} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch {
    notFound();
  }
}

