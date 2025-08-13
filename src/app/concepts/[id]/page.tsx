
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Concept } from '@/lib/openalex/types';
import type { ConceptPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchConcept(id: string): Promise<Concept> {
  // Note: concepts endpoint is not fully implemented in the client yet
  // Using direct request method as a workaround
  const normalisedId = normaliseEntityId(id, EntityType.CONCEPT);
  try {
    // Using internal request method as concepts.get is not implemented in the client
    const response = await openAlex.request<Concept>(`/concepts/${normalisedId}`);
    if (!response) throw new Error(`Concept not found: ${normalisedId}`);
    return response;
  } catch (error) {
    console.error('Error fetching concept:', error);
    throw new Error(`Failed to fetch concept: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible concept IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: ConceptPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!validateEntityId(id, EntityType.CONCEPT) && !/^\d+$/.test(id)) {
      return { title: 'Concept Not Found - Academic Explorer' };
    }
    const concept = await fetchConcept(id);
    return {
      title: `${concept.display_name || `Concept ${concept.id}`} - Academic Explorer`,
      description: `Research concept: ${concept.display_name}. Level ${concept.level}, ${concept.works_count.toLocaleString()} works, ${concept.cited_by_count.toLocaleString()} citations.`,
    };
  } catch { return { title: 'Concept - Academic Explorer' }; }
}

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

export default async function ConceptsPage({ params }: ConceptPageProps) {
  const { id } = await params;
  if (!validateEntityId(id, EntityType.CONCEPT) && !/^\d+$/.test(id)) notFound();
  
  try {
    const concept = await fetchConcept(id);
    return (
      <EntityErrorBoundary entityType="concepts" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <ConceptDisplay concept={concept} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch {
    notFound();
  }
}

