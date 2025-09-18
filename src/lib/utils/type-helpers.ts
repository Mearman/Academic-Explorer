/**
 * Type helper utilities for handling external API responses and type casting
 * These utilities encapsulate necessary type assertions in a controlled manner.
 */

/**
 * Validates and returns external API response data
 * This performs basic validation before trusting external type contracts
 */
export function validateApiResponse(data: unknown): NonNullable<unknown> {
	// Basic validation that we received some data
	if (data === null || data === undefined) {
		throw new Error("Received null or undefined response from API");
	}

	// Return validated data that is guaranteed to be non-null
	return data;
}

/**
 * UNAVOIDABLE TYPE ASSERTION: Trust external API contract after validation
 * This function exists to isolate the one place where we must trust external APIs
 * All external API responses eventually need this assertion due to TypeScript limitations
 */
export function trustApiContract(validatedData: NonNullable<unknown>): unknown {
	// Return the validated data as unknown for further type checking
	return validatedData;
}

/**
 * Type guard to verify if value is a record object
 * Returns true if the value is a valid Record<string, unknown>
 */
export function isRecord(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj);
}

/**
 * Safely convert validated object to record
 * This function assumes the object has already been validated as a record
 */
export function trustObjectShape(obj: unknown): Record<string, unknown> {
	if (!isRecord(obj)) {
		throw new Error("Object is not a valid record type");
	}
	// TypeScript knows this is a Record<string, unknown> after type guard
	return obj;
}

/**
 * Extract a property value from an object with unknown structure
 * Returns unknown type that must be validated by caller
 */
export function extractProperty(obj: Record<string, unknown>, key: string): unknown {
	return obj[key];
}