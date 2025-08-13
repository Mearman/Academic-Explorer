
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { normaliseEntityId, validateEntityId, EntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { Institution } from '@/lib/openalex/types';
import type { InstitutionPageProps } from '@/app/types/page-params';
import EntityErrorBoundary from '@/components/error-boundary';
import { EntityPageSkeleton } from '@/components/loading';

async function fetchInstitution(id: string): Promise<Institution> {
  try {
    const normalisedId = normaliseEntityId(id, EntityType.INSTITUTION);
    const response = await openAlex.institution(normalisedId);
    
    if (!response) {
      throw new Error(`Institution not found: ${normalisedId}`);
    }
    
    return response;
  } catch (error) {
    console.error('Error fetching institution:', error);
    throw new Error(`Failed to fetch institution: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible institution IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

export async function generateMetadata({ params }: InstitutionPageProps): Promise<Metadata> {
  try {
    const { id } = await params;
    
    if (!validateEntityId(id, EntityType.INSTITUTION) && !/^\d+$/.test(id)) {
      return {
        title: 'Institution Not Found - Academic Explorer',
        description: 'The requested academic institution could not be found.',
      };
    }

    const institution = await fetchInstitution(id);
    const name = institution.display_name || `Institution ${institution.id}`;
    
    const location = institution.geo ? ` in ${institution.geo.city || institution.geo.country || ''}` : '';
    const description = `Academic institution: ${name}${location}. ${institution.works_count.toLocaleString()} works, ${institution.cited_by_count.toLocaleString()} citations.`;
    
    return {
      title: `${name} - Academic Explorer`,
      description: description.length > 160 ? `${description.substring(0, 157)}...` : description,
      openGraph: {
        title: name,
        description,
        type: 'website',
      },
      robots: { index: true, follow: true },
    };
  } catch {
    return {
      title: 'Institution - Academic Explorer',
      description: 'View academic institution details and research output',
    };
  }
}

function InstitutionDisplay({ institution }: { institution: Institution }) {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <span className="bg-orange-100 text-orange-800 text-sm font-medium px-2.5 py-0.5 rounded">
            Institution
          </span>
          <span className="text-gray-500 text-sm font-mono">{institution.id}</span>
          {institution.type && (
            <span className="bg-gray-100 text-gray-700 text-sm px-2 py-0.5 rounded capitalize">
              {institution.type}
            </span>
          )}
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900">
          {institution.display_name || 'Unknown Institution'}
        </h1>
        
        {institution.display_name_alternatives && institution.display_name_alternatives.length > 0 && (
          <div className="text-gray-600">
            <span className="text-sm">Also known as: </span>
            {institution.display_name_alternatives.slice(0, 2).join(', ')}
          </div>
        )}
        
        {institution.geo && (
          <div className="text-lg text-gray-700">
            {[institution.geo.city, institution.geo.region, institution.geo.country]
              .filter(Boolean)
              .join(', ')}
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-blue-600">
            {institution.works_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Works</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-green-600">
            {institution.cited_by_count.toLocaleString()}
          </div>
          <div className="text-sm text-gray-600">Citations</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-purple-600">
            {institution.summary_stats.h_index}
          </div>
          <div className="text-sm text-gray-600">h-index</div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border text-center">
          <div className="text-2xl font-bold text-orange-600">
            {institution.summary_stats['2yr_mean_citedness'].toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">2yr Mean</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Institution Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {institution.type && (
            <div>
              <dt className="font-medium text-gray-700">Type</dt>
              <dd className="text-gray-900 capitalize">{institution.type}</dd>
            </div>
          )}
          
          {institution.country_code && (
            <div>
              <dt className="font-medium text-gray-700">Country</dt>
              <dd className="text-gray-900">{institution.country_code}</dd>
            </div>
          )}
          
          {institution.ror && (
            <div>
              <dt className="font-medium text-gray-700">ROR ID</dt>
              <dd className="text-gray-900 font-mono">{institution.ror}</dd>
            </div>
          )}
          
          {institution.geo?.latitude && institution.geo?.longitude && (
            <div>
              <dt className="font-medium text-gray-700">Coordinates</dt>
              <dd className="text-gray-900 font-mono">
                {institution.geo.latitude.toFixed(4)}, {institution.geo.longitude.toFixed(4)}
              </dd>
            </div>
          )}
        </div>
      </div>

      {institution.topics && institution.topics.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Research Areas</h2>
          <div className="flex flex-wrap gap-2">
            {institution.topics.slice(0, 10).map((topic) => (
              <span
                key={topic.id}
                className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-sm"
              >
                {topic.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">External Links</h2>
        <div className="space-y-2">
          {institution.homepage_url && (
            <a href={institution.homepage_url} target="_blank" rel="noopener noreferrer" 
               className="block text-blue-600 hover:underline">
              Institution Homepage
            </a>
          )}
          
          {institution.ror && (
            <a href={`https://ror.org/${institution.ror}`} target="_blank" rel="noopener noreferrer"
               className="block text-orange-600 hover:underline">
              ROR Profile
            </a>
          )}
          
          <a href={`https://openalex.org/${institution.id}`} target="_blank" rel="noopener noreferrer"
             className="block text-gray-600 hover:underline">
            View on OpenAlex
          </a>
        </div>
      </div>
    </div>
  );
}

export default async function InstitutionsPage({ params }: InstitutionPageProps) {
  const { id } = await params;

  if (!validateEntityId(id, EntityType.INSTITUTION) && !/^\d+$/.test(id)) {
    notFound();
  }

  try {
    const institution = await fetchInstitution(id);

    return (
      <EntityErrorBoundary entityType="institutions" entityId={id}>
        <Suspense fallback={<EntityPageSkeleton />}>
          <InstitutionDisplay institution={institution} />
        </Suspense>
      </EntityErrorBoundary>
    );
  } catch (error) {
    console.error('Error in institutions page:', error);
    notFound();
  }
}

