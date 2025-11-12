/**
 * React hook for bookmark management
 * Provides reactive bookmark state and CRUD operations
 */

import { useCallback, useEffect, useState } from "react";
import {
  catalogueEventEmitter,
  logger,
  type CatalogueEntity,
  type EntityType,
  type AddBookmarkParams
} from "@academic-explorer/utils";
import { useStorageProvider } from "@/contexts/storage-provider-context";

const BOOKMARKS_LOGGER_CONTEXT = "bookmarks-hook";

export interface UseBookmarksResult {
  /** Current bookmarks list */
  bookmarks: CatalogueEntity[];

  /** Add a new bookmark */
  addBookmark: (params: AddBookmarkParams) => Promise<string>;

  /** Remove a bookmark by entity record ID */
  removeBookmark: (entityRecordId: string) => Promise<void>;

  /** Check if an entity is bookmarked */
  isBookmarked: (entityType: EntityType, entityId: string) => Promise<boolean>;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: Error | null;

  /** Refresh bookmarks manually */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing bookmarks with reactive state
 *
 * Features:
 * - Automatic initialization of special lists
 * - Reactive updates via catalogueEventEmitter
 * - Error handling with state
 * - Loading states during operations
 *
 * @example
 * ```tsx
 * const { bookmarks, addBookmark, removeBookmark, isBookmarked, loading, error } = useBookmarks();
 *
 * // Add bookmark
 * await addBookmark({
 *   entityType: "works",
 *   entityId: "W2741809807",
 *   url: "https://openalex.org/W2741809807",
 *   title: "ML for Cultural Heritage"
 * });
 *
 * // Check if bookmarked
 * const bookmarked = await isBookmarked("works", "W2741809807");
 *
 * // Remove bookmark
 * await removeBookmark(entityRecordId);
 * ```
 */
export function useBookmarks(): UseBookmarksResult {
  const storage = useStorageProvider();

  // State
  const [bookmarks, setBookmarks] = useState<CatalogueEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Refresh bookmarks from storage
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Initialize special lists if not already done
      if (!initialized) {
        await storage.initializeSpecialLists();
        setInitialized(true);
        logger.debug(BOOKMARKS_LOGGER_CONTEXT, "Special lists initialized");
      }

      const currentBookmarks = await storage.getBookmarks();
      setBookmarks(currentBookmarks);

      logger.debug(BOOKMARKS_LOGGER_CONTEXT, "Bookmarks refreshed", {
        count: currentBookmarks.length
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error(BOOKMARKS_LOGGER_CONTEXT, "Failed to refresh bookmarks", { error: err });
    } finally {
      setLoading(false);
    }
  }, [storage, initialized]);

  // Initialize on mount
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Subscribe to catalogue events for reactive updates
  useEffect(() => {
    const unsubscribe = catalogueEventEmitter.subscribe((event) => {
      // Check if event affects bookmarks
      const isBookmarksEvent =
        event.listId === "bookmarks-list" ||
        event.type === "entity-added" ||
        event.type === "entity-removed";

      if (isBookmarksEvent) {
        logger.debug(BOOKMARKS_LOGGER_CONTEXT, "Catalogue event detected, refreshing bookmarks", {
          eventType: event.type,
          listId: event.listId
        });
        void refresh();
      }
    });

    return unsubscribe;
  }, [refresh]);

  // Add bookmark
  const addBookmark = useCallback(async (params: AddBookmarkParams): Promise<string> => {
    setLoading(true);
    setError(null);

    try {
      const entityRecordId = await storage.addBookmark(params);

      logger.debug(BOOKMARKS_LOGGER_CONTEXT, "Bookmark added", {
        entityType: params.entityType,
        entityId: params.entityId,
        entityRecordId
      });

      // Refresh will be triggered by catalogueEventEmitter
      return entityRecordId;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error(BOOKMARKS_LOGGER_CONTEXT, "Failed to add bookmark", {
        params,
        error: err
      });
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, [storage]);

  // Remove bookmark
  const removeBookmark = useCallback(async (entityRecordId: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      await storage.removeBookmark(entityRecordId);

      logger.debug(BOOKMARKS_LOGGER_CONTEXT, "Bookmark removed", {
        entityRecordId
      });

      // Refresh will be triggered by catalogueEventEmitter
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      logger.error(BOOKMARKS_LOGGER_CONTEXT, "Failed to remove bookmark", {
        entityRecordId,
        error: err
      });
      throw errorObj;
    } finally {
      setLoading(false);
    }
  }, [storage]);

  // Check if entity is bookmarked
  const isBookmarked = useCallback(async (entityType: EntityType, entityId: string): Promise<boolean> => {
    try {
      const result = await storage.isBookmarked(entityType, entityId);

      logger.debug(BOOKMARKS_LOGGER_CONTEXT, "Checked bookmark status", {
        entityType,
        entityId,
        isBookmarked: result
      });

      return result;
    } catch (err) {
      logger.error(BOOKMARKS_LOGGER_CONTEXT, "Failed to check bookmark status", {
        entityType,
        entityId,
        error: err
      });
      return false;
    }
  }, [storage]);

  return {
    bookmarks,
    addBookmark,
    removeBookmark,
    isBookmarked,
    loading,
    error,
    refresh,
  };
}
