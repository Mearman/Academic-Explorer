/**
 * Type Guards - Minimal implementation
 */

import type { Work, Author, Source, InstitutionEntity, Topic, Publisher, Funder, OpenAlexEntity } from './types';

export function isWork(entity: unknown): entity is Work {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('W');
}

export function isAuthor(entity: unknown): entity is Author {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('A');
}

export function isSource(entity: unknown): entity is Source {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('S');
}

export function isInstitution(entity: unknown): entity is InstitutionEntity {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('I');
}

export function isTopic(entity: unknown): entity is Topic {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('T');
}

export function isConcept(entity: unknown): entity is Topic {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('C');
}

export function isPublisher(entity: unknown): entity is Publisher {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('P');
}

export function isFunder(entity: unknown): entity is Funder {
  return typeof entity === 'object' && entity !== null && 'id' in entity &&
    typeof (entity as Record<string, unknown>).id === 'string' &&
    (entity as Record<string, unknown>).id?.toString().startsWith('F');
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
    typeof (entity as Record<string, unknown>).id === 'string' &&
    /^[WASIJTPF]\d+/.test((entity as Record<string, unknown>).id?.toString() || '');
}