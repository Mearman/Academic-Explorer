
/**
 * URL conversion utilities for OpenAlex links using existing canonical route logic
 */
export function convertToRelativeUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // Convert OpenAlex API URLs to entity routes
    if (urlObj.hostname === "api.openalex.org") {
      // Extract entity type from path (e.g., /works, /authors, etc.)
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        const entityType = pathParts[0]; // e.g., "works", "authors"
        const queryString = urlObj.search; // e.g., "?filter=author.id:A5017898742"
        return `#/${entityType}${queryString}`;
      }
      return null;
    }

    // Convert OpenAlex entity URLs to hash routes
    if (urlObj.hostname === "openalex.org") {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length === 1) {
        const fullPath = pathParts[0];
        const route = determineCanonicalRoute(fullPath);
        return route ? `#${route}` : null;
      }
    }

    // For ROR URLs, we need special handling - they should link to institutions
    // But we can't resolve ROR to OpenAlex ID here, so we'll handle this in the matcher
    if (urlObj.hostname === "ror.org") {
      return null; // Will be handled specially in the matcher
    }

    return null; // Not an OpenAlex URL
  } catch {
    return null; // Invalid URL
  }
}

export function isOpenAlexUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname === "api.openalex.org" ||
      urlObj.hostname === "openalex.org" ||
      urlObj.hostname === "ror.org"
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
    if (urlObj.hostname === "openalex.org") {
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

export function determineCanonicalRoute(path: string): string {
  // Handle paths that start with entity type (e.g., "works?filter=...")
  if (path.includes("?")) {
    const [entityType] = path.split("?");
    return `/${entityType}`;
  }

  // Handle entity paths (e.g., "W123456789", "works/W123456789")
  const pathSegments = path.split("/");
  if (pathSegments.length === 1) {
    // Single segment - check if it's an entity type or entity ID
    const segment = pathSegments[0];
    const firstChar = segment.charAt(0).toLowerCase();

    // If it starts with a letter that indicates an entity type, treat as entity type
    if (
      ["w", "a", "i", "s", "t", "p", "f"].includes(firstChar) &&
      segment.length > 1 &&
      /^[a-z]+$/.test(segment)
    ) {
      return `/${segment}`;
    }

    // Otherwise treat as entity ID
    const entityType = getEntityTypeFromId(segment);
    return `/${entityType}/${segment}`;
  } else if (pathSegments.length >= 2) {
    // Multi-segment path like "works/W123456789"
    const entityType = pathSegments[0];
    const entityId = pathSegments[1].split("?")[0]; // Remove query params for entity routes
    return `/${entityType}/${entityId}`;
  }

  return `/${path}`;
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
