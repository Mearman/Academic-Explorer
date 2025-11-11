/**
 * Shared type definitions for catalogue feature
 *
 * These types are used across components, hooks, and storage layers.
 * They define the contract between different parts of the catalogue system.
 *
 * Feature: 004-fix-failing-tests
 * Created: 2025-11-11
 */

// ==================
// Entity Types
// ==================

export type EntityType =
  | 'work'
  | 'author'
  | 'institution'
  | 'source'
  | 'topic'
  | 'funder'
  | 'publisher'
  | 'concept';

// ==================
// Catalogue List
// ==================

export interface CatalogueList {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  entityCount: number;
  isPublic: boolean;
  isBibliography: boolean;
  shareToken?: string;
}

// ==================
// Catalogue Entity
// ==================

export interface CatalogueEntity {
  id: string; // Composite: `${listId}:${entityId}`
  listId: string;
  entityId: string;
  entityType: EntityType;
  position: number;
  note?: string;
  addedAt: string;
  metadata: EntityMetadata;
}

// ==================
// Entity Metadata
// ==================

export interface BaseEntityMetadata {
  displayName: string;
  externalIds?: Record<string, string>;
}

export interface WorkMetadata extends BaseEntityMetadata {
  type: 'work';
  publicationYear?: number;
  citedByCount: number;
  primaryLocation?: {
    source?: { displayName: string };
  };
  authorships?: Array<{
    author: { displayName: string };
    institutions: Array<{ displayName: string }>;
  }>;
  openAccess?: {
    isOa: boolean;
    oaStatus: string;
  };
}

export interface AuthorMetadata extends BaseEntityMetadata {
  type: 'author';
  worksCount: number;
  citedByCount: number;
  hIndex?: number;
  lastKnownInstitution?: {
    displayName: string;
  };
}

export interface InstitutionMetadata extends BaseEntityMetadata {
  type: 'institution';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
  type?: string;
}

export interface SourceMetadata extends BaseEntityMetadata {
  type: 'source';
  worksCount: number;
  citedByCount: number;
  issn?: string[];
  isOa?: boolean;
}

export interface TopicMetadata extends BaseEntityMetadata {
  type: 'topic';
  worksCount: number;
  citedByCount: number;
  field?: { displayName: string };
  domain?: { displayName: string };
}

export interface FunderMetadata extends BaseEntityMetadata {
  type: 'funder';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
}

export interface PublisherMetadata extends BaseEntityMetadata {
  type: 'publisher';
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
}

export interface ConceptMetadata extends BaseEntityMetadata {
  type: 'concept';
  worksCount: number;
  citedByCount: number;
  level?: number;
}

export type EntityMetadata =
  | WorkMetadata
  | AuthorMetadata
  | InstitutionMetadata
  | SourceMetadata
  | TopicMetadata
  | FunderMetadata
  | PublisherMetadata
  | ConceptMetadata;

// ==================
// Import/Export
// ==================

export interface ExportFormat {
  version: '1.0';
  exportedAt: string;
  listMetadata: {
    title: string;
    description?: string;
    created: string;
    entityCount: number;
    isBibliography: boolean;
  };
  entities: Array<{
    entityId: string;
    type: EntityType;
    position: number;
    note?: string;
    addedAt: string;
    metadata: EntityMetadata;
  }>;
}

// ==================
// Component Props
// ==================

export interface AddToCatalogueButtonProps {
  entityId: string;
  entityType: EntityType;
  metadata: EntityMetadata;
  variant?: 'default' | 'subtle' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export interface CatalogueManagerProps {
  initialListId?: string;
}

export interface CatalogueListProps {
  listId: string;
  onEntitySelect?: (entityId: string) => void;
  onEntityRemove?: (entityId: string) => void;
}

export interface CatalogueEntitiesProps {
  listId: string;
  entities: CatalogueEntity[];
  onReorder: (entityId: string, newPosition: number) => void;
  onRemove: (entityId: string) => void;
  onUpdateNote: (entityId: string, note: string | undefined) => void;
  onSelect?: (entityId: string) => void;
  selectedIds?: Set<string>;
  isLoading?: boolean;
}

export interface AddToListModalProps {
  opened: boolean;
  onClose: () => void;
  entityId: string;
  entityType: EntityType;
  metadata: EntityMetadata;
}

export interface CreateListModalProps {
  opened: boolean;
  onClose: () => void;
  onCreated?: (listId: string) => void;
  isBibliography?: boolean;
}

export interface ExportModalProps {
  opened: boolean;
  onClose: () => void;
  listId: string;
}

export interface ImportModalProps {
  opened: boolean;
  onClose: () => void;
  onImported?: (listId: string) => void;
  initialData?: string; // Share URL data parameter
}

export interface ShareModalProps {
  opened: boolean;
  onClose: () => void;
  listId: string;
}

// ==================
// Type Guards
// ==================

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

// ==================
// Validation
// ==================

export function validateExportFormat(data: unknown): asserts data is ExportFormat {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid format: must be object');
  }

  const format = data as Partial<ExportFormat>;

  if (format.version !== '1.0') {
    throw new Error(`Unsupported version: ${format.version ?? 'undefined'}`);
  }

  if (!format.listMetadata?.title?.trim()) {
    throw new Error('Invalid format: missing list title');
  }

  if (!Array.isArray(format.entities)) {
    throw new Error('Invalid format: entities must be array');
  }

  if (format.entities.length !== format.listMetadata.entityCount) {
    throw new Error('Invalid format: entity count mismatch');
  }

  if (format.entities.length > 10000) {
    throw new Error('Invalid format: too many entities (max 10,000)');
  }

  format.entities.forEach((entity, index) => {
    if (!entity.entityId || !entity.type || typeof entity.position !== 'number') {
      throw new Error(`Invalid entity at position ${index}`);
    }
    if (entity.position !== index) {
      throw new Error(`Invalid entity position at index ${index}: expected ${index}, got ${entity.position}`);
    }
    if (!entity.metadata || !entity.metadata.displayName) {
      throw new Error(`Invalid entity metadata at position ${index}`);
    }
  });
}

// ==================
// Constants
// ==================

export const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  work: 'Work',
  author: 'Author',
  institution: 'Institution',
  source: 'Source',
  topic: 'Topic',
  funder: 'Funder',
  publisher: 'Publisher',
  concept: 'Concept',
};

export const ENTITY_TYPE_COLORS: Record<EntityType, string> = {
  work: 'blue',
  author: 'green',
  institution: 'orange',
  source: 'violet',
  topic: 'pink',
  funder: 'yellow',
  publisher: 'red',
  concept: 'gray',
};

export const MAX_LIST_TITLE_LENGTH = 200;
export const MAX_LIST_DESCRIPTION_LENGTH = 1000;
export const MAX_ENTITY_NOTE_LENGTH = 5000;
export const MAX_ENTITIES_PER_LIST = 10000;
export const EXPORT_FORMAT_VERSION = '1.0';
