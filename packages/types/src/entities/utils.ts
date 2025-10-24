/**
 * General utility functions for OpenAlex API
 */

export function hasProperty<T extends Record<string, unknown>>(params: {
	obj: unknown
	prop: string
}): params is { obj: T & Record<typeof params.prop, unknown>; prop: string } {
	const { obj, prop } = params
	return typeof obj === "object" && obj !== null && prop in obj
}

export function isNonNull<T>(value: T | null | undefined): value is T {
	return value !== null && value !== undefined
}

/**
 * Type guard to verify if value is a record object
 * Returns true if the value is a valid Record<string, unknown>
 */
export function isRecord(obj: unknown): obj is Record<string, unknown> {
	return typeof obj === "object" && obj !== null && !Array.isArray(obj)
}

/**
 * Safely convert validated object to record
 * This function assumes the object has already been validated as a record
 */
export function trustObjectShape(obj: unknown): Record<string, unknown> {
	if (!isRecord(obj)) {
		throw new Error("Object is not a valid record type")
	}
	// TypeScript knows this is a Record<string, unknown> after type guard
	return obj
}

/**
 * Extract a property value from an object with unknown structure
 * Returns unknown type that must be validated by caller
 */
export function extractPropertyValue({
	obj,
	key,
}: {
	obj: Record<string, unknown>
	key: string
}): unknown {
	return obj[key]
}

/**
 * Creates a type guard function from a Zod schema
 * Can be used in TypeScript type guard positions for runtime validation
 */
export function createSchemaTypeGuard<T>(schema: {
	parse: (data: unknown) => T
}): (data: unknown) => data is T {
	return (data: unknown): data is T => {
		try {
			schema.parse(data)
			return true
		} catch {
			return false
		}
	}
}

/**
 * Validates data with a Zod schema and returns typed result
 * Throws an error if validation fails
 */
export function validateWithSchema<T>({
	data,
	schema,
}: {
	data: unknown
	schema: { parse: (data: unknown) => T }
}): T {
	return schema.parse(data)
}
