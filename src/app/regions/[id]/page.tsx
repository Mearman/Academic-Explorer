
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Region } from '@/lib/openalex/types';
import type { RegionPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchRegion(id: string): Promise<Region> {
  const normalisedId = normaliseEntityId(id, EntityType.REGION);
  const response = await openAlex.region(normalisedId);
  if (!response) throw new Error(`Region not found: ${normalisedId}`);
  return response;
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible region IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!validateEntityId(id, EntityType.REGION) && !/^\d+$/.test(id)) {
      return { title: 'Region Not Found - Academic Explorer' };
    }
    const region = await fetchRegion(id);
    return {
      title: `${region.display_name || `Region ${region.id}`} - Academic Explorer`,
      description: `Region: ${region.display_name}. ${region.works_count.toLocaleString()} works, ${region.cited_by_count.toLocaleString()} citations.`,
    };
  } catch { return { title: 'Region - Academic Explorer' }; }
}

function RegionDisplay({ region }: { region: Region }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-cyan-100 text-cyan-800 text-sm font-medium px-2.5 py-0.5 rounded">Region</span>
          <span className="text-gray-500 text-sm font-mono">{region.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{region.display_name || 'Unknown Region'}</h1>
        {region.description && <p className="text-gray-600">{region.description}</p>}
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{region.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{region.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {region.wikidata && (
            <a href={`https://www.wikidata.org/wiki/${region.wikidata}`} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Wikidata</a>
          )}
          <a href={`https://openalex.org/${region.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

export default async function RegionsPage({ params }: RegionPageProps) {
  const { id } = await params;
  if (!validateEntityId(id, EntityType.REGION) && !/^\d+$/.test(id)) notFound();
  
  try {
    const region = await fetchRegion(id);
    return (
      <EntityErrorBoundary entityType="regions" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <RegionDisplay region={region} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch {
    notFound();
  }
}

