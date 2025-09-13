import { createFileRoute, useNavigate, notFound } from '@tanstack/react-router';
import { useEffect } from 'react';

import { buildEntityPath } from '@/components/atoms/utils/entity-link-utils';
import { 
  detectIdType,
  detectEntityType,
  parseExternalId,
  decodeExternalId,
  ExternalIdType
} from '@/lib/openalex/utils/entity-detection';

// Helper functions to reduce complexity
function handleHttpsUrls(decodedId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  if (!decodedId.startsWith('https://') && !decodedId.startsWith('https:/')) {
    return false;
  }

  console.log('BareIdRedirect: HTTPS URL detected');
  
  // Handle OpenAlex URLs
  if (decodedId.includes('openalex.org/')) {
    return handleOpenAlexUrls(decodedId, navigate);
  }
  
  // Handle ORCID URLs
  if (decodedId.includes('orcid.org/')) {
    return handleOrcidUrls(decodedId, navigate);
  }
  
  // Handle DOI URLs
  if (decodedId.includes('doi.org/')) {
    return handleDoiUrls(decodedId, navigate);
  }
  
  // Handle ROR URLs
  if (decodedId.includes('ror.org/')) {
    return handleRorUrls(decodedId, navigate);
  }
  
  // Handle Wikidata URLs
  if (decodedId.includes('wikidata.org/')) {
    return handleWikidataUrls(decodedId, navigate);
  }
  
  // If we get here, we couldn't handle this HTTPS URL
  console.log('BareIdRedirect: Could not handle HTTPS URL, throwing notFound');
  throw notFound();
}

function handleOpenAlexUrls(decodedId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  const openAlexMatch = decodedId.match(/openalex\.org\/([WASIPFTCKRN]\d{7,10})/i);
  if (openAlexMatch && openAlexMatch[1]) {
    const openAlexId = openAlexMatch[1].toUpperCase();
    const entityType = detectEntityType(openAlexId);
    if (entityType) {
      const entityPath = buildEntityPath(entityType, openAlexId);
      console.log(`BareIdRedirect: OpenAlex URL detected, redirecting to ${entityPath}`);
      navigate({ to: entityPath, replace: true });
      return true;
    }
  }
  
  // Handle alternative OpenAlex URL patterns like https://openalex.org/authors/A5017898742
  const altOpenAlexMatch = decodedId.match(/openalex\.org\/([a-z]+)\/([WASIPFTCKRN]\d{7,10})/i);
  if (altOpenAlexMatch && altOpenAlexMatch[2]) {
    const openAlexId = altOpenAlexMatch[2].toUpperCase();
    const entityType = detectEntityType(openAlexId);
    if (entityType) {
      const entityPath = buildEntityPath(entityType, openAlexId);
      console.log(`BareIdRedirect: Alternative OpenAlex URL detected, redirecting to ${entityPath}`);
      navigate({ to: entityPath, replace: true });
      return true;
    }
  }
  
  return false;
}

function handleOrcidUrls(decodedId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  const orcidMatch = decodedId.match(/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[\dX])/i);
  if (orcidMatch) {
    const orcidId = orcidMatch[1];
    console.log(`BareIdRedirect: ORCID URL detected, redirecting to /authors/${orcidId}`);
    navigate({ to: `/author/${orcidId}`, replace: true });
    return true;
  }
  return false;
}

function handleDoiUrls(decodedId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  const doiMatch = decodedId.match(/doi\.org\/(10\.[0-9]{4,}\/[^\s]+)/i);
  if (doiMatch && doiMatch[1]) {
    const doiId = doiMatch[1];
    console.log(`BareIdRedirect: DOI URL detected, redirecting to /works/${encodeURIComponent(doiId)}`);
    navigate({ to: `/work/${encodeURIComponent(doiId)}`, replace: true });
    return true;
  }
  return false;
}

function handleRorUrls(decodedId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  const rorMatch = decodedId.match(/ror\.org\/(0[0-9a-z]{6}[0-9]{2})/i);
  if (rorMatch) {
    const rorId = rorMatch[1];
    console.log(`BareIdRedirect: ROR URL detected, redirecting to /institutions/${rorId}`);
    navigate({ to: `/institutions/${rorId}`, replace: true });
    return true;
  }
  return false;
}

