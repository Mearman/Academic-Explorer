/**
 * Utilities for working with partially hydrated OpenAlex entities
 * Only 'id' is guaranteed - all other fields may be present or absent
 */

/**
 * Type guard to check if an entity has a specific field hydrated
 */
export function hasField<T, K extends keyof T>(
	entity: T,
	field: K
): entity is T & Required<Pick<T, K>> {
	return entity[field] !== undefined;
}

/**
 * Type guard to check if an entity has multiple fields hydrated
 */
export function hasFields<T, K extends keyof T>(
	entity: T,
	...fields: K[]
): entity is T & Required<Pick<T, K>> {
	return fields.every(field => entity[field] !== undefined);
}

/**
 * Get list of all hydrated fields (excluding 'id' which is always present)
 */
export function getHydratedFields(entity: Record<string, unknown>): string[] {
	return Object.keys(entity).filter(key =>
		entity[key] !== undefined && key !== "id"
	);
}

/**
 * Check if an entity is minimally hydrated (only id and maybe display_name)
 */
export function isMinimallyHydrated(entity: Record<string, unknown>): boolean {
	return getHydratedFields(entity).length <= 1;
}

/**
 * Check if an entity appears to be fully hydrated (has many fields)
 */
export function isFullyHydrated(entity: Record<string, unknown>): boolean {
	return getHydratedFields(entity).length > 10;
}

/**
 * Safe array operations that handle undefined arrays
 */
export function safeSlice<T>(array: T[] | undefined, start?: number, end?: number): T[] {
	return array?.slice(start, end) ?? [];
}

export function safeMap<T, R>(array: T[] | undefined, fn: (item: T, index: number) => R): R[] {
	return array?.map(fn) ?? [];
}

export function safeForEach<T>(array: T[] | undefined, fn: (item: T, index: number) => void): void {
	array?.forEach(fn);
}

export function safeLength(array: unknown[] | undefined): number {
	return array?.length ?? 0;
}

export function safeFind<T>(array: T[] | undefined, predicate: (item: T) => boolean): T | undefined {
	return array?.find(predicate);
}

export function safeFilter<T>(array: T[] | undefined, predicate: (item: T) => boolean): T[] {
	return array?.filter(predicate) ?? [];
}