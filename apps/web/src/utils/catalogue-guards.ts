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
  AuthorMetadata,
  ConceptMetadata,
  EntityMetadata,
  FunderMetadata,
  InstitutionMetadata,
  PublisherMetadata,
  SourceMetadata,
  TopicMetadata,
  WorkMetadata,
} from '../types/catalogue';

export const isWorkMetadata = (metadata: EntityMetadata): metadata is WorkMetadata => metadata.type === 'work';

export const isAuthorMetadata = (metadata: EntityMetadata): metadata is AuthorMetadata => metadata.type === 'author';

export const isInstitutionMetadata = (metadata: EntityMetadata): metadata is InstitutionMetadata => metadata.type === 'institution';

export const isSourceMetadata = (metadata: EntityMetadata): metadata is SourceMetadata => metadata.type === 'source';

export const isTopicMetadata = (metadata: EntityMetadata): metadata is TopicMetadata => metadata.type === 'topic';

export const isFunderMetadata = (metadata: EntityMetadata): metadata is FunderMetadata => metadata.type === 'funder';

export const isPublisherMetadata = (metadata: EntityMetadata): metadata is PublisherMetadata => metadata.type === 'publisher';

export const isConceptMetadata = (metadata: EntityMetadata): metadata is ConceptMetadata => metadata.type === 'concept';
