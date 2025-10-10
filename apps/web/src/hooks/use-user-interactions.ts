/**
 * React hook for user interactions (visits and bookmarks)
 */

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  userInteractionsService,
  type BookmarkRecord,
  type VisitRecord,
} from "@academic-explorer/utils/storage/user-interactions-db";
import { logger } from "@academic-explorer/utils/logger";

export interface UseUserInteractionsOptions {
  entityId?: string;
  entityType?: string;
  autoTrackVisits?: boolean;
  sessionId?: string;
}

export interface UseUserInteractionsReturn {
  // Visit tracking
  recordVisit: (
    entityId: string,
    entityType: string,
    url: string,
    queryParams?: Record<string, string>,
  ) => Promise<void>;
  recentVisits: VisitRecord[];
  entityVisits: VisitRecord[];
  visitStats: {
    totalVisits: number;
    uniqueEntities: number;
    mostVisitedEntity: {
      entityId: string;
      entityType: string;
      count: number;
    } | null;
  };

  // Bookmark management
  bookmarks: BookmarkRecord[];
  isBookmarked: boolean;
  bookmarkEntity: (
    title: string,
    notes?: string,
    tags?: string[],
  ) => Promise<void>;
  unbookmarkEntity: () => Promise<void>;
  updateBookmark: (
    updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>,
  ) => Promise<void>;
  searchBookmarks: (query: string) => Promise<BookmarkRecord[]>;

  // Loading states
  isLoadingVisits: boolean;
  isLoadingBookmarks: boolean;
  isLoadingStats: boolean;

  // Actions
  refreshData: () => Promise<void>;
  clearOldVisits: (olderThanDays?: number) => Promise<void>;
}

