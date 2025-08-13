
export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { decodeExternalId, parseExternalId, ExternalIdType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';

function ISSNRedirectLoading({ issn }: { issn: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Looking up ISSN-L
        </h1>
        <p className="text-gray-600 mb-2">
          ISSN-L: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{issn}</span>
        </p>
        <p className="text-sm text-gray-500">
          Redirecting to source page...
        </p>
      </div>
    </div>
  );
}

function ISSNError({ issn, error }: { issn: string; error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid ISSN-L Format
        </h1>
        <p className="text-gray-600 mb-2">
          ISSN-L: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{issn}</span>
        </p>
        <p className="text-sm text-red-600 mb-6">
          {error}
        </p>
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
          <p className="text-xs text-gray-500">
            Valid ISSN-L format: 1234-5678
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ISSNPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const issnId = params?.id as string;

  const [state, setState] = useState<{
    status: 'processing' | 'redirecting' | 'error';
    error?: string;
    issn?: string;
  }>({ status: 'processing' });

  useEffect(() => {
    if (!issnId) {
      setState({
        status: 'error',
        error: 'No ISSN-L ID provided'
      });
      return;
    }

    try {
      // Decode the ISSN-L in case it was URL-encoded
      const decodedISSN = decodeExternalId(issnId);
      
      // Validate the ISSN-L format
      const externalIdResult = parseExternalId(decodedISSN);
      
      if (externalIdResult.idType !== ExternalIdType.ISSN_L) {
        setState({
          status: 'error',
          issn: decodedISSN,
          error: 'Invalid ISSN-L format. ISSN-L must be in format 1234-5678.'
        });
        return;
      }

      setState({
        status: 'redirecting',
        issn: decodedISSN
      });

      // Build the redirect URL - OpenAlex can handle ISSN-L directly
      const searchParamsString = searchParams?.toString();
      const redirectUrl = `/sources/${encodeURIComponent(decodedISSN)}${
        searchParamsString ? `?${searchParamsString}` : ''
      }`;

      // Perform client-side redirect
      router.replace(redirectUrl);

    } catch (error) {
      console.error('Error processing ISSN-L:', error);
      
      let errorMessage = 'Failed to process ISSN-L';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState({
        status: 'error',
        issn: issnId,
        error: errorMessage
      });
    }
  }, [issnId, router, searchParams]);

  // Show appropriate UI based on state
  if (state.status === 'error') {
    return (
      <EntityErrorBoundary entityType="issn">
        <ISSNError issn={state.issn || issnId} error={state.error || 'Unknown error'} />
      </EntityErrorBoundary>
    );
  }

  // Show processing/redirecting state
  return (
    <EntityErrorBoundary entityType="issn">
      <ISSNRedirectLoading issn={state.issn || issnId} />
    </EntityErrorBoundary>
  );
}

