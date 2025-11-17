/**
 * React hook for catalogue management
 * Provides CRUD operations for lists and bibliographies
 */

import { useCallback, useEffect, useState } from "react";
import {
  catalogueEventEmitter,
  type CatalogueList,
  type CatalogueEntity,
  type EntityType,
  type ListType,
} from "@academic-explorer/utils";
import { compressListData, createShareUrl, extractListDataFromUrl, validateListData, type CompressedListData, decompressListData } from "@academic-explorer/utils";
import type { ExportFormat } from "@/types/catalogue";
import { validateExportFormat } from "@/utils/catalogue-validation";
import { logger } from "@academic-explorer/utils/logger";
import { useStorageProvider } from "@/contexts/storage-provider-context";
import QRCode from "qrcode";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-hook";

// T079: User-friendly error message mapping
function getUserFriendlyErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const lowerMessage = errorMessage.toLowerCase();

  // Storage quota exceeded
  if (lowerMessage.includes("quota") || lowerMessage.includes("storage") || lowerMessage.includes("full")) {
    return "Storage quota exceeded. Please free up space by deleting unused lists or clearing browser data.";
  }

  // Network errors
  if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
    return "Network error occurred. Please check your internet connection and try again.";
  }

  // Not found errors
  if (lowerMessage.includes("not found") || lowerMessage.includes("does not exist")) {
    return "The requested item could not be found. It may have been deleted.";
  }

  // Validation errors
  if (lowerMessage.includes("invalid") || lowerMessage.includes("validation") || lowerMessage.includes("format")) {
    return "Invalid data format. Please check your input and try again.";
  }

  // Permission errors
  if (lowerMessage.includes("permission") || lowerMessage.includes("denied") || lowerMessage.includes("unauthorized")) {
    return "Permission denied. You don't have access to perform this action.";
  }

  // Database errors
  if (lowerMessage.includes("database") || lowerMessage.includes("indexeddb") || lowerMessage.includes("dexie")) {
    return "Database error occurred. Try refreshing the page or clearing your browser cache.";
  }

  // Duplicate errors
  if (lowerMessage.includes("duplicate") || lowerMessage.includes("already exists")) {
    return "This item already exists in the list.";
  }

  // Timeout errors
  if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
    return "Operation timed out. Please try again.";
  }

  // Default fallback
  return `An error occurred: ${errorMessage}`;
}

export interface UseCatalogueOptions {
  /** Auto-refresh on list changes */
  autoRefresh?: boolean;
  /** Specific list ID to focus on */
  listId?: string;
}

export interface UseCatalogueReturn {
  // Lists
  lists: CatalogueList[];
  selectedList: CatalogueList | null;
  isLoadingLists: boolean;

  // Entities
  entities: CatalogueEntity[];
  isLoadingEntities: boolean;

