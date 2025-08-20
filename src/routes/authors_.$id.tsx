import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { AuthorDisplay } from '@/components/entity-displays/AuthorDisplay';
import { useAuthorData } from '@/hooks/use-entity-data';
import { useEntityGraphTracking } from '@/hooks/use-entity-graph-tracking';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType } from '@/lib/openalex/utils/entity-detection';
import { useEntityGraphStore } from '@/stores/entity-graph-store';

function AuthorPage() {
  const { id } = Route.useParams();
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  console.log('[AuthorPage] TESTING WITHOUT COMPLEX HOOKS - ID:', id);
  
  // Re-enabling useEntityGraphStore to test if this causes the 'logs' error
  const { isHydrated } = useEntityGraphStore();
  // const isHydrated = true; // Mock for now
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.AUTHOR);
  
  // Re-enabling useEntityGraphTracking to test if this causes the 'logs' error
  const graphTracking = useEntityGraphTracking({
    autoTrack: true,
    extractRelationships: true,
  });
  const {trackEntityData} = graphTracking;
  // const trackEntityData = null; // Mock for now
  
  // Use the author data hook directly with the ID (no complex processing)
  const authorIdToPass = id && !isRedirecting ? id : null;
  const { data: author, loading, error, retry } = useAuthorData({
    authorId: authorIdToPass
  });
  
  console.log('[AuthorPage] Loading state:', { loading, hasAuthor: !!author, hasError: !!error });
  
  // Add timeout protection to prevent infinite loading
  useEffect(() => {
    if (loading && id && !isRedirecting) {
      // Clear any existing timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
      
      // Set a 30-second timeout for loading
      loadingTimeoutRef.current = setTimeout(() => {
        console.warn(`[AuthorPage] Loading timeout exceeded for ${id}. This may indicate an infinite loading state.`);
        
        // Force a retry after timeout to attempt recovery
        if (loading && !error) {
          console.log(`[AuthorPage] Forcing retry after timeout for ${id}`);
          retry().catch((retryError) => {
            console.error(`[AuthorPage] Retry after timeout failed for ${id}:`, retryError);
          });
        }
      }, 30000); // 30 seconds
    } else {
      // Clear timeout if no longer loading
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [loading, id, isRedirecting, error, retry]);
  
  // Re-enabling entity tracking useEffect to test if this causes the 'logs' error
  // Track entity data when author loads AND store is hydrated
  useEffect(() => {
    console.log('[AuthorPage] Entity tracking status check:', {
      hasAuthor: !!author,
      authorName: author?.display_name,
      hasId: !!id,
      actualId: id,
      isRedirecting,
      isHydrated,
      hasTrackEntityData: !!trackEntityData
    });
    
    if (author && !isRedirecting && isHydrated && trackEntityData) {
      console.log('[AuthorPage] All conditions met - calling trackEntityData');
      trackEntityData(author, EntityType.AUTHOR, author.id).catch((trackingError: unknown) => {
        console.error('[AuthorPage] Entity tracking failed:', trackingError);
      });
    } else {
      console.log('[AuthorPage] Conditions not met for tracking:', {
        hasAuthor: !!author,
        notRedirecting: !isRedirecting,
        storeHydrated: isHydrated,
        hasTracker: !!trackEntityData
      });
    }
  }, [author, id, isRedirecting, isHydrated, trackEntityData]);
  

  // Show loading state for redirection
  if (isRedirecting) {
    console.log('[AuthorPage] Redirecting numeric ID');
    return (
      <EntityErrorBoundary entityType="author" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    console.log('[AuthorPage] Rendering loading skeleton');
    return (
      <EntityErrorBoundary entityType="author" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    console.log('[AuthorPage] Rendering error state:', error);
    return (
      <EntityErrorBoundary entityType="author" entityId={id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={id} 
          entityType={EntityType.AUTHOR}
        />
      </EntityErrorBoundary>
    );
  }

  // Show author data with full functionality
  if (author) {
    console.log('[AuthorPage] Rendering full author page with data:', author.display_name);
    
    // Full author page with AuthorDisplay and EntityGraphVisualization
    return (
      <EntityErrorBoundary entityType="author" entityId={id}>
        <AuthorDisplay
          entity={author}
          useTwoPaneLayout={true}
          graphPane={<EntityGraphVisualization />}
        />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  console.log('[AuthorPage] Rendering fallback state');
  return (
    <EntityErrorBoundary entityType="author" entityId={id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={id} 
        entityType={EntityType.AUTHOR}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/authors_/$id')({
  component: AuthorPage,
});