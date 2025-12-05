/**
 * URL Reconstruction Utility
 *
 * Reconstructs navigation URLs from entity type + ID pairs.
 * Supports all identifier formats handled by EntityDetectionService:
 * - OpenAlex IDs (W123, A456, etc.)
 * - External identifiers (DOI, ORCID, ROR, ISSN)
 * - GitHub Pages base path normalization
 */

import type { EntityType } from "@bibgraph/types"

/**
 * Configuration options for URL reconstruction
 */
export interface UrlReconstructionOptions {
	/**
	 * Base path for GitHub Pages deployment (e.g., "/BibGraph")
	 * Defaults to "/" for standard deployment
	 */
	basePath?: string

	/**
	 * Whether to preserve external identifier URLs as-is
	 * If false, converts to app routes (e.g., DOI → /works/doi:...)
	 * Default: false
	 */
	preserveExternalUrls?: boolean
}

/**
 * Default base path used for GitHub Pages deployment
 */
const DEFAULT_BASE_PATH = "/"

/**
 * GitHub Pages base path for the project
 */
const GITHUB_PAGES_BASE_PATH = "/BibGraph"

/**
 * Reconstructs a navigation URL from entity type and ID
 *
 * This is the reverse of EntityDetectionService - it converts entity type + ID pairs
 * back to navigation URLs that work with the app's routing system.
 *
 * @param entityType - The OpenAlex entity type
 * @param entityId - The normalized entity ID (may be external identifier)
 * @param options - Configuration options
 * @returns Navigation URL path (without domain)
 */
export const reconstructEntityUrl = (entityType: EntityType, entityId: string, options: UrlReconstructionOptions = {}): string => {
	const { basePath = DEFAULT_BASE_PATH, preserveExternalUrls = false } = options

	// Normalize base path to ensure it starts with / and doesn't end with /
	const normalizedBasePath = basePath.startsWith("/") ? basePath : `/${basePath}`
	const finalBasePath = normalizedBasePath.endsWith("/")
		? normalizedBasePath.slice(0, -1)
		: normalizedBasePath

	// Handle external identifiers
	if (isExternalIdentifier(entityId)) {
		if (preserveExternalUrls) {
			// Return the original external URL
			return entityId
		} else {
			// Convert to app route for external identifiers
			return reconstructExternalIdRoute(entityType, entityId, finalBasePath)
		}
	}

	// Handle OpenAlex entities (direct IDs)
	return reconstructOpenAlexUrl(entityType, entityId, finalBasePath)
};

/**
 * Checks if an entity ID represents an external identifier
 * @param entityId
 */
const isExternalIdentifier = (entityId: string): boolean => {
	// DOI pattern (including DOI URL format)
	if (/^10\.\d+\/\S+$/.test(entityId) || /^https?:\/\/doi\.org\/10\.\d+\/\S+$/i.test(entityId)) {
		return true
	}

	// ORCID pattern (including ORCID URL format)
	if (/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(entityId) || /^https?:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(entityId)) {
		return true
	}

	// ROR pattern (including ROR URL format)
	if (/^[0-9a-z]{9}$/i.test(entityId) && /[a-z]/i.test(entityId)) {
		return true
	}
	if (/^https?:\/\/ror\.org\/[0-9a-z]{9}$/i.test(entityId)) {
		return true
	}

	// ISSN pattern
	if (/^\d{4}-\d{3}[0-9X]$/i.test(entityId)) {
		return true
	}

	return false
};

/**
 * Reconstructs URL for external identifiers as app routes
 * @param entityType
 * @param entityId
 * @param basePath
 */
const reconstructExternalIdRoute = (entityType: EntityType, entityId: string, basePath: string): string => {
	// Strip URL prefixes for external identifiers
	const cleanId = extractExternalId(entityId)

	// Route patterns for external identifiers
	switch (entityType) {
		case "works":
			if (cleanId.startsWith("10.")) {
				// DOI route
				return `${basePath}/doi/${cleanId}`
			}
			break

		case "authors":
			if (/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(cleanId)) {
				// ORCID route
				return `${basePath}/authors/orcid/${cleanId}`
			}
			break

		case "institutions":
			if (/^[0-9a-z]{9}$/i.test(cleanId) && /[a-z]/i.test(cleanId)) {
				// ROR route
				return `${basePath}/institutions/ror/${cleanId}`
			}
			break

		case "sources":
			if (/^\d{4}-\d{3}[0-9X]$/i.test(cleanId)) {
				// ISSN route
				return `${basePath}/sources/issn/${cleanId}`
			}
			break

		default:
			// For unknown entity types with external IDs, fall back to generic route
			return `${basePath}/${entityType}/${cleanId}`
	}

	// Fallback to standard entity route
	return `${basePath}/${entityType}/${cleanId}`
};

/**
 * Extracts clean external ID from URL format
 * @param entityId
 */
const extractExternalId = (entityId: string): string => {
	// DOI URL format
	const doiMatch = entityId.match(/https?:\/\/doi\.org\/(10\.\d+\/\S+)/i)
	if (doiMatch) {
		return doiMatch[1]
	}

	// ORCID URL format
	const orcidMatch = entityId.match(/https?:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i)
	if (orcidMatch) {
		return orcidMatch[1]
	}

	// ROR URL format
	const rorMatch = entityId.match(/https?:\/\/ror\.org\/([0-9a-z]{9})/i)
	if (rorMatch) {
		return rorMatch[1]
	}

	return entityId
};

/**
 * Reconstructs URL for OpenAlex entities (direct IDs)
 * @param entityType
 * @param entityId
 * @param basePath
 */
