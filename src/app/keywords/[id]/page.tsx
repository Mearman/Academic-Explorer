
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Keyword } from '@/lib/openalex/types';
import type { KeywordPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchKeyword(id: string): Promise<Keyword> {
  const normalisedId = normaliseEntityId(id, EntityType.KEYWORD);
  try {
    // Using direct request method as keywords.get is not implemented
    const response = await openAlex.request<Keyword>(`/keywords/${normalisedId}`);
    if (!response) throw new Error(`Keyword not found: ${normalisedId}`);
    return response;
  } catch (error) {
    console.error('Error fetching keyword:', error);
    throw new Error(`Failed to fetch keyword: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible keyword IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: KeywordPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    if (!validateEntityId(id, EntityType.KEYWORD) && !/^\d+$/.test(id)) {
      return { title: 'Keyword Not Found - Academic Explorer' };
    }
    const keyword = await fetchKeyword(id);
    return {
      title: `${keyword.display_name || `Keyword ${keyword.id}`} - Academic Explorer`,
      description: `Research keyword: "${keyword.display_name}". ${keyword.works_count.toLocaleString()} works, ${keyword.cited_by_count.toLocaleString()} citations.`,
    };
  } catch { return { title: 'Keyword - Academic Explorer' }; }
}

function KeywordDisplay({ keyword }: { keyword: Keyword }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-pink-100 text-pink-800 text-sm font-medium px-2.5 py-0.5 rounded">Keyword</span>
          <span className="text-gray-500 text-sm font-mono">{keyword.id}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">&ldquo;{keyword.display_name || 'Unknown Keyword'}&rdquo;</h1>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">{keyword.works_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">{keyword.cited_by_count.toLocaleString()}</div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        {keyword.score && (
          <div className="bg-white p-4 rounded-lg border text-center">
            <div className="text-2xl font-bold text-pink-600">{keyword.score.toFixed(2)}</div>
            <div className="text-sm text-gray-600">Score</div>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          <a href={keyword.works_api_url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 hover:underline">View Works (API)</a>
          <a href={`https://openalex.org/${keyword.id}`} target="_blank" rel="noopener noreferrer" className="block text-gray-600 hover:underline">View on OpenAlex</a>
        </div>
      </div>
    </div>
  );
}

export default async function KeywordsPage({ params }: KeywordPageProps) {
  const { id } = await params;
  if (!validateEntityId(id, EntityType.KEYWORD) && !/^\d+$/.test(id)) notFound();
  
  try {
    const keyword = await fetchKeyword(id);
    return (
      <EntityErrorBoundary entityType="keywords" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <KeywordDisplay keyword={keyword} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch {
    notFound();
  }
}

