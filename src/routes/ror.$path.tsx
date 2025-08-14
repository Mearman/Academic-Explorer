import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { decodeExternalId, parseExternalId, ExternalIdType } from '@/lib/openalex/utils/entity-detection';
import { EntityErrorBoundary } from '@/components';

function RORRedirectLoading({ ror }: { ror: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Looking up ROR ID
        </h1>
        <p className="text-gray-600 mb-2">
          ROR: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded break-all">{ror}</span>
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to institution page...
        </p>
      </div>
    </div>
  );
}

function RORError({ ror, error }: { ror: string; error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid ROR Format
        </h1>
        <p className="text-gray-600 mb-2">
          ROR: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded break-all">{ror}</span>
        </p>
        <p className="text-sm text-red-600 mb-6">
          {error}
        </p>
        <div className="space-y-3">
          <a
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </a>
          <p className="text-xs text-gray-500">
            Valid ROR formats: https://ror.org/04gyf1771 or 04gyf1771
          </p>
        </div>
      </div>
    </div>
  );
}

function RORPage() {
  const { path } = Route.useParams();
  const navigate = useNavigate();
  const search = Route.useSearch();
  
  const [state, setState] = useState<{
    status: 'processing' | 'redirecting' | 'error';
    error?: string;
    ror?: string;
  }>({ status: 'processing' });

  useEffect(() => {
    if (!path) {
      setState({
        status: 'error',
        error: 'No ROR path provided'
      });
      return;
    }

    try {
      // Decode the path in case it was URL-encoded
      const decodedPath = decodeExternalId(path);
      
      // Reconstruct potential ROR
      let candidateROR = decodedPath;
      
      // Handle both full URL format and just the ID
      if (candidateROR.includes('ror.org/')) {
        // It's a full ROR URL, validate as is
      } else {
        // It's just the ROR ID, create the full URL for validation
        candidateROR = `https://ror.org/${candidateROR}`;
      }

      // Validate the ROR format
      const externalIdResult = parseExternalId(candidateROR);
      
      if (externalIdResult.idType !== ExternalIdType.ROR) {
        setState({
          status: 'error',
          ror: candidateROR,
          error: 'Invalid ROR format. ROR IDs must be valid ROR.org URLs or IDs.'
        });
        return;
      }

      setState({
        status: 'redirecting',
        ror: candidateROR
      });

      // Build the redirect URL - OpenAlex can handle ROR URLs directly
      const redirectUrl = `/institutions/${encodeURIComponent(candidateROR)}`;

      // Perform client-side redirect, preserving search params
      navigate({ to: redirectUrl, search });

    } catch (error) {
      console.error('Error processing ROR:', error);
      
      let errorMessage = 'Failed to process ROR ID';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        status: 'error',
        ror: path,
        error: errorMessage
      });
    }
  }, [path, navigate, search]);

  // Show appropriate UI based on state
  if (state.status === 'error') {
    return (
      <EntityErrorBoundary entityType="ror">
        <RORError ror={state.ror || path || 'unknown'} error={state.error || 'Unknown error'} />
      </EntityErrorBoundary>
    );
  }

  // Show processing/redirecting state
  return (
    <EntityErrorBoundary entityType="ror">
      <RORRedirectLoading ror={state.ror || path || 'unknown'} />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/ror/$path')({
  component: RORPage,
});