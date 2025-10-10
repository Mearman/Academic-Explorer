/**
 * URL conversion utilities for OpenAlex links using existing canonical route logic
 */

// Hostname constants
const API_OPENALEX_HOST = "api.openalex.org";
const OPENALEX_HOST = "openalex.org";
const ROR_HOST = "ror.org";

export function convertToRelativeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (urlObj.hostname === API_OPENALEX_HOST) {
      return convertApiUrl(urlObj);
    }

    if (urlObj.hostname === OPENALEX_HOST) {
      return convertEntityUrl(urlObj);
    }

    if (urlObj.hostname === ROR_HOST) {
      return null; // Will be handled specially in the matcher
    }

    return null; // Not an OpenAlex URL
  } catch {
    return null; // Invalid URL
  }
}

/**
 * Converts OpenAlex API URLs to entity routes
 */
function convertApiUrl(urlObj: URL): string | null {
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  if (pathParts.length > 0) {
    const entityType = pathParts[0]; // e.g., "works", "authors"
    const queryString = urlObj.search; // e.g., "?filter=author.id:A5017898742"
    return `#/${entityType}${queryString}`;
  }
  return null;
}

/**
 * Converts OpenAlex entity URLs to hash routes
 */
function convertEntityUrl(urlObj: URL): string | null {
  const pathParts = urlObj.pathname.split("/").filter(Boolean);
  if (pathParts.length === 1) {
    const fullPath = pathParts[0];
    const route = determineCanonicalRoute(fullPath);
    return route ? `#${route}` : null;
  }
  return null;
}

export function isOpenAlexUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return [API_OPENALEX_HOST, OPENALEX_HOST, ROR_HOST].includes(
      urlObj.hostname,
    );
  } catch {
    return false;
  }
}

/**
 * Determine the canonical relative route for a given path (adapted from redirect-test-utils)
 */
/**
 * Extract entity ID from an OpenAlex URL
 */
export function extractEntityId(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === OPENALEX_HOST) {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length === 1) {
        return pathParts[0];
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Entity type prefixes for ID detection
const ENTITY_TYPE_PREFIXES = new Set(["w", "a", "i", "s", "t", "p", "f"]);

export function determineCanonicalRoute(path: string): string {
  // Handle paths that start with entity type (e.g., "works?filter=...")
  if (path.includes("?")) {
    const [entityType] = path.split("?");
    return `/${entityType}`;
  }

  const pathSegments = path.split("/");
  if (pathSegments.length === 1) {
    return handleSingleSegmentPath(pathSegments[0]);
  }

  if (pathSegments.length >= 2) {
    return handleMultiSegmentPath(pathSegments);
  }

  return `/${path}`;
}

/**
 * Handles single segment paths (entity type or entity ID)
 */
function handleSingleSegmentPath(segment: string): string {
  const firstChar = segment.charAt(0).toLowerCase();

  // If it starts with a letter that indicates an entity type, treat as entity type
  if (
    ENTITY_TYPE_PREFIXES.has(firstChar) &&
    segment.length > 1 &&
    /^[a-z]+$/.test(segment)
  ) {
    return `/${segment}`;
  }

  // Otherwise treat as entity ID
  const entityType = getEntityTypeFromId(segment);
  return `/${entityType}/${segment}`;
}

/**
 * Handles multi-segment paths like "works/W123456789"
 */
function handleMultiSegmentPath(pathSegments: string[]): string {
  const entityType = pathSegments[0];
  const entityId = pathSegments[1].split("?")[0]; // Remove query params for entity routes
  return `/${entityType}/${entityId}`;
}

/**
 * Extract entity type from OpenAlex ID prefix
 */
export function getEntityTypeFromId(id: string): string {
  const firstChar = id.charAt(0).toLowerCase();
  switch (firstChar) {
    case "w":
      return "works";
    case "a":
      return "authors";
    case "i":
      return "institutions";
    case "s":
      return "sources";
    case "t":
      return "topics";
    case "p":
      return "publishers";
    case "f":
      return "funders";
    default:
      return "works"; // fallback
  }
}

/**
 * Helper functions for styling
 */
export function getTopicColor(topic: { count?: number }): string {
  const colors = ["blue", "green", "orange", "red", "purple", "cyan"];
  const score = topic.count || 0;
  return colors[Math.min(Math.floor(score / 10), colors.length - 1)];
}

export function getConceptColor(level: number): string {
  const colors = ["gray", "blue", "green", "orange", "red"];
  return colors[Math.min(level, colors.length - 1)];
}

export function getIdColor(key: string): string {
  const colorMap: Record<string, string> = {
    openalex: "blue",
    orcid: "green",
    doi: "purple",
    ror: "orange",
    issn: "teal",
    scopus: "red",
    mag: "gray",
    wikipedia: "blue",
    wikidata: "blue",
  };
  return colorMap[key] || "gray";
}

export function getEntityColor(entityType: string): string {
  const colorMap: Record<string, string> = {
    works: "blue",
    authors: "green",
    institutions: "orange",
    sources: "purple",
    topics: "red",
    publishers: "teal",
    funders: "cyan",
  };
  return colorMap[entityType] || "gray";
}
