import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, useCallback } from 'react';

import { EntityErrorBoundary, EntitySkeleton, EntityError, EntityFallback, EntityGraphVisualization } from '@/components';
import { AuthorDisplay } from '@/components/entity-displays/AuthorDisplay';
import { useAuthorData } from '@/hooks/use-entity-data';
import { useNumericIdRedirect } from '@/hooks/use-numeric-id-redirect';
import { EntityType, detectIdType, decodeExternalId, ExternalIdType, detectEntityType } from '@/lib/openalex/utils/entity-detection';
import { buildEntityPath } from '@/components/atoms/utils/entity-link-utils';

function AuthorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [processedId, setProcessedId] = useState<string | null>(null);
  const [isProcessingId, setIsProcessingId] = useState(true);
  
  // Handle numeric ID redirection to proper prefixed format
  const isRedirecting = useNumericIdRedirect(id, EntityType.AUTHOR);
  
  // Memoize navigate function to prevent useEffect loops
  const stableNavigate = useCallback(navigate, []);
  
  // Process the ID to handle external formats
  useEffect(() => {
    console.log('AuthorPage: id =', id);
    
    if (!id) {
      setProcessedId(null);
      setIsProcessingId(false);
      return;
    }

    try {
      // Decode the ID in case it was URL-encoded
      const decodedId = decodeExternalId(id);
      console.log('AuthorPage: decodedId =', decodedId);
      
      // Skip numeric IDs - they are handled by useNumericIdRedirect hook
      if (/^\d{7,10}$/.test(decodedId)) {
        console.log('AuthorPage: Raw numeric ID detected, will be handled by useNumericIdRedirect hook');
        setIsProcessingId(false);
        return;
      }
      
      // Check if this is a full OpenAlex URL (including HTTPS patterns)
      if (decodedId.includes('openalex.org/')) {
        const match = decodedId.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
        if (match) {
          const openAlexId = match[1].toUpperCase();
          // Only redirect if this is an author ID, otherwise redirect to correct entity type
          if (openAlexId.startsWith('A')) {
            console.log('AuthorPage: OpenAlex author URL detected, redirecting to clean URL');
            stableNavigate({ to: `/author/${openAlexId}`, replace: true });
            return;
          } else {
            // This is not an author ID, redirect to the correct entity type
            const entityType = detectEntityType(openAlexId);
            const entityPath = buildEntityPath(entityType, openAlexId);
            console.log(`AuthorPage: Non-author OpenAlex URL detected, redirecting to ${entityPath}`);
            stableNavigate({ to: entityPath, replace: true });
            return;
          }
        }
        
        // Handle alternative OpenAlex URL patterns like https://openalex.org/authors/A5017898742
        const altMatch = decodedId.match(/openalex\.org\/authors\/([WASIPFTCKRN]\d{7,10})/i);
        if (altMatch) {
          const openAlexId = altMatch[1].toUpperCase();
          if (openAlexId.startsWith('A')) {
            console.log('AuthorPage: Alternative OpenAlex author URL detected, redirecting to clean URL');
            stableNavigate({ to: `/author/${openAlexId}`, replace: true });
            return;
          } else {
            // This is not an author ID, redirect to the correct entity type
            const entityType = detectEntityType(openAlexId);
            const entityPath = buildEntityPath(entityType, openAlexId);
            console.log(`AuthorPage: Non-author in authors path detected, redirecting to ${entityPath}`);
            stableNavigate({ to: entityPath, replace: true });
            return;
          }
        }
      }
      
      // Handle HTTPS URLs (both original and browser-transformed)
      if (decodedId.startsWith('https://') || decodedId.startsWith('https:/')) {
        console.log('AuthorPage: HTTPS URL detected');
        
        // Handle OpenAlex HTTPS URLs
        if (decodedId.includes('openalex.org/')) {
          const openAlexMatch = decodedId.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
          if (openAlexMatch) {
            const openAlexId = openAlexMatch[1].toUpperCase();
            if (openAlexId.startsWith('A')) {
              console.log(`AuthorPage: HTTPS OpenAlex author URL detected, redirecting to /author/${openAlexId}`);
              stableNavigate({ to: `/author/${openAlexId}`, replace: true });
              return;
            } else {
              // This is not an author ID, redirect to the correct entity type
              const entityType = detectEntityType(openAlexId);
              const entityPath = buildEntityPath(entityType, openAlexId);
              console.log(`AuthorPage: HTTPS Non-author OpenAlex URL detected, redirecting to ${entityPath}`);
              stableNavigate({ to: entityPath, replace: true });
              return;
            }
          }
          
          // Handle alternative OpenAlex URL patterns like https://openalex.org/authors/A5017898742
          const altOpenAlexMatch = decodedId.match(/openalex\.org\/authors\/([WASIPFTCKRN]\d{7,10})/i);
          if (altOpenAlexMatch) {
            const openAlexId = altOpenAlexMatch[1].toUpperCase();
            if (openAlexId.startsWith('A')) {
              console.log(`AuthorPage: HTTPS Alternative OpenAlex author URL detected, redirecting to /author/${openAlexId}`);
              stableNavigate({ to: `/author/${openAlexId}`, replace: true });
              return;
            } else {
              // This is not an author ID, redirect to the correct entity type
              const entityType = detectEntityType(openAlexId);
              const entityPath = buildEntityPath(entityType, openAlexId);
              console.log(`AuthorPage: HTTPS Non-author in authors path detected, redirecting to ${entityPath}`);
              stableNavigate({ to: entityPath, replace: true });
              return;
            }
          }
        }
        
        // Handle ORCID HTTPS URLs
        if (decodedId.includes('orcid.org/')) {
          const orcidMatch = decodedId.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
          if (orcidMatch) {
            const orcidId = orcidMatch[1];
            console.log(`AuthorPage: HTTPS ORCID URL detected, redirecting to /author/${orcidId}`);
            stableNavigate({ to: `/author/${orcidId}`, replace: true });
            return;
          }
        }
        
        // If we get here, we couldn't handle this HTTPS URL in the authors context
        console.log('AuthorPage: Could not handle HTTPS URL in authors context');
        // Let it continue to normal processing which will likely result in an error
      }
      
      // Check if this is a full ORCID URL
      if (decodedId.includes('orcid.org/')) {
        const match = decodedId.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
        if (match) {
          const orcidId = match[1];
          console.log('AuthorPage: ORCID URL detected, redirecting to clean ORCID format');
          stableNavigate({ to: `/author/${orcidId}`, replace: true });
          return;
        }
      }
      
      // Detect and handle different ID types
      const idType = detectIdType(decodedId);
      
      if (idType === ExternalIdType.ORCID) {
        // For ORCID IDs, use them directly with the OpenAlex API
        console.log('AuthorPage: ORCID ID detected, using as-is');
        setProcessedId(decodedId);
      } else if (idType === ExternalIdType.OPENALEX) {
        // For OpenAlex IDs, check if it's actually an author
        if (decodedId.toUpperCase().startsWith('A')) {
          console.log('AuthorPage: OpenAlex author ID detected, using as-is');
          setProcessedId(decodedId.toUpperCase());
        } else {
          // This is not an author ID, redirect to the correct entity type
          const entityType = detectEntityType(decodedId);
          const entityPath = buildEntityPath(entityType, decodedId.toUpperCase());
          console.log(`AuthorPage: Non-author OpenAlex ID detected, redirecting to ${entityPath}`);
          stableNavigate({ to: entityPath, replace: true });
          return;
        }
      } else {
        // For unknown formats, try to use as-is but log warning
        console.warn('AuthorPage: Unknown ID format, using as-is:', decodedId);
        setProcessedId(decodedId);
      }
      
      setIsProcessingId(false);
    } catch (error) {
      console.error('Error processing author ID:', error);
      // If ID processing fails, try to use the original ID
      setProcessedId(id);
      setIsProcessingId(false);
    }
  }, [id, stableNavigate]);
  
  // Use the author data hook with the processed ID
  const { data: author, loading, error, retry } = useAuthorData(
    processedId && !isRedirecting && !isProcessingId ? processedId : null
  );

  // Show loading state for redirection or ID processing
  if (isRedirecting || isProcessingId) {
    return (
      <EntityErrorBoundary entityType="author" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show loading skeleton
  if (loading) {
    return (
      <EntityErrorBoundary entityType="author" entityId={id}>
        <EntitySkeleton entityType={EntityType.AUTHOR} />
      </EntityErrorBoundary>
    );
  }

  // Show error state
  if (error) {
    return (
      <EntityErrorBoundary entityType="author" entityId={processedId || id}>
        <EntityError 
          error={error} 
          onRetry={retry} 
          entityId={processedId || id} 
          entityType={EntityType.AUTHOR}
        />
      </EntityErrorBoundary>
    );
  }

  // Show author data
  if (author) {
    return (
      <EntityErrorBoundary entityType="author" entityId={processedId || id}>
        <AuthorDisplay 
          entity={author} 
          useTwoPaneLayout={true}
          graphPane={<EntityGraphVisualization />}
        />
      </EntityErrorBoundary>
    );
  }

  // Fallback state
  return (
    <EntityErrorBoundary entityType="author" entityId={processedId || id}>
      <EntityFallback 
        onRetry={retry} 
        entityId={processedId || id} 
        entityType={EntityType.AUTHOR}
      />
    </EntityErrorBoundary>
  );
}

export const Route = createFileRoute('/author/$id')({
  component: AuthorPage,
});