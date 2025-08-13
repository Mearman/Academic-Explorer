'use client';

export async function generateStaticParams() {
  // Return empty array since we can't pre-generate all possible IDs
  // This allows the route to work with static export but pages will be generated on demand
  return [];
}

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  EntityDetectionError, 
  getEntityEndpoint,
  detectIdType,
  detectEntityType,
  parseExternalId,
  decodeExternalId,
  ExternalIdType
} from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';

function RedirectLoading({ entityId, entityType, idType }: { 
  entityId: string; 
  entityType?: string;
  idType?: 'openalex' | 'external';
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Redirecting to {entityType || 'Entity'}
        </h1>
        <p className="text-gray-600 mb-2">
          {idType === 'external' ? 'External ID' : 'Entity ID'}: 
          <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded ml-2 break-all">
            {entityId}
          </span>
        </p>
        <p className="text-sm text-gray-500">
          {idType === 'external' 
            ? 'Resolving external ID and redirecting...' 
            : 'Taking you to the appropriate page...'
          }
        </p>
      </div>
    </div>
  );
}

function EntityIdError({ entityId, error }: { entityId: string; error: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-600 text-4xl mb-4">⚠️</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-2">
          Invalid Entity ID
        </h1>
        <p className="text-gray-600 mb-2">
          ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{entityId}</span>
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
            Valid formats: W123456789, A987654321, etc.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function GenericEntityPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityId = params?.entityId as string;
  
  const [state, setState] = useState<{
    status: 'detecting' | 'redirecting' | 'error';
    error?: string;
    entityType?: string;
    idType?: 'openalex' | 'external';
  }>({ status: 'detecting' });

  useEffect(() => {
    if (!entityId) {
      setState({ 
        status: 'error', 
        error: 'No entity ID provided' 
      });
      return;
    }

    try {
      // Decode the entity ID in case it was URL-encoded
      const decodedEntityId = decodeExternalId(entityId);
      
      // Detect whether this is an OpenAlex ID or external ID
      const idType = detectIdType(decodedEntityId);
      
      if (idType === ExternalIdType.OPENALEX) {
        // Handle OpenAlex ID - detect entity type from prefix
        const entityType = detectEntityType(decodedEntityId);
        const endpoint = getEntityEndpoint(entityType);
        
        // Extract numeric part for the route
        const numericId = decodedEntityId.replace(/^[A-Za-z]/, '');
        
        setState({ 
          status: 'redirecting', 
          entityType: entityType,
          idType: 'openalex'
        });

        // Build the redirect URL with search parameters
        const searchParamsString = searchParams?.toString();
        const redirectUrl = `/${endpoint}/${numericId}${
          searchParamsString ? `?${searchParamsString}` : ''
        }`;

        // Perform client-side redirect
        router.replace(redirectUrl);
        
      } else {
        // Handle external ID - parse it for more details
        const externalIdResult = parseExternalId(decodedEntityId);
        
        setState({ 
          status: 'redirecting', 
          entityType: externalIdResult.possibleEntityTypes?.[0] || 'Entity',
          idType: 'external'
        });

        // For external IDs, route to the appropriate endpoint based on expected type
        let redirectUrl: string;
        const searchParamsString = searchParams?.toString();
        
        if (externalIdResult.possibleEntityTypes && externalIdResult.possibleEntityTypes.length === 1) {
          const endpoint = getEntityEndpoint(externalIdResult.possibleEntityTypes[0]);
          // Pass the original external ID to the specific entity endpoint
          redirectUrl = `/${endpoint}/${encodeURIComponent(decodedEntityId)}${
            searchParamsString ? `?${searchParamsString}` : ''
          }`;
        } else {
          // For ambiguous external IDs (like Wikidata), pass them through as is
          // The OpenAlex API will resolve them
          redirectUrl = `/${encodeURIComponent(decodedEntityId)}${
            searchParamsString ? `?${searchParamsString}` : ''
          }`;
        }

        // Perform client-side redirect
        router.replace(redirectUrl);
      }
    } catch (error) {
      console.error('Error in generic entity page:', error);
      
      let errorMessage = 'Failed to process ID';
      if (error instanceof EntityDetectionError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setState({ 
        status: 'error', 
        error: errorMessage 
      });
    }
  }, [entityId, router, searchParams]);

  // Show appropriate UI based on state
  if (state.status === 'error') {
    return (
      <EntityErrorBoundary entityType="entity">
        <EntityIdError entityId={entityId || 'unknown'} error={state.error || 'Unknown error'} />
      </EntityErrorBoundary>
    );
  }

  // Show loading/redirecting state
  return (
    <EntityErrorBoundary entityType="entity">
      <RedirectLoading 
        entityId={entityId} 
        entityType={state.entityType} 
        idType={state.idType}
      />
    </EntityErrorBoundary>
  );
}

