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

    try {
      // Load recent page visits
      const pageVisits = await userInteractionsService.getRecentPageVisits(20);
      setRecentPageVisits(pageVisits);

      // Check bookmark status based on content type
      if (entityId && entityType) {
        const bookmarked = await userInteractionsService.isEntityBookmarked(
          entityId,
          entityType,
        );
        setIsBookmarked(bookmarked);
      } else if (searchQuery) {
        const bookmarked = await userInteractionsService.isSearchBookmarked(
          searchQuery,
          filters,
        );
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
      setPageVisitStats(pageStats);
    } catch (error) {
      logger.error(
        USER_INTERACTIONS_LOGGER_CONTEXT,
        "Failed to refresh user interaction data",
        { error },
      );
    } finally {
      setIsLoadingPageVisits(false);
      setIsLoadingBookmarks(false);
      setIsLoadingStats(false);
    }
  }, [entityId, entityType, searchQuery, filters, url]);

  // Auto-track page visits when enabled
  useEffect(() => {
    if (autoTrackVisits) {
      const trackPageVisit = async () => {
        try {
          const url = location.pathname + location.search;

          await userInteractionsService.recordPageVisitLegacy(
            url,
            {
              searchQuery,
              filters,
              entityId,
              entityType,
            },
            sessionId,
            document.referrer || undefined,
          );
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
    autoTrackVisits,
    location.pathname,
    location.search,
    sessionId,
  ]);

  // Load data on mount and when entity changes
  useEffect(() => {
    void refreshData();
  }, [entityId, entityType, refreshData]);

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
        await userInteractionsService.recordPageVisitLegacy(
          url,
          metadata,
          sessionId,
          document.referrer || undefined,
        );

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
        const url = location.pathname + location.search;
        const queryParams = getSearchParams();

        await userInteractionsService.addEntityBookmark(
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

        await userInteractionsService.addBookmark(request, title, notes, tags);

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
        const queryParams = getSearchParams();

        await userInteractionsService.addListBookmark(
          title,
          url,
          Object.keys(queryParams).length > 0 ? queryParams : undefined,
          notes,
          tags,
        );

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
      const bookmark = await userInteractionsService.getSearchBookmark(
        searchQuery,
        filters,
      );
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
        const bookmark = await userInteractionsService.getEntityBookmark(
          entityId,
          entityType,
        );
        if (bookmark?.id) {
          await userInteractionsService.updateBookmark(bookmark.id, updates);
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

    // Loading states
    isLoadingPageVisits,
    isLoadingBookmarks,
    isLoadingStats,

    // Actions
    refreshData,
  };
}
