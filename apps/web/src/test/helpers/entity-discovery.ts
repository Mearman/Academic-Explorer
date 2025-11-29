/**
 * Runtime Entity Discovery
 *
 * Fetches fresh entity IDs from OpenAlex API for E2E testing.
 * Provides up-to-date entity IDs to ensure tests use valid data.
 */

import type { EntityType } from "@bibgraph/types";

import { SAMPLE_ENTITIES, SAMPLE_EXTERNAL_IDS } from "../fixtures/sample-entities";

const OPENALEX_API_BASE = "https://api.openalex.org";

/**
 * Cache for discovered entity IDs to avoid repeated API calls
 */
const entityCache = new Map<EntityType, string>();
const externalIdCache = new Map<string, string>();

/**
 * Discover a valid entity ID from OpenAlex API
 *
 * Fetches the first result from the entity type's list endpoint.
 * Caches results for the test session to minimize API calls.
 *
 * @param type - The entity type to fetch
 * @returns The discovered entity ID, or null if discovery fails
 */
export async function discoverEntityId(type: EntityType): Promise<string | null> {
	// Check cache first
	if (entityCache.has(type)) {
		return entityCache.get(type)!;
	}

	try {
		const url = `${OPENALEX_API_BASE}/${type}?per_page=1&select=id`;
		const response = await fetch(url, {
			headers: {
				"User-Agent": "BibGraph-E2E-Tests (https://github.com/Mearman/BibGraph)",
			},
		});

		if (!response.ok) {
			console.warn(`Failed to fetch ${type} from OpenAlex: ${response.status}`);
			return null;
		}

		const data = await response.json();
		if (!data.results || data.results.length === 0) {
			console.warn(`No results found for ${type}`);
			return null;
		}

		// Extract short ID from full URL (e.g., "https://openalex.org/W123" -> "W123")
		const fullId = data.results[0].id as string;
		const shortId = fullId.split("/").pop()!;

		entityCache.set(type, shortId);
		return shortId;
	} catch (error) {
		console.warn(`Error discovering ${type}:`, error);
		return null;
	}
}

/**
 * Get an entity ID, preferring runtime discovery with fallback to sample
 *
 * @param type - The entity type
 * @returns A valid entity ID (from API or fallback)
 */
export async function getEntityId(type: EntityType): Promise<string> {
	const discovered = await discoverEntityId(type);
	return discovered ?? SAMPLE_ENTITIES[type];
}

/**
 * Discover external IDs from OpenAlex API
 *
 * Fetches entities with specific external identifiers (ORCID, DOI, ISSN, ROR).
 */
export async function discoverExternalId(
	idType: "orcid" | "issn" | "ror" | "doi"
): Promise<string | null> {
	// Check cache first
	if (externalIdCache.has(idType)) {
		return externalIdCache.get(idType)!;
	}

	try {
		let url: string;
		let extractId: (data: unknown) => string | null;

		switch (idType) {
			case "orcid":
				url = `${OPENALEX_API_BASE}/authors?filter=has_orcid:true&per_page=1&select=orcid`;
				extractId = (data: unknown) => {
					const results = (data as { results?: { orcid?: string }[] }).results;
					const orcid = results?.[0]?.orcid;
					// Extract ORCID from full URL (e.g., "https://orcid.org/0000-0002-1234-5678")
					return orcid?.split("/").pop() ?? null;
				};
				break;

			case "doi":
				url = `${OPENALEX_API_BASE}/works?filter=has_doi:true&per_page=1&select=doi`;
				extractId = (data: unknown) => {
					const results = (data as { results?: { doi?: string }[] }).results;
					const doi = results?.[0]?.doi;
					// Extract DOI from full URL (e.g., "https://doi.org/10.1234/example")
					return doi?.replace("https://doi.org/", "") ?? null;
				};
				break;

			case "issn":
				url = `${OPENALEX_API_BASE}/sources?filter=type:journal&per_page=1&select=issn`;
				extractId = (data: unknown) => {
					const results = (data as { results?: { issn?: string[] }[] }).results;
					return results?.[0]?.issn?.[0] ?? null;
				};
				break;

			case "ror":
				url = `${OPENALEX_API_BASE}/institutions?per_page=1&select=ror`;
				extractId = (data: unknown) => {
					const results = (data as { results?: { ror?: string }[] }).results;
					const ror = results?.[0]?.ror;
					// Extract ROR ID from full URL (e.g., "https://ror.org/00cvxb145")
					return ror?.split("/").pop() ?? null;
				};
				break;
		}

		const response = await fetch(url, {
			headers: {
				"User-Agent": "BibGraph-E2E-Tests (https://github.com/Mearman/BibGraph)",
			},
		});

		if (!response.ok) {
			console.warn(`Failed to fetch ${idType} from OpenAlex: ${response.status}`);
			return null;
		}

		const data = await response.json();
		const externalId = extractId(data);

		if (externalId) {
			externalIdCache.set(idType, externalId);
		}

		return externalId;
	} catch (error) {
		console.warn(`Error discovering ${idType}:`, error);
		return null;
	}
}

/**
 * Get an external ID, preferring runtime discovery with fallback to sample
 */
export async function getExternalId(
	idType: "orcid" | "issn" | "ror" | "doi"
): Promise<string> {
	const discovered = await discoverExternalId(idType);
	return discovered ?? SAMPLE_EXTERNAL_IDS[idType];
}

/**
 * Clear the entity cache (useful between test runs)
 */
export function clearEntityCache(): void {
	entityCache.clear();
	externalIdCache.clear();
}

/**
 * Pre-warm the cache by discovering all entity types in parallel
 *
 * Call this in test setup to minimize latency during tests.
 */
export async function prewarmEntityCache(): Promise<void> {
	const entityTypes: EntityType[] = [
		"works",
		"authors",
		"sources",
		"institutions",
		"topics",
		"publishers",
		"funders",
		"concepts",
		"keywords",
		"domains",
		"fields",
		"subfields",
	];

	const externalIdTypes: ("orcid" | "issn" | "ror" | "doi")[] = [
		"orcid",
		"issn",
		"ror",
		"doi",
	];

	// Discover all entity types in parallel
	await Promise.all([
		...entityTypes.map((type) => discoverEntityId(type)),
		...externalIdTypes.map((type) => discoverExternalId(type)),
	]);
}
