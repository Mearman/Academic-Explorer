/**
 * Generic entity page template for client-side rendering
 * Provides consistent error handling, loading states, and data fetching patterns
 * for all OpenAlex entity types in static export mode
 */

'use client';

import { useParams } from 'next/navigation';
import { ReactNode } from 'react';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import EntityErrorBoundary from '@/components/error-boundary';
import { useEntityData, EntityData } from '@/hooks/use-entity-data';
import { EntityError, EntitySkeleton, EntityFallback } from '@/components/entity-error';

/**
 * Props for the entity page template
 */
export interface EntityPageTemplateProps {
  /** The entity type being displayed */
  entityType: EntityType;
  /** Component to render when data is successfully loaded */
  renderEntity: (data: EntityData) => ReactNode;
  /** Optional custom loading component */
  renderLoading?: () => ReactNode;
  /** Optional custom error component */
  renderError?: (error: Error | unknown, retry: () => void, entityId: string) => ReactNode;
  /** Optional custom fallback component */
  renderFallback?: (retry: () => void, entityId: string) => ReactNode;
  /** Optional hook options */
  hookOptions?: {
    refetchOnWindowFocus?: boolean;
    staleTime?: number;
    maxRetries?: number;
    onError?: (error: Error | unknown) => void;
    onSuccess?: (data: EntityData) => void;
  };
}

/**
 * Generic entity page template component
 * 
 * @example
 * ```typescript
 * export default function WorksPage() {
 *   return (
 *     <EntityPageTemplate
 *       entityType={EntityType.WORK}
 *       renderEntity={(work) => <WorkDisplay work={work} />}
 *     />
 *   );
 * }
 * ```
 */
export function EntityPageTemplate({
  entityType,
  renderEntity,
  renderLoading,
  renderError,
  renderFallback,
  hookOptions = {}
}: EntityPageTemplateProps) {
  const params = useParams();
  const entityId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  // Set up default hook options
  const defaultOptions = {
    enabled: !!entityId,
    refetchOnWindowFocus: true,
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (error: Error | unknown) => {
      console.error(`${entityType} fetch error:`, error);
    },
    ...hookOptions
  };

  const { 
    data, 
    loading, 
    error, 
    retry 
  } = useEntityData(entityId || '', entityType, defaultOptions);

  // Handle missing entity ID
  if (!entityId) {
    return (
      <EntityErrorBoundary entityType={entityType} entityId="unknown">
        {renderFallback ? renderFallback(() => {}, "unknown") : <EntityFallback onRetry={() => {}} entityId="unknown" entityType={entityType} />}
      </EntityErrorBoundary>
    );
  }

  // Show loading state
  if (loading) {
    return (
      <EntityErrorBoundary entityType={entityType} entityId={entityId}>
        {renderLoading ? renderLoading() : <EntitySkeleton entityType={entityType} />}
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType={entityType} entityId={entityId}>
        {renderError ? (
          renderError(error, retry, entityId)
        ) : (
          <EntityError 
            error={error} 
            onRetry={retry} 
            entityId={entityId} 
            entityType={entityType}
          />
        )}
      </EntityErrorBoundary>
    );
  }

  // Show entity data
  if (data) {
    return (
      <EntityErrorBoundary entityType={entityType} entityId={entityId}>
        {renderEntity(data)}
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType={entityType} entityId={entityId}>
      {renderFallback ? (
        renderFallback(retry, entityId)
      ) : (
        <EntityFallback 
          onRetry={retry} 
          entityId={entityId} 
          entityType={entityType}
        />
      )}
    </EntityErrorBoundary>
  );
}

