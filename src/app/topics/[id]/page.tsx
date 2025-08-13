
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Topic } from '@/lib/openalex/types';
import type { TopicPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchTopic(id: string): Promise<Topic> {
  const normalisedId = normaliseEntityId(id, EntityType.TOPIC);
  const response = await openAlex.topic(normalisedId);
  if (!response) throw new Error(`Topic not found: ${normalisedId}`);
  return response;
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible topic IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!validateEntityId(id, EntityType.TOPIC) && !/^\d+$/.test(id)) {
      return { title: 'Topic Not Found - Academic Explorer' };
    }
    const topic = await fetchTopic(id);
    return {
      title: `${topic.display_name || `Topic ${topic.id}`} - Academic Explorer`,
      description: `Research topic: ${topic.display_name}. ${topic.works_count.toLocaleString()} works, ${topic.cited_by_count.toLocaleString()} citations.`,
    };
  } catch { return { title: 'Topic - Academic Explorer' }; }
}

function TopicDisplay({ topic }: { topic: Topic }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded">Topic</span>
          <span className="text-gray-500 text-sm font-mono">{topic.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{topic.display_name || 'Unknown Topic'}</h1>
        
        {(topic.field || topic.subfield || topic.domain) && (
          <div className="flex flex-wrap gap-2">
            {topic.domain && <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">Domain: {topic.domain.display_name}</span>}
            {topic.field && <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-sm">Field: {topic.field.display_name}</span>}
            {topic.subfield && <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-sm">Subfield: {topic.subfield.display_name}</span>}
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{topic.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{topic.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-indigo-600">{topic.keywords?.length || 0}</div>
          <div className="text-sm text-gray-600">Keywords</div>
        </div>
      </div>

      {topic.keywords && topic.keywords.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Keywords</h2>
          <div className="flex flex-wrap gap-2">
            {topic.keywords.map((keyword) => (
              <span key={keyword} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">{keyword}</span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          <a href={topic.works_api_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">View Works (API)</a>
          <a href={`https://openalex.org/${topic.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

export default async function TopicsPage({ params }: TopicPageProps) {
  const { id } = await params;
  if (!validateEntityId(id, EntityType.TOPIC) && !/^\d+$/.test(id)) notFound();
  
  try {
    const topic = await fetchTopic(id);
    return (
      <EntityErrorBoundary entityType="topics" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <TopicDisplay topic={topic} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch {
    notFound();
  }
}

