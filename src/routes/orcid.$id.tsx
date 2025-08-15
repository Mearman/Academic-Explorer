import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { EntityErrorBoundary } from '@/components';
import { decodeExternalId, parseExternalId, ExternalIdType } from '@/lib/openalex/utils/entity-detection';

function ORCIDRedirectLoading({ orcid }: { orcid: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Looking up ORCID
        </h1>
        <p className="text-gray-600 mb-2">
          ORCID: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{orcid}</span>
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to author page...
        </p>
      </div>
    </div>
  );
}

function ORCIDError({ orcid, error }: { orcid: string; error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid ORCID Format
        </h1>
        <p className="text-gray-600 mb-2">
          ORCID: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{orcid}</span>
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
            Valid ORCID format: 0000-0000-0000-0000
          </p>
        </div>
      </div>
    </div>
  );
}

function ORCIDPage() {
  const { id: orcidId } = Route.useParams();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [state, setState] = useState<{
    status: 'processing' | 'redirecting' | 'error';
    error?: string;
    orcid?: string;
  }>({ status: 'processing' });

  useEffect(() => {
    if (!orcidId) {
      setState({
        status: 'error',
        error: 'No ORCID ID provided'
      });
      return;
    }

    try {
      // Decode the ORCID in case it was URL-encoded
      const decodedORCID = decodeExternalId(orcidId);
      
      // Validate the ORCID format
      const externalIdResult = parseExternalId(decodedORCID);
      
      if (externalIdResult.idType !== ExternalIdType.ORCID) {
        setState({
          status: 'error',
          orcid: decodedORCID,
          error: 'Invalid ORCID format. ORCIDs must be in format 0000-0000-0000-0000.'
        });
        return;
      }

      setState({
        status: 'redirecting',
        orcid: decodedORCID
      });

      // Build the redirect URL - OpenAlex can handle ORCIDs directly
      const redirectUrl = `/authors/${encodeURIComponent(decodedORCID)}`;

      // Perform client-side redirect, preserving search params
      navigate({ to: redirectUrl, search });

    } catch (error) {
      console.error('Error processing ORCID:', error);
      
      let errorMessage = 'Failed to process ORCID';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        status: 'error',
        orcid: orcidId,
        error: errorMessage
      });
    }
  }, [orcidId, navigate, search]);

  // Show appropriate UI based on state
  if (state.status === 'error') {
    return (
      <EntityErrorBoundary entityType="orcid">
        <ORCIDError orcid={state.orcid || orcidId || 'unknown'} error={state.error || 'Unknown error'} />
      </EntityErrorBoundary>
    );
  }

  // Show processing/redirecting state
  return (
    <EntityErrorBoundary entityType="orcid">
      <ORCIDRedirectLoading orcid={state.orcid || orcidId || 'unknown'} />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/orcid/$id')({
  component: ORCIDPage,
});