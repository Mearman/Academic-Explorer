/**
 * Entity type detection utilities for CLI
 */

import type { EntityType } from "@academic-explorer/client";

/**
 * Map OpenAlex ID prefixes to entity types
 */
function prefixToEntityType(prefix: string): EntityType {
	switch (prefix) {
		case "W":
			return "works";
		case "A":
			return "authors";
		case "S":
			return "sources";
		case "I":
			return "institutions";
		case "T":
			return "topics";
		case "C":
			return "concepts";
		case "P":
			return "publishers";
		case "F":
			return "funders";
		default:
			throw new Error(`Unknown entity prefix: ${prefix}`);
	}
}

/**
 * Detect entity type from OpenAlex ID
 */
export function detectEntityType(entityId: string): EntityType {
	// Detect from ID format (W123456789, A123456789, etc.)
	const match = entityId.match(/^https:\/\/openalex\.org\/([WASITPF])\d+$/);
	if (match?.[1]) {
		const prefix = match[1];
		return prefixToEntityType(prefix);
	}

	// Handle bare IDs
	const bareMatch = entityId.match(/^([WASITPF])\d+$/);
	if (bareMatch?.[1]) {
		const prefix = bareMatch[1];
		return prefixToEntityType(prefix);
	}

	throw new Error(`Cannot detect entity type from ID: ${entityId}`);
}

/**
 * Supported entity types for CLI operations
 */
export const SUPPORTED_ENTITIES = [
	"authors",
	"works",
	"institutions",
	"topics",
	"publishers",
	"funders"
] as const;

export type StaticEntityType = typeof SUPPORTED_ENTITIES[number];

/**
 * Convert EntityType to StaticEntityType
 */
function toStaticEntityType(entityType: EntityType): StaticEntityType {
	if (SUPPORTED_ENTITIES.includes(entityType as StaticEntityType)) {
		return entityType as StaticEntityType;
	}
	throw new Error(`Unsupported entity type for CLI: ${entityType}`);
}