const reconstructOpenAlexUrl = (entityType: EntityType, entityId: string, basePath: string): string => {
	// Remove any trailing slash and ensure uppercase format
	const cleanId = entityId.replace(/\/$/, "").toUpperCase()

	// Validate that it's a proper OpenAlex ID for the entity type
	if (!isValidOpenAlexId(entityType, cleanId)) {
		// If validation fails, still construct the URL but let the app handle 404s
		console.warn(`Invalid OpenAlex ID format for ${entityType}: ${cleanId}`)
	}

	return `${basePath}/${entityType}/${cleanId}`
};

/**
 * Validates OpenAlex ID format against entity type
 * @param entityType
 * @param entityId
 */
const isValidOpenAlexId = (entityType: EntityType, entityId: string): boolean => {
	// Check if ID starts with correct prefix for entity type
	const prefixMap: Record<EntityType, string> = {
		works: "W",
		authors: "A",
		sources: "S",
		institutions: "I",
		publishers: "P",
		concepts: "C",
		funders: "F",
		topics: "T",
		keywords: "K",
		domains: "D",
		subfields: "SF",
		fields: "FI"
	}

	const expectedPrefix = prefixMap[entityType]
	if (!expectedPrefix) {
		return false // Unknown entity type
	}

	// Check prefix and that it's followed by digits
	const prefixPattern = new RegExp(String.raw`^${expectedPrefix}\d+$`)
	return prefixPattern.test(entityId)
};

/**
 * Detects if a URL is an external identifier URL
 * This is useful for backward compatibility with existing bookmark data
 * @param url
 */
export const isExternalIdentifierUrl = (url: string): boolean => /^https?:\/\/(?:doi\.org|orcid\.org|ror\.org)\//i.test(url);

/**
 * Extracts entity type and ID from existing app URLs
 * Useful for migration and backward compatibility
 * @param url
 */
export const parseExistingAppUrl = (url: string): { entityType?: EntityType; entityId?: string } | null => {
	try {
		const urlObj = new URL(url)
		const pathname = urlObj.pathname

		// Handle GitHub Pages base path
		const pathWithoutBase = pathname.startsWith(GITHUB_PAGES_BASE_PATH)
			? pathname.slice(GITHUB_PAGES_BASE_PATH.length)
			: pathname

		// Parse entity routes: /works/W123, /authors/A456, etc.
		const entityRouteMatch = pathWithoutBase.match(/^\/([^/]+)\/([^/]+)$/)
		if (entityRouteMatch) {
			const entityType = entityRouteMatch[1]
			const entityId = entityRouteMatch[2]

			// Validate entity type
			const validEntityTypes: EntityType[] = ["works", "authors", "sources", "institutions", "publishers", "concepts", "funders", "topics", "keywords", "domains", "fields", "subfields"]
			if (validEntityTypes.includes(entityType as EntityType)) {
				return {
					entityType: entityType as EntityType,
					entityId
				}
			}
		}

		// Handle DOI routes: /doi/10.1234/example
		const doiRouteMatch = pathWithoutBase.match(/^\/doi\/(.+)$/)
		if (doiRouteMatch) {
			const doi = doiRouteMatch[1]
			if (/^10\.\d+\/\S+$/.test(doi)) {
				return {
					entityType: "works" as EntityType,
					entityId: `https://doi.org/${doi}`
				}
			}
		}

		// Handle ORCID routes: /authors/orcid/0000-0000-0000-0000
		const orcidRouteMatch = pathWithoutBase.match(/^\/authors\/orcid\/(.+)$/)
		if (orcidRouteMatch) {
			const orcid = orcidRouteMatch[1]
			if (/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(orcid)) {
				return {
					entityType: "authors" as EntityType,
					entityId: `https://orcid.org/${orcid}`
				}
			}
		}

		// Handle ROR routes: /institutions/ror/02y3ad647
		const rorRouteMatch = pathWithoutBase.match(/^\/institutions\/ror\/(.+)$/)
		if (rorRouteMatch) {
			const ror = rorRouteMatch[1]
			if (/^[0-9a-z]{9}$/i.test(ror) && /[a-z]/i.test(ror)) {
				return {
					entityType: "institutions" as EntityType,
					entityId: `https://ror.org/${ror}`
				}
			}
		}

		// Handle ISSN routes: /sources/issn/1234-5678
		const issnRouteMatch = pathWithoutBase.match(/^\/sources\/issn\/(.+)$/)
		if (issnRouteMatch) {
			const issn = issnRouteMatch[1]
			if (/^\d{4}-\d{3}[0-9X]$/i.test(issn)) {
				return {
					entityType: "sources" as EntityType,
					entityId: issn
				}
			}
		}

		return null
	} catch {
		// Invalid URL format
		return null
	}
};

/**
 * Creates a URL reconstruction function with fixed options
 * Useful for creating app-specific reconstruction utilities
 * @param options
 */
export const createUrlReconstructor = (options: UrlReconstructionOptions) => (entityType: EntityType, entityId: string): string => reconstructEntityUrl(entityType, entityId, options);

/**
 * Default URL reconstructor for standard deployment
 */
export const reconstructStandardUrl = createUrlReconstructor({
	basePath: DEFAULT_BASE_PATH,
	preserveExternalUrls: false
})

/**
 * URL reconstructor for GitHub Pages deployment
 */
export const reconstructGitHubPagesUrl = createUrlReconstructor({
	basePath: GITHUB_PAGES_BASE_PATH,
	preserveExternalUrls: false
})