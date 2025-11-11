/**
 * Interface contract for the useCatalogue hook
 *
 * This hook provides the primary API for catalogue operations,
 * abstracting storage implementation details from UI components.
 *
 * Feature: 004-fix-failing-tests
 * Created: 2025-11-11
 */

import type { EntityType, CatalogueList, CatalogueEntity, EntityMetadata, ExportFormat } from './types';

export interface UseCatalogueReturn {
  // ==================
  // State
  // ==================

  /**
   * All catalogue lists, sorted by updatedAt descending
   */
  lists: CatalogueList[];

  /**
   * Currently selected list (null if none selected)
   */
  currentList: CatalogueList | null;

  /**
   * Entities in current list, sorted by position ascending
   */
  currentEntities: CatalogueEntity[];

  /**
   * Loading states for async operations
   */
  isLoading: {
    lists: boolean;
    entities: boolean;
    operation: boolean; // Generic operation in progress
  };

  /**
   * Error state (null if no error)
   */
  error: Error | null;

  // ==================
  // List Operations
  // ==================

  /**
   * Create a new catalogue list
   *
   * @param title - List title (1-200 characters, required)
   * @param description - List description (max 1000 characters, optional)
   * @param isBibliography - Whether this is a bibliography list
   * @returns Promise resolving to created list
   * @throws Error if title invalid or storage fails
   */
  createList(
    title: string,
    description?: string,
    isBibliography?: boolean
  ): Promise<CatalogueList>;

  /**
   * Update an existing list's metadata
   *
   * @param listId - ID of list to update
   * @param updates - Partial list data to update
   * @returns Promise resolving when update complete
   * @throws Error if list not found or storage fails
   */
  updateList(
    listId: string,
    updates: Partial<Pick<CatalogueList, 'title' | 'description'>>
  ): Promise<void>;

  /**
   * Delete a catalogue list and all its entities
   *
   * @param listId - ID of list to delete
   * @returns Promise resolving when deletion complete
   * @throws Error if storage fails
   */
  deleteList(listId: string): Promise<void>;

  /**
   * Select a list as the current list
   *
   * @param listId - ID of list to select (null to deselect)
   */
  selectList(listId: string | null): void;

  /**
   * Refresh lists from storage
   *
   * @returns Promise resolving when refresh complete
   */
  refreshLists(): Promise<void>;

  // ==================
  // Entity Operations
  // ==================

  /**
   * Add an entity to a catalogue list
   *
   * @param listId - ID of list to add entity to
   * @param entityId - OpenAlex entity ID (e.g., "W2741809807")
   * @param entityType - Type of entity
   * @param metadata - Entity metadata for display
   * @param note - Optional user note
   * @returns Promise resolving when entity added
   * @throws Error if entity already in list or storage fails
   */
  addEntity(
    listId: string,
    entityId: string,
    entityType: EntityType,
    metadata: EntityMetadata,
    note?: string
  ): Promise<void>;

  /**
   * Remove an entity from a catalogue list
   *
   * @param listId - ID of list containing entity
   * @param entityId - OpenAlex entity ID to remove
   * @returns Promise resolving when entity removed
   * @throws Error if storage fails
   */
  removeEntity(listId: string, entityId: string): Promise<void>;

  /**
   * Update an entity's note
   *
   * @param listId - ID of list containing entity
   * @param entityId - OpenAlex entity ID
   * @param note - New note text (max 5000 characters, undefined to clear)
   * @returns Promise resolving when note updated
   * @throws Error if entity not found or storage fails
   */
  updateEntityNote(
    listId: string,
    entityId: string,
    note: string | undefined
  ): Promise<void>;

  /**
   * Reorder an entity within a list via drag-and-drop
   *
   * @param listId - ID of list containing entity
   * @param entityId - OpenAlex entity ID to move
   * @param newPosition - New 0-based position in list
   * @returns Promise resolving when reorder complete
   * @throws Error if entity not found or storage fails
   */
  reorderEntity(
    listId: string,
    entityId: string,
    newPosition: number
  ): Promise<void>;

  /**
   * Remove multiple entities from a list (bulk operation)
   *
   * @param listId - ID of list containing entities
   * @param entityIds - Array of OpenAlex entity IDs to remove
   * @returns Promise resolving when all entities removed
   * @throws Error if storage fails
   */
  bulkRemoveEntities(listId: string, entityIds: string[]): Promise<void>;

  /**
   * Move multiple entities to another list (bulk operation)
   *
   * @param sourceListId - ID of list containing entities
   * @param targetListId - ID of destination list
   * @param entityIds - Array of OpenAlex entity IDs to move
   * @returns Promise resolving when all entities moved
   * @throws Error if any entity already in target or storage fails
   */
  bulkMoveEntities(
    sourceListId: string,
    targetListId: string,
    entityIds: string[]
  ): Promise<void>;

