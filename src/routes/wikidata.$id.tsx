import { IconAlertTriangle } from '@tabler/icons-react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { EntityErrorBoundary } from '@/components';
import { decodeExternalId, parseExternalId, ExternalIdType } from '@/lib/openalex/utils/entity-detection';

function WikidataRedirectLoading({ wikidataId }: { wikidataId: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Looking up Wikidata ID
        </h1>
        <p className="text-gray-600 mb-2">
          Wikidata: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{wikidataId}</span>
        </p>
        <p className="text-sm text-gray-500">
          Determining entity type and redirecting...
        </p>
        <p className="text-xs text-gray-400 mt-2">
          Wikidata IDs can represent any entity type (works, authors, institutions, etc.)
        </p>
      </div>
    </div>
  );
}

function WikidataError({ wikidataId, error }: { wikidataId: string; error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">
          <IconAlertTriangle size={48} />
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid Wikidata ID Format
        </h1>
        <p className="text-gray-600 mb-2">
          Wikidata: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{wikidataId}</span>
        </p>
        <p className="text-sm text-red-600 mb-6">
          {error}
        </p>
        <div className="space-y-3">
          <Link
            to="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors text-center"
          >
            Return to Home
          </Link>
          <p className="text-xs text-gray-500">
            Valid Wikidata format: Q123456
          </p>
        </div>
      </div>
    </div>
  );
}

function WikidataPage() {
  const { id: wikidataId } = Route.useParams();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [state, setState] = useState<{
    status: 'processing' | 'redirecting' | 'error';
    error?: string;
    wikidata?: string;
  }>({ status: 'processing' });

  useEffect(() => {
    if (!wikidataId) {
      setState({
        status: 'error',
        error: 'No Wikidata ID provided'
      });
      return;
    }

    try {
      // Decode the Wikidata ID in case it was URL-encoded
      const decodedWikidata = decodeExternalId(wikidataId);
      
      // Validate the Wikidata format
      const externalIdResult = parseExternalId(decodedWikidata);
      
      if (externalIdResult.idType !== ExternalIdType.WIKIDATA) {
        setState({
          status: 'error',
          wikidata: decodedWikidata,
          error: 'Invalid Wikidata format. Wikidata IDs must start with Q followed by numbers.'
        });
        return;
      }

      setState({
        status: 'redirecting',
        wikidata: decodedWikidata
      });

      // Since Wikidata IDs can represent any entity type, we redirect to the generic
      // entity handler which will use OpenAlex's API to resolve the entity type
      const redirectUrl = `/${encodeURIComponent(decodedWikidata)}`;

      // Perform client-side redirect, preserving search params
      navigate({ to: redirectUrl, search });

    } catch (error) {
      console.error('Error processing Wikidata ID:', error);
      
      let errorMessage = 'Failed to process Wikidata ID';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        status: 'error',
        wikidata: wikidataId,
        error: errorMessage
      });
    }
  }, [wikidataId, navigate, search]);

  // Show appropriate UI based on state
  if (state.status === 'error') {
    return (
      <EntityErrorBoundary entityType="wikidata">
        <WikidataError wikidataId={state.wikidata || wikidataId || 'unknown'} error={state.error || 'Unknown error'} />
      </EntityErrorBoundary>
    );
  }

  // Show processing/redirecting state
  return (
    <EntityErrorBoundary entityType="wikidata">
      <WikidataRedirectLoading wikidataId={state.wikidata || wikidataId || 'unknown'} />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/wikidata/$id')({
  component: WikidataPage,
});