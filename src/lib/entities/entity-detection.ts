/**
 * Entity type detection utilities
 * Separated from EntityFactory to avoid circular dependencies
 */

import type { EntityType } from "@/lib/graph/types";
import type { OpenAlexEntity } from "@/lib/openalex/types";

/**
 * Detect entity type from OpenAlex ID or entity data
 */
export function detectEntityType(entityOrId: OpenAlexEntity | string): EntityType {
	if (typeof entityOrId === "string") {
		// Detect from ID format (W123456789, A123456789, etc.)
		const match = entityOrId.match(/^https:\/\/openalex\.org\/([WASITP])\d+$/);
		if (match) {
			const prefix = match[1];
			return prefixToEntityType(prefix);
		}

		// Handle bare IDs
		const bareMatch = entityOrId.match(/^([WASITP])\d+$/);
		if (bareMatch) {
			const prefix = bareMatch[1];
			return prefixToEntityType(prefix);
		}

		throw new Error(`Cannot detect entity type from ID: ${entityOrId}`);
	}

	// Detect from entity data structure
	if ("authorships" in entityOrId) return "works";
	if ("works_count" in entityOrId && "orcid" in entityOrId) return "authors";
	if ("issn_l" in entityOrId) return "sources";
	if ("ror" in entityOrId) return "institutions";

	throw new Error("Cannot detect entity type from entity data");
}

/**
 * Convert OpenAlex ID prefix to entity type
 */
function prefixToEntityType(prefix: string): EntityType {
	switch (prefix) {
		case "W": return "works";
		case "A": return "authors";
		case "S": return "sources";
		case "I": return "institutions";
		case "T": return "topics";
		case "P": return "publishers";
		default:
			throw new Error(`Unknown entity prefix: ${prefix}`);
	}
}