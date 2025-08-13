
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Funder } from '@/lib/openalex/types';
import type { FunderPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchFunder(id: string): Promise<Funder> {
  const normalisedId = normaliseEntityId(id, EntityType.FUNDER);
  try {
    // Using direct request method as funders.get is not implemented
    const response = await openAlex.request<Funder>(`/funders/${normalisedId}`);
    if (!response) throw new Error(`Funder not found: ${normalisedId}`);
    return response;
  } catch (error) {
    console.error('Error fetching funder:', error);
    throw new Error(`Failed to fetch funder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible funder IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: FunderPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!validateEntityId(id, EntityType.FUNDER) && !/^\d+$/.test(id)) {
      return { title: 'Funder Not Found - Academic Explorer' };
    }
    const funder = await fetchFunder(id);
    return {
      title: `${funder.display_name || `Funder ${funder.id}`} - Academic Explorer`,
      description: `Research funder: ${funder.display_name}. ${funder.grants_count.toLocaleString()} grants, ${funder.works_count.toLocaleString()} works, ${funder.cited_by_count.toLocaleString()} citations.`,
    };
  } catch { return { title: 'Funder - Academic Explorer' }; }
}

function FunderDisplay({ funder }: { funder: Funder }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-yellow-100 text-yellow-800 text-sm font-medium px-2.5 py-0.5 rounded">Funder</span>
          <span className="text-gray-500 text-sm font-mono">{funder.id}</span>
          {funder.country_code && (
            <span className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded">{funder.country_code}</span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{funder.display_name || 'Unknown Funder'}</h1>
        {funder.description && <p className="text-gray-600">{funder.description}</p>}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-yellow-600">{funder.grants_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Grants</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{funder.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{funder.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">{funder.summary_stats.h_index}</div>
          <div className="text-sm text-gray-600">h-index</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {funder.homepage_url && (
            <a href={funder.homepage_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">Homepage</a>
          )}
          <a href={`https://openalex.org/${funder.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

export default async function FundersPage({ params }: FunderPageProps) {
  const { id } = await params;
  if (!validateEntityId(id, EntityType.FUNDER) && !/^\d+$/.test(id)) notFound();
  
  try {
    const funder = await fetchFunder(id);
    return (
      <EntityErrorBoundary entityType="funders" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <FunderDisplay funder={funder} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch {
    notFound();
  }
}