export function useUserInteractions(
  options: UseUserInteractionsOptions = {},
): UseUserInteractionsReturn {
  const { entityId, entityType, autoTrackVisits = true, sessionId } = options;
  const location = useLocation();

  // Helper to parse search params
  const getSearchParams = useCallback((): Record<string, string> => {
    const params = new URLSearchParams(location.search);
    const result: Record<string, string> = {};
    params.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }, [location.search]);

  // State
  const [recentVisits, setRecentVisits] = useState<VisitRecord[]>([]);
  const [entityVisits, setEntityVisits] = useState<VisitRecord[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [visitStats, setVisitStats] = useState({
    totalVisits: 0,
    uniqueEntities: 0,
    mostVisitedEntity: null as {
      entityId: string;
      entityType: string;
      count: number;
    } | null,
  });

  // Loading states
  const [isLoadingVisits, setIsLoadingVisits] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoadingVisits(true);
    setIsLoadingBookmarks(true);
    setIsLoadingStats(true);

    try {
      // Load recent visits
      const visits = await userInteractionsService.getRecentVisits(20);
      setRecentVisits(visits);

      // Load entity-specific visits if entity is provided
      if (entityId && entityType) {
        const entityVisitRecords =
          await userInteractionsService.getEntityVisits(entityId, entityType);
        setEntityVisits(entityVisitRecords);

        // Check if entity is bookmarked
        const bookmarked = await userInteractionsService.isEntityBookmarked(
          entityId,
          entityType,
        );
        setIsBookmarked(bookmarked);
      }

      // Load all bookmarks
      const allBookmarks = await userInteractionsService.getAllBookmarks();
      setBookmarks(allBookmarks);

      // Load visit stats
      const stats = await userInteractionsService.getVisitStats();
      setVisitStats(stats);
    } catch (error) {
      logger.error(
        "user-interactions",
        "Failed to refresh user interaction data",
        { error },
      );
    } finally {
      setIsLoadingVisits(false);
      setIsLoadingBookmarks(false);
      setIsLoadingStats(false);
    }
  }, [entityId, entityType]);

  // Auto-track visits when entityId and entityType are provided
  useEffect(() => {
    if (autoTrackVisits && entityId && entityType) {
      const trackVisit = async () => {
        try {
          const url = location.pathname + location.search;
          const queryParams = getSearchParams();

          await userInteractionsService.recordVisit(
            entityId,
            entityType,
            url,
            Object.keys(queryParams).length > 0 ? queryParams : undefined,
            document.referrer || undefined,
            sessionId,
          );
        } catch (error) {
          logger.error("user-interactions", "Failed to auto-track visit", {
            entityId,
            entityType,
            error,
          });
        }
      };

      void trackVisit();
    }
  }, [
    entityId,
    entityType,
    autoTrackVisits,
    location.pathname,
    location.search,
    getSearchParams,
    sessionId,
  ]);

  // Load data on mount and when entity changes
  useEffect(() => {
    void refreshData();
  }, [entityId, entityType, refreshData]);

  const recordVisit = useCallback(
    async (
      visitEntityId: string,
      visitEntityType: string,
      url: string,
      queryParams?: Record<string, string>,
    ) => {
      try {
        await userInteractionsService.recordVisit(
          visitEntityId,
          visitEntityType,
          url,
          queryParams,
          document.referrer || undefined,
          sessionId,
        );

        // Refresh data to update UI
        await refreshData();
      } catch (error) {
        logger.error("user-interactions", "Failed to record visit", {
          entityId: visitEntityId,
          entityType: visitEntityType,
          error,
        });
        throw error;
      }
    },
    [sessionId, refreshData],
  );

  const bookmarkEntity = useCallback(
    async (title: string, notes?: string, tags?: string[]) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to bookmark");
      }

      try {
        const url = location.pathname + location.search;
        const queryParams = getSearchParams();

        await userInteractionsService.addBookmark(
          entityId,
          entityType,
          title,
          url,
          Object.keys(queryParams).length > 0 ? queryParams : undefined,
          notes,
          tags,
        );

        setIsBookmarked(true);
        await refreshData();
      } catch (error) {
        logger.error("user-interactions", "Failed to bookmark entity", {
          entityId,
          entityType,
          error,
        });
        throw error;
      }
    },
    [
      entityId,
      entityType,
      location.pathname,
      location.search,
      getSearchParams,
      refreshData,
    ],
  );

  const unbookmarkEntity = useCallback(async () => {
    if (!entityId || !entityType) {
      throw new Error("Entity ID and type are required to unbookmark");
    }

    try {
      const bookmark = await userInteractionsService.getEntityBookmark(
        entityId,
        entityType,
      );
      if (bookmark?.id) {
        await userInteractionsService.removeBookmark(bookmark.id);
        setIsBookmarked(false);
        await refreshData();
      }
    } catch (error) {
      logger.error("user-interactions", "Failed to unbookmark entity", {
        entityId,
        entityType,
        error,
      });
      throw error;
    }
  }, [entityId, entityType, refreshData]);

  const updateBookmark = useCallback(
    async (
      updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>,
    ) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to update bookmark");
      }

      try {
        const bookmark = await userInteractionsService.getEntityBookmark(
          entityId,
          entityType,
        );
        if (bookmark?.id) {
          await userInteractionsService.updateBookmark(bookmark.id, updates);
          await refreshData();
        }
      } catch (error) {
        logger.error("user-interactions", "Failed to update bookmark", {
          entityId,
          entityType,
          updates,
          error,
        });
        throw error;
      }
    },
    [entityId, entityType, refreshData],
  );

  const searchBookmarks = useCallback(
    async (query: string): Promise<BookmarkRecord[]> => {
      try {
        return await userInteractionsService.searchBookmarks(query);
      } catch (error) {
        logger.error("user-interactions", "Failed to search bookmarks", {
          query,
          error,
        });
        return [];
      }
    },
    [],
  );

  const clearOldVisits = useCallback(
    async (olderThanDays = 30) => {
      try {
        await userInteractionsService.clearOldVisits(olderThanDays);
        await refreshData();
      } catch (error) {
        logger.error("user-interactions", "Failed to clear old visits", {
          olderThanDays,
          error,
        });
        throw error;
      }
    },
    [refreshData],
  );

  return {
    // Visit tracking
    recordVisit,
    recentVisits,
    entityVisits,
    visitStats,

    // Bookmark management
    bookmarks,
    isBookmarked,
    bookmarkEntity,
    unbookmarkEntity,
    updateBookmark,
    searchBookmarks,

    // Loading states
    isLoadingVisits,
    isLoadingBookmarks,
    isLoadingStats,

    // Actions
    refreshData,
    clearOldVisits,
  };
}
