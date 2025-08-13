
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Continent } from '@/lib/openalex/types';
import type { ContinentPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchContinent(id: string): Promise<Continent> {
  const normalisedId = normaliseEntityId(id, EntityType.CONTINENT);
  try {
    // Using direct request method as continents.get is not implemented
    const response = await openAlex.request<Continent>(`/continents/${normalisedId}`);
    if (!response) throw new Error(`Continent not found: ${normalisedId}`);
    return response;
  } catch (error) {
    console.error('Error fetching continent:', error);
    throw new Error(`Failed to fetch continent: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible continent IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: ContinentPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!validateEntityId(id, EntityType.CONTINENT) && !/^\d+$/.test(id)) {
      return { title: 'Continent Not Found - Academic Explorer' };
    }
    const continent = await fetchContinent(id);
    return {
      title: `${continent.display_name || `Continent ${continent.id}`} - Academic Explorer`,
      description: `Continent: ${continent.display_name}. ${continent.works_count.toLocaleString()} works, ${continent.cited_by_count.toLocaleString()} citations.`,
    };
  } catch { return { title: 'Continent - Academic Explorer' }; }
}

function ContinentDisplay({ continent }: { continent: Continent }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-emerald-100 text-emerald-800 text-sm font-medium px-2.5 py-0.5 rounded">Continent</span>
          <span className="text-gray-500 text-sm font-mono">{continent.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{continent.display_name || 'Unknown Continent'}</h1>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{continent.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{continent.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {continent.wikidata && (
            <a href={`https://www.wikidata.org/wiki/${continent.wikidata}`} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Wikidata</a>
          )}
          <a href={`https://openalex.org/${continent.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

export default async function ContinentsPage({ params }: ContinentPageProps) {
  const { id } = await params;
  if (!validateEntityId(id, EntityType.CONTINENT) && !/^\d+$/.test(id)) notFound();
  
  try {
    const continent = await fetchContinent(id);
    return (
      <EntityErrorBoundary entityType="continents" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <ContinentDisplay continent={continent} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch {
    notFound();
  }
}