function handleWikidataUrls(decodedId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  const wikidataMatch = decodedId.match(/wikidata\.org\/wiki\/(Q[0-9]+)/i);
  if (wikidataMatch && wikidataMatch[1]) {
    const wikidataId = wikidataMatch[1];
    console.log(`BareIdRedirect: Wikidata URL detected, using parseExternalId to determine entity type`);
    const externalIdResult = parseExternalId(wikidataId);
    if (externalIdResult.possibleEntityTypes && externalIdResult.possibleEntityTypes.length >= 1) {
      const firstEntityType = externalIdResult.possibleEntityTypes[0];
      if (firstEntityType) {
        const entityPath = buildEntityPath(firstEntityType, wikidataId);
        if (externalIdResult.possibleEntityTypes.length > 1) {
          console.log(`BareIdRedirect: Multiple possible entity types for Wikidata, defaulting to ${entityPath}`);
        }
        navigate({ to: entityPath, replace: true });
        return true;
      }
    }
  }
  return false;
}

function handleExternalIds(decodedId: string, navigate: ReturnType<typeof useNavigate>): boolean {
  const idType = detectIdType(decodedId);
  
  if (idType === ExternalIdType.OPENALEX) {
    const entityType = detectEntityType(decodedId);
    const normalizedId = decodedId.toUpperCase();
    const entityPath = buildEntityPath(entityType, normalizedId);
    navigate({ to: entityPath, replace: true });
    return true;
  }
  
  if (idType === ExternalIdType.ORCID) {
    navigate({ to: `/authors/${decodedId}`, replace: true });
    return true;
  }
  
  if (idType === ExternalIdType.DOI) {
    navigate({ to: `/works/${encodeURIComponent(decodedId)}`, replace: true });
    return true;
  }
  
  // For other external IDs, parse and redirect appropriately
  const externalIdResult = parseExternalId(decodedId);
  if (externalIdResult.possibleEntityTypes && externalIdResult.possibleEntityTypes.length === 1) {
    const firstEntityType = externalIdResult.possibleEntityTypes[0];
    if (firstEntityType) {
      const entityPath = buildEntityPath(firstEntityType, encodeURIComponent(decodedId));
      console.log(`BareIdRedirect: External ID detected, redirecting to ${entityPath}`);
      navigate({ to: entityPath, replace: true });
      return true;
    }
  }
  
  return false;
}

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
      // Handle HTTPS URLs first
      if (handleHttpsUrls(decodedId, navigate)) {
        return;
      }
      
      // Handle raw numeric IDs (e.g. /#/5017898742) - assume author for now based on user example
      if (/^\d{7,10}$/.test(decodedId)) {
        console.log('BareIdRedirect: Raw numeric ID detected, assuming author');
        navigate({ to: `/authors/A${decodedId}`, replace: true });
        return;
      }
      
      // Handle full OpenAlex URLs (e.g. /#/https://openalex.org/A5017898742)
      if (decodedId.includes('openalex.org/') && handleOpenAlexUrls(decodedId, navigate)) {
        return;
      }
      
      // Handle ORCID URLs (e.g. /#/https://orcid.org/0000-0003-1613-5981)
      if (decodedId.includes('orcid.org/') && handleOrcidUrls(decodedId, navigate)) {
        return;
      }
      
      // Handle bare OpenAlex IDs (e.g. /#/A5017898742)
      if (/^[WASIPFTCKRN]\d{7,10}$/i.test(decodedId)) {
        const entityType = detectEntityType(decodedId);
        const normalizedId = decodedId.toUpperCase();
        const entityPath = buildEntityPath(entityType, normalizedId);
        console.log(`BareIdRedirect: Bare OpenAlex ID detected, redirecting to ${entityPath}`);
        navigate({ to: entityPath, replace: true });
        return;
      }
      
      // Try to detect and handle other external IDs
      if (handleExternalIds(decodedId, navigate)) {
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