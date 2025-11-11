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
import { logger } from "@academic-explorer/utils/logger";
import { useStorageProvider } from "@/contexts/storage-provider-context";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-hook";

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

  // Search
  searchLists: (query: string) => Promise<CatalogueList[]>;

  // Sharing
  generateShareUrl: (listId: string) => Promise<string>;
  importFromShareUrl: (url: string) => Promise<string | null>;

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

    setIsLoadingEntities(true);
    try {
      const listEntities = await storage.getListEntities(listId);
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
      throw error;
    }
  }, []);

  // Update list
  const updateList = useCallback(async (
    listId: string,
    updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>
  ): Promise<void> => {
    try {
      await storage.updateList(listId, updates);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to update catalogue list", { listId, updates, error });
      throw error;
    }
  }, []);

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
      throw error;
    }
  }, [selectedListId]);

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
      throw error;
    }
  }, []);

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
      // This would need to be implemented in the service
      // For now, we'll just refresh the entities
      await refreshEntities(listId);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to reorder catalogue list entities", {
        listId,
        orderedEntityIds,
        error
      });
      throw error;
    }
  }, [refreshEntities]);

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

  // Search lists
  const searchLists = useCallback(async (query: string): Promise<CatalogueList[]> => {
    try {
      return await storage.searchLists(query);
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to search catalogue lists", { query, error });
      return [];
    }
  }, []);

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

  // Import from share URL
  const importFromShareUrl = useCallback(async (url: string): Promise<string | null> => {
    try {
      const listData = extractListDataFromUrl(url, logger);

      if (!listData || !validateListData(listData)) {
        throw new Error("Invalid or corrupted list data in URL");
      }

      // Create new list from shared data
      const listId = await storage.createList({
        title: `${listData.list.title} (Imported)`,
        description: listData.list.description ? `${listData.list.description} (Imported from shared list)` : "Imported from shared list",
        type: listData.list.type,
        tags: [...(listData.list.tags || []), "imported"],
        isPublic: false, // Don't make imported lists public by default
      });

      // Add entities to the new list
      if (listData.entities.length > 0) {
        await storage.addEntitiesToList(listId, listData.entities);
      }

      return listId;
    } catch (error) {
      logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to import from share URL", { url, error });
      return null;
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

    // Search
    searchLists,

    // Sharing
    generateShareUrl,
    importFromShareUrl,

    // Utilities
    refreshLists,
    refreshEntities,
    getListStats,

    // URL Compression
    exportListAsCompressedData,
    importListFromCompressedData,
  };
}