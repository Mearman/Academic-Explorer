/**
 * Type Guards - Minimal implementation
 */

import type {
  Work,
  Author,
  Source,
  InstitutionEntity,
  Topic,
  Concept,
  Publisher,
  Funder,
  Keyword,
  OpenAlexEntity,
} from "./entities";

export function isWork(entity: unknown): entity is Work {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  if (!("id" in obj) || typeof obj.id !== "string") return false;
  const id = obj.id;
  return (
    id.startsWith("W") ||
    id.startsWith("w") ||
    id.startsWith("https://openalex.org/W") ||
    id.startsWith("https://openalex.org/w")
  );
}

export function isAuthor(entity: unknown): entity is Author {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("a") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/a"))
  );
}

export function isSource(entity: unknown): entity is Source {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("s") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/s"))
  );
}

export function isInstitution(entity: unknown): entity is InstitutionEntity {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("i") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/i"))
  );
}

export function isTopic(entity: unknown): entity is Topic {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("t") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/t"))
  );
}

export function isConcept(entity: unknown): entity is Concept {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("c") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/c"))
  );
}

export function isPublisher(entity: unknown): entity is Publisher {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("p") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/p"))
  );
}

export function isFunder(entity: unknown): entity is Funder {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("f") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/f"))
  );
}

export function isKeyword(entity: unknown): entity is Keyword {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("k") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/k"))
  );
}

export function getEntityType(entity: OpenAlexEntity): string {
  if (isWork(entity)) return "works";
  if (isAuthor(entity)) return "authors";
  if (isSource(entity)) return "sources";
  if (isInstitution(entity)) return "institutions";
  if (isTopic(entity)) return "topics";
  if (isConcept(entity)) return "concepts";
  if (isPublisher(entity)) return "publishers";
  if (isFunder(entity)) return "funders";
  if (isKeyword(entity)) return "keywords";
  return "unknown";
}

export function hasProperty<T extends Record<string, unknown>>(
  obj: unknown,
  prop: string,
): obj is T & Record<typeof prop, unknown> {
  return typeof obj === "object" && obj !== null && prop in obj;
}

export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isOpenAlexEntity(entity: unknown): entity is OpenAlexEntity {
  return (
    isWork(entity) ||
    isAuthor(entity) ||
    isSource(entity) ||
    isInstitution(entity) ||
    isTopic(entity) ||
    isConcept(entity) ||
    isPublisher(entity) ||
    isFunder(entity) ||
    isKeyword(entity)
  );
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
export function extractPropertyValue(
  obj: Record<string, unknown>,
  key: string,
): unknown {
  return obj[key];
}

/**
 * Basic ID validation functions
 */
export function isOpenAlexId(id: string): boolean {
  return /^https:\/\/openalex\.org\/[A-Z]\d+$/.test(id);
}

export function isValidDateString(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export function isValidDOI(doi: string): boolean {
  return doi.startsWith("10.") && doi.includes("/");
}

export function isValidORCID(orcid: string): boolean {
  return /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid);
}

export function isValidROR(ror: string): boolean {
  return ror.startsWith("https://ror.org/") || ror.startsWith("0");
}

export function isValidISSN(issn: string): boolean {
  return /^\d{4}-\d{3}[\dX]$/.test(issn);
}

export function isValidWikidataId(id: string): boolean {
  return id.startsWith("Q") && /^\d+$/.test(id.substring(1));
}

/**
 * Creates a type guard function from a Zod schema
 * Can be used in TypeScript type guard positions for runtime validation
 */
export function createSchemaTypeGuard<T>(schema: {
  parse: (data: unknown) => T;
}): (data: unknown) => data is T {
  return (data: unknown): data is T => {
    try {
      schema.parse(data);
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * Validates data with a Zod schema and returns typed result
 * Throws an error if validation fails
 */
export function validateWithSchema<T>(
  data: unknown,
  schema: { parse: (data: unknown) => T },
): T {
  return schema.parse(data);
}
