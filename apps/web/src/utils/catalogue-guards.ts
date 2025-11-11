/**
 * Type guard functions for catalogue entity metadata
 *
 * These functions provide runtime type narrowing for discriminated union types,
 * allowing TypeScript to safely access entity-specific metadata fields.
 *
 * Feature: 004-fix-failing-tests
 * Created: 2025-11-11
 */

import type {
  EntityMetadata,
  WorkMetadata,
  AuthorMetadata,
  InstitutionMetadata,
  SourceMetadata,
  TopicMetadata,
  FunderMetadata,
  PublisherMetadata,
  ConceptMetadata,
} from '../types/catalogue';

export function isWorkMetadata(metadata: EntityMetadata): metadata is WorkMetadata {
  return metadata.type === 'work';
}

export function isAuthorMetadata(metadata: EntityMetadata): metadata is AuthorMetadata {
  return metadata.type === 'author';
}

export function isInstitutionMetadata(metadata: EntityMetadata): metadata is InstitutionMetadata {
  return metadata.type === 'institution';
}

export function isSourceMetadata(metadata: EntityMetadata): metadata is SourceMetadata {
  return metadata.type === 'source';
}

export function isTopicMetadata(metadata: EntityMetadata): metadata is TopicMetadata {
  return metadata.type === 'topic';
}

export function isFunderMetadata(metadata: EntityMetadata): metadata is FunderMetadata {
  return metadata.type === 'funder';
}

export function isPublisherMetadata(metadata: EntityMetadata): metadata is PublisherMetadata {
  return metadata.type === 'publisher';
}

export function isConceptMetadata(metadata: EntityMetadata): metadata is ConceptMetadata {
  return metadata.type === 'concept';
}
