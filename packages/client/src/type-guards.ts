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
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("a") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/a"))
  );
}

export function isSource(entity: unknown): entity is Source {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("s") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/s"))
  );
}

export function isInstitution(entity: unknown): entity is InstitutionEntity {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("i") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/i"))
  );
}

export function isTopic(entity: unknown): entity is Topic {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("t") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/t"))
  );
}

export function isConcept(entity: unknown): entity is Topic {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("c") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/c"))
  );
}

export function isPublisher(entity: unknown): entity is Publisher {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("p") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/p"))
  );
}

export function isFunder(entity: unknown): entity is Funder {
  if (typeof entity !== "object" || entity === null) return false;
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj &&
    typeof obj.id === "string" &&
    (obj.id.toLowerCase().startsWith("f") ||
      obj.id.toLowerCase().startsWith("https://openalex.org/f"))
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
  const obj = entity as Record<string, unknown>;
  return (
    "id" in obj && typeof obj.id === "string" && /^[WASIJTPF]\d+/.test(obj.id)
  );
}
