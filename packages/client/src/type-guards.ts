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

export function isAuthor(entity: OpenAlexEntity): entity is Author {
  return (
    entity.id.toLowerCase().startsWith("a") ||
    entity.id.toLowerCase().startsWith("https://openalex.org/a")
  );
}

export function isSource(entity: OpenAlexEntity): entity is Source {
  return (
    entity.id.toLowerCase().startsWith("s") ||
    entity.id.toLowerCase().startsWith("https://openalex.org/s")
  );
}

export function isInstitution(
  entity: OpenAlexEntity,
): entity is InstitutionEntity {
  return (
    entity.id.toLowerCase().startsWith("i") ||
    entity.id.toLowerCase().startsWith("https://openalex.org/i")
  );
}

export function isTopic(entity: OpenAlexEntity): entity is Topic {
  return (
    entity.id.toLowerCase().startsWith("t") ||
    entity.id.toLowerCase().startsWith("https://openalex.org/t")
  );
}

export function isConcept(entity: OpenAlexEntity): entity is Topic {
  return (
    entity.id.toLowerCase().startsWith("c") ||
    entity.id.toLowerCase().startsWith("https://openalex.org/c")
  );
}

export function isPublisher(entity: OpenAlexEntity): entity is Publisher {
  return (
    entity.id.toLowerCase().startsWith("p") ||
    entity.id.toLowerCase().startsWith("https://openalex.org/p")
  );
}

export function isFunder(entity: OpenAlexEntity): entity is Funder {
  return (
    entity.id.toLowerCase().startsWith("f") ||
    entity.id.toLowerCase().startsWith("https://openalex.org/f")
  );
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
  const obj = entity;
  return (
    "id" in obj && typeof obj.id === "string" && /^[WASIJTPF]\d+/.test(obj.id)
  );
}
