/**
 * Comprehensive error handling components for entity pages
 * Provides user-friendly error messages and retry functionality
 * for client-side entity data fetching
 */

'use client';

import { Link } from '@tanstack/react-router';
import { EntityErrorType } from '@/hooks/use-entity-data';
import { EntityType } from '@/lib/openalex/utils/entity-detection';

/**
 * Props for entity error components
 */
export interface EntityErrorProps {
  error: Error | EntityErrorType | unknown;
  onRetry: () => void;
  entityId: string;
  entityType?: EntityType;
}

/**
 * Type guard to check if an error has a type property
 */
function hasErrorType(error: unknown): error is { type: EntityErrorType } {
  return error !== null && typeof error === 'object' && 'type' in error;
}

/**
 * Get user-friendly error messages based on error type and entity type
 */
function getErrorDetails(error: Error | EntityErrorType | unknown, entityId: string, entityType?: EntityType) {
  const entityName = entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : 'Entity';
  const entityIdExample = getEntityIdExample(entityType);
  
  if (error === EntityErrorType.INVALID_ID || (hasErrorType(error) && error.type === EntityErrorType.INVALID_ID)) {
    return {
      title: `Invalid ${entityName} ID`,
      message: `The ${entityType || 'entity'} ID "${entityId}" is not in a valid format. Please ensure you're using a correct OpenAlex ${entityType || 'entity'} ID (e.g., ${entityIdExample}).`,
      showRetry: false,
      icon: '❌'
    };
  }
  
  if (error === EntityErrorType.NOT_FOUND || (hasErrorType(error) && error.type === EntityErrorType.NOT_FOUND)) {
    return {
      title: `${entityName} Not Found`,
      message: `The ${entityType || 'entity'} "${entityId}" could not be found. It may have been removed or the ID may be incorrect.`,
      showRetry: false,
      icon: '🔍'
    };
  }
  
  if (error === EntityErrorType.NETWORK_ERROR || (hasErrorType(error) && error.type === EntityErrorType.NETWORK_ERROR)) {
    return {
      title: 'Connection Error',
      message: 'Unable to connect to OpenAlex. Please check your internet connection.',
      showRetry: true,
      icon: '🌐'
    };
  }
  
  if (error === EntityErrorType.TIMEOUT || (hasErrorType(error) && error.type === EntityErrorType.TIMEOUT)) {
    return {
      title: 'Request Timeout',
      message: 'The request took too long to complete. The service may be experiencing high load.',
      showRetry: true,
      icon: '⏱️'
    };
  }
  
  if (error === EntityErrorType.RATE_LIMITED || (hasErrorType(error) && error.type === EntityErrorType.RATE_LIMITED)) {
    return {
      title: 'Rate Limited',
      message: 'Too many requests have been made. Please wait a moment before trying again.',
      showRetry: true,
      icon: '🚦'
    };
  }
  
  return {
    title: `Error Loading ${entityName}`,
    message: error instanceof Error ? error.message : `An unexpected error occurred while loading the ${entityType || 'entity'}.`,
    showRetry: true,
    icon: '⚠️'
  };
}

/**
 * Get example entity ID for error messages
 */
function getEntityIdExample(entityType?: EntityType): string {
  switch (entityType) {
    case EntityType.WORK:
      return 'W123456789';
    case EntityType.AUTHOR:
      return 'A123456789';
    case EntityType.SOURCE:
      return 'S123456789';
    case EntityType.INSTITUTION:
      return 'I123456789';
    case EntityType.PUBLISHER:
      return 'P123456789';
    case EntityType.FUNDER:
      return 'F123456789';
    case EntityType.TOPIC:
      return 'T123456789';
    case EntityType.CONCEPT:
      return 'C123456789';
    case EntityType.KEYWORD:
      return 'K123456789';
    case EntityType.CONTINENT:
      return 'N123456789';
    case EntityType.REGION:
      return 'R123456789';
    default:
      return 'X123456789';
  }
}

/**
 * Main entity error display component
 */
