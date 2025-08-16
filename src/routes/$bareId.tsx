import { createFileRoute, useNavigate, notFound } from '@tanstack/react-router';
import { useEffect } from 'react';

import { 
  detectIdType,
  detectEntityType,
  parseExternalId,
  decodeExternalId,
  getEntityEndpoint,
  ExternalIdType
} from '@/lib/openalex/utils/entity-detection';

function BareIdRedirect() {
  const { bareId } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('BareIdRedirect: bareId =', bareId);
    
    if (!bareId) {
      console.log('BareIdRedirect: No bareId, throwing notFound');
      throw notFound();
    }

    // Decode the ID in case it was URL-encoded
    const decodedId = decodeExternalId(bareId);
    console.log('BareIdRedirect: decodedId =', decodedId);
    
    try {
      // Handle all the specific patterns from OpenAlex documentation
      
      // 1. Handle raw numeric IDs (e.g. /#/5017898742) - assume author for now based on user example
      if (/^\d{7,10}$/.test(decodedId)) {
        console.log('BareIdRedirect: Raw numeric ID detected, assuming author');
        navigate({ to: `/authors/A${decodedId}`, replace: true });
        return;
      }
      
      // 2. Handle full OpenAlex URLs (e.g. /#/https://openalex.org/A5017898742)
      if (decodedId.includes('openalex.org/')) {
        const openAlexMatch = decodedId.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
        if (openAlexMatch) {
          const openAlexId = openAlexMatch[1].toUpperCase();
          const entityType = detectEntityType(openAlexId);
          const endpoint = getEntityEndpoint(entityType);
          console.log(`BareIdRedirect: OpenAlex URL detected, redirecting to /${endpoint}/${openAlexId}`);
          navigate({ to: `/${endpoint}/${openAlexId}`, replace: true });
          return;
        }
        
        // Handle alternative OpenAlex URL patterns like https://openalex.org/authors/A5017898742
        const altOpenAlexMatch = decodedId.match(/openalex\.org\/([a-z]+)\/([WASIPFTCKRN]\d{7,10})/i);
        if (altOpenAlexMatch) {
          const openAlexId = altOpenAlexMatch[2].toUpperCase();
          const entityType = detectEntityType(openAlexId);
          const endpoint = getEntityEndpoint(entityType);
          console.log(`BareIdRedirect: Alternative OpenAlex URL detected, redirecting to /${endpoint}/${openAlexId}`);
          navigate({ to: `/${endpoint}/${openAlexId}`, replace: true });
          return;
        }
      }
      
      // 3. Handle ORCID URLs (e.g. /#/https://orcid.org/0000-0003-1613-5981)
      if (decodedId.includes('orcid.org/')) {
        const orcidMatch = decodedId.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
        if (orcidMatch) {
          const orcidId = orcidMatch[1];
          console.log(`BareIdRedirect: ORCID URL detected, redirecting to /authors/${orcidId}`);
          navigate({ to: `/authors/${orcidId}`, replace: true });
          return;
        }
      }
      
      // 4. Handle bare OpenAlex IDs (e.g. /#/A5017898742)
      if (/^[WASIPFTCKRN]\d{7,10}$/i.test(decodedId)) {
        const entityType = detectEntityType(decodedId);
        const endpoint = getEntityEndpoint(entityType);
        const normalizedId = decodedId.toUpperCase();
        console.log(`BareIdRedirect: Bare OpenAlex ID detected, redirecting to /${endpoint}/${normalizedId}`);
        navigate({ to: `/${endpoint}/${normalizedId}`, replace: true });
        return;
      }
      
      // 5. Try to detect and handle other external IDs
      const idType = detectIdType(decodedId);
      
      if (idType === ExternalIdType.OPENALEX) {
        // This should have been handled above, but just in case
        const entityType = detectEntityType(decodedId);
        const endpoint = getEntityEndpoint(entityType);
        const normalizedId = decodedId.toUpperCase();
        navigate({ to: `/${endpoint}/${normalizedId}`, replace: true });
        return;
      }
      
      if (idType === ExternalIdType.ORCID) {
        // Handle bare ORCID ID
        navigate({ to: `/authors/${decodedId}`, replace: true });
        return;
      }
      
      if (idType === ExternalIdType.DOI) {
        // Handle DOI - redirect to works
        navigate({ to: `/works/${encodeURIComponent(decodedId)}`, replace: true });
        return;
      }
      
      // For other external IDs, parse and redirect appropriately
      const externalIdResult = parseExternalId(decodedId);
      if (externalIdResult.possibleEntityTypes && externalIdResult.possibleEntityTypes.length === 1) {
        const endpoint = getEntityEndpoint(externalIdResult.possibleEntityTypes[0]);
        console.log(`BareIdRedirect: External ID detected, redirecting to /${endpoint}/${encodeURIComponent(decodedId)}`);
        navigate({ to: `/${endpoint}/${encodeURIComponent(decodedId)}`, replace: true });
        return;
      }
      
      // If we get here, we couldn't determine what to do with this ID
      console.log('BareIdRedirect: Could not determine entity type, throwing notFound');
      throw notFound();
      
    } catch (error) {
      console.error('BareIdRedirect: Error processing ID:', error);
      // If we can't detect the ID type, let it 404
      throw notFound();
    }
  }, [bareId, navigate]);

  // Show minimal loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export const Route = createFileRoute('/$bareId')({
  component: BareIdRedirect,
});