/**
 * React hook for user interactions (visits and bookmarks)
 */

import { useCallback, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import {
  userInteractionsService,
  type BookmarkRecord,
  type PageVisitRecord,
} from "@academic-explorer/utils/storage/user-interactions-db";
import { logger } from "@academic-explorer/utils/logger";

const USER_INTERACTIONS_LOGGER_CONTEXT = "user-interactions";

export interface UseUserInteractionsOptions {
  entityId?: string;
  entityType?: string;
  searchQuery?: string;
  filters?: Record<string, unknown>;
  url?: string;
  autoTrackVisits?: boolean;
  sessionId?: string;
}

export interface UseUserInteractionsReturn {
  // Page visit tracking
  recordPageVisit: (params: {
    url: string;
    metadata?: {
      searchQuery?: string;
      filters?: Record<string, unknown>;
      entityId?: string;
      entityType?: string;
      resultCount?: number;
    };
  }) => Promise<void>;
  recentPageVisits: PageVisitRecord[];
  pageVisitsForUrl: (normalizedUrl: string) => PageVisitRecord[];
  pageVisitStats: {
    totalVisits: number;
    uniqueUrls: number;
    byType: Record<string, number>;
    mostVisitedUrl: {
      normalizedUrl: string;
      count: number;
    } | null;
  };

  // Bookmark management
  bookmarks: BookmarkRecord[];
  isBookmarked: boolean;
  bookmarkEntity: (params: {
    title: string;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  bookmarkSearch: (params: {
    title: string;
    searchQuery: string;
    filters?: Record<string, unknown>;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  bookmarkList: (params: {
    title: string;
    url: string;
    notes?: string;
    tags?: string[];
  }) => Promise<void>;
  unbookmarkEntity: () => Promise<void>;
  unbookmarkSearch: () => Promise<void>;
  unbookmarkList: () => Promise<void>;
  updateBookmark: (
    updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>,
  ) => Promise<void>;
  searchBookmarks: (query: string) => Promise<BookmarkRecord[]>;

  // Bulk operations
  bulkRemoveBookmarks: (bookmarkIds: number[]) => Promise<{ success: number; failed: number }>;
  bulkUpdateBookmarkTags: (params: {
    bookmarkIds: number[];
    addTags?: string[];
    removeTags?: string[];
    replaceTags?: string[];
  }) => Promise<{ success: number; failed: number }>;
  bulkUpdateBookmarkNotes: (params: {
    bookmarkIds: number[];
    notes?: string;
    action?: "replace" | "append" | "prepend";
  }) => Promise<{ success: number; failed: number }>;

  // Loading states
  isLoadingPageVisits: boolean;
  isLoadingBookmarks: boolean;
  isLoadingStats: boolean;

  // Actions
  refreshData: () => Promise<void>;
}

export function useUserInteractions(
  options: UseUserInteractionsOptions = {},
): UseUserInteractionsReturn {
  const {
    entityId,
    entityType,
    searchQuery,
    filters,
    url,
    autoTrackVisits = true,
    sessionId,
  } = options;
  // Safely get router location (may not be available in test environments)
  const location = (() => {
    try {
      return useLocation();
    } catch (error) {
      // Return a fallback location object when router is not available
      return {
        pathname: '',
        search: '',
        hash: '',
        state: null,
        key: '',
      };
    }
  })();

  // Helper to parse search params
  const getSearchParams = useCallback((): Record<string, string> => {
    const result: Record<string, string> = {};
    // TanStack Router's location.search is already an object, not a query string
    const search = location.search as Record<string, unknown>;
    for (const [key, value] of Object.entries(search)) {
      // Convert values to strings
      if (value !== undefined && value !== null) {
        result[key] = String(value);
      }
    }
    return result;
  }, [location.search]);

  // State
  const [recentPageVisits, setRecentPageVisits] = useState<PageVisitRecord[]>(
    [],
  );
  const [bookmarks, setBookmarks] = useState<BookmarkRecord[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [pageVisitStats, setPageVisitStats] = useState({
    totalVisits: 0,
    uniqueUrls: 0,
    byType: {} as Record<string, number>,
    mostVisitedUrl: null as {
      normalizedUrl: string;
      count: number;
    } | null,
  });

  // Loading states
  const [isLoadingPageVisits, setIsLoadingPageVisits] = useState(false);
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const refreshData = useCallback(async () => {
    setIsLoadingPageVisits(true);
    setIsLoadingBookmarks(true);
    setIsLoadingStats(true);

    // Add timeout to prevent infinite loading in test environments
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('User interactions data loading timed out after 10 seconds'));
      }, 10000); // 10 second timeout
    });

    try {
      // Wrap all database operations in a race against timeout
      const dataLoadPromise = (async () => {
        // Load recent page visits
        const pageVisits = await userInteractionsService.getRecentPageVisits(20);
        setRecentPageVisits(pageVisits);

        // Check bookmark status based on content type
        if (entityId && entityType) {
          const bookmarked = await userInteractionsService.isEntityBookmarked({
            entityId,
            entityType,
          });
          setIsBookmarked(bookmarked);
        } else if (searchQuery) {
          const bookmarked = await userInteractionsService.isSearchBookmarked({
            searchQuery,
            filters,
          });
          setIsBookmarked(bookmarked);
        } else if (url) {
          const bookmarked = await userInteractionsService.isListBookmarked(url);
          setIsBookmarked(bookmarked);
        }

        // Load all bookmarks
        const allBookmarks = await userInteractionsService.getAllBookmarks();
        setBookmarks(allBookmarks);

        // Load page visit stats (using legacy format for compatibility)
        const pageStats = await userInteractionsService.getPageVisitStatsLegacy();
        setPageVisitStats({
          totalVisits: pageStats.totalVisits,
          uniqueUrls: pageStats.uniqueRequests,
          byType: pageStats.byEndpoint,
          mostVisitedUrl: null,
        });
      })();

      // Race between data loading and timeout
      await Promise.race([dataLoadPromise, timeoutPromise]);
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to refresh user interaction data",
        { error },
      );

      // Set default values when loading fails
      setRecentPageVisits([]);
      setBookmarks([]);
      setPageVisitStats({
        totalVisits: 0,
        uniqueUrls: 0,
        byType: {},
        mostVisitedUrl: null,
      });
      setIsBookmarked(false);
    } finally {
      setIsLoadingPageVisits(false);
      setIsLoadingBookmarks(false);
      setIsLoadingStats(false);
    }
  }, [entityId, entityType, searchQuery, filters, url]);

  // Auto-track page visits when enabled - stabilize dependencies to prevent loops
  useEffect(() => {
    if (autoTrackVisits) {
      const trackPageVisit = async () => {
        try {
          const url = location.pathname + location.search;

          await userInteractionsService.recordPageVisitLegacy({
            cacheKey: url,
            metadata: {
              sessionId,
              referrer: document.referrer || undefined,
            },
          });
        } catch (error) {
          logger.error(
            USER_INTERACTIONS_LOGGER_CONTEXT,
            "Failed to auto-track page visit",
            {
              entityId,
              entityType,
              error,
            },
          );
        }
      };

      void trackPageVisit();
    }
  }, [
    entityId,
    entityType,
    searchQuery,
    autoTrackVisits,
    sessionId,
    // Only track when pathname or search changes, not filters object
    location.pathname,
    location.search,
  ]);

  // Load data on mount and when entity changes
  useEffect(() => {
    void refreshData();
  }, [entityId, entityType, searchQuery, url]); // Don't include filters or refreshData to prevent loops

  const recordPageVisit = useCallback(
    async ({
      url,
      metadata,
    }: {
      url: string;
      metadata?: {
        searchQuery?: string;
        filters?: Record<string, unknown>;
        entityId?: string;
        entityType?: string;
        resultCount?: number;
      };
    }) => {
      try {
        await userInteractionsService.recordPageVisitLegacy({
          cacheKey: url,
          metadata: {
            ...metadata,
            sessionId,
            referrer: document.referrer || undefined,
          },
        });

        // Refresh data to update UI
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to record page visit",
          {
            url,
            error,
          },
        );
        throw error;
      }
    },
    [sessionId, refreshData],
  );

  const pageVisitsForUrl = useCallback(
    (normalizedUrl: string): PageVisitRecord[] => {
      // This is a simple filter - in a real app you might want to cache this
      return recentPageVisits.filter(
        (visit) => visit.request.cacheKey === normalizedUrl,
      );
    },
    [recentPageVisits],
  );

  const bookmarkEntity = useCallback(
    async ({
      title,
      notes,
      tags,
    }: {
      title: string;
      notes?: string;
      tags?: string[];
    }) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to bookmark");
      }

      try {
        const request = {
          cacheKey: `/${entityType}/${entityId}`,
          hash: `entity-${entityType}-${entityId}`.slice(0, 16),
          endpoint: `/${entityType}`,
          params: { id: entityId },
        };

        await userInteractionsService.addBookmark({
          request,
          title,
          notes,
          tags,
        });

        setIsBookmarked(true);
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bookmark entity",
          {
            entityId,
            entityType,
            error,
          },
        );
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
      const bookmark = await userInteractionsService.getEntityBookmark({
        entityId,
        entityType,
      });
      if (bookmark?.id) {
        await userInteractionsService.removeBookmark(bookmark.id);
        setIsBookmarked(false);
        await refreshData();
      }
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to unbookmark entity",
        {
          entityId,
          entityType,
          error,
        },
      );
      throw error;
    }
  }, [entityId, entityType, refreshData]);

  const bookmarkSearch = useCallback(
    async ({
      title,
      searchQuery,
      filters,
      notes,
      tags,
    }: {
      title: string;
      searchQuery: string;
      filters?: Record<string, unknown>;
      notes?: string;
      tags?: string[];
    }) => {
      try {
        const params: Record<string, unknown> = { search: searchQuery };
        if (filters) {
          Object.assign(params, filters);
        }

        const request = {
          cacheKey: `/search?q=${searchQuery}`,
          hash: `search-${searchQuery}`.slice(0, 16),
          endpoint: "/search",
          params,
        };

        await userInteractionsService.addBookmark({
          request,
          title,
          notes,
          tags,
        });

        setIsBookmarked(true);
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bookmark search",
          {
            searchQuery,
            filters,
            error,
          },
        );
        throw error;
      }
    },
    [location.pathname, location.search, getSearchParams, refreshData],
  );

  const bookmarkList = useCallback(
    async ({
      title,
      url,
      notes,
      tags,
    }: {
      title: string;
      url: string;
      notes?: string;
      tags?: string[];
    }) => {
      try {
        await userInteractionsService.addListBookmark(url, title, notes, tags);

        setIsBookmarked(true);
        await refreshData();
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bookmark list",
          {
            url,
            error,
          },
        );
        throw error;
      }
    },
    [getSearchParams, refreshData],
  );

  const unbookmarkSearch = useCallback(async () => {
    if (!searchQuery) {
      throw new Error("Search query is required to unbookmark");
    }

    try {
      const bookmark = await userInteractionsService.getSearchBookmark({
        searchQuery,
        filters,
      });
      if (bookmark?.id) {
        await userInteractionsService.removeBookmark(bookmark.id);
        setIsBookmarked(false);
        await refreshData();
      }
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to unbookmark search",
        {
          searchQuery,
          filters,
          error,
        },
      );
      throw error;
    }
  }, [searchQuery, filters, refreshData]);

  const unbookmarkList = useCallback(async () => {
    if (!url) {
      throw new Error("URL is required to unbookmark list");
    }

    try {
      const bookmark = await userInteractionsService.getListBookmark(url);
      if (bookmark?.id) {
        await userInteractionsService.removeBookmark(bookmark.id);
        setIsBookmarked(false);
        await refreshData();
      }
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to unbookmark list",
        {
          url,
          error,
        },
      );
      throw error;
    }
  }, [url, refreshData]);

  const updateBookmark = useCallback(
    async (
      updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>,
    ) => {
      if (!entityId || !entityType) {
        throw new Error("Entity ID and type are required to update bookmark");
      }

      try {
        const bookmark = await userInteractionsService.getEntityBookmark({
          entityId,
          entityType,
        });
        if (bookmark?.id) {
          await userInteractionsService.updateBookmark({
            bookmarkId: bookmark.id,
            updates,
          });
          await refreshData();
        }
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to update bookmark",
          {
            entityId,
            entityType,
            updates,
            error,
          },
        );
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
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to search bookmarks",
          {
            query,
            error,
          },
        );
        return [];
      }
    },
    [],
  );

  const bulkRemoveBookmarks = useCallback(
    async (bookmarkIds: number[]): Promise<{ success: number; failed: number }> => {
      try {
        const result = await userInteractionsService.removeBookmarks(bookmarkIds);
        await refreshData(); // Refresh data after bulk operation
        return result;
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bulk remove bookmarks",
          {
            bookmarkIds,
            error,
          },
        );
        throw error;
      }
    },
    [refreshData],
  );

  const bulkUpdateBookmarkTags = useCallback(
    async (params: {
      bookmarkIds: number[];
      addTags?: string[];
      removeTags?: string[];
      replaceTags?: string[];
    }): Promise<{ success: number; failed: number }> => {
      try {
        const result = await userInteractionsService.updateBookmarkTags(params);
        await refreshData(); // Refresh data after bulk operation
        return result;
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bulk update bookmark tags",
          {
            params,
            error,
          },
        );
        throw error;
      }
    },
    [refreshData],
  );

  const bulkUpdateBookmarkNotes = useCallback(
    async (params: {
      bookmarkIds: number[];
      notes?: string;
      action?: "replace" | "append" | "prepend";
    }): Promise<{ success: number; failed: number }> => {
      try {
        const result = await userInteractionsService.updateBookmarkNotes(params);
        await refreshData(); // Refresh data after bulk operation
        return result;
      } catch (error) {
        logger.error(
          USER_INTERACTIONS_LOGGER_CONTEXT,
          "Failed to bulk update bookmark notes",
          {
            params,
            error,
          },
        );
        throw error;
      }
    },
    [refreshData],
  );

  return {
    // Page visit tracking
    recordPageVisit,
    recentPageVisits,
    pageVisitsForUrl,
    pageVisitStats,

    // Bookmark management
    bookmarks,
    isBookmarked,
    bookmarkEntity,
    bookmarkSearch,
    bookmarkList,
    unbookmarkEntity,
    unbookmarkSearch,
    unbookmarkList,
    updateBookmark,
    searchBookmarks,

    // Bulk operations
    bulkRemoveBookmarks,
    bulkUpdateBookmarkTags,
    bulkUpdateBookmarkNotes,

    // Loading states
    isLoadingPageVisits,
    isLoadingBookmarks,
    isLoadingStats,

    // Actions
    refreshData,
  };
}
