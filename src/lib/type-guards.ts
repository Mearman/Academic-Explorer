/**
 * Type guard utilities for runtime type checking
 * These replace type assertions to provide safe runtime type validation
 */

import { RelationType } from "@/lib/graph/types";
import type { EntityType } from "@/lib/openalex/types";

/**
 * Type guard to check if a string is a valid RelationType
 */
export function isRelationType(value: string): value is RelationType {
	const relationTypeValues = Object.values(RelationType);
	return relationTypeValues.includes(value);
}

/**
 * Type guard to check if a string is a valid EntityType
 */
export function isEntityType(value: string): value is EntityType {
	const validEntityTypes = [
		"works",
		"authors",
		"sources",
		"institutions",
		"topics",
		"concepts",
		"publishers",
		"funders",
		"keywords"
	];
	return validEntityTypes.includes(value);
}

/**
 * Safely convert string to RelationType with validation
 * @param value - String to convert
 * @returns RelationType if valid, null if invalid
 */
export function safeParseRelationType(value: string): RelationType | null {
	return isRelationType(value) ? value : null;
}

/**
 * Safely convert string to EntityType with validation
 * @param value - String to convert
 * @returns EntityType if valid, null if invalid
 */
export function safeParseEntityType(value: string): EntityType | null {
	return isEntityType(value) ? value : null;
}

/**
 * Assert that a value is a RelationType, throwing an error if invalid
 * Use only when you're certain the value should be valid
 */
export function assertRelationType(value: string): asserts value is RelationType {
	if (!isRelationType(value)) {
		throw new Error(`Invalid RelationType: ${value}`);
	}
}

/**
 * Assert that a value is an EntityType, throwing an error if invalid
 * Use only when you're certain the value should be valid
 */
export function assertEntityType(value: string): asserts value is EntityType {
	if (!isEntityType(value)) {
		throw new Error(`Invalid EntityType: ${value}`);
	}
}