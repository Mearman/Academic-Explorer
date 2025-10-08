/**
 * Type Guards - Minimal implementation
 */

import type {
  Work,
  Author,
  Source,
  InstitutionEntity,
  Topic,
  Publisher,
  Funder,
  OpenAlexEntity,
} from "./types";

export function isWork(entity: unknown): entity is Work {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("W");
}

export function isAuthor(entity: unknown): entity is Author {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("A");
}

export function isSource(entity: unknown): entity is Source {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("S");
}

export function isInstitution(entity: unknown): entity is InstitutionEntity {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("I");
}

export function isTopic(entity: unknown): entity is Topic {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("T");
}

export function isConcept(entity: unknown): entity is Topic {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("C");
}

export function isPublisher(entity: unknown): entity is Publisher {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("P");
}

export function isFunder(entity: unknown): entity is Funder {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return "id" in obj && typeof obj.id === "string" && obj.id.startsWith("F");
}

export function isKeyword(
  entity: unknown,
): entity is { id: string; display_name: string } {
  return (
    typeof entity === "object" && entity !== null && "display_name" in entity
  );
}

export function getEntityType(entity: OpenAlexEntity): string {
  if (isWork(entity)) return "works";
  if (isAuthor(entity)) return "authors";
  if (isSource(entity)) return "sources";
  if (isInstitution(entity)) return "institutions";
  if (isTopic(entity)) return "topics";
  if (isPublisher(entity)) return "publishers";
  if (isFunder(entity)) return "funders";
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
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj && typeof obj.id === "string" && /^[WASIJTPF]\d+/.test(obj.id)
  );
}