  // CRUD Operations
  createList: (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }) => Promise<string>;
  updateList: (listId: string, updates: Partial<Pick<CatalogueList,
    "title" | "description" | "tags" | "isPublic"
  >>) => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
  selectList: (listId: string | null) => void;

  // Entity Management
  addEntityToList: (params: {
    listId: string;
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }) => Promise<string>;
  addEntitiesToList: (listId: string, entities: Array<{
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }>) => Promise<{ success: number; failed: number }>;
  removeEntityFromList: (listId: string, entityRecordId: string) => Promise<void>;
  reorderEntities: (listId: string, entityIds: string[]) => Promise<void>;
  updateEntityNotes: (entityRecordId: string, notes: string) => Promise<void>;
  bulkRemoveEntities: (listId: string, entityIds: string[]) => Promise<void>;
  bulkMoveEntities: (sourceListId: string, targetListId: string, entityIds: string[]) => Promise<void>;

  // Search and Filter
  searchLists: (query: string) => Promise<CatalogueList[]>;
  searchEntities: (query: string) => CatalogueEntity[];
  filterByType: (types: EntityType[]) => CatalogueEntity[];

  // Sharing
  generateShareUrl: (listId: string) => Promise<string>;
  importFromShareUrl: (url: string) => Promise<string | null>;
  generateQRCode: (shareURL: string) => Promise<string>;
  copyToClipboard: (text: string) => Promise<void>;

  // Utilities
  refreshLists: () => Promise<void>;
  refreshEntities: (listId: string) => Promise<void>;
  getListStats: (listId: string) => Promise<{
    totalEntities: number;
    entityCounts: Record<EntityType, number>;
  }>;

  // URL Compression
  exportListAsCompressedData: (listId: string) => Promise<string | null>;
  importListFromCompressedData: (compressedData: string) => Promise<string | null>;

  // File Export
  exportList: (listId: string) => Promise<ExportFormat>;
  exportListCompressed: (listId: string) => Promise<string>;
  exportListAsFile: (listId: string, format: "json" | "compressed") => Promise<void>;

  // Import Methods
  importList: (data: ExportFormat, mergeIfExists?: boolean) => Promise<string>;
  importListCompressed: (compressed: string, mergeIfExists?: boolean) => Promise<string>;
  importListFromFile: (file: File, mergeIfExists?: boolean) => Promise<string>;
  validateImportData: (data: unknown) => { valid: boolean; errors: string[]; warnings?: string[] };
  previewImport: (data: ExportFormat) => Promise<{
    listTitle: string;
    entityCount: number;
    entityTypes: Record<EntityType, number>;
    duplicates: number;
    estimatedSize: string;
  }>;
}

