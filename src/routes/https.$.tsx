import { createFileRoute, useNavigate, notFound } from '@tanstack/react-router';
import { useEffect } from 'react';

import { 
  detectEntityType,
  getEntityEndpoint,
  decodeExternalId,
  parseExternalId,
  ExternalIdType
} from '@/lib/openalex/utils/entity-detection';

function HttpsRedirect() {
  const { _splat } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('HttpsRedirect: _splat =', _splat);
    
    if (!_splat) {
      console.log('HttpsRedirect: No _splat, throwing notFound');
      throw notFound();
    }

    try {
      // Reconstruct the full URL - hash routing breaks on // so we need to rebuild it
      // The route path will be like "https:" and _splat will be "//openalex.org/A5017898742"
      const fullUrl = `https:${_splat}`;
      console.log('HttpsRedirect: Reconstructed URL =', fullUrl);
      
      const decodedUrl = decodeExternalId(fullUrl);
      console.log('HttpsRedirect: Decoded URL =', decodedUrl);
      
      // Handle OpenAlex URLs
      if (decodedUrl.includes('openalex.org/')) {
        const openAlexMatch = decodedUrl.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
        if (openAlexMatch) {
          const openAlexId = openAlexMatch[1].toUpperCase();
          const entityType = detectEntityType(openAlexId);
          const endpoint = getEntityEndpoint(entityType);
          console.log(`HttpsRedirect: OpenAlex URL detected, redirecting to /${endpoint}/${openAlexId}`);
          navigate({ to: `/${endpoint}/${openAlexId}`, replace: true });
          return;
        }
        
        // Handle alternative OpenAlex URL patterns like https://openalex.org/authors/A5017898742
        const altOpenAlexMatch = decodedUrl.match(/openalex\.org\/([a-z]+)\/([WASIPFTCKRN]\d{7,10})/i);
        if (altOpenAlexMatch) {
          const openAlexId = altOpenAlexMatch[2].toUpperCase();
          const entityType = detectEntityType(openAlexId);
          const endpoint = getEntityEndpoint(entityType);
          console.log(`HttpsRedirect: Alternative OpenAlex URL detected, redirecting to /${endpoint}/${openAlexId}`);
          navigate({ to: `/${endpoint}/${openAlexId}`, replace: true });
          return;
        }
      }
      
      // Handle ORCID URLs
      if (decodedUrl.includes('orcid.org/')) {
        const orcidMatch = decodedUrl.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
        if (orcidMatch) {
          const orcidId = orcidMatch[1];
          console.log(`HttpsRedirect: ORCID URL detected, redirecting to /authors/${orcidId}`);
          navigate({ to: `/authors/${orcidId}`, replace: true });
          return;
        }
      }
      
      // Handle DOI URLs
      if (decodedUrl.includes('doi.org/')) {
        const doiMatch = decodedUrl.match(/doi\.org\/(10\.[0-9]{4,}\/[^\s]+)/i);
        if (doiMatch) {
          const doiId = doiMatch[1];
          console.log(`HttpsRedirect: DOI URL detected, redirecting to /works/${encodeURIComponent(doiId)}`);
          navigate({ to: `/works/${encodeURIComponent(doiId)}`, replace: true });
          return;
        }
      }
      
      // Handle ROR URLs
      if (decodedUrl.includes('ror.org/')) {
        const rorMatch = decodedUrl.match(/ror\.org\/(0[0-9a-z]{6}[0-9]{2})/i);
        if (rorMatch) {
          const rorId = rorMatch[1];
          console.log(`HttpsRedirect: ROR URL detected, redirecting to /institutions/${rorId}`);
          navigate({ to: `/institutions/${rorId}`, replace: true });
          return;
        }
      }
      
      // Handle Wikidata URLs
      if (decodedUrl.includes('wikidata.org/')) {
        const wikidataMatch = decodedUrl.match(/wikidata\.org\/wiki\/(Q[0-9]+)/i);
        if (wikidataMatch) {
          const wikidataId = wikidataMatch[1];
          console.log(`HttpsRedirect: Wikidata URL detected, using parseExternalId to determine entity type`);
          // Wikidata can be used by multiple entity types, so parse it properly
          const externalIdResult = parseExternalId(wikidataId);
          if (externalIdResult.possibleEntityTypes && externalIdResult.possibleEntityTypes.length === 1) {
            const endpoint = getEntityEndpoint(externalIdResult.possibleEntityTypes[0]);
            navigate({ to: `/${endpoint}/${wikidataId}`, replace: true });
            return;
          } else if (externalIdResult.possibleEntityTypes && externalIdResult.possibleEntityTypes.length > 1) {
            // Default to first possible entity type if multiple
            const endpoint = getEntityEndpoint(externalIdResult.possibleEntityTypes[0]);
            console.log(`HttpsRedirect: Multiple possible entity types for Wikidata, defaulting to ${endpoint}`);
            navigate({ to: `/${endpoint}/${wikidataId}`, replace: true });
            return;
          }
        }
      }
      
      // If we get here, we couldn't handle this URL
      console.log('HttpsRedirect: Could not handle URL, throwing notFound');
      throw notFound();
      
    } catch (error) {
      console.error('HttpsRedirect: Error processing URL:', error);
      throw notFound();
    }
  }, [_splat, navigate]);

  // Show minimal loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}

export const Route = createFileRoute('/https/$')({
  component: HttpsRedirect,
});