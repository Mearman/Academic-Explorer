import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect } from 'react';
import { parseEntityIdentifier, EntityType } from '@/lib/openalex/utils/entity-detection';
import { EntityErrorBoundary } from '@/components';
// import { EntityPageTemplate } from '@/components'; // Unused - simple div used instead
import type { OpenAlexEntity } from '@/components/types';

/**
 * Universal catch-all route for handling all entity patterns under /entity/
 * This route catches any URL under /entity/ that doesn't match explicit routes
 * and attempts to resolve it as an OpenAlex entity
 * 
 * Examples:
 * - /entity/W123456 → Work entity
 * - /entity/A123456 → Author entity  
 * - /entity/10.1234/example → DOI resolution
 * - /entity/0000-0002-1825-0097 → ORCID resolution
 */

function getEntityTypeFromPath(splat: string): { entityType: EntityType; entityId: string } | null {
  if (!splat) return null;
  
  try {
    // Try to parse as entity identifier
    const result = parseEntityIdentifier(splat);
    if (result && result.type && result.id) {
      return {
        entityType: result.type,
        entityId: result.id
      };
    }
  } catch (error) {
    console.error('Error parsing entity identifier:', error);
  }
  
  return null;
}

function _renderEntityData(entityType: EntityType) {
  const EntityRenderer = (data: OpenAlexEntity) => {
    // Generic renderer for the catch-all route
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <header className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2.5 py-0.5 rounded capitalize">
              {entityType}
            </span>
            <span className="text-gray-500 text-sm font-mono">{data.id}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{data.display_name || `${entityType} ${data.id}`}</h1>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {'works_count' in data && (
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-blue-600">{data.works_count.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Works</div>
            </div>
          )}
          {'cited_by_count' in data && (
            <div className="bg-white p-4 rounded-lg border text-center">
              <div className="text-2xl font-bold text-green-600">{data.cited_by_count.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Citations</div>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Entity Information</h2>
          <div className="space-y-2 text-sm">
            <div><strong>ID:</strong> {data.id}</div>
            <div><strong>Type:</strong> <span className="capitalize">{entityType}</span></div>
            <div><strong>Display Name:</strong> {data.display_name}</div>
          </div>
          <div className="mt-4">
            <a 
              href={`https://openalex.org/${data.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              View on OpenAlex →
            </a>
          </div>
        </div>
      </div>
    );
  };
  
  return EntityRenderer;
}

function EntityCatchAllPage() {
  const { _splat } = Route.useParams();
  
  // Attempt to detect entity type from the path
  const entityInfo = _splat ? getEntityTypeFromPath(_splat) : null;

  useEffect(() => {
    // Log for debugging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Entity catch-all route params:', { _splat, entityInfo });
    }
  }, [_splat, entityInfo]);

  // If we couldn't detect an entity, show error
  if (!entityInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Invalid Entity Path
          </h1>
          <p className="text-gray-600 mb-4">
            Could not resolve: <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              /entity/{_splat || ''}
            </span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Please check the entity ID format and try again.
          </p>
          <Link 
            to="/"
            className="inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // Generic entity handler - redirect to specific entity routes
  return (
    <EntityErrorBoundary entityType={entityInfo.entityType} entityId={entityInfo.entityId}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Entity Found</h2>
          <p>Detected {entityInfo.entityType} entity: {entityInfo.entityId}</p>
          <Link
            to="/"
            className="inline-block mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/entity/$')({
  component: EntityCatchAllPage,
});