export function useCatalogue(options: UseCatalogueOptions = {}): UseCatalogueReturn {
  const { autoRefresh = true, listId: focusedListId } = options;

  // Get storage provider from context
  const storage = useStorageProvider();

  // State
  const [lists, setLists] = useState<CatalogueList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(focusedListId || null);
  const [entities, setEntities] = useState<CatalogueEntity[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  // Get selected list object
  const selectedList = lists.find(list => list.id === selectedListId) || null;

  // Refresh lists
  const refreshLists = useCallback(async () => {
    setIsLoadingLists(true);
    try {
      const allLists = await storage.getAllLists();
      setLists(allLists);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to refresh catalogue lists", { error });
    } finally {
      setIsLoadingLists(false);
    }
  }, [storage]);

  // Refresh entities for a specific list
  const refreshEntities = useCallback(async (listId: string) => {
    if (!listId) return;

    logger.debug(CATALOGUE_LOGGER_CONTEXT, "refreshEntities called", { listId });
    setIsLoadingEntities(true);
    try {
      const listEntities = await storage.getListEntities(listId);
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "getListEntities returned", { listId, count: listEntities.length, entities: listEntities });
      setEntities(listEntities);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to refresh list entities", { listId, error });
      setEntities([]);
    } finally {
      setIsLoadingEntities(false);
    }
  }, [storage]);

  // Load data on mount
  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  // Load entities when selected list changes
  useEffect(() => {
    logger.debug(CATALOGUE_LOGGER_CONTEXT, "selectedListId changed, refreshing entities", { selectedListId });
    if (selectedListId) {
      void refreshEntities(selectedListId);
    } else {
      setEntities([]);
    }
  }, [selectedListId, refreshEntities]);

  // Listen for catalogue events if auto-refresh is enabled
  useEffect(() => {
    if (!autoRefresh) return;

    const unsubscribe = catalogueEventEmitter.subscribe((event) => {
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Catalogue event detected", { event });

      // Refresh lists on any list-related event
      if (event.type.startsWith('list-')) {
        void refreshLists();
      }

      // Refresh entities for the affected list
      if (event.listId && selectedListId && event.listId === selectedListId) {
        void refreshEntities(selectedListId);
      }
    });

    return unsubscribe;
  }, [autoRefresh, refreshLists, refreshEntities, selectedListId]);

  // Create list
  const createList = useCallback(async (params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<string> => {
    try {
      const listId = await storage.createList(params);

      // Auto-select the new list
      setSelectedListId(listId);

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to create catalogue list", { params, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Update list
  const updateList = useCallback(async (
    listId: string,
    updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>
  ): Promise<void> => {
    try {
      await storage.updateList(listId, updates);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to update catalogue list", { listId, updates, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Delete list
  const deleteList = useCallback(async (listId: string): Promise<void> => {
    try {
      await storage.deleteList(listId);

      // Clear selection if deleted list was selected
      if (selectedListId === listId) {
        setSelectedListId(null);
      }
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to delete catalogue list", { listId, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [selectedListId, storage]);

  // Select list
  const selectList = useCallback((listId: string | null) => {
    setSelectedListId(listId);
  }, []);

  // Add entity to list
  const addEntityToList = useCallback(async (params: {
    listId: string;
    entityType: EntityType;
    entityId: string;
    notes?: string;
  }): Promise<string> => {
    try {
      return await storage.addEntityToList(params);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to add entity to catalogue list", { params, error });
      // T079: Throw user-friendly error message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Add multiple entities to list
  const addEntitiesToList = useCallback(async (
    listId: string,
    entities: Array<{
      entityType: EntityType;
      entityId: string;
      notes?: string;
    }>
  ): Promise<{ success: number; failed: number }> => {
    try {
      return await storage.addEntitiesToList(listId, entities);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to add multiple entities to catalogue list", {
        listId,
        entitiesCount: entities.length,
        error
      });
      throw error;
    }
  }, []);

  // Remove entity from list
  const removeEntityFromList = useCallback(async (listId: string, entityRecordId: string): Promise<void> => {
    try {
      await storage.removeEntityFromList(listId, entityRecordId);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to remove entity from catalogue list", {
        listId,
        entityRecordId,
        error
      });
      throw error;
    }
  }, []);

  // Reorder entities in list
  const reorderEntities = useCallback(async (listId: string, orderedEntityIds: string[]): Promise<void> => {
    try {
      await storage.reorderEntities(listId, orderedEntityIds);
      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Entities reordered successfully", {
        listId,
        entityCount: orderedEntityIds.length
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to reorder catalogue list entities", {
        listId,
        orderedEntityIds,
        error
      });
      throw error;
    }
  }, [storage]);

  // Update entity notes
  const updateEntityNotes = useCallback(async (entityRecordId: string, notes: string): Promise<void> => {
    try {
      await storage.updateEntityNotes(entityRecordId, notes);
      // Refresh entities to show updated notes
      if (selectedList) {
        await refreshEntities(selectedList.id!);
      }
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to update entity notes", {
        entityRecordId,
        notesLength: notes.length,
        error
      });
      throw error;
    }
  }, [selectedList, refreshEntities]);

  // Bulk remove entities from list
  const bulkRemoveEntities = useCallback(async (listId: string, entityIds: string[]): Promise<void> => {
    if (!entityIds || entityIds.length === 0) return;

    try {
      // Remove entities one by one
      for (const entityId of entityIds) {
        await storage.removeEntityFromList(listId, entityId);
      }

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Bulk remove completed successfully", {
        listId,
        removedCount: entityIds.length
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to bulk remove entities", {
        listId,
        entityCount: entityIds.length,
        error
      });
      throw error;
    }
  }, [storage]);

  // Bulk move entities from one list to another
  const bulkMoveEntities = useCallback(async (
    sourceListId: string,
    targetListId: string,
    entityIds: string[]
  ): Promise<void> => {
    if (!entityIds || entityIds.length === 0) return;
    if (sourceListId === targetListId) {
      throw new Error("Source and target lists cannot be the same");
    }

    try {
      // Get the entities from source list
      const sourceEntities = await storage.getListEntities(sourceListId);
      const entitiesToMove = sourceEntities.filter(e => entityIds.includes(e.id!));

      // Move entities one by one
      for (const entity of entitiesToMove) {
        // Add to target list
        await storage.addEntityToList({
          listId: targetListId,
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        });

        // Remove from source list
        await storage.removeEntityFromList(sourceListId, entity.id!);
      }

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "Bulk move completed successfully", {
        sourceListId,
        targetListId,
        movedCount: entitiesToMove.length
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to bulk move entities", {
        sourceListId,
        targetListId,
        entityCount: entityIds.length,
        error
      });
      throw error;
    }
  }, [storage]);

  // Search lists
  const searchLists = useCallback(async (query: string): Promise<CatalogueList[]> => {
    try {
      return await storage.searchLists(query);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to search catalogue lists", { query, error });
      return [];
    }
  }, []);

  // Search entities by entityId or notes (case-insensitive)
  const searchEntities = useCallback((query: string): CatalogueEntity[] => {
    if (!query.trim()) {
      return entities;
    }

    const lowercaseQuery = query.toLowerCase();
    return entities.filter((entity) => {
      const entityId = entity.entityId?.toLowerCase() || '';
      const notes = entity.notes?.toLowerCase() || '';
      return entityId.includes(lowercaseQuery) || notes.includes(lowercaseQuery);
    });
  }, [entities]);

  // Filter entities by type
  const filterByType = useCallback((types: EntityType[]): CatalogueEntity[] => {
    if (!types || types.length === 0) {
      return entities;
    }

    return entities.filter((entity) => types.includes(entity.entityType));
  }, [entities]);

  // Generate share URL
  const generateShareUrl = useCallback(async (listId: string): Promise<string> => {
    try {
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      // Convert to compressed data format
      const listData: CompressedListData = {
        list: {
          title: list.title,
          description: list.description,
          type: list.type,
          tags: list.tags,
        },
        entities: listEntities.map(entity => ({
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        })),
      };

      // Generate share token
      const shareToken = await storage.generateShareToken(listId);

      // Create share URL with compressed data
      const baseUrl = `${window.location.origin}${window.location.pathname}#/catalogue/shared/${shareToken}`;
      return createShareUrl(baseUrl, listData, logger);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to generate share URL", { listId, error });
      throw error;
    }
  }, []);

  // Import from share URL (T062, T065, T067)
  const importFromShareUrl = useCallback(async (url: string): Promise<string | null> => {
    try {
      // T065: URL validation - Check if input is full URL or just data string
      let compressedData: string;

      if (url.includes('://') || url.includes('?')) {
        // Full URL format - extract data parameter
        try {
          const urlObj = new URL(url.startsWith('http') ? url : `https://dummy.com${url.startsWith('/') ? '' : '/'}${url}`);
          const dataParam = urlObj.searchParams.get('data');

          if (!dataParam) {
            throw new Error("Invalid share URL: missing 'data' parameter");
          }

          compressedData = dataParam;
        } catch (urlError) {
          throw new Error("Invalid share URL format: " + (urlError instanceof Error ? urlError.message : 'malformed URL'));
        }
      } else {
        // Just the data string (Base64URL)
        compressedData = url.trim();
      }

      // T065: Validate Base64URL format (basic check)
      if (!compressedData || !/^[A-Za-z0-9_-]+$/.test(compressedData)) {
        throw new Error("Invalid share URL: data must be Base64URL encoded");
      }

      // T065: Try to decompress and validate
      const listData = decompressListData(compressedData);

      if (!listData || !validateListData(listData)) {
        throw new Error("Invalid or corrupted list data in URL");
      }

      // T067: Create new list from shared data, preserving isBibliography flag
      const listId = await storage.createList({
        title: `${listData.list.title} (Imported)`,
        description: listData.list.description ? `${listData.list.description} (Imported from shared list)` : "Imported from shared list",
        type: listData.list.type, // T067: Preserves 'bibliography' type
        tags: [...(listData.list.tags || []), "imported"],
        isPublic: false, // Don't make imported lists public by default
      });

      // Add entities to the new list
      if (listData.entities.length > 0) {
        await storage.addEntitiesToList(listId, listData.entities);
      }

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List imported from share URL successfully", {
        listId,
        entityCount: listData.entities.length,
        isBibliography: listData.list.type === 'bibliography',
      });

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import from share URL", { url, error });
      // T079: Re-throw with user-friendly message
      throw new Error(getUserFriendlyErrorMessage(error));
    }
  }, [storage]);

  // Generate QR code from share URL
  const generateQRCode = useCallback(async (shareURL: string): Promise<string> => {
    try {
      const dataURL = await QRCode.toDataURL(shareURL, {
        errorCorrectionLevel: 'M',
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "QR code generated successfully", {
        urlLength: shareURL.length,
      });

      return dataURL;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to generate QR code", { shareURL, error });
      throw error;
    }
  }, []);

  // Copy text to clipboard
  const copyToClipboard = useCallback(async (text: string): Promise<void> => {
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        logger.debug(CATALOGUE_LOGGER_CONTEXT, "Text copied to clipboard using Clipboard API", {
          textLength: text.length,
        });
        return;
      }

      // Fallback for older browsers or non-secure contexts
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        const successful = document.execCommand('copy');
        if (!successful) {
          throw new Error("execCommand('copy') failed");
        }
        logger.debug(CATALOGUE_LOGGER_CONTEXT, "Text copied to clipboard using fallback method", {
          textLength: text.length,
        });
      } finally {
        document.body.removeChild(textArea);
      }
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to copy to clipboard", { error });
      throw error;
    }
  }, []);

  // Get list statistics
  const getListStats = useCallback(async (listId: string): Promise<{
    totalEntities: number;
    entityCounts: Record<EntityType, number>;
  }> => {
    try {
      return await storage.getListStats(listId);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to get list stats", { listId, error });
      return {
        totalEntities: 0,
        entityCounts: {
          works: 0,
          authors: 0,
          sources: 0,
          institutions: 0,
          topics: 0,
          publishers: 0,
          funders: 0,
        },
      };
    }
  }, []);

  // Export list as compressed data
  const exportListAsCompressedData = useCallback(async (listId: string): Promise<string | null> => {
    try {
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      const listData: CompressedListData = {
        list: {
          title: list.title,
          description: list.description,
          type: list.type,
          tags: list.tags,
        },
        entities: listEntities.map(entity => ({
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        })),
      };

      return compressListData(listData);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list as compressed data", { listId, error });
      return null;
    }
  }, []);

  // Import list from compressed data
  const importListFromCompressedData = useCallback(async (compressedData: string): Promise<string | null> => {
    try {
      const listData = decompressListData(compressedData);

      if (!listData || !validateListData(listData)) {
        throw new Error("Invalid or corrupted list data");
      }

      // Create new list from compressed data
      const listId = await storage.createList({
        title: `${listData.list.title} (Imported)`,
        description: listData.list.description ? `${listData.list.description} (Imported)` : "Imported from compressed data",
        type: listData.list.type,
        tags: [...(listData.list.tags || []), "imported"],
        isPublic: false,
      });

      // Add entities to the new list
      if (listData.entities.length > 0) {
        await storage.addEntitiesToList(listId, listData.entities);
      }

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import from compressed data", { error });
      return null;
    }
  }, []);

  // Export list to ExportFormat
  const exportList = useCallback(async (listId: string): Promise<ExportFormat> => {
    try {
      // Get list metadata
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      // Get all entities for the list
      const listEntities = await storage.getListEntities(listId);

      // Helper function to convert plural entity type to singular
      const toSingularType = (type: string): import("@/types/catalogue").EntityType => {
        const mapping: Record<string, import("@/types/catalogue").EntityType> = {
          "works": "work",
          "authors": "author",
          "sources": "source",
          "institutions": "institution",
          "topics": "topic",
          "publishers": "publisher",
          "funders": "funder",
          "concepts": "concept",
        };
        return mapping[type] || type as import("@/types/catalogue").EntityType;
      };

      // Convert to ExportFormat
      const exportData: ExportFormat = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        listMetadata: {
          title: list.title,
          description: list.description,
          created: list.createdAt instanceof Date ? list.createdAt.toISOString() : list.createdAt,
          entityCount: listEntities.length,
          isBibliography: list.type === "bibliography",
        },
        entities: listEntities.map(entity => ({
          entityId: entity.entityId,
          type: toSingularType(entity.entityType),
          position: entity.position,
          note: entity.notes,
          addedAt: entity.addedAt instanceof Date ? entity.addedAt.toISOString() : entity.addedAt,
          // For now, create minimal metadata since CatalogueEntity doesn't store full metadata
          metadata: {
            type: toSingularType(entity.entityType) as any,
            displayName: entity.entityId,
            worksCount: 0,
            citedByCount: 0,
          } as any,
        })),
      };

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List exported successfully", {
        listId,
        entityCount: listEntities.length,
      });

      return exportData;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list", { listId, error });
      throw error;
    }
  }, [storage]);

  // Export list as compressed Base64URL string
  const exportListCompressed = useCallback(async (listId: string): Promise<string> => {
    try {
      // Get the export data
      const exportData = await exportList(listId);

      // Serialize to JSON
      const jsonString = JSON.stringify(exportData);

      // Compress using pako (via imported compressListData if available, or inline)
      // Note: We'll use the existing compressListData function, but need to convert format
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      const listEntities = await storage.getListEntities(listId);

      // Create CompressedListData format for compression
      const compressedFormat: CompressedListData = {
        list: {
          title: list.title,
          description: list.description,
          type: list.type,
          tags: list.tags,
        },
        entities: listEntities.map(entity => ({
          entityType: entity.entityType,
          entityId: entity.entityId,
          notes: entity.notes,
        })),
      };

      // Use existing compression utility
      const compressed = compressListData(compressedFormat);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List compressed successfully", {
        listId,
        originalSize: jsonString.length,
        compressedSize: compressed.length,
        compressionRatio: (compressed.length / jsonString.length * 100).toFixed(1) + "%",
      });

      return compressed;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to compress list", { listId, error });
      throw error;
    }
  }, [exportList, storage]);

  // Export list as downloadable file
  const exportListAsFile = useCallback(async (listId: string, format: "json" | "compressed"): Promise<void> => {
    try {
      const list = await storage.getList(listId);
      if (!list) {
        throw new Error("List not found");
      }

      let data: string;
      let mimeType: string;
      let extension: string;

      if (format === "json") {
        // Export as JSON
        const exportData = await exportList(listId);
        data = JSON.stringify(exportData, null, 2);
        mimeType = "application/json";
        extension = "json";
      } else {
        // Export as compressed
        data = await exportListCompressed(listId);
        mimeType = "text/plain";
        extension = "txt";
      }

      // Create filename: catalogue-{listTitle}-{date}.{format}
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sanitizedTitle = list.title
        .replace(/[^a-z0-9]/gi, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      const filename = `catalogue-${sanitizedTitle}-${date}.${extension}`;

      // Create blob and trigger download
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);

      // Create temporary anchor element
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // Trigger download
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List file download triggered", {
        listId,
        format,
        filename,
        dataSize: data.length,
      });
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to export list as file", { listId, format, error });
      throw error;
    }
  }, [storage, exportList, exportListCompressed]);

  // Import list from ExportFormat data
  const importList = useCallback(async (data: ExportFormat, mergeIfExists = false): Promise<string> => {
    try {
      // Validate the data first
      validateExportFormat(data);

      // Helper function to convert singular entity type to plural
      const toPluralType = (type: string): EntityType => {
        const mapping: Record<string, EntityType> = {
          "work": "works",
          "author": "authors",
          "source": "sources",
          "institution": "institutions",
          "topic": "topics",
          "publisher": "publishers",
          "funder": "funders",
        };
        return mapping[type] || (type + "s") as EntityType;
      };

      // Create new list from imported data
      const listId = await storage.createList({
        title: `${data.listMetadata.title} (Imported)`,
        description: data.listMetadata.description
          ? `${data.listMetadata.description} (Imported)`
          : "Imported from file",
        type: data.listMetadata.isBibliography ? "bibliography" : "list",
        tags: ["imported"],
        isPublic: false, // Don't make imported lists public by default
      });

      // Add all entities to the list (preserve positions and notes)
      if (data.entities.length > 0) {
        const entitiesToAdd = data.entities.map(entity => ({
          entityType: toPluralType(entity.type),
          entityId: entity.entityId,
          notes: entity.note,
        }));

        await storage.addEntitiesToList(listId, entitiesToAdd);
      }

      logger.debug(CATALOGUE_LOGGER_CONTEXT, "List imported successfully", {
        listId,
        entityCount: data.entities.length,
        title: data.listMetadata.title,
      });

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import list", { error });
      throw error;
    }
  }, [storage]);

  // Import list from compressed Base64URL string
  const importListCompressed = useCallback(async (compressed: string, mergeIfExists = false): Promise<string> => {
    try {
      // Decompress the data
      const listData = decompressListData(compressed);

      if (!listData) {
        throw new Error("Failed to decompress data or data is corrupted");
      }

      // Convert CompressedListData to ExportFormat
      const exportData: ExportFormat = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        listMetadata: {
          title: listData.list.title,
          description: listData.list.description,
          created: new Date().toISOString(),
          entityCount: listData.entities.length,
          isBibliography: listData.list.type === "bibliography",
        },
        entities: listData.entities.map((entity, index) => {
          // Helper function to convert plural entity type to singular
          const toSingularType = (type: string): import("@/types/catalogue").EntityType => {
            const mapping: Record<string, import("@/types/catalogue").EntityType> = {
              "works": "work",
              "authors": "author",
              "sources": "source",
              "institutions": "institution",
              "topics": "topic",
              "publishers": "publisher",
              "funders": "funder",
            };
            return mapping[type] || type as import("@/types/catalogue").EntityType;
          };

          return {
            entityId: entity.entityId,
            type: toSingularType(entity.entityType),
            position: index,
            note: entity.notes,
            addedAt: new Date().toISOString(),
            metadata: {
              type: toSingularType(entity.entityType) as any,
              displayName: entity.entityId,
              worksCount: 0,
              citedByCount: 0,
            } as any,
          };
        }),
      };

      // Use importList to handle the actual import
      return await importList(exportData, mergeIfExists);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import compressed list", { error });
      throw error;
    }
  }, [importList]);

  // Import list from File object
  const importListFromFile = useCallback(async (file: File, mergeIfExists = false): Promise<string> => {
    try {
      // Read file as text
      const text = await file.text();

      if (!text || text.trim().length === 0) {
        throw new Error("File is empty");
      }

      // Try to detect format (JSON or compressed)
      let data: ExportFormat;

      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(text);

        // If it has the ExportFormat structure, use it directly
        if (parsed.version && parsed.listMetadata && parsed.entities) {
          data = parsed as ExportFormat;
        } else {
          throw new Error("Not an ExportFormat JSON");
        }
      } catch (jsonError) {
        // If JSON parsing fails, treat as compressed data
        try {
          return await importListCompressed(text.trim(), mergeIfExists);
        } catch (compressedError) {
          throw new Error("File contains invalid data: not valid JSON or compressed format");
        }
      }

      // Use importList to handle the actual import
      return await importList(data, mergeIfExists);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import list from file", {
        fileName: file.name,
        fileSize: file.size,
        error
      });
      throw error;
    }
  }, [importList, importListCompressed]);

  // Validate import data
  const validateImportData = useCallback((data: unknown): {
    valid: boolean;
    errors: string[];
    warnings?: string[]
  } => {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      validateExportFormat(data);

      // Add warnings for potential issues
      const exportData = data as ExportFormat;

      if (exportData.entities.length > 1000) {
        warnings.push(`Large import: ${exportData.entities.length} entities (may take a moment)`);
      }

      if (exportData.version !== "1.0") {
        warnings.push(`Import uses version ${exportData.version} (current version is 1.0)`);
      }

      return { valid: true, errors: [], warnings: warnings.length > 0 ? warnings : undefined };
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      } else {
        errors.push("Unknown validation error");
      }
      return { valid: false, errors, warnings: warnings.length > 0 ? warnings : undefined };
    }
  }, []);

  // Preview import before actually importing
  const previewImport = useCallback(async (data: ExportFormat): Promise<{
    listTitle: string;
    entityCount: number;
    entityTypes: Record<EntityType, number>;
    duplicates: number;
    estimatedSize: string;
  }> => {
    try {
      // Extract metadata
      const listTitle = data.listMetadata.title;
      const entityCount = data.entities.length;

      // Group entities by type and count
      const entityTypes: Record<EntityType, number> = {
        works: 0,
        authors: 0,
        sources: 0,
        institutions: 0,
        topics: 0,
        publishers: 0,
        funders: 0,
      };

      data.entities.forEach(entity => {
        const type = entity.type;
        // Convert singular to plural for counting
        const pluralType = (type + "s") as EntityType;
        if (pluralType in entityTypes) {
          entityTypes[pluralType]++;
        }
      });

      // Check for duplicates (entities already in user's catalogue)
      let duplicates = 0;
      const allLists = await storage.getAllLists();

      for (const list of allLists) {
        const listEntities = await storage.getListEntities(list.id!);
        const existingEntityIds = new Set(listEntities.map(e => e.entityId));

        for (const entity of data.entities) {
          if (existingEntityIds.has(entity.entityId)) {
            duplicates++;
          }
        }
      }

      // Estimate size (compressed size if applicable)
      const jsonString = JSON.stringify(data);
      const estimatedSize = jsonString.length < 1024
        ? `${jsonString.length} bytes`
        : jsonString.length < 1024 * 1024
        ? `${(jsonString.length / 1024).toFixed(1)} KB`
        : `${(jsonString.length / (1024 * 1024)).toFixed(1)} MB`;

      return {
        listTitle,
        entityCount,
        entityTypes,
        duplicates,
        estimatedSize,
      };
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to preview import", { error });
      throw error;
    }
  }, [storage]);

  return {
    // Lists
    lists,
    selectedList,
    isLoadingLists,

    // Entities
    entities,
    isLoadingEntities,

    // CRUD Operations
    createList,
    updateList,
    deleteList,
    selectList,

    // Entity Management
    addEntityToList,
    addEntitiesToList,
    removeEntityFromList,
    reorderEntities,
    updateEntityNotes,
    bulkRemoveEntities,
    bulkMoveEntities,

    // Search and Filter
    searchLists,
    searchEntities,
    filterByType,

    // Sharing
    generateShareUrl,
    importFromShareUrl,
    generateQRCode,
    copyToClipboard,

    // Utilities
    refreshLists,
    refreshEntities,
    getListStats,

    // URL Compression
    exportListAsCompressedData,
    importListFromCompressedData,

    // File Export
    exportList,
    exportListCompressed,
    exportListAsFile,

    // Import Methods
    importList,
    importListCompressed,
    importListFromFile,
    validateImportData,
    previewImport,
  };
}