export function EntityError({ error, onRetry, entityId, entityType }: EntityErrorProps) {
  const { title, message, showRetry, icon } = getErrorDetails(error, entityId, entityType);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-4">{icon}</div>
        <h1 className="text-xl font-semibold text-red-800 mb-3">{title}</h1>
        <p className="text-red-700 mb-6 max-w-md mx-auto">{message}</p>
        
        {/* Entity ID display */}
        <div className="bg-red-100 rounded-md p-3 mb-6 inline-block">
          <span className="text-sm text-red-600 font-medium">Entity ID: </span>
          <code className="text-red-800 font-mono bg-red-200 px-2 py-1 rounded text-sm">
            {entityId}
          </code>
        </div>
        
        <div className="space-y-3">
          {showRetry && (
            <button
              onClick={onRetry}
              className="bg-red-600 text-white px-6 py-3 rounded-md hover:bg-red-700 transition-colors font-medium"
            >
              Try Again
            </button>
          )}
          
          <div className="flex justify-center space-x-4 text-sm">
            <Link
              to="/"
              className="text-red-600 hover:text-red-800 underline font-medium"
            >
              Return to Home
            </Link>
            
            {entityType && (
              <Link
                to="/"
                search={{ q: entityType }}
                className="text-red-600 hover:text-red-800 underline font-medium"
              >
                Search {entityType.charAt(0).toUpperCase() + entityType.slice(1)}s
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact entity error component for smaller spaces
 */
export function CompactEntityError({ error, onRetry, entityId, entityType }: EntityErrorProps) {
  const { title, message, showRetry, icon } = getErrorDetails(error, entityId, entityType);

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center max-w-md mx-auto">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-red-800 mb-2">{title}</h3>
      <p className="text-sm text-red-700 mb-4">{message}</p>
      
      {showRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Generic loading skeleton that adapts to different entity types
 */
export function EntitySkeleton({ entityType }: { entityType?: EntityType }) {
  const isAuthor = entityType === EntityType.AUTHOR;
  const isWork = entityType === EntityType.WORK;
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 animate-pulse">
      {/* Header skeleton */}
      <header className="space-y-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gray-200 h-6 w-16 rounded"></div>
          <div className="bg-gray-200 h-4 w-32 rounded"></div>
          {(isAuthor || isWork) && <div className="bg-gray-200 h-6 w-16 rounded"></div>}
        </div>
        <div className="bg-gray-200 h-8 w-3/4 rounded"></div>
        {isAuthor && <div className="bg-gray-200 h-4 w-1/2 rounded"></div>}
        {isAuthor && <div className="bg-gray-200 h-6 w-1/3 rounded"></div>}
        {isWork && (
          <div className="flex flex-wrap gap-2">
            <div className="bg-gray-200 h-4 w-12 rounded"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-4 w-24 rounded"></div>
            ))}
          </div>
        )}
      </header>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border">
            <div className="bg-gray-200 h-8 w-16 mx-auto rounded mb-2"></div>
            <div className="bg-gray-200 h-4 w-20 mx-auto rounded"></div>
          </div>
        ))}
      </div>

      {/* Content sections skeleton */}
      <div className="space-y-6">
        {[...Array(isAuthor ? 5 : isWork ? 4 : 3)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border space-y-4">
            <div className="bg-gray-200 h-6 w-1/4 rounded"></div>
            <div className="space-y-2">
              <div className="bg-gray-200 h-4 w-full rounded"></div>
              <div className="bg-gray-200 h-4 w-3/4 rounded"></div>
              {(isAuthor && i === 2) && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {[...Array(6)].map((_, j) => (
                    <div key={j} className="bg-gray-200 h-6 w-20 rounded-full"></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Fallback component for when no data is available
 */
export function EntityFallback({ 
  onRetry, 
  entityId, 
  entityType 
}: { 
  onRetry: () => void; 
  entityId: string; 
  entityType?: EntityType; 
}) {
  const entityName = entityType ? entityType.charAt(0).toUpperCase() + entityType.slice(1) : 'Entity';
  
  return (
    <div className="max-w-4xl mx-auto p-6 text-center">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-8">
        <div className="text-4xl mb-4">📄</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-3">
          No {entityName} Data Available
        </h2>
        <p className="text-gray-600 mb-6">
          Unable to load data for {entityType || 'entity'} <code className="bg-gray-200 px-2 py-1 rounded font-mono text-sm">{entityId}</code>
        </p>
        <button
          onClick={onRetry}
          className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Try Again
        </button>
        <div className="mt-4">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper function to get entity endpoint
 */
function getEntityEndpoint(entityType: EntityType): string {
  switch (entityType) {
    case EntityType.WORK:
      return 'works';
    case EntityType.AUTHOR:
      return 'authors';
    case EntityType.SOURCE:
      return 'sources';
    case EntityType.INSTITUTION:
      return 'institutions';
    case EntityType.PUBLISHER:
      return 'publishers';
    case EntityType.FUNDER:
      return 'funders';
    case EntityType.TOPIC:
      return 'topics';
    case EntityType.CONCEPT:
      return 'concepts';
    case EntityType.KEYWORD:
      return 'keywords';
    case EntityType.CONTINENT:
      return 'continents';
    case EntityType.REGION:
      return 'regions';
    default:
      return 'entities';
  }
}