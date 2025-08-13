import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { decodeExternalId, parseExternalId, ExternalIdType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';

function DOIRedirectLoading({ doi }: { doi: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Looking up DOI
        </h1>
        <p className="text-gray-600 mb-2">
          DOI: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded break-all">{doi}</span>
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to work page...
        </p>
      </div>
    </div>
  );
}

function DOIError({ doi, error }: { doi: string; error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid DOI Format
        </h1>
        <p className="text-gray-600 mb-2">
          DOI: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded break-all">{doi}</span>
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
            Valid DOI format: 10.1234/example.doi
          </p>
        </div>
      </div>
    </div>
  );
}

function DOIPage() {
  const { path } = Route.useParams();
  const navigate = useNavigate();
  const search = Route.useSearch();
  
  const [state, setState] = useState<{
    status: 'processing' | 'redirecting' | 'error';
    error?: string;
    doi?: string;
  }>({ status: 'processing' });

  useEffect(() => {
    if (!path) {
      setState({
        status: 'error',
        error: 'No DOI path provided'
      });
      return;
    }

    try {
      // Decode the path in case it was URL-encoded
      const decodedPath = decodeExternalId(path);
      
      // Reconstruct potential DOI
      // Handle both formats: "10.1234/example" and just "1234/example" (assuming 10. prefix)
      let candidateDOI = decodedPath;
      if (!candidateDOI.startsWith('10.')) {
        candidateDOI = `10.${candidateDOI}`;
      }

      // Validate the DOI format
      const externalIdResult = parseExternalId(candidateDOI);
      
      if (externalIdResult.idType !== ExternalIdType.DOI) {
        setState({
          status: 'error',
          doi: candidateDOI,
          error: 'Invalid DOI format. DOIs must start with 10. and contain a slash.'
        });
        return;
      }

      setState({
        status: 'redirecting',
        doi: candidateDOI
      });

      // Build the redirect URL - OpenAlex can handle DOIs directly
      const redirectUrl = `/works/${encodeURIComponent(candidateDOI)}`;

      // Perform client-side redirect, preserving search params
      navigate({ to: redirectUrl, search });

    } catch (error) {
      console.error('Error processing DOI:', error);
      
      let errorMessage = 'Failed to process DOI';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        status: 'error',
        doi: path,
        error: errorMessage
      });
    }
  }, [path, navigate, search]);

  // Show appropriate UI based on state
  if (state.status === 'error') {
    return (
      <EntityErrorBoundary entityType="doi">
        <DOIError doi={state.doi || path || 'unknown'} error={state.error || 'Unknown error'} />
      </EntityErrorBoundary>
    );
  }

  // Show processing/redirecting state
  return (
    <EntityErrorBoundary entityType="doi">
      <DOIRedirectLoading doi={state.doi || path || 'unknown'} />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/doi/$path')({
  component: DOIPage,
});