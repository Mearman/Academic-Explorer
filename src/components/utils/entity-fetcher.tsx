/* eslint-disable react-refresh/only-export-components */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { normaliseEntityId, validateEntityId, EntityType as DetectionEntityType } from '@/lib/openalex/utils/entity-detection';
import { openAlex } from '@/lib/openalex';
import type { EntityFetcherProps, DataState, EntityType, OpenAlexEntity } from '../types';

/**
 * Client-side entity data fetcher with caching and error handling
 * Designed for use with static Next.js exports where server-side data fetching is not available
 */
export function EntityFetcher<T extends OpenAlexEntity = OpenAlexEntity>({
  entityId,
  entityType,
  onData,
  onError,
  children,
}: EntityFetcherProps<T>) {
  const [state, setState] = useState<DataState<T>>({
    loading: true,
    error: undefined,
    data: undefined,
    lastFetched: undefined,
  });

  const fetchEntity = useCallback(async () => {
    if (!entityId) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'No entity ID provided',
      }));
      return;
    }

    // Validate entity ID format - convert string to enum value
    const detectionEntityType = Object.values(DetectionEntityType).find(type => type === entityType);
    if (!validateEntityId(entityId, detectionEntityType) && !/^\d+$/.test(entityId)) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Invalid entity ID format: ${entityId}`,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const normalisedId = normaliseEntityId(entityId, detectionEntityType);
      const response = await fetchFromApi(entityType, normalisedId);
      
      if (!response) {
        throw new Error(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found: ${normalisedId}`);
      }

      const newState: DataState<T> = {
        data: response as T,
        loading: false,
        error: undefined,
        lastFetched: new Date(),
      };

      setState(newState);
      onData?.(response as T);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const newState: DataState<T> = {
        ...state,
        loading: false,
        error: errorMessage,
        lastFetched: new Date(),
      };
      
      setState(newState);
      onError?.(errorMessage);
    }
  }, [entityId, entityType, onData, onError, state]);

  // Initial fetch
  useEffect(() => {
    fetchEntity();
  }, [fetchEntity]);

  // Retry function
  const retry = useCallback(() => {
    fetchEntity();
  }, [fetchEntity]);

  // Enhanced state with retry function
  const enhancedState = {
    ...state,
    retry,
  };

  return children(enhancedState);
}

// Helper function to get API endpoint from entity type

// Helper function to fetch from appropriate API endpoint
async function fetchFromApi(entityType: EntityType, id: string): Promise<OpenAlexEntity | null> {
  switch (entityType) {
    case 'work':
      return await openAlex.work(id);
    case 'author':
      return await openAlex.author(id);
    case 'source':
      return await openAlex.source(id);
    case 'institution':
      return await openAlex.institution(id);
    case 'publisher':
      return await openAlex.publisher(id);
    case 'funder':
      return await openAlex.funder(id);
    case 'topic':
      return await openAlex.topic(id);
    case 'concept':
      return await openAlex.concept(id);
    case 'keyword':
      return await openAlex.keyword(id);
    case 'continent':
      return await openAlex.continent(id);
    case 'region':
      return await openAlex.region(id);
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

/**
 * Hook version of EntityFetcher for more convenient usage
 */
export function useEntityData<T extends OpenAlexEntity = OpenAlexEntity>(
  entityId: string,
  entityType: EntityType
): DataState<T> & { retry: () => void } {
  const [state, setState] = useState<DataState<T> & { retry: () => void }>({
    loading: true,
    error: undefined,
    data: undefined,
    lastFetched: undefined,
    retry: () => {},
  });

  const fetchEntity = useCallback(async () => {
    if (!entityId) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'No entity ID provided',
      }));
      return;
    }

    // Validate entity ID format - convert string to enum value
    const detectionEntityType = Object.values(DetectionEntityType).find(type => type === entityType);
    if (!validateEntityId(entityId, detectionEntityType) && !/^\d+$/.test(entityId)) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Invalid entity ID format: ${entityId}`,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: undefined }));

    try {
      const normalisedId = normaliseEntityId(entityId, detectionEntityType);
      const response = await fetchFromApi(entityType, normalisedId);
      
      if (!response) {
        throw new Error(`${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found: ${normalisedId}`);
      }

      setState(prev => ({
        ...prev,
        data: response as T,
        loading: false,
        error: undefined,
        lastFetched: new Date(),
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        lastFetched: new Date(),
      }));
    }
  }, [entityId, entityType]);

  const retry = useCallback(() => {
    fetchEntity();
  }, [fetchEntity]);

  useEffect(() => {
    setState(prev => ({ ...prev, retry }));
  }, [retry]);

  useEffect(() => {
    fetchEntity();
  }, [fetchEntity]);

  return state;
}

/**
 * Higher-order component for wrapping components with entity data fetching
 * 
 * Note: Currently commented out due to complex TypeScript generic constraints
 * that would require type coercion to resolve. This function is not used in
 * the main application and can be re-implemented if needed with proper types.
 */
/*
export function withEntityData<P extends { entity: OpenAlexEntity }>(
  WrappedComponent: React.ComponentType<P>,
  entityType: EntityType
) {
  return function EntityDataWrapper(props: Omit<P, 'entity'> & { entityId: string }) {
    const { entityId, ...restProps } = props;
    
    return (
      <EntityFetcher entityId={entityId} entityType={entityType}>
        {({ data, loading, error, retry }) => {
          if (loading) {
            return <div>Loading {entityType}...</div>;
          }
          
          if (error) {
            return (
              <div>
                <p>Error loading {entityType}: {error}</p>
                <button onClick={retry}>Retry</button>
              </div>
            );
          }
          
          if (!data) {
            return <div>No {entityType} data available</div>;
          }
          
          // Type-safe props spreading without coercion
          const propsWithEntity = { ...restProps, entity: data };
          return <WrappedComponent {...propsWithEntity} />;
        }}
      </EntityFetcher>
    );
  };
}
*/