import { createFileRoute, useNavigate, notFound } from '@tanstack/react-router';
import { useEffect } from 'react';

import { buildEntityPath } from '@/components/atoms/utils/entity-link-utils';
import { 
  detectEntityType,
  parseExternalId,
  decodeExternalId
} from '@/lib/openalex/utils/entity-detection';

function HttpsUrlRedirect() {
  const { _splat } = Route.useParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('HttpsUrlRedirect: _splat =', _splat);
    
    if (!_splat) {
      console.log('HttpsUrlRedirect: No _splat, throwing notFound');
      throw notFound();
    }

    // Reconstruct the full HTTPS URL
    // The browser transformed /#/https://openalex.org/A5017898742 to /#/https:/openalex.org/A5017898742
    // So _splat should be something like ":/openalex.org/A5017898742"
    const reconstructedUrl = `https${_splat}`;
    console.log('HttpsUrlRedirect: reconstructedUrl =', reconstructedUrl);
    
    // Decode the URL in case it was URL-encoded
    const decodedId = decodeExternalId(reconstructedUrl);
    console.log('HttpsUrlRedirect: decodedId =', decodedId);
    
    try {
      // Handle OpenAlex URLs
      if (decodedId.includes('openalex.org/')) {
        const openAlexMatch = decodedId.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
        if (openAlexMatch && openAlexMatch[1]) {
          const openAlexId = openAlexMatch[1].toUpperCase();
          const entityType = detectEntityType(openAlexId);
          const entityPath = buildEntityPath(entityType, openAlexId);
          console.log(`HttpsUrlRedirect: OpenAlex URL detected, redirecting to ${entityPath}`);
          navigate({ to: entityPath, replace: true });
          return;
        }

        // Handle alternative OpenAlex URL patterns like https://openalex.org/authors/A5017898742
        const altOpenAlexMatch = decodedId.match(/openalex\.org\/([a-z]+)\/([WASIPFTCKRN]\d{7,10})/i);
        if (altOpenAlexMatch && altOpenAlexMatch[2]) {
          const openAlexId = altOpenAlexMatch[2].toUpperCase();
          const entityType = detectEntityType(openAlexId);
          const entityPath = buildEntityPath(entityType, openAlexId);
          console.log(`HttpsUrlRedirect: Alternative OpenAlex URL detected, redirecting to ${entityPath}`);
          navigate({ to: entityPath, replace: true });
          return;
        }
      }
      
      // Handle ORCID URLs
      if (decodedId.includes('orcid.org/')) {
        const orcidMatch = decodedId.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
        if (orcidMatch && orcidMatch[1]) {
          const orcidId = orcidMatch[1];
          console.log(`HttpsUrlRedirect: ORCID URL detected, redirecting to /authors/${orcidId}`);
          navigate({ to: `/authors/${orcidId}`, replace: true });
          return;
        }
      }
      
      // Handle DOI URLs
      if (decodedId.includes('doi.org/')) {
        const doiMatch = decodedId.match(/doi\.org\/(10\.[0-9]{4,}\/[^\s]+)/i);
        if (doiMatch && doiMatch[1]) {
          const doiId = doiMatch[1];
          console.log(`HttpsUrlRedirect: DOI URL detected, redirecting to /works/${encodeURIComponent(doiId)}`);
          navigate({ to: `/works/${encodeURIComponent(doiId)}`, replace: true });
          return;
        }
      }
      
      // Handle ROR URLs
      if (decodedId.includes('ror.org/')) {
        const rorMatch = decodedId.match(/ror\.org\/(0[0-9a-z]{6}[0-9]{2})/i);
        if (rorMatch && rorMatch[1]) {
          const rorId = rorMatch[1];
          console.log(`HttpsUrlRedirect: ROR URL detected, redirecting to /institutions/${rorId}`);
          navigate({ to: `/institutions/${rorId}`, replace: true });
          return;
        }
      }
      
      // Handle Wikidata URLs
      if (decodedId.includes('wikidata.org/')) {
        const wikidataMatch = decodedId.match(/wikidata\.org\/wiki\/(Q[0-9]+)/i);
        if (wikidataMatch && wikidataMatch[1]) {
          const wikidataId = wikidataMatch[1];
          console.log(`HttpsUrlRedirect: Wikidata URL detected, using parseExternalId to determine entity type`);
          const externalIdResult = parseExternalId(wikidataId);
          if (externalIdResult.possibleEntityTypes && externalIdResult.possibleEntityTypes.length >= 1) {
            const firstEntityType = externalIdResult.possibleEntityTypes[0];
            if (firstEntityType) {
              const entityPath = buildEntityPath(firstEntityType, wikidataId);
              navigate({ to: entityPath, replace: true });
              return;
            }
          }
        }
      }
      
      // If we get here, we couldn't handle this HTTPS URL
      console.log('HttpsUrlRedirect: Could not handle HTTPS URL, throwing notFound');
      throw notFound();
      
    } catch (error) {
      console.error('HttpsUrlRedirect: Error processing URL:', error);
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
  component: HttpsUrlRedirect,
});