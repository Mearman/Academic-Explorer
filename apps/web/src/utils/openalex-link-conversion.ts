/**
 * Utilities for converting OpenAlex URLs and IDs to internal app routes
 */

export interface ConvertedLink {
  isOpenAlexLink: boolean;
  internalPath: string;
  originalUrl: string;
}

/**
 * Detects if a string is an OpenAlex entity ID (e.g., A5017898742, W1234567890)
 */
export function isOpenAlexId(str: string): boolean {
  return /^[AWISVFCPT]\d+$/.test(str);
}

/**
 * Gets the entity type from an OpenAlex ID
 */
export function getEntityTypeFromId(id: string): string | null {
  const prefix = id.charAt(0);
  const typeMap: Record<string, string> = {
    'A': 'authors',
    'W': 'works',
    'I': 'institutions',
    'S': 'sources',
    'V': 'sources', // Venues (deprecated, now sources)
    'F': 'funders',
    'C': 'concepts',
    'P': 'publishers',
    'T': 'topics',
  };
  return typeMap[prefix] || null;
}

/**
 * Converts an OpenAlex URL or ID to an internal app path
 */
export function convertOpenAlexToInternalLink(url: string): ConvertedLink {
  const originalUrl = url;

  // Case 1: OpenAlex entity URL (https://openalex.org/A5017898742)
  const entityUrlMatch = url.match(/https?:\/\/openalex\.org\/([AWISVFCPT]\d+)/i);
  if (entityUrlMatch) {
    const entityId = entityUrlMatch[1];
    const entityType = getEntityTypeFromId(entityId);
    if (entityType) {
      return {
        isOpenAlexLink: true,
        internalPath: `/${entityType}/${entityId}`,
        originalUrl,
      };
    }
  }

  // Case 2: OpenAlex API URL (https://api.openalex.org/works?filter=author.id:A5017898742)
  const apiUrlMatch = url.match(/https?:\/\/api\.openalex\.org\/([^?]+)(\?.*)?/i);
  if (apiUrlMatch) {
    const path = apiUrlMatch[1];
    const queryString = apiUrlMatch[2] || '';
    return {
      isOpenAlexLink: true,
      internalPath: `/${path}${queryString}`,
      originalUrl,
    };
  }

  // Case 3: Just an OpenAlex ID (A5017898742)
  if (isOpenAlexId(url)) {
    const entityType = getEntityTypeFromId(url);
    if (entityType) {
      return {
        isOpenAlexLink: true,
        internalPath: `/${entityType}/${url}`,
        originalUrl,
      };
    }
  }

  // Not an OpenAlex link
  return {
    isOpenAlexLink: false,
    internalPath: url,
    originalUrl,
  };
}

/**
 * Extracts OpenAlex IDs from a string
 */
export function extractOpenAlexIds(str: string): string[] {
  const matches = str.match(/[AWISVFCPT]\d+/g);
  return matches || [];
}

/**
 * Checks if a URL is an OpenAlex URL (entity or API)
 */
export function isOpenAlexUrl(url: string): boolean {
  return url.includes('openalex.org') || url.includes('api.openalex.org');
}
