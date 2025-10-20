/**
 * Generic validation utilities and type guards
 * These replace type assertions to provide safe runtime type validation
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
 * Trust external API contract after validation
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
export function extractProperty({
  obj,
  key,
}: {
  obj: Record<string, unknown>;
  key: string;
}): unknown {
  return obj[key];
}

/**
 * Type guard to check if a string is within a specific set of values
 * @param value - String to check
 * @param validValues - Array of valid values
 * @returns True if value is in validValues
 */
export function isStringInSet<T extends string>(params: {
  value: string;
  validValues: readonly T[];
}): params is { value: T; validValues: readonly T[] } {
  const { value, validValues } = params;
  return validValues.includes(value as T);
}

/**
 * Safely convert string to enum-like type with validation
 * @param value - String to convert
 * @param validValues - Array of valid enum values
 * @returns Enum value if valid, null if invalid
 */
export function safeParseEnum<T extends string>({
  value,
  validValues,
}: {
  value: string;
  validValues: readonly T[];
}): T | null {
  return isStringInSet({ value, validValues }) ? (value as T) : null;
}

/**
 * Assert that a value is within a specific set, throwing an error if invalid
 * Use only when you're certain the value should be valid
 */
export function assertStringInSet<T extends string>(params: {
  value: string;
  validValues: readonly T[];
  typeName: string;
}): asserts params is {
  value: T;
  validValues: readonly T[];
  typeName: string;
} {
  const { value, validValues, typeName } = params;
  if (!isStringInSet({ value, validValues })) {
    throw new Error(
      `Invalid ${typeName}: ${value}. Valid values: ${validValues.join(", ")}`,
    );
  }
}

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === "string";
}

/**
 * Type guard to check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value);
}

/**
 * Type guard to check if value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Type guard to check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Type guard to check if value is a non-empty array
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Type guard to check if value is a function
 */
export function isFunction(
  value: unknown,
): value is (...args: unknown[]) => unknown {
  return typeof value === "function";
}

/**
 * Type guard to check if value is null
 */
export function isNull(value: unknown): value is null {
  return value === null;
}

/**
 * Type guard to check if value is undefined
 */
export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

/**
 * Type guard to check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Type guard to check if value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if string is non-empty
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/**
 * Type guard to check if string is a valid URL
 */
export function isValidUrl(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type guard to check if string is a valid email
 */
export function isValidEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

/**
 * Type guard factory for objects with specific properties
 */
export function hasProperty<K extends string>(params: {
  obj: unknown;
  key: K;
}): params is { obj: Record<K, unknown>; key: K } {
  const { obj, key } = params;
  return isRecord(obj) && key in obj;
}

/**
 * Type guard factory for objects with specific property types
 */
export function hasPropertyOfType<T>(params: {
  obj: unknown;
  key: string;
  typeGuard: (value: unknown) => value is T;
}): params is {
  obj: Record<string, unknown> & { [K in typeof params.key]: T };
  key: string;
  typeGuard: (value: unknown) => value is T;
} {
  const { obj, key, typeGuard } = params;
  return (
    hasProperty({ obj, key }) &&
    typeGuard((obj as Record<string, unknown>)[key])
  );
}

/**
 * Create a type guard for objects matching a specific shape
 */
export function createShapeValidator<T>(validators: {
  [K in keyof T]: (value: unknown) => value is T[K];
}) {
  return (obj: unknown): obj is T => {
    if (!isRecord(obj)) return false;

    for (const [key, validator] of Object.entries(validators)) {
      if (!(validator as (value: unknown) => boolean)(obj[key])) return false;
    }

    return true;
  };
}

/**
 * Validate that an array contains only items of a specific type
 */
export function isArrayOfType<T>(params: {
  value: unknown;
  itemGuard: (item: unknown) => item is T;
}): params is { value: T[]; itemGuard: (item: unknown) => item is T } {
  const { value, itemGuard } = params;
  return isArray(value) && value.every(itemGuard);
}

/**
 * Safely parse JSON with type validation
 */
export function safeJsonParse<T>({
  jsonString,
  validator,
}: {
  jsonString: string;
  validator: (value: unknown) => value is T;
}): T | null {
  try {
    const parsed = JSON.parse(jsonString);
    return validator(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Define valid relation types for graph relationships
const VALID_RELATION_TYPES = [
  "cites",
  "cited_by",
  "references",
  "authored_by",
  "published_in",
  "affiliated_with",
  "funded_by",
  "related_to",
] as const;

export type RelationType = (typeof VALID_RELATION_TYPES)[number];

/**
 * Safely parse relation type with validation
 */
export function safeParseRelationType(value: string): RelationType | null {
  return safeParseEnum({ value, validValues: VALID_RELATION_TYPES });
}

// Define valid expansion targets for graph expansion
const VALID_EXPANSION_TARGETS = [
  "authors",
  "works",
  "institutions",
  "topics",
  "sources",
  "publishers",
  "funders",
  "citations",
  "references",
] as const;

export type ExpansionTarget = (typeof VALID_EXPANSION_TARGETS)[number];

/**
 * Safely parse expansion target with validation
 */
export function safeParseExpansionTarget(
  value: string,
): ExpansionTarget | null {
  return safeParseEnum({ value, validValues: VALID_EXPANSION_TARGETS });
}