  // ==================
  // Search/Filter
  // ==================

  /**
   * Search/filter entities within the current list
   *
   * @param query - Search query (searches displayName, note fields)
   * @returns Filtered entities matching query
   */
  searchEntities(query: string): CatalogueEntity[];

  /**
   * Filter entities by type
   *
   * @param types - Array of entity types to include (empty = all types)
   * @returns Filtered entities matching types
   */
  filterByType(types: EntityType[]): CatalogueEntity[];

  // ==================
  // Import/Export
  // ==================

  /**
   * Export a list to ExportFormat
   *
   * @param listId - ID of list to export
   * @returns Promise resolving to export data
   * @throws Error if list not found or storage fails
   */
  exportList(listId: string): Promise<ExportFormat>;

  /**
   * Export a list as compressed JSON string
   *
   * @param listId - ID of list to export
   * @returns Promise resolving to compressed Base64 string
   * @throws Error if list not found, compression fails, or storage fails
   */
  exportListCompressed(listId: string): Promise<string>;

  /**
   * Export a list as downloadable file
   *
   * @param listId - ID of list to export
   * @param format - Export format ('json' | 'compressed')
   * @returns Promise resolving when download triggered
   * @throws Error if list not found or export fails
   */
  exportListAsFile(
    listId: string,
    format: 'json' | 'compressed'
  ): Promise<void>;

  /**
   * Import a list from ExportFormat
   *
   * @param data - Export data to import
   * @param mergeIfExists - If true, merge with existing list; if false, create new
   * @returns Promise resolving to imported/merged list ID
   * @throws Error if data invalid or storage fails
   */
  importList(
    data: ExportFormat,
    mergeIfExists?: boolean
  ): Promise<string>;

  /**
   * Import a list from compressed Base64 string
   *
   * @param compressed - Compressed Base64 string
   * @param mergeIfExists - If true, merge with existing list; if false, create new
   * @returns Promise resolving to imported/merged list ID
   * @throws Error if data malformed, invalid, or storage fails
   */
  importListCompressed(
    compressed: string,
    mergeIfExists?: boolean
  ): Promise<string>;

  /**
   * Import a list from file upload
   *
   * @param file - File object from input element
   * @param mergeIfExists - If true, merge with existing list; if false, create new
   * @returns Promise resolving to imported/merged list ID
   * @throws Error if file invalid, data invalid, or storage fails
   */
  importListFromFile(
    file: File,
    mergeIfExists?: boolean
  ): Promise<string>;

  /**
   * Validate import data without importing
   *
   * @param data - Export data to validate
   * @returns Validation result with errors array (empty if valid)
   */
  validateImportData(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings?: string[];
  };

  /**
   * Preview import data before importing
   *
   * @param data - Export data to preview
   * @returns Preview information
   * @throws Error if data invalid
   */
  previewImport(data: ExportFormat): {
    listTitle: string;
    entityCount: number;
    entityTypes: Record<EntityType, number>;
    duplicates: number; // Count of entities already in user's catalogue
    estimatedSize: string; // Human-readable size estimate
  };

  // ==================
  // Sharing
  // ==================

  /**
   * Generate a shareable URL for a list
   *
   * @param listId - ID of list to share
   * @returns Promise resolving to share URL
   * @throws Error if list not found, export fails, or compression fails
   */
  generateShareURL(listId: string): Promise<string>;

  /**
   * Generate a QR code for a share URL
   *
   * @param shareURL - Share URL to encode
   * @returns Promise resolving to QR code data URL
   * @throws Error if QR generation fails
   */
  generateQRCode(shareURL: string): Promise<string>;

  /**
   * Import a list from a share URL
   *
   * @param shareURL - Full share URL or just the data parameter
   * @returns Promise resolving to imported list ID
   * @throws Error if URL invalid, data malformed, or import fails
   */
  importFromShareURL(shareURL: string): Promise<string>;

  /**
   * Copy text to clipboard
   *
   * @param text - Text to copy
   * @returns Promise resolving when copy complete
   * @throws Error if clipboard API unavailable or copy fails
   */
  copyToClipboard(text: string): Promise<void>;

  // ==================
  // Utility
  // ==================

  /**
   * Clear error state
   */
  clearError(): void;

  /**
   * Check if an entity is already in a list
   *
   * @param listId - ID of list to check
   * @param entityId - OpenAlex entity ID
   * @returns Promise resolving to true if entity in list, false otherwise
   */
  isEntityInList(listId: string, entityId: string): Promise<boolean>;

  /**
   * Get entity count for a list
   *
   * @param listId - ID of list
   * @returns Promise resolving to entity count
   */
  getEntityCount(listId: string): Promise<number>;
}

/**
 * Hook factory function
 */
export function useCatalogue(): UseCatalogueReturn;
