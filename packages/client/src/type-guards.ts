/**
 * Type Guards - Minimal implementation
 */

import type { Work, Author, Source, InstitutionEntity, Topic, Publisher, Funder, OpenAlexEntity } from './types';

export function isWork(entity: unknown): entity is Work {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('W');
}

export function isAuthor(entity: unknown): entity is Author {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('A');
}

export function isSource(entity: unknown): entity is Source {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('S');
}

export function isInstitution(entity: unknown): entity is InstitutionEntity {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('I');
}

export function isTopic(entity: unknown): entity is Topic {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('T');
}

export function isConcept(entity: unknown): entity is Topic {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('C');
}

export function isPublisher(entity: unknown): entity is Publisher {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('P');
}

export function isFunder(entity: unknown): entity is Funder {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && (entity as any).id.startsWith('F');
}

export function isKeyword(entity: unknown): entity is { id: string; display_name: string } {
  return typeof entity === 'object' && entity !== null && 'display_name' in entity;
}

export function getEntityType(entity: OpenAlexEntity): string {
  if (isWork(entity)) return 'works';
  if (isAuthor(entity)) return 'authors';
  if (isSource(entity)) return 'sources';
  if (isInstitution(entity)) return 'institutions';
  if (isTopic(entity)) return 'topics';
  if (isPublisher(entity)) return 'publishers';
  if (isFunder(entity)) return 'funders';
  return 'unknown';
}

export function hasProperty<T extends Record<string, unknown>>(obj: unknown, prop: string): obj is T & Record<typeof prop, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj;
}

export function isNonNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isOpenAlexEntity(entity: unknown): entity is OpenAlexEntity {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as any).id === 'string' && /^[WASIJTPF]\d+/.test((entity as any).id